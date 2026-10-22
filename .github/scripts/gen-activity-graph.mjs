#!/usr/bin/env node
// Gera profile/activity-graph.svg — as contribuições do último ano desenhadas
// como a forma de onda de uma faixa, a partir da API do GitHub (sem serviço
// de terceiros).
//
//   node .github/scripts/gen-activity-graph.mjs <login> [saída]
//   node .github/scripts/gen-activity-graph.mjs <login> [saída] --placeholder
//   node .github/scripts/gen-activity-graph.mjs <login> [saída] --fixture <json>
//
// --placeholder desenha a peça sem dados, para o README nunca ficar com uma
// imagem quebrada antes da primeira coleta. --fixture renderiza a partir de um
// JSON { "days": [{ "date": "2026-01-31", "count": 3 }] }, sem tocar na rede.

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { parseArgs } from './lib/args.mjs';
import { contributionCalendar } from './lib/github.mjs';
import { C, esc, frame, num, open, rule, SANS } from './lib/theme.mjs';
import { note, rugPattern, vinyl, vinylDefs } from './lib/motifs.mjs';

const W = 1200;
const H = 404;
const PLOT = { x0: 84, x1: 1128, yTop: 108, yBase: 290 };
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

/** Teto do eixo divisível por 4, para os rótulos da grade saírem redondos. */
function niceCeil(value) {
  const quarter = Math.max(1, value / 4);
  const magnitude = 10 ** Math.floor(Math.log10(quarter));
  const step = [1, 2, 2.5, 5, 10].map((s) => s * magnitude).find((s) => s >= quarter) ?? 10 * magnitude;
  return Math.round(step * 4);
}

/**
 * Barras simétricas em torno do eixo, como a onda de uma faixa de áudio:
 * cada semana é uma barra, a altura é o total de contribuições.
 */
function bars(weeks, x, y, max, axis, height) {
  const gap = (PLOT.x1 - PLOT.x0) / weeks.length;
  const width = Math.max(3, gap * 0.56);
  return weeks
    .map((week, i) => {
      const h = Math.max(2.5, (week.total / max) * height);
      const bx = x(i) - width / 2;
      const top = axis - h / 2;
      const tone = week.total === 0 ? C.panelAlt : C.terracotta;
      const opacity = week.total === 0 ? '.75' : (0.45 + 0.5 * (week.total / max)).toFixed(2);
      return `<rect x="${bx.toFixed(1)}" y="${top.toFixed(1)}" width="${width.toFixed(1)}" height="${h.toFixed(1)}" rx="${(width / 2).toFixed(1)}" fill="${tone}" fill-opacity="${opacity}"/>`;
    })
    .join('');
}

function statBlock(x, label, value) {
  return `
<g>
  ${note(x - 52, 362, 20, C.terracotta, 'opacity=".55"')}
  <text x="${x}" y="360" text-anchor="middle" font-size="25" fill="url(#brassv)" letter-spacing=".5">${esc(value)}</text>
  <text x="${x}" y="380" text-anchor="middle" font-size="11" fill="${C.muted}" letter-spacing="2.2" font-family="${SANS}">${esc(label.toUpperCase())}</text>
</g>`;
}

const STYLE = `
  .axis { font-size: 11px; fill: ${C.muted}; letter-spacing: 1.4px; font-family: ${SANS}; }
  .grid { stroke: ${C.panelAlt}; stroke-width: 1; stroke-dasharray: 2 7; }
  .peak { animation: beat 3s ease-in-out infinite; }
  @keyframes beat { 0%, 100% { r: 4; opacity: .95; } 50% { r: 6.5; opacity: .5; } }
  .halo { animation: halo 3s ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
  @keyframes halo { 0% { transform: scale(.4); opacity: .8; } 75%, 100% { transform: scale(2.4); opacity: 0; } }`;

function render({ weeks, totals, period, note: hint }) {
  const { x0, x1, yTop, yBase } = PLOT;
  const axis = (yTop + yBase) / 2;
  const height = yBase - yTop;
  const span = Math.max(1, weeks.length - 1);
  const x = (i) => x0 + (i * (x1 - x0)) / span;
  const max = niceCeil(Math.max(1, ...weeks.map((w) => w.total)));

  const ticks = [];
  let previousMonth = null;
  weeks.forEach((week, i) => {
    const month = Number(week.start.slice(5, 7)) - 1;
    if (month !== previousMonth) {
      ticks.push({ x: x(i), label: MONTHS[month] });
      previousMonth = month;
    }
  });
  const monthLabels = ticks
    .filter((tick, i) => i === 0 || tick.x - ticks[i - 1].x > 48)
    .map((tick) => `<text class="axis" x="${tick.x.toFixed(1)}" y="${yBase + 24}" text-anchor="middle">${tick.label}</text>`)
    .join('\n');

  const peakIndex = weeks.reduce((best, w, i) => (w.total > weeks[best].total ? i : best), 0);
  const peakX = x(peakIndex);
  const peakY = axis - Math.max(2.5, (weeks[peakIndex].total / max) * height) / 2 - 10;

  return `${open(
    W,
    H,
    'Rotação: contribuições do último ano',
    `As contribuições por semana nos últimos doze meses (${period}) desenhadas como a forma de onda de uma faixa. Total de ${num(totals.total)} contribuições, melhor dia com ${num(totals.bestDay)} e média de ${totals.weeklyAverage} por semana.`,
    STYLE,
    `${rugPattern()}${vinylDefs('rot')}`,
  )}
${frame(W, H)}

<text x="${W / 2}" y="54" text-anchor="middle" font-size="26" fill="url(#brassv)" letter-spacing="3">Rotação</text>
${rule(W / 2, 64, 300)}
<text x="${W / 2}" y="86" text-anchor="middle" font-size="11.5" fill="${C.muted}" letter-spacing="3" font-family="${SANS}">${esc(period.toUpperCase())}</text>
${vinyl(70, 56, 24, { spin: 9, label: C.wine, grooves: 4, id: 'rot' })}

<line class="grid" x1="${x0}" y1="${axis}" x2="${x1}" y2="${axis}"/>
<text class="axis" x="${x0 - 14}" y="${axis + 4}" text-anchor="end">0</text>
<text class="axis" x="${x0 - 14}" y="${yTop + 10}" text-anchor="end">${num(max)}</text>

${bars(weeks, x, yTop, max, axis, height)}
${monthLabels}

<g>
  <circle cx="${peakX.toFixed(1)}" cy="${peakY.toFixed(1)}" r="4" fill="none" stroke="${C.brassSoft}" stroke-width="1.3" class="halo motion"/>
  <circle cx="${peakX.toFixed(1)}" cy="${peakY.toFixed(1)}" r="4" fill="${C.brassSoft}" class="peak"/>
</g>

${rule(W / 2, 324, 980)}
${statBlock(300, 'No ano', num(totals.total))}
${statBlock(600, 'Melhor dia', num(totals.bestDay))}
${statBlock(900, 'Média semanal', totals.weeklyAverage)}
${hint ? `<text x="${W / 2}" y="${axis + 6}" text-anchor="middle" font-size="15" fill="${C.muted}" font-family="${SANS}">${esc(hint)}</text>` : ''}
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
  const { login, out, placeholder: usePlaceholder, fixture } = parseArgs(process.argv.slice(2), 'profile/activity-graph.svg');

  let svg;
  if (usePlaceholder) {
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
