#!/usr/bin/env node
// Gera profile/trophies.svg — as conquistas do perfil como cartas de baralho,
// desenhadas aqui mesmo a partir da API do GitHub (sem serviço de terceiros).
//
//   node .github/scripts/gen-trophies.mjs <login> [saída]
//   node .github/scripts/gen-trophies.mjs <login> [saída] --placeholder
//   node .github/scripts/gen-trophies.mjs <login> [saída] --fixture <json>
//
// Métrica que a API não devolver aparece como "—": nenhum número é inventado.
// --fixture renderiza a partir de um JSON de métricas, sem tocar na rede.

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { allPublicRepos, rest, searchCount } from './lib/github.mjs';
import { C, esc, open, rule, shortNum, suit } from './lib/theme.mjs';

const W = 1200;
const COLS = 4;
const MARGIN = 30;
const GAP = 14;
const CARD_W = Math.round((W - MARGIN * 2 - GAP * (COLS - 1)) / COLS);
const CARD_H = 158;
const GRID_TOP = 104;

const SUITS = ['spade', 'heart', 'diamond', 'club'];
const RANKS = ['Ás', 'Rei', 'Dama', 'Valete', 'Dez'];

/** Posição do valor nas faixas (da mais alta para a mais baixa). */
function rankOf(value, thresholds) {
  if (value === null || value === undefined) return null;
  const index = thresholds.findIndex((limit) => value >= limit);
  return RANKS[index === -1 ? RANKS.length - 1 : index];
}

function card(trophy, index) {
  const col = index % COLS;
  const row = Math.floor(index / COLS);
  const x = MARGIN + col * (CARD_W + GAP);
  const y = GRID_TOP + row * (CARD_H + GAP);
  const suitName = SUITS[index % SUITS.length];
  const suitColor = suitName === 'heart' || suitName === 'diamond' ? C.redDeep : C.gold;
  const missing = trophy.value === null || trophy.value === undefined;
  const delay = (0.22 * index).toFixed(2);
  const clip = `clip-${index}`;
  const ace = trophy.rank === RANKS[0];

  return `
<g${missing ? ' opacity=".55"' : ''}>
  <clipPath id="${clip}"><rect x="${x}" y="${y}" width="${CARD_W}" height="${CARD_H}" rx="10"/></clipPath>
  <rect x="${x}" y="${y}" width="${CARD_W}" height="${CARD_H}" rx="10" fill="${C.panel}" stroke="${C.goldDark}" stroke-width="1.2"/>
  <rect class="${ace ? 'ace' : ''}" x="${x + 5}" y="${y + 5}" width="${CARD_W - 10}" height="${CARD_H - 10}" rx="7" fill="none" stroke="${C.gold}" stroke-width=".6" stroke-opacity=".35"${ace ? ` style="animation-delay:${delay}s"` : ''}/>
  <g clip-path="url(#${clip})">
    <!-- brilho que varre a carta: 2,7 s de passagem e ~6 s de pausa a cada ciclo -->
    <rect class="motion" x="${x - CARD_W}" y="${y}" width="${CARD_W * 0.7}" height="${CARD_H}" fill="url(#sheen)">
      <animateTransform attributeName="transform" type="translate"
        values="0 0;${(CARD_W * 2.2).toFixed(0)} 0;${(CARD_W * 2.2).toFixed(0)} 0"
        keyTimes="0;0.3;1" calcMode="spline" keySplines=".4 0 .2 1;0 0 1 1"
        dur="9s" begin="${delay}s" repeatCount="indefinite"/>
    </rect>
  </g>
  ${suit(suitName, x + 18, y + 28, 15, suitColor, 'class="pip" style="animation-delay:' + delay + 's"')}
  ${suit(suitName, x + CARD_W - 18, y + CARD_H - 14, 15, suitColor, 'opacity=".5"')}
  <text x="${x + CARD_W - 16}" y="${y + 26}" text-anchor="end" font-size="11" fill="${C.purpleSoft}" letter-spacing="1.8">${esc((trophy.rank || '—').toUpperCase())}</text>
  <text x="${x + CARD_W / 2}" y="${y + 86}" text-anchor="middle" font-size="40" fill="url(#goldv)" letter-spacing="1">${esc(trophy.display)}</text>
  <text x="${x + CARD_W / 2}" y="${y + 112}" text-anchor="middle" font-size="14" fill="${C.cream}" letter-spacing=".6">${esc(trophy.label)}</text>
  <text x="${x + CARD_W / 2}" y="${y + 133}" text-anchor="middle" font-size="10.5" fill="${C.purpleSoft}" letter-spacing=".4"><tspan font-style="italic">${esc(trophy.flavor)}</tspan></text>
</g>`;
}

