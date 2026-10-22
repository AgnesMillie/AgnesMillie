#!/usr/bin/env node
// Gera as artes fixas do perfil em assets/: capa, sulco divisor, cabeçalhos
// das faixas e encerramento. Não depende de rede — rode e comite o resultado.
//
//   node .github/scripts/gen-art.mjs [diretório]   (padrão: assets)

import { writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { C, esc, frame, open, rule, SANS } from './lib/theme.mjs';
import { cup, note, rugPattern, tonearm, vinyl, vinylDefs, waveform } from './lib/motifs.mjs';

const W = 1200;

/** Faixas do disco: id, lado, título e o que a seção realmente contém. */
export const TRACKS = [
  { id: 'a1', side: 'A', n: 1, title: 'Quem está tocando', sub: 'Sobre mim', seed: 11 },
  { id: 'a2', side: 'A', n: 2, title: 'O repertório', sub: 'Especialidades', seed: 23 },
  { id: 'a3', side: 'A', n: 3, title: 'Os instrumentos', sub: 'Stack tecnológico', seed: 37 },
  { id: 'b1', side: 'B', n: 1, title: 'As gravações', sub: 'Projetos em destaque', seed: 53 },
  { id: 'b2', side: 'B', n: 2, title: 'Rotação', sub: 'Métricas e contribuições', seed: 71 },
  { id: 'b3', side: 'B', n: 3, title: 'Faixas bônus', sub: 'Conquistas', seed: 89 },
];

const NAME = 'Agnes Millie';
const ROLE = 'Engenheira de Software Sênior';
const LINE = 'Resolvendo problemas complexos com software bem construído e engenharia com propósito.';

// ── capa ──────────────────────────────────────────────────────────────────

function cover() {
  const H = 430;
  const style = `
  .name { font-size: 62px; letter-spacing: 7px; fill: url(#brassv); }
  .role { font-size: 20px; letter-spacing: 4.2px; fill: ${C.cream}; }
  .line { font-size: 15.5px; fill: ${C.muted}; font-family: ${SANS}; }
  .meta { font-size: 11px; letter-spacing: 3.4px; fill: ${C.muted}; font-family: ${SANS}; }`;

  return `${open(
    W,
    H,
    `${NAME} — ${ROLE}`,
    'Capa em formato de disco de vinil: o LP gira no toca-discos com o braço apoiado no sulco, uma xícara de café fumega ao lado e o nome aparece em letras de latão sobre o tapete vermelho.',
    style,
    `${rugPattern()}${vinylDefs('cover')}`,
  )}
${frame(W, H)}

${vinyl(236, 215, 150, { spin: 14, label: C.wine, grooves: 11, id: 'cover' })}
${tonearm(372, 96, 150, 28)}
${cup(452, 330, 58)}

<g transform="translate(520 0)">
  <text class="name" x="0" y="168">${esc(NAME.toUpperCase())}</text>
  <rect x="2" y="190" width="560" height="1.4" fill="url(#rule)"/>
  <text class="role" x="2" y="228">${esc(ROLE.toUpperCase())}</text>
  <text class="line" x="2" y="266">Resolvendo problemas complexos com software</text>
  <text class="line" x="2" y="289">bem construído e engenharia com propósito.</text>
  ${note(600, 150, 46, C.terracotta, 'class="pulse"')}
  ${waveform(2, 338, 560, 46, 46, 5, C.terracotta, '.55')}
  <text class="meta" x="2" y="382">LADO A · LADO B — 33⅓ RPM — GRAVADO EM SÃO PAULO</text>
</g>
</svg>
`;
}

// ── divisor ───────────────────────────────────────────────────────────────

function groove() {
  const H = 46;
  // A animação CSS sobrescreve um transform de atributo no MESMO elemento:
  // a posição de repouso fica no grupo de fora, o deslocamento no de dentro.
  const style = `
  .needle { animation: slide 16s ease-in-out infinite; }
  @keyframes slide { 0%, 100% { transform: translateX(0); } 50% { transform: translateX(840px); } }`;

  const lines = [0, 1, 2, 3]
    .map((i) => {
      const y = 15 + i * 5;
      const opacity = (0.3 - i * 0.055).toFixed(3);
      return `<line x1="120" y1="${y}" x2="1080" y2="${y}" stroke="${C.terracotta}" stroke-opacity="${opacity}" stroke-width="1"/>`;
    })
    .join('\n');

  return `${open(
    W,
    H,
    'Divisor',
    'Sulcos de um disco com a agulha correndo sobre eles.',
    style,
    '',
  )}
${lines}
<g transform="translate(170 0)">
  <g class="needle">
    <circle cx="0" cy="20" r="9" fill="url(#spark)"/>
    <rect x="-1" y="6" width="2" height="28" rx="1" fill="${C.brass}" fill-opacity=".75"/>
  </g>
</g>
${note(600, 36, 26, C.brass, 'opacity=".75"')}
</svg>
`;
}

// ── cabeçalho de faixa ────────────────────────────────────────────────────

function trackHeader(track) {
  const H = 132;
  const style = `
  .idx { font-size: 15px; letter-spacing: 3px; fill: ${C.brass}; font-family: ${SANS}; }
  .title { font-size: 34px; letter-spacing: 1.6px; fill: ${C.cream}; }
  .sub { font-size: 13px; letter-spacing: 3.6px; fill: ${C.muted}; font-family: ${SANS}; }`;

  const tag = `${track.side}${track.n}`;

  return `${open(
    W,
    H,
    `${tag} — ${track.title} (${track.sub})`,
    `Cabeçalho da faixa ${tag} do disco: ${track.title}. Seção de ${track.sub.toLowerCase()}.`,
    style,
    `${rugPattern()}${vinylDefs(track.id)}`,
  )}
${frame(W, H)}

<g transform="translate(46 0)">
  <rect x="0" y="40" width="54" height="52" rx="8" fill="${C.wine}" fill-opacity=".55" stroke="${C.brass}" stroke-opacity=".45"/>
  <text class="idx" x="27" y="72" text-anchor="middle">${tag}</text>
</g>

<text class="title" x="126" y="62">${esc(track.title)}</text>
<text class="sub" x="128" y="88">${esc(track.sub.toUpperCase())}</text>
<rect x="126" y="100" width="300" height="1.2" fill="url(#rule)"/>

${waveform(560, 66, 420, 54, 42, track.seed, C.terracotta, '.4')}
${vinyl(1092, 66, 44, { spin: 11, label: C.clay, grooves: 6, id: track.id })}
</svg>
`;
}

// ── encerramento ──────────────────────────────────────────────────────────

function outro() {
  const H = 230;
  const style = `
  .end { font-size: 30px; letter-spacing: 5px; fill: url(#brassv); }
  .quote { font-size: 14px; fill: ${C.muted}; font-family: ${SANS}; }
  .meta { font-size: 11px; letter-spacing: 3.2px; fill: ${C.muted}; font-family: ${SANS}; }`;

  return `${open(
    W,
    H,
    'Fim do lado B',
    'Encerramento: o disco chega ao fim do lado B, a agulha se levanta e a xícara esfria.',
    style,
    `${rugPattern()}${vinylDefs('outro')}`,
  )}
${frame(W, H)}

${vinyl(170, 115, 72, { spin: 0, label: C.wine, grooves: 7, id: 'outro' })}
${tonearm(248, 60, 72, 34)}
${cup(1040, 140, 52)}

<text class="end" x="600" y="98" text-anchor="middle">FIM DO LADO B</text>
${rule(600, 116, 420)}
<text class="quote" x="600" y="146" text-anchor="middle">“O bom software, como o bom disco, se reconhece no silêncio entre as faixas.”</text>
<text class="meta" x="600" y="178" text-anchor="middle">OBRIGADA POR OUVIR ATÉ O FIM</text>
${waveform(390, 204, 420, 26, 40, 97, C.terracotta, '.3')}
</svg>
`;
}

// ── execução ──────────────────────────────────────────────────────────────

async function main() {
  const dir = process.argv[2] || 'assets';
  await mkdir(dir, { recursive: true });

  const files = [
    ['cover.svg', cover()],
    ['groove.svg', groove()],
    ['outro.svg', outro()],
    ...TRACKS.map((track) => [`track-${track.id}.svg`, trackHeader(track)]),
  ];

  for (const [name, svg] of files) {
    await writeFile(join(dir, name), svg, 'utf8');
    console.log(`[ok] ${join(dir, name)} (${svg.length} bytes)`);
  }
}

main().catch((error) => {
  console.error(`[erro] ${error.message}`);
  process.exit(1);
});
