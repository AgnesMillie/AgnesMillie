#!/usr/bin/env node
// Gera profile/trophies.svg — as conquistas do perfil como as faixas bônus do
// disco, cada uma com seu selo, a partir da API do GitHub (sem terceiros).
//
//   node .github/scripts/gen-trophies.mjs <login> [saída]
//   node .github/scripts/gen-trophies.mjs <login> [saída] --placeholder
//   node .github/scripts/gen-trophies.mjs <login> [saída] --fixture <json>
//
// Métrica que a API não devolver aparece como "—": nenhum número é inventado.

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { parseArgs } from './lib/args.mjs';
import { allPublicRepos, rest, searchCount } from './lib/github.mjs';
import { C, esc, fit, frame, MIN_READABLE, open, rule, SANS, shortNum } from './lib/theme.mjs';
import { rugPattern, vinyl, vinylDefs, waveform } from './lib/motifs.mjs';

const W = 1200;
const COLS = 4;
const MARGIN = 34;
const GAP = 16;
const CARD_W = Math.round((W - MARGIN * 2 - GAP * (COLS - 1)) / COLS);
const CARD_H = 200;
const GRID_TOP = 112;

/** Selos de disco, do mais alto para o mais baixo. */
const SEALS = ['Ouro', 'Prata', 'Bronze', 'Cobre', 'Demo'];
const SEAL_COLOR = { Ouro: C.brass, Prata: '#BFC3C0', Bronze: C.clay, Cobre: C.terracotta, Demo: C.muted };

function sealOf(value, thresholds) {
  if (value === null || value === undefined) return null;
  const index = thresholds.findIndex((limit) => value >= limit);
  return SEALS[index === -1 ? SEALS.length - 1 : index];
}

function card(item, index) {
  const col = index % COLS;
  const row = Math.floor(index / COLS);
  const x = MARGIN + col * (CARD_W + GAP);
  const y = GRID_TOP + row * (CARD_H + GAP);
  const missing = item.value === null || item.value === undefined;
  const delay = (0.24 * index).toFixed(2);
  const clip = `clip-${index}`;
  const seal = item.seal ?? '—';
  const sealColor = SEAL_COLOR[seal] ?? C.muted;

  // O cartão é lido a ~72% do tamanho nativo dentro do README, então a
  // tipografia é generosa — e encolhe sozinha se o texto não couber na ficha.
  const inner = CARD_W - 40;
  const labelSize = fit(item.label, 21, inner);
  const flavorSize = fit(item.flavor, 17, inner);
  const valueSize = fit(item.display, 44, inner, 24);

  return `
<g${missing ? ' opacity=".5"' : ''}>
  <clipPath id="${clip}"><rect x="${x}" y="${y}" width="${CARD_W}" height="${CARD_H}" rx="12"/></clipPath>
  <rect x="${x}" y="${y}" width="${CARD_W}" height="${CARD_H}" rx="12" fill="${C.panel}" stroke="${C.brass}" stroke-opacity=".3" stroke-width="1.1"/>
  <g clip-path="url(#${clip})">
    <!-- brilho que varre a ficha: ~2,7 s de passagem e ~6 s de pausa -->
    <rect class="motion" x="${x - CARD_W}" y="${y}" width="${CARD_W * 0.7}" height="${CARD_H}" fill="url(#sheen)">
      <animateTransform attributeName="transform" type="translate"
        values="0 0;${(CARD_W * 2.2).toFixed(0)} 0;${(CARD_W * 2.2).toFixed(0)} 0"
        keyTimes="0;0.3;1" calcMode="spline" keySplines=".4 0 .2 1;0 0 1 1"
        dur="9s" begin="${delay}s" repeatCount="indefinite"/>
    </rect>
    ${waveform(x + 14, y + CARD_H - 20, CARD_W - 28, 20, 26, item.seed, C.terracotta, '.22')}
  </g>

  ${vinyl(x + 34, y + 34, 16, { spin: missing ? 0 : 13 + index, label: sealColor, grooves: 3, id: `t${index}` })}
  <text x="${x + CARD_W - 18}" y="${y + 39}" text-anchor="end" font-size="${MIN_READABLE}" fill="${sealColor}" letter-spacing="1.8" font-family="${SANS}">${esc(seal.toUpperCase())}</text>

  <text x="${x + 20}" y="${y + 100}" font-size="${valueSize}" fill="url(#brassv)" letter-spacing=".5">${esc(item.display)}</text>
  <text x="${x + 20}" y="${y + 134}" font-size="${labelSize}" fill="${C.cream}" letter-spacing=".3">${esc(item.label)}</text>
  <text x="${x + 20}" y="${y + 160}" font-size="${flavorSize}" fill="${C.muted}" font-style="italic">${esc(item.flavor)}</text>
</g>`;
}

const STYLE = '';

