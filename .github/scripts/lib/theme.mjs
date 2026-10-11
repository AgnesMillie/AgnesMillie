// Paleta e peças de desenho compartilhadas pelos cartões gerados em profile/.
// As cores são as mesmas das ilustrações em assets/ (livro vitoriano / baralho).

import { suit, suitDefs } from './suits.mjs';

export const C = {
  bg: '#1A1726',
  bgDeep: '#13101F',
  panel: '#221B33',
  panelAlt: '#2A2140',
  gold: '#D4AF37',
  goldLight: '#F6DC8A',
  goldDark: '#8C6A12',
  red: '#C0344D',
  redDeep: '#B3263E',
  purple: '#7B5EA7',
  purpleSoft: '#A99CC4',
  cream: '#F1E6CC',
};

export const SERIF = "Georgia, 'Iowan Old Style', 'Palatino Linotype', 'Times New Roman', serif";

const XML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' };

export function esc(value) {
  return String(value).replace(/[&<>"']/g, (ch) => XML_ESCAPES[ch]);
}

const numberFormat = new Intl.NumberFormat('pt-BR');

/** Número no formato pt-BR; `null`/`undefined` viram um travessão. */
export function num(value) {
  return value === null || value === undefined ? '—' : numberFormat.format(value);
}

/** Abrevia valores altos (12,3 mil; 3,4 mi) para caber nos cartões. */
export function shortNum(value) {
  if (value === null || value === undefined) return '—';
  if (value >= 1_000_000) return `${numberFormat.format(Math.round(value / 100_000) / 10)} mi`;
  if (value >= 10_000) return `${numberFormat.format(Math.round(value / 100) / 10)} mil`;
  return numberFormat.format(value);
}

export { suit, suitDefs };

/** Gradientes, filtros e símbolos usados por todos os cartões. */
export function commonDefs() {
  return `
<linearGradient id="goldv" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0" stop-color="${C.goldLight}"/><stop offset=".5" stop-color="${C.gold}"/><stop offset="1" stop-color="${C.goldDark}"/>
</linearGradient>
<linearGradient id="rule" x1="0" y1="0" x2="1" y2="0">
  <stop offset="0" stop-color="${C.gold}" stop-opacity="0"/>
  <stop offset=".5" stop-color="${C.gold}" stop-opacity=".9"/>
  <stop offset="1" stop-color="${C.gold}" stop-opacity="0"/>
</linearGradient>
<linearGradient id="sheen" x1="0" y1="0" x2="1" y2="0">
  <stop offset="0" stop-color="${C.goldLight}" stop-opacity="0"/>
  <stop offset=".5" stop-color="${C.goldLight}" stop-opacity=".30"/>
  <stop offset="1" stop-color="${C.goldLight}" stop-opacity="0"/>
</linearGradient>
<radialGradient id="vignette" cx="50%" cy="38%" r="78%">
  <stop offset="0" stop-color="${C.panelAlt}"/><stop offset=".62" stop-color="${C.bg}"/><stop offset="1" stop-color="${C.bgDeep}"/>
</radialGradient>
<radialGradient id="spark">
  <stop offset="0" stop-color="${C.goldLight}" stop-opacity=".95"/>
  <stop offset=".45" stop-color="${C.gold}" stop-opacity=".45"/>
  <stop offset="1" stop-color="${C.gold}" stop-opacity="0"/>
</radialGradient>
<filter id="glow" x="-60%" y="-60%" width="220%" height="220%">
  <feGaussianBlur stdDeviation="3" result="b"/>
  <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
</filter>
${suitDefs()}`;
}

/**
 * Moldura do cartão: fundo, filete duplo dourado e os quatro naipes nos cantos.
 * `w`/`h` são as dimensões totais do SVG.
 */
export function frame(w, h) {
  const corners = [
    ['spade', 24, 30],
    ['heart', w - 24, 30],
    ['club', 24, h - 16],
    ['diamond', w - 24, h - 16],
  ];
  return `
<rect width="${w}" height="${h}" rx="14" fill="url(#vignette)"/>
<rect x="3.5" y="3.5" width="${w - 7}" height="${h - 7}" rx="12" fill="none" stroke="${C.goldDark}" stroke-width="1.6"/>
<rect x="9.5" y="9.5" width="${w - 19}" height="${h - 19}" rx="8" fill="none" stroke="${C.gold}" stroke-width=".7" stroke-opacity=".45"/>
${corners
  .map(([name, x, y], i) => suit(name, x, y, 13, i % 2 === 0 ? C.gold : C.redDeep, `opacity=".75" class="pip" style="animation-delay:${(i * 0.45).toFixed(2)}s"`))
  .join('\n')}`;
}

/** Filete ornamental horizontal centrado em (cx, y). */
export function rule(cx, y, width) {
  return `<rect x="${cx - width / 2}" y="${y}" width="${width}" height="1.2" fill="url(#rule)"/>`;
}

/**
 * Animações compartilhadas. Em README o SVG é servido como imagem: só CSS/SMIL.
 *
 * Regra destes cartões: nenhum dado depende de animação para ser visto. O que
 * se move é enfeite (brilho, faísca, naipes). Há leitores que exibem o SVG
 * parado — e um cartão que só aparece animado é um cartão quebrado para eles.
 */
export function commonStyle() {
  return `
  text { font-family: ${SERIF}; }
  .pip { animation: pip 4.2s ease-in-out infinite; }
  @keyframes pip { 0%, 100% { opacity: .4; } 50% { opacity: 1; } }
  /* Quem pediu menos movimento perde só os laços decorativos, nunca o conteúdo. */
  @media (prefers-reduced-motion: reduce) {
    .pip { animation: none; }
    .motion { display: none; }
  }`;
}

/** Abre o documento SVG com título e descrição acessíveis. */
export function open(w, h, title, desc, style) {
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-labelledby="t d">
<title id="t">${esc(title)}</title>
<desc id="d">${esc(desc)}</desc>
<defs>${commonDefs()}</defs>
<style>${commonStyle()}${style || ''}</style>
${frame(w, h)}`;
}
