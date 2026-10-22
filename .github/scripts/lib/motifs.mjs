// Vocabulário visual do perfil: um disco tocando num quarto silencioso.
// Tudo é desenhado em coordenadas próprias e posicionado por transform, para
// o mesmo traço servir à capa, aos divisores e aos cartões.

import { C } from './theme.mjs';

/**
 * Disco de vinil visto de cima.
 * `spin` em segundos liga a rotação (enfeite: o disco já está desenhado).
 */
export function vinyl(cx, cy, r, { spin = 0, label = C.terracotta, grooves = 9, id = 'lp' } = {}) {
  const rings = Array.from({ length: grooves }, (_, i) => {
    const rr = r * (0.42 + (0.56 * (i + 1)) / grooves);
    const opacity = (0.06 + (i % 3 === 0 ? 0.08 : 0.02)).toFixed(3);
    return `<circle cx="0" cy="0" r="${rr.toFixed(1)}" fill="none" stroke="${C.cream}" stroke-opacity="${opacity}" stroke-width="${(r * 0.012).toFixed(2)}"/>`;
  }).join('');

  const spinner = spin
    ? `<animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="${spin}s" repeatCount="indefinite"/>`
    : '';

  return `
<g transform="translate(${cx} ${cy})">
  <circle cx="0" cy="0" r="${r}" fill="url(#${id}-disc)"/>
  ${rings}
  <g>${spinner}
    <circle cx="0" cy="0" r="${(r * 0.36).toFixed(1)}" fill="${label}"/>
    <circle cx="0" cy="0" r="${(r * 0.36).toFixed(1)}" fill="none" stroke="${C.cream}" stroke-opacity=".25" stroke-width="1"/>
    <path d="M${(-r * 0.22).toFixed(1)} 0 a${(r * 0.22).toFixed(1)} ${(r * 0.22).toFixed(1)} 0 0 1 ${(r * 0.44).toFixed(1)} 0" fill="none" stroke="${C.cream}" stroke-opacity=".35" stroke-width="1"/>
    <circle cx="0" cy="${(-r * 0.18).toFixed(1)}" r="${(r * 0.03).toFixed(1)}" fill="${C.cream}" fill-opacity=".5"/>
  </g>
  <circle cx="0" cy="0" r="${(r * 0.045).toFixed(1)}" fill="${C.ink}"/>
  <circle cx="${(-r * 0.3).toFixed(1)}" cy="${(-r * 0.42).toFixed(1)}" r="${(r * 0.52).toFixed(1)}" fill="url(#${id}-shine)" opacity=".5"/>
</g>`;
}

/** Gradientes que o disco precisa; um por `id` usado em vinyl(). */
export function vinylDefs(id = 'lp') {
  return `
<radialGradient id="${id}-disc">
  <stop offset=".3" stop-color="#1C1416"/>
  <stop offset=".86" stop-color="#2A1E20"/>
  <stop offset="1" stop-color="#140E10"/>
</radialGradient>
<radialGradient id="${id}-shine">
  <stop offset="0" stop-color="${C.cream}" stop-opacity=".16"/>
  <stop offset="1" stop-color="${C.cream}" stop-opacity="0"/>
</radialGradient>`;
}

/** Braço do toca-discos apoiado no sulco, com a cápsula na ponta. */
export function tonearm(x, y, length, angle, color = C.brass) {
  return `
<g transform="translate(${x} ${y}) rotate(${angle})">
  <circle cx="0" cy="0" r="9" fill="${color}" fill-opacity=".9"/>
  <circle cx="0" cy="0" r="4" fill="${C.ink}" fill-opacity=".5"/>
  <rect x="-3" y="0" width="6" height="${length}" rx="3" fill="${color}" fill-opacity=".85"/>
  <rect x="-7" y="${length - 6}" width="14" height="16" rx="3" fill="${color}"/>
  <path d="M0 ${length + 10} l3 9 -6 0 z" fill="${C.cream}" fill-opacity=".8"/>
</g>`;
}

