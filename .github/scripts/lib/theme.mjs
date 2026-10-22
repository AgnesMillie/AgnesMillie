// Paleta e peças de desenho compartilhadas pelas artes do perfil.
//
// A referência é a ilustração do avatar: tapete vermelho, toca-discos, café
// quente, luz baixa. Tons quentes e dessaturados — nada de cor saturada.

export const C = {
  ink: '#1B1214', // fundo mais profundo, quase preto quente
  bg: '#241A1B', // fundo das peças
  panel: '#2E2122', // cartões sobre o fundo
  panelAlt: '#3A2A2A', // linhas de grade, separações
  wine: '#7E3B3B', // bordô do tapete
  clay: '#A8503F', // argila
  terracotta: '#C27049', // terracota: acento principal
  brass: '#D9A864', // latão envelhecido: títulos e números
  brassSoft: '#E8C999', // latão claro, para brilhos
  blush: '#C98F86', // rosa-poeira
  moss: '#6E8674', // verde-musgo: contraponto frio
  cream: '#EFE1CD', // papel: texto principal
  muted: '#B79E92', // texto secundário
};

export const SERIF = "Georgia, 'Iowan Old Style', 'Palatino Linotype', 'Times New Roman', serif";
export const SANS = "'Avenir Next', 'Segoe UI', Inter, system-ui, -apple-system, sans-serif";

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

/** Gradientes e filtros usados pelas peças. */
export function commonDefs() {
  return `
<linearGradient id="brassv" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0" stop-color="${C.brassSoft}"/><stop offset=".55" stop-color="${C.brass}"/><stop offset="1" stop-color="#A97F43"/>
</linearGradient>
<linearGradient id="rule" x1="0" y1="0" x2="1" y2="0">
  <stop offset="0" stop-color="${C.terracotta}" stop-opacity="0"/>
  <stop offset=".5" stop-color="${C.brass}" stop-opacity=".75"/>
  <stop offset="1" stop-color="${C.terracotta}" stop-opacity="0"/>
</linearGradient>
<linearGradient id="sheen" x1="0" y1="0" x2="1" y2="0">
  <stop offset="0" stop-color="${C.brassSoft}" stop-opacity="0"/>
  <stop offset=".5" stop-color="${C.brassSoft}" stop-opacity=".22"/>
  <stop offset="1" stop-color="${C.brassSoft}" stop-opacity="0"/>
</linearGradient>
<radialGradient id="lamp" cx="50%" cy="34%" r="80%">
  <stop offset="0" stop-color="#3C2A29"/><stop offset=".55" stop-color="${C.bg}"/><stop offset="1" stop-color="${C.ink}"/>
</radialGradient>
<radialGradient id="spark">
  <stop offset="0" stop-color="${C.brassSoft}" stop-opacity=".95"/>
  <stop offset=".45" stop-color="${C.brass}" stop-opacity=".4"/>
  <stop offset="1" stop-color="${C.brass}" stop-opacity="0"/>
</radialGradient>
<filter id="glow" x="-60%" y="-60%" width="220%" height="220%">
  <feGaussianBlur stdDeviation="3" result="b"/>
  <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
</filter>`;
}

/** Moldura: luz de abajur ao centro, filete de latão e cantos arredondados. */
export function frame(w, h, { rug = true } = {}) {
  return `
<rect width="${w}" height="${h}" rx="16" fill="url(#lamp)"/>
${rug ? `<rect width="${w}" height="${h}" rx="16" fill="url(#rug)"/>` : ''}
<rect x="4" y="4" width="${w - 8}" height="${h - 8}" rx="13" fill="none" stroke="${C.brass}" stroke-opacity=".38" stroke-width="1.4"/>
<rect x="10" y="10" width="${w - 20}" height="${h - 20}" rx="9" fill="none" stroke="${C.terracotta}" stroke-opacity=".18" stroke-width=".8"/>`;
}

/**
 * Piso de tipografia das peças, em unidades do SVG.
 *
 * O README exibe uma imagem de 1200 de largura em cerca de 870 px, ou seja,
 * a ~72% do tamanho nativo. Para o texto chegar ao leitor com 11 px — o
 * mínimo legível — ele precisa ser desenhado com 11 / 0,72 ≈ 15,2. Daí 16:
 * nenhum texto informativo das peças desce abaixo disso.
 */