const STYLE = `
  .ace { animation: ace 3.6s ease-in-out infinite; }
  @keyframes ace { 0%, 100% { stroke-opacity: .3; } 50% { stroke-opacity: 1; } }`;

function render(trophies, footer) {
  const rows = Math.ceil(trophies.length / COLS);
  const H = GRID_TOP + rows * CARD_H + (rows - 1) * GAP + 54;
  const described = trophies.map((t) => `${t.label}: ${t.display}`).join('; ');

  return `${open(
    W,
    H,
    'Conquistas de Agnes Millie no GitHub',
    `Oito cartas de baralho com as conquistas do perfil — ${described}.`,
    STYLE,
  )}
<text x="${W / 2}" y="52" text-anchor="middle" font-size="25" fill="url(#goldv)" letter-spacing="2.2">O Baralho das Conquistas</text>
${rule(W / 2, 62, 360)}
<text x="${W / 2}" y="82" text-anchor="middle" font-size="12" fill="${C.purpleSoft}" letter-spacing="2.4">TODOS GANHARAM E TODOS DEVEM TER PRÊMIOS</text>
${suit('diamond', W / 2 - 196, 60, 11, C.redDeep, 'class="pip"')}
${suit('club', W / 2 + 196, 60, 11, C.gold, 'class="pip" style="animation-delay:.8s"')}

${trophies.map(card).join('\n')}

<text x="${W / 2}" y="${H - 20}" text-anchor="middle" font-size="10.5" fill="${C.purpleSoft}" letter-spacing="1.2">${esc(footer)}</text>
</svg>
`;
}

function build(metrics) {
  const spec = [
    { key: 'commits', label: 'Commits', flavor: 'cada carta na mesa', thresholds: [1000, 500, 200, 50, 0] },
    { key: 'stars', label: 'Estrelas', flavor: 'o jardim de rosas', thresholds: [500, 100, 25, 5, 0] },
    { key: 'pullRequests', label: 'Pull Requests', flavor: 'convites ao chá', thresholds: [200, 50, 20, 5, 0] },
    { key: 'issues', label: 'Issues', flavor: 'enigmas do Gato', thresholds: [100, 30, 10, 3, 0] },
    { key: 'followers', label: 'Seguidores', flavor: 'a corte reunida', thresholds: [200, 50, 20, 5, 0] },
    { key: 'repositories', label: 'Repositórios', flavor: 'portas do corredor', thresholds: [50, 25, 10, 3, 0] },
    { key: 'forks', label: 'Forks', flavor: 'espelhos do outro lado', thresholds: [100, 25, 10, 2, 0] },
    { key: 'years', label: 'Jornada', flavor: 'desde a toca do coelho', thresholds: [8, 5, 3, 1, 0], suffix: ' anos' },
  ];

  return spec.map((item) => {
    const value = metrics[item.key];
    const display = value === null || value === undefined ? '—' : `${shortNum(value)}${item.suffix || ''}`;
    return {
      label: item.label,
      flavor: item.flavor,
      value,
      display,
      rank: rankOf(value, item.thresholds),
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
  const argv = process.argv.slice(2);
  const fixtureAt = argv.indexOf('--fixture');
  const fixture = fixtureAt === -1 ? null : argv[fixtureAt + 1];
  const args = argv.filter((a, i) => a !== '--placeholder' && a !== '--fixture' && i !== fixtureAt + 1);
  const login = args[0];
  const out = args[1] || 'profile/trophies.svg';
  if (!login) throw new Error('uso: gen-trophies.mjs <login> [saída] [--placeholder] [--fixture <json>]');

  let svg;
  if (argv.includes('--placeholder')) {
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
