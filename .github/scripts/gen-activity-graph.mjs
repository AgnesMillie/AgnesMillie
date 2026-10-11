#!/usr/bin/env node
// Gera profile/activity-graph.svg — o histórico de contribuições do último ano,
// desenhado aqui mesmo a partir da API do GitHub (sem serviço de terceiros).
//
//   node .github/scripts/gen-activity-graph.mjs <login> [saída]
//   node .github/scripts/gen-activity-graph.mjs <login> [saída] --placeholder
//   node .github/scripts/gen-activity-graph.mjs <login> [saída] --fixture <json>
//
// --placeholder desenha a moldura sem dados, para o README nunca ficar com uma
// imagem quebrada antes da primeira coleta. --fixture renderiza a partir de um
// JSON { "days": [{ "date": "2026-01-31", "count": 3 }] }, sem tocar na rede.

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { contributionCalendar } from './lib/github.mjs';
import { C, esc, num, open, rule, suit } from './lib/theme.mjs';

const W = 1200;
const H = 404;
const PLOT = { x0: 84, x1: 1128, yTop: 104, yBase: 290 };
const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

function weeksFrom(days) {
  const sorted = [...days].sort((a, b) => a.date.localeCompare(b.date));
  const weeks = [];
  // Agrupa de trás para frente: a última semana é sempre a atual. A sobra do
  // começo fica de fora — uma semana pela metade afundaria a curva no início.
  for (let end = sorted.length; end >= 7; end -= 7) {
    const slice = sorted.slice(end - 7, end);
    weeks.unshift({
      start: slice[0].date,
      total: slice.reduce((sum, d) => sum + d.count, 0),
    });
  }
  return weeks;
}

/** Teto do eixo Y divisível por 4, para os rótulos da grade saírem redondos. */
function niceCeil(value) {
  const quarter = Math.max(1, value / 4);
  const magnitude = 10 ** Math.floor(Math.log10(quarter));
  const step = [1, 2, 2.5, 5, 10].map((s) => s * magnitude).find((s) => s >= quarter) ?? 10 * magnitude;
  return Math.round(step * 4);
}