export const MIN_READABLE = 16;

/**
 * Maior tamanho de fonte, até `max`, em que o texto ainda cabe em `width`.
 * Nunca desce de MIN_READABLE: se nem assim couber, quem cede é o layout.
 */
export function fit(text, max, width, floor = MIN_READABLE) {
  const estimated = textWidth(text, max);
  if (estimated <= width) return max;
  return Math.max(floor, Math.floor(((max * width) / estimated) * 10) / 10);
}

/**
 * Largura aproximada de um texto, para dimensionar pílulas e caixas.
 * É estimativa: o navegador é quem mede de verdade, então erra para mais.
 */
export function textWidth(text, size, { bold = false, tracking = 0 } = {}) {
  let units = 0;
  for (const ch of String(text)) {
    if (/[iIljt.,:;'!|]/.test(ch)) units += 0.32;
    else if (/[A-ZÀ-ÖØ-Þ]/.test(ch)) units += 0.68;
    else if (/[mwMW]/.test(ch)) units += 0.88;
    else if (ch === ' ') units += 0.3;
    else units += 0.54;
  }
  return units * size * (bold ? 1.06 : 1) + tracking * String(text).length;
}

/** Pílula com texto centralizado; devolve { svg, width }. */
export function pill(x, y, text, { size = 12.5, fg = C.cream, bg = C.panel, border = C.brass, padding = 13, height = 26 } = {}) {
  const width = Math.round(textWidth(text, size) + padding * 2);
  return {
    width,
    svg: `<g>
  <rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${height / 2}" fill="${bg}" stroke="${border}" stroke-opacity=".35" stroke-width=".9"/>
  <text x="${x + width / 2}" y="${y + height / 2 + 4.2}" text-anchor="middle" font-size="${size}" fill="${fg}" font-family="${SANS}">${esc(text)}</text>
</g>`,
  };
}

/** Linha de pílulas com quebra automática dentro de `maxWidth`. */
export function pillRow(x, y, items, { gap = 9, lineGap = 10, maxWidth = 1100, ...options } = {}) {
  const height = options.height ?? 26;
  const size = options.size ?? 12.5;
  const padding = options.padding ?? 13;
  let cx = x;
  let cy = y;
  const parts = [];

  for (const item of items) {
    const width = Math.round(textWidth(item, size) + padding * 2);
    if (cx > x && cx + width > x + maxWidth) {
      cx = x;
      cy += height + lineGap;
    }
    parts.push(pill(cx, cy, item, options).svg);
    cx += width + gap;
  }

  return { svg: parts.join('\n'), height: cy - y + height };
}

/** Filete ornamental horizontal centrado em (cx, y). */
export function rule(cx, y, width) {
  return `<rect x="${cx - width / 2}" y="${y}" width="${width}" height="1.2" fill="url(#rule)"/>`;
}

/**
 * Animações compartilhadas.
 *
 * Regra destas peças: nenhum dado depende de animação para ser visto. O que se
 * move é enfeite — há leitores que exibem o SVG parado, e um cartão que só
 * aparece animado é um cartão quebrado para eles. Por isso toda animação parte
 * de um estado já legível, e `.motion` some em prefers-reduced-motion.
 */
export function commonStyle() {
  return `
  text { font-family: ${SERIF}; }
  .pulse { animation: pulse 5s ease-in-out infinite; }
  @keyframes pulse { 0%, 100% { opacity: .45; } 50% { opacity: 1; } }
  @media (prefers-reduced-motion: reduce) {
    .pulse { animation: none; }
    .motion { display: none; }
  }`;
}

/** Abre o documento SVG com título e descrição acessíveis. */
export function open(w, h, title, desc, style, extraDefs = '') {
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-labelledby="t d">
<title id="t">${esc(title)}</title>
<desc id="d">${esc(desc)}</desc>
<defs>${commonDefs()}${extraDefs}</defs>
<style>${commonStyle()}${style || ''}</style>`;
}
