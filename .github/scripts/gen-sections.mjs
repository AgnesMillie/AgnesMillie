#!/usr/bin/env node
// Gera as peças de conteúdo do README em assets/: etiquetas da tracklist,
// selos, botões, o quadro de especialidades e a ficha técnica do stack.
//
//   node .github/scripts/gen-sections.mjs [diretório]   (padrão: assets)
//
// Estas peças substituem shields.io e skillicons.dev: fora de qualquer
// paleta nossa, e mais uma dependência externa para o README quebrar.

import { writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { C, esc, fit, frame, MIN_READABLE, open, pillRow, rule, SANS, textWidth } from './lib/theme.mjs';
import { note, rugPattern, vinyl, vinylDefs, waveform } from './lib/motifs.mjs';

const W = 1200;

// ── etiquetas da tracklist ────────────────────────────────────────────────
// Uma por faixa, para cada uma poder virar um link no README.

const TRACKS = [
  { id: 'a1', tag: 'A1', title: 'Quem está tocando', sub: 'Sobre mim', seed: 11 },
  { id: 'a2', tag: 'A2', title: 'O repertório', sub: 'Especialidades', seed: 23 },
  { id: 'a3', tag: 'A3', title: 'Os instrumentos', sub: 'Stack tecnológico', seed: 37 },
  { id: 'b1', tag: 'B1', title: 'As gravações', sub: 'Projetos em destaque', seed: 53 },
  { id: 'b2', tag: 'B2', title: 'Rotação', sub: 'Métricas e contribuições', seed: 71 },
  { id: 'b3', tag: 'B3', title: 'Faixas bônus', sub: 'Conquistas', seed: 89 },
];

function trackItem(track) {
  const w = 560;
  const h = 92;
  return `${open(
    w,
    h,
    `${track.tag} — ${track.title}`,
    `Etiqueta da faixa ${track.tag}: ${track.title}. Leva à seção de ${track.sub.toLowerCase()}.`,
    '',
    `${rugPattern()}${vinylDefs(`ti-${track.id}`)}`,
  )}
<rect width="${w}" height="${h}" rx="12" fill="url(#lamp)"/>
<rect width="${w}" height="${h}" rx="12" fill="url(#rug)"/>
<rect x="3" y="3" width="${w - 6}" height="${h - 6}" rx="10" fill="none" stroke="${C.brass}" stroke-opacity=".3" stroke-width="1.1"/>

${vinyl(42, 46, 22, { spin: 12, label: C.wine, grooves: 5, id: `ti-${track.id}` })}
<text x="80" y="51" font-size="15" fill="${C.brass}" letter-spacing="1.4" font-family="${SANS}">${track.tag}</text>

<text x="116" y="44" font-size="21" fill="${C.cream}">${esc(track.title)}</text>
<text x="117" y="68" font-size="${MIN_READABLE}" fill="${C.muted}" letter-spacing="1.6" font-family="${SANS}">${esc(track.sub.toUpperCase())}</text>
${waveform(w - 150, 46, 118, 26, 16, track.seed, C.terracotta, '.4')}
</svg>
`;
}

// ── selos do bloco "quem está tocando" ────────────────────────────────────

function tags() {
  const items = ['Brasil', 'Aberta a novos projetos', 'PT · EN · ES'];
  const h = 50;
  const row = pillRow(0, 9, items, { size: MIN_READABLE, height: 32, gap: 10, fg: C.cream, bg: C.panel, border: C.brass });
  const width = Math.round(items.reduce((sum, t) => sum + textWidth(t, MIN_READABLE) + 26, 0) + 10 * (items.length - 1));

  return `${open(width, h, 'Brasil · Aberta a novos projetos · PT, EN e ES', 'Selos com localização, disponibilidade e idiomas.', '', '')}
${row.svg}
</svg>
`;
}

/** Botão desenhado; vira link ao ser embrulhado em <a> no README. */
function button(label, { accent = C.terracotta, id = 'btn' } = {}) {
  const size = MIN_READABLE;
  const w = Math.round(textWidth(label, size, { tracking: 1.6 }) + 96);
  const h = 48;
  return `${open(w, h, label, `Botão: ${label}.`, '', vinylDefs(id))}
<rect x="1" y="1" width="${w - 2}" height="${h - 2}" rx="10" fill="${C.panel}" stroke="${accent}" stroke-opacity=".6" stroke-width="1.3"/>
<rect x="5" y="5" width="${w - 10}" height="${h - 10}" rx="7" fill="none" stroke="${accent}" stroke-opacity=".2"/>
${vinyl(28, 22, 13, { spin: 10, label: accent, grooves: 3, id })}
<text x="${(w + 30) / 2}" y="${h / 2 + 5}" text-anchor="middle" font-size="${size}" fill="${C.cream}" letter-spacing="1.6" font-family="${SANS}">${esc(label.toUpperCase())}</text>
</svg>
`;
}

// ── quadro de especialidades ──────────────────────────────────────────────

const SKILLS = [
  {
    title: 'Desenvolvimento Full Stack',
    lines: ['Interfaces modernas e APIs robustas,', 'do frontend ao backend corporativo.'],
    stack: ['React', 'Next.js', 'Angular', 'Vue'],
    levels: [['React', 'Especialista'], ['Node.js', 'Especialista']],
  },
  {
    title: 'Arquitetura & DevOps',
    lines: ['Infraestrutura escalável, CI/CD', 'e orquestração de microsserviços.'],
    stack: ['Docker', 'Kubernetes', 'AWS', 'Terraform'],
    levels: [['AWS', 'Avançado'], ['Docker', 'Especialista']],
  },
  {
    title: 'IA & Automação',
    lines: ['Machine learning, NLP e automação', 'inteligente de processos empresariais.'],
    stack: ['Python', 'TensorFlow', 'PyTorch', 'OpenCV'],
    levels: [['Python', 'Especialista'], ['TensorFlow', 'Avançado']],
  },
  {
    title: 'Dados & Persistência',
    lines: ['Modelagem, performance e integridade', 'em bancos relacionais e NoSQL.'],
    stack: ['PostgreSQL', 'MongoDB', 'Redis', 'Elasticsearch'],
    levels: [['PostgreSQL', 'Especialista'], ['MongoDB', 'Avançado']],
  },
  {
    title: 'Integração de Sistemas',
    lines: ['REST, GraphQL, mensageria e', 'integrações corporativas complexas.'],
    stack: ['GraphQL', 'FastAPI', 'Spring', 'Kafka'],
    levels: [['APIs REST', 'Especialista'], ['GraphQL', 'Avançado']],
  },
  {
    title: 'UX/UI & Design Systems',
    lines: ['Experiências digitais elegantes,', 'acessíveis e orientadas ao usuário.'],
    stack: ['Figma', 'Tailwind', 'Sass', 'Material UI'],
    levels: [['Figma', 'Avançado'], ['Tailwind', 'Especialista']],
  },
];

/**
 * Fader de mesa de som. São dois níveis declarados no perfil, então são
 * duas posições — a barra não finge uma precisão que o dado não tem.
 */
function fader(x, y, width, label, level) {
  const filled = level === 'Especialista' ? width : width * 0.68;
  const knob = x + filled;
  return `
<text x="${x}" y="${y - 9}" font-size="${MIN_READABLE}" fill="${C.cream}" font-family="${SANS}">${esc(label)}</text>
<text x="${x + width}" y="${y - 9}" text-anchor="end" font-size="${MIN_READABLE}" fill="${C.muted}" letter-spacing="1" font-family="${SANS}">${esc(level.toUpperCase())}</text>
<rect x="${x}" y="${y}" width="${width}" height="4" rx="2" fill="${C.panelAlt}"/>
<rect x="${x}" y="${y}" width="${filled.toFixed(1)}" height="4" rx="2" fill="${C.terracotta}"/>
<circle cx="${knob.toFixed(1)}" cy="${y + 2}" r="5" fill="${C.brass}"/>
<circle cx="${knob.toFixed(1)}" cy="${y + 2}" r="2" fill="${C.ink}" fill-opacity=".45"/>`;
}

const CARD = { cols: 3, w: 368, gapX: 18, gapY: 18, top: 36, left: 36, pillsTop: 126 };

/** Altura que a tira de pílulas ocupa nesta ficha (pode quebrar em 2 linhas). */
function stackHeight(skill) {
  return pillRow(0, 0, skill.stack, { ...PILL_STYLE, maxWidth: CARD.w - 44 }).height;
}

const PILL_STYLE = {
  size: MIN_READABLE,
  height: 30,
  padding: 11,
  gap: 7,
  fg: C.muted,
  bg: C.bg,
  border: C.terracotta,
};

function skillCard(skill, index, cardH, faderTop) {
  const { cols, w: cardW, gapX, gapY, top, left, pillsTop } = CARD;
  const x = left + (index % cols) * (cardW + gapX);
  const y = top + Math.floor(index / cols) * (cardH + gapY);

  const stack = pillRow(x + 22, y + pillsTop, skill.stack, { ...PILL_STYLE, maxWidth: cardW - 44 });

  return `
<g>
  <rect x="${x}" y="${y}" width="${cardW}" height="${cardH}" rx="12" fill="${C.panel}" stroke="${C.brass}" stroke-opacity=".28" stroke-width="1.1"/>
  ${note(x + 32, y + 42, 22, C.terracotta, 'class="pulse"')}
  <text x="${x + 48}" y="${y + 42}" font-size="20" fill="${C.cream}">${esc(skill.title)}</text>
  <rect x="${x + 22}" y="${y + 54}" width="${cardW - 44}" height="1" fill="url(#rule)"/>
  <text x="${x + 22}" y="${y + 82}" font-size="${fit(skill.lines[0], 17, cardW - 44)}" fill="${C.muted}" font-family="${SANS}">${esc(skill.lines[0])}</text>
  <text x="${x + 22}" y="${y + 104}" font-size="${fit(skill.lines[1], 17, cardW - 44)}" fill="${C.muted}" font-family="${SANS}">${esc(skill.lines[1])}</text>
  ${stack.svg}
  ${fader(x + 22, y + faderTop, cardW - 44, skill.levels[0][0], skill.levels[0][1])}
  ${fader(x + 22, y + faderTop + 44, cardW - 44, skill.levels[1][0], skill.levels[1][1])}
</g>`;
}

function skills() {
  // Todas as fichas têm a altura da que precisa de mais espaço para as pílulas.
  const pills = Math.max(...SKILLS.map(stackHeight));
  const faderTop = CARD.pillsTop + pills + 44;
  const cardH = faderTop + 44 + 26;
  const H = CARD.top * 2 + 2 * cardH + CARD.gapY;
  const described = SKILLS.map((s) => `${s.title} (${s.stack.join(', ')})`).join('; ');
  return `${open(
    W,
    H,
    'Repertório: áreas de especialidade',
    `Seis fichas de especialidade, cada uma com as tecnologias e o nível declarado — ${described}.`,
    '',
    rugPattern(),
  )}
${frame(W, H)}
${SKILLS.map((skill, i) => skillCard(skill, i, cardH, faderTop)).join('\n')}
</svg>
`;
}

// ── ficha técnica do stack ────────────────────────────────────────────────

const STACK = [
  { group: 'Linguagens', items: ['Python', 'Java', 'TypeScript', 'JavaScript', 'Go', 'C#', 'PHP', 'Kotlin'] },
  {
    group: 'Frameworks e bibliotecas',
    items: ['React', 'Next.js', 'Angular', 'Vue', 'Node.js', 'FastAPI', 'Spring', 'Flutter', 'Laravel', 'Express', 'NestJS', 'Django', 'GraphQL', 'Redux', 'Prisma', 'Jest'],
  },
  { group: 'Dados e storage', items: ['PostgreSQL', 'MongoDB', 'MySQL', 'Redis', 'SQLite', 'Elasticsearch', 'Supabase', 'Firebase'] },
  { group: 'Nuvem e infraestrutura', items: ['AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes', 'Terraform', 'Nginx', 'Linux'] },
  { group: 'Ferramentas', items: ['Git', 'GitHub', 'GitLab', 'Jira', 'Figma', 'VS Code', 'Postman', 'Grafana'] },
];

function stack() {
  const left = 60;
  const maxWidth = W - left * 2;
  let y = 58;
  const blocks = [];

  STACK.forEach((group, i) => {
    const row = pillRow(left, y + 28, group.items, {
      size: MIN_READABLE,
      height: 32,
      padding: 13,
      gap: 8,
      lineGap: 9,
      maxWidth,
      fg: C.cream,
      bg: C.panel,
      border: C.terracotta,
    });
    blocks.push(`
<g>
  ${note(left + 8, y + 10, 20, C.brass, `class="pulse" style="animation-delay:${(i * 0.4).toFixed(1)}s"`)}
  <text x="${left + 26}" y="${y + 5}" font-size="${MIN_READABLE}" fill="${C.brass}" letter-spacing="2" font-family="${SANS}">${esc(group.group.toUpperCase())}</text>
  <rect x="${left}" y="${y + 13}" width="${maxWidth}" height="1" fill="url(#rule)"/>
  ${row.svg}
</g>`);
    y += 28 + row.height + 36;
  });

  const H = y + 10;
  return `${open(
    W,
    H,
    'Instrumentos: stack tecnológico',
    `Ficha técnica do stack por grupo — ${STACK.map((g) => `${g.group}: ${g.items.join(', ')}`).join('; ')}.`,
    '',
    rugPattern(),
  )}
${frame(W, H)}
${blocks.join('\n')}
${rule(W / 2, H - 26, 420)}
</svg>
`;
}

// ── execução ──────────────────────────────────────────────────────────────

async function main() {
  const dir = process.argv[2] || 'assets';
  await mkdir(dir, { recursive: true });

  const files = [
    ...TRACKS.map((track) => [`item-${track.id}.svg`, trackItem(track)]),
    ['tags.svg', tags()],
    ['btn-portfolio.svg', button('Ouvir o disco inteiro', { accent: C.terracotta, id: 'btn-pf' })],
    ['btn-repos.svg', button('Catálogo completo', { accent: C.brass, id: 'btn-rp' })],
    ['skills.svg', skills()],
    ['stack.svg', stack()],
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