/** Catmull-Rom convertido em curvas de Bézier cúbicas. */
function smoothPath(points) {
  if (points.length < 2) return points.length ? `M${points[0].x} ${points[0].y}` : '';
  const at = (i) => points[Math.min(points.length - 1, Math.max(0, i))];
  let d = `M${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = at(i - 1);
    const p1 = at(i);
    const p2 = at(i + 1);
    const p3 = at(i + 2);
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C${c1x.toFixed(1)} ${c1y.toFixed(1)} ${c2x.toFixed(1)} ${c2y.toFixed(1)} ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return d;
}

function monthTicks(weeks, x) {
  const ticks = [];
  let previous = null;
  weeks.forEach((week, i) => {
    const month = Number(week.start.slice(5, 7)) - 1;
    if (month !== previous) {
      ticks.push({ x: x(i), label: MONTHS[month] });
      previous = month;
    }
  });
  // Evita rótulos colados quando a primeira semana cai no fim de um mês.
  return ticks.filter((tick, i) => i === 0 || tick.x - ticks[i - 1].x > 48);
}

function statBlock(x, label, value, suitName) {
  const color = suitName === 'heart' || suitName === 'diamond' ? C.redDeep : C.gold;
  return `
<g>
  ${suit(suitName, x, 332, 11, color, 'class="pip"')}
  <text x="${x}" y="360" text-anchor="middle" font-size="24" fill="${C.goldLight}" letter-spacing=".5">${esc(value)}</text>
  <text x="${x}" y="379" text-anchor="middle" font-size="11" fill="${C.purpleSoft}" letter-spacing="1.6">${esc(label.toUpperCase())}</text>
</g>`;
}

const STYLE = `
  .curve { fill: none; stroke: ${C.red}; stroke-width: 2.6; stroke-linecap: round; stroke-linejoin: round; filter: url(#glow); }
  .trace { fill: none; stroke: ${C.goldLight}; stroke-width: 3.2; stroke-linecap: round; filter: url(#glow);
    stroke-dasharray: .06 .94; animation: trace 7s linear infinite; }
  @keyframes trace { from { stroke-dashoffset: 1; } to { stroke-dashoffset: 0; } }
  .grid { stroke: ${C.panelAlt}; stroke-width: 1; stroke-dasharray: 3 6; }
  .axis { font-size: 11px; fill: ${C.purpleSoft}; letter-spacing: 1.2px; }
  .peak { animation: beat 2.6s ease-in-out infinite; }
  @keyframes beat { 0%, 100% { r: 4.2; opacity: .95; } 50% { r: 6.6; opacity: .5; } }
  .halo { animation: halo 2.8s ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
  @keyframes halo { 0% { transform: scale(.4); opacity: .85; } 75%, 100% { transform: scale(2.4); opacity: 0; } }`;

function render({ weeks, totals, period, note }) {
  const { x0, x1, yTop, yBase } = PLOT;
  const span = Math.max(1, weeks.length - 1);
  const x = (i) => x0 + (i * (x1 - x0)) / span;
  const max = niceCeil(Math.max(1, ...weeks.map((w) => w.total)));
  const y = (value) => yBase - (value / max) * (yBase - yTop);

  const points = weeks.map((week, i) => ({ x: x(i), y: y(week.total), total: week.total }));
  const line = smoothPath(points);
  const area = `${line} L${x1.toFixed(1)} ${yBase} L${x0.toFixed(1)} ${yBase} Z`;

  const gridLines = [0, 0.25, 0.5, 0.75, 1]
    .map((f) => {
      const value = Math.round(max * f);
      const gy = y(value);
      return `<line class="grid" x1="${x0}" y1="${gy.toFixed(1)}" x2="${x1}" y2="${gy.toFixed(1)}"/>
<text class="axis" x="${x0 - 12}" y="${(gy + 4).toFixed(1)}" text-anchor="end">${num(value)}</text>`;
    })
    .join('\n');

  const ticks = monthTicks(weeks, x)
    .map((tick) => `<text class="axis" x="${tick.x.toFixed(1)}" y="${yBase + 20}" text-anchor="middle">${tick.label}</text>`)
    .join('\n');

  const peakIndex = points.reduce((best, p, i) => (p.total > points[best].total ? i : best), 0);
  const peak = points[peakIndex];
  const last = points[points.length - 1];

  return `${open(
    W,
    H,
    'Histórico de contribuições de Agnes Millie',
    `Gráfico de linha com as contribuições por semana nos últimos doze meses (${period}). Total de ${num(totals.total)} contribuições, melhor dia com ${num(totals.bestDay)} e média de ${totals.weeklyAverage} por semana.`,
    STYLE,
  )}
<defs>
  <linearGradient id="area" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="${C.purple}" stop-opacity=".7"/>
    <stop offset=".5" stop-color="${C.purple}" stop-opacity=".28"/>
    <stop offset="1" stop-color="${C.purple}" stop-opacity=".04"/>
  </linearGradient>
  <linearGradient id="shimmer" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="${C.goldLight}" stop-opacity="0"/>
    <stop offset=".5" stop-color="${C.goldLight}" stop-opacity=".18"/>
    <stop offset="1" stop-color="${C.goldLight}" stop-opacity="0"/>
  </linearGradient>
  <clipPath id="under"><path d="${area}"/></clipPath>
</defs>

<text x="${W / 2}" y="52" text-anchor="middle" font-size="25" fill="url(#goldv)" letter-spacing="2.2">Histórico de Contribuições</text>
${rule(W / 2, 62, 360)}
<text x="${W / 2}" y="82" text-anchor="middle" font-size="12" fill="${C.purpleSoft}" letter-spacing="2.4">${esc(period.toUpperCase())}</text>
${suit('heart', W / 2 - 196, 60, 11, C.redDeep, 'class="pip"')}
${suit('spade', W / 2 + 196, 60, 11, C.gold, 'class="pip" style="animation-delay:.8s"')}

${gridLines}
${ticks}

<path d="${area}" fill="url(#area)"/>
<g clip-path="url(#under)">
  <!-- luz que atravessa o preenchimento, só enfeite: o gráfico já está desenhado -->
  <rect class="motion" x="${x0 - 300}" y="${yTop - 14}" width="300" height="${yBase - yTop + 14}" fill="url(#shimmer)">
    <animateTransform attributeName="transform" type="translate" values="0 0;${x1 - x0 + 600} 0;${x1 - x0 + 600} 0"
      keyTimes="0;0.45;1" dur="9s" begin="1.5s" repeatCount="indefinite"/>
  </rect>
</g>
<path id="curve" class="curve" pathLength="1" d="${line}"/>
<path class="trace motion" pathLength="1" d="${line}"/>
<circle class="motion" r="11" fill="url(#spark)">
  <animateMotion dur="7s" begin="0s" repeatCount="indefinite" rotate="auto"><mpath xlink:href="#curve"/></animateMotion>
</circle>

<g>
  <circle cx="${peak.x.toFixed(1)}" cy="${peak.y.toFixed(1)}" r="4.2" fill="none" stroke="${C.goldLight}" stroke-width="1.4" class="halo motion"/>
  <circle cx="${peak.x.toFixed(1)}" cy="${peak.y.toFixed(1)}" r="4.2" fill="${C.goldLight}" class="peak"/>
  <circle cx="${last.x.toFixed(1)}" cy="${last.y.toFixed(1)}" r="3.4" fill="${C.red}" stroke="${C.goldLight}" stroke-width="1.2"/>
</g>

${rule(W / 2, 324, 980)}
${statBlock(300, 'Total no ano', num(totals.total), 'spade')}
${statBlock(600, 'Melhor dia', num(totals.bestDay), 'heart')}
${statBlock(900, 'Média semanal', totals.weeklyAverage, 'diamond')}
${note ? `<text x="${W / 2}" y="${yTop + 60}" text-anchor="middle" font-size="15" fill="${C.purpleSoft}">${esc(note)}</text>` : ''}
</svg>
`;
}

function placeholder() {
  const weeks = Array.from({ length: 52 }, (_, i) => {
    const date = new Date(Date.now() - (51 - i) * 7 * 24 * 60 * 60 * 1000);
    return { start: date.toISOString().slice(0, 10), total: 0 };
  });
  return render({
    weeks,
    totals: { total: null, bestDay: null, weeklyAverage: '—' },
    period: 'últimos 12 meses',
    note: 'Aguardando a primeira coleta de dados do GitHub.',
  });
}

function periodLabel(firstDate, lastDate) {
  const label = (iso) => {
    const [year, month] = iso.split('-');
    return `${MONTHS[Number(month) - 1]}/${year}`;
  };
  return `${label(firstDate)} — ${label(lastDate)}`;
}

async function main() {
  const argv = process.argv.slice(2);
  const fixtureAt = argv.indexOf('--fixture');
  const fixture = fixtureAt === -1 ? null : argv[fixtureAt + 1];
  const args = argv.filter((a, i) => a !== '--placeholder' && a !== '--fixture' && i !== fixtureAt + 1);
  const login = args[0];
  const out = args[1] || 'profile/activity-graph.svg';
  if (!login) throw new Error('uso: gen-activity-graph.mjs <login> [saída] [--placeholder] [--fixture <json>]');

  let svg;
  if (argv.includes('--placeholder')) {
    svg = placeholder();
  } else {
    const { days, source } = fixture
      ? { days: JSON.parse(await readFile(fixture, 'utf8')).days, source: `fixture ${fixture}` }
      : await contributionCalendar(login);
    const sorted = [...days].sort((a, b) => a.date.localeCompare(b.date));
    const weeks = weeksFrom(sorted);
    if (!weeks.length) throw new Error('calendário com menos de uma semana de dados');
    // Os números do rodapé cobrem exatamente o intervalo desenhado.
    const covered = sorted.slice(sorted.length - weeks.length * 7);
    const total = covered.reduce((sum, d) => sum + d.count, 0);
    svg = render({
      weeks,
      totals: {
        total,
        bestDay: Math.max(...covered.map((d) => d.count)),
        weeklyAverage: (total / weeks.length).toFixed(1).replace('.', ','),
      },
      period: periodLabel(covered[0].date, covered[covered.length - 1].date),
    });
    console.log(`[ok] calendário via ${source}: ${covered.length} dias, ${total} contribuições`);
  }

  await mkdir(dirname(out), { recursive: true });
  await writeFile(out, svg, 'utf8');
  console.log(`[ok] ${out} (${svg.length} bytes)`);
}

main().catch((error) => {
  console.error(`[erro] ${error.message}`);
  process.exit(1);
});