function render(items, footer) {
  const rows = Math.ceil(items.length / COLS);
  const H = GRID_TOP + rows * CARD_H + (rows - 1) * GAP + 56;
  const described = items.map((t) => `${t.label}: ${t.display}`).join('; ');

  return `${open(
    W,
    H,
    'Faixas bônus: conquistas no GitHub',
    `Oito fichas de faixa com as conquistas do perfil — ${described}.`,
    STYLE,
    `${rugPattern()}${items.map((_, i) => vinylDefs(`t${i}`)).join('')}`,
  )}
${frame(W, H)}

<text x="${W / 2}" y="58" text-anchor="middle" font-size="30" fill="url(#brassv)" letter-spacing="3">Faixas bônus</text>
${rule(W / 2, 68, 300)}
<text x="${W / 2}" y="92" text-anchor="middle" font-size="${MIN_READABLE}" fill="${C.muted}" letter-spacing="3" font-family="${SANS}">O QUE FICOU GRAVADO ATÉ AQUI</text>

${items.map(card).join('\n')}

<text x="${W / 2}" y="${H - 22}" text-anchor="middle" font-size="${MIN_READABLE}" fill="${C.muted}" letter-spacing="1.2" font-family="${SANS}">${esc(footer)}</text>
</svg>
`;
}

function build(metrics) {
  const spec = [
    { key: 'commits', label: 'Commits', flavor: 'tomadas gravadas', thresholds: [1000, 500, 200, 50, 0], seed: 11 },
    { key: 'pullRequests', label: 'Pull Requests', flavor: 'entregue à prensa', thresholds: [200, 50, 20, 5, 0], seed: 19 },
    { key: 'issues', label: 'Issues', flavor: 'ruídos na fita', thresholds: [100, 30, 10, 3, 0], seed: 29 },
    { key: 'repositories', label: 'Repositórios', flavor: 'o catálogo', thresholds: [50, 25, 10, 3, 0], seed: 41 },
    { key: 'stars', label: 'Estrelas', flavor: 'quem levou para casa', thresholds: [500, 100, 25, 5, 0], seed: 53 },
    { key: 'forks', label: 'Forks', flavor: 'regravado por outros', thresholds: [100, 25, 10, 2, 0], seed: 67 },
    { key: 'followers', label: 'Seguidores', flavor: 'a plateia', thresholds: [200, 50, 20, 5, 0], seed: 79 },
    { key: 'years', label: 'Em estúdio', flavor: 'desde a 1ª gravação', thresholds: [8, 5, 3, 1, 0], suffix: ' anos', seed: 91 },
  ];

  return spec.map((item) => {
    const value = metrics[item.key];
    const display = value === null || value === undefined ? '—' : `${shortNum(value)}${item.suffix || ''}`;
    return {
      label: item.label,
      flavor: item.flavor,
      seed: item.seed,
      value,
      display,
      seal: sealOf(value, item.thresholds),
    };
  });
}

async function collect(login) {
  const user = await rest(`/users/${encodeURIComponent(login)}`);
  const repos = await allPublicRepos(login);
  const own = repos.filter((repo) => !repo.fork);
  const q = encodeURIComponent(`author:${login}`);

  const [commits, pullRequests, issues] = await Promise.all([
    searchCount(`/search/commits?q=${q}&per_page=1`),
    searchCount(`/search/issues?q=${q}+type:pr&per_page=1`),
    searchCount(`/search/issues?q=${q}+type:issue&per_page=1`),
  ]);

  const years = (Date.now() - new Date(user.created_at).getTime()) / (365.25 * 24 * 60 * 60 * 1000);

  return {
    commits,
    pullRequests,
    issues,
    stars: own.reduce((sum, repo) => sum + repo.stargazers_count, 0),
    forks: own.reduce((sum, repo) => sum + repo.forks_count, 0),
    followers: user.followers,
    repositories: user.public_repos,
    years: Math.max(0, Math.round(years * 10) / 10),
  };
}

function today() {
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date());
}

async function main() {
  const { login, out, placeholder: usePlaceholder, fixture } = parseArgs(process.argv.slice(2), 'profile/trophies.svg');

  let svg;
  if (usePlaceholder) {
    svg = render(build({}), 'Aguardando a primeira coleta de dados do GitHub.');
  } else {
    const metrics = fixture ? JSON.parse(await readFile(fixture, 'utf8')) : await collect(login);
    svg = render(build(metrics), `Dados do GitHub em ${today()} · commits, PRs e issues pela API de busca`);
    console.log(`[ok] métricas: ${JSON.stringify(metrics)}`);
  }

  await mkdir(dirname(out), { recursive: true });
  await writeFile(out, svg, 'utf8');
  console.log(`[ok] ${out} (${svg.length} bytes)`);
}

main().catch((error) => {
  console.error(`[erro] ${error.message}`);
  process.exit(1);
});
