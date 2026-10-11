// node --test .github/scripts/lib
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseContributionsHtml } from './github.mjs';

/** Trecho no formato da página pública de contribuições do GitHub. */
function page(cells) {
  const tds = cells
    .map(
      (c, i) =>
        `<td style="width: 11px" data-date="${c.date}" id="cell-${i}" data-level="${c.level}" role="gridcell" data-ix="${i}" tabindex="-1"></td>`,
    )
    .join('');
  const tips = cells
    .map((c, i) => (c.tip === null ? '' : `<tool-tip class="sr-only" for="cell-${i}" popover="manual">${c.tip}</tool-tip>`))
    .join('');
  return `<table class="ContributionCalendar-grid"><tbody><tr>${tds}</tr></tbody></table>${tips}`;
}

test('lê data e contagem de cada dia', () => {
  const days = parseContributionsHtml(
    page([
      { date: '2026-01-01', level: 0, tip: 'No contributions on January 1st.' },
      { date: '2026-01-02', level: 2, tip: '4 contributions on January 2nd.' },
      { date: '2026-01-03', level: 4, tip: '17 contributions on January 3rd.' },
    ]),
  );

  assert.deepEqual(
    days.map((d) => [d.date, d.count]),
    [
      ['2026-01-01', 0],
      ['2026-01-02', 4],
      ['2026-01-03', 17],
    ],
  );
  assert.ok(days.every((d) => d.estimated === false));
});

test('tolera um dia sem tooltip', () => {
  const cells = Array.from({ length: 20 }, (_, i) => ({
    date: `2026-02-${String(i + 1).padStart(2, '0')}`,
    level: 1,
    tip: '2 contributions.',
  }));
  cells[7].tip = null;

  const days = parseContributionsHtml(page(cells));
  assert.equal(days.length, 20);
  assert.equal(days.filter((d) => d.estimated).length, 1);
});

test('recusa a página quando as contagens somem', () => {
  const cells = Array.from({ length: 10 }, (_, i) => ({
    date: `2026-03-${String(i + 1).padStart(2, '0')}`,
    level: 1,
    tip: null,
  }));

  assert.throws(() => parseContributionsHtml(page(cells)), /sem contagens/);
});

test('recusa uma página sem calendário', () => {
  assert.throws(() => parseContributionsHtml('<html><body>404</body></html>'), /não foi possível ler/);
});