/** Nota musical (colcheia). `size` é a altura aproximada. */
export function note(x, y, size, fill, extra = '') {
  const k = (size / 100).toFixed(4);
  return `<g transform="translate(${x} ${y}) scale(${k})"${extra ? ' ' + extra : ''}>
  <ellipse cx="-16" cy="0" rx="20" ry="15" fill="${fill}" transform="rotate(-20 -16 0)"/>
  <rect x="0" y="-86" width="7" height="86" rx="3" fill="${fill}"/>
  <path d="M7 -86 q30 12 30 38 q0 10 -7 18 q4 -22 -23 -33 z" fill="${fill}"/>
</g>`;
}

/** Xícara fumegante; o vapor é a única parte animada. */
export function cup(x, y, size, { steam = true } = {}) {
  const k = (size / 100).toFixed(4);
  const vapor = steam
    ? `<g class="motion" opacity=".55">
    <path d="M-14 -16 q10 -14 0 -28 q-10 -14 0 -26" fill="none" stroke="${C.cream}" stroke-opacity=".5" stroke-width="3" stroke-linecap="round">
      <animate attributeName="d" dur="5s" repeatCount="indefinite"
        values="M-14 -16 q10 -14 0 -28 q-10 -14 0 -26;M-14 -16 q-10 -14 0 -28 q10 -14 0 -26;M-14 -16 q10 -14 0 -28 q-10 -14 0 -26"/>
    </path>
    <path d="M10 -16 q-10 -12 0 -24 q10 -12 0 -22" fill="none" stroke="${C.cream}" stroke-opacity=".35" stroke-width="3" stroke-linecap="round">
      <animate attributeName="d" dur="6.5s" repeatCount="indefinite"
        values="M10 -16 q-10 -12 0 -24 q10 -12 0 -22;M10 -16 q10 -12 0 -24 q-10 -12 0 -22;M10 -16 q-10 -12 0 -24 q10 -12 0 -22"/>
    </path>
  </g>`
    : '';

  return `<g transform="translate(${x} ${y}) scale(${k})">
  ${vapor}
  <path d="M-30 -10 h52 a6 6 0 0 1 6 6 v16 a26 26 0 0 1 -26 26 h-12 a26 26 0 0 1 -26 -26 v-16 a6 6 0 0 1 6 -6 z" fill="${C.clay}"/>
  <path d="M28 -4 h8 a14 14 0 0 1 0 28 h-8" fill="none" stroke="${C.clay}" stroke-width="7"/>
  <ellipse cx="-2" cy="-10" rx="30" ry="7" fill="${C.ink}" fill-opacity=".45"/>
  <ellipse cx="-2" cy="42" rx="34" ry="6" fill="${C.ink}" fill-opacity=".25"/>
</g>`;
}

/**
 * Forma de onda simétrica, do tipo que aparece num editor de áudio.
 * Determinística: a mesma `seed` devolve sempre o mesmo desenho.
 */
export function waveform(x, y, width, height, bars, seed = 7, color = C.terracotta, opacity = '.65') {
  const gap = width / bars;
  let state = seed;
  const rand = () => {
    state = (state * 1103515245 + 12345) % 2147483648;
    return state / 2147483648;
  };
  return Array.from({ length: bars }, (_, i) => {
    const envelope = Math.sin((Math.PI * (i + 0.5)) / bars) ** 0.6;
    const h = Math.max(2, height * envelope * (0.3 + 0.7 * rand()));
    const bx = x + i * gap;
    return `<rect x="${bx.toFixed(1)}" y="${(y - h / 2).toFixed(1)}" width="${(gap * 0.52).toFixed(1)}" height="${h.toFixed(1)}" rx="${(gap * 0.26).toFixed(1)}" fill="${color}" fill-opacity="${opacity}"/>`;
  }).join('');
}

/** Padrão do tapete: losangos finos, bem discretos, ao fundo das peças. */
export function rugPattern(id = 'rug') {
  return `
<pattern id="${id}" width="54" height="54" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
  <rect width="54" height="54" fill="none"/>
  <path d="M27 6 L48 27 L27 48 L6 27 Z" fill="none" stroke="${C.clay}" stroke-opacity=".10" stroke-width="1"/>
  <circle cx="27" cy="27" r="3" fill="${C.clay}" fill-opacity=".08"/>
</pattern>`;
}
