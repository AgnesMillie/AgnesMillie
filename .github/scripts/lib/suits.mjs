// Naipes do baralho, extraídos de assets/divider.svg para manter o mesmo traço
// em todas as peças do perfil. Desenhados com o eixo Y invertido (scale(k, -k)),
// como no divisor original: a origem do `use` fica na base do símbolo.

export const SUIT_PATHS = {
  spade: "M920 1492Q1014 1325 1230 1049Q1467 771 1473 714Q1512 629 1512 549V509Q1512 342 1350 246Q1297 224 1233 224Q1079 224 984 445H942V433Q942 150 1025 0H810V6Q895 157 895 442L892 445H854L807 357Q722 224 595 224Q408 224 332 433L323 506V552Q323 735 510 938Q825 1324 914 1489L917 1492Z",
  heart: "M552 1492Q755 1492 871 1257Q913 1164 915 1115H918Q953 1277 1045 1384Q1153 1492 1288 1492Q1497 1492 1623 1268Q1655 1185 1655 1112Q1655 862 1447 635L918 0H912L350 689Q182 894 182 1112Q182 1323 381 1447Q465 1492 552 1492Z",
  club: "M919 1492Q1133 1492 1234 1265Q1247 1213 1250 1157Q1250 1040 1130 880L1070 820H1073Q1147 848 1231 848H1250Q1488 848 1584 646Q1607 580 1607 520Q1607 315 1398 211Q1358 199 1287 193Q1045 193 944 467H941V458Q941 115 1023 6V0H815L809 6Q894 134 894 467V470H891Q791 193 546 193Q355 193 253 394Q228 462 228 520Q228 753 474 836Q540 848 591 848H600Q686 848 764 820H767V823Q683 894 654 963Q594 1073 594 1154V1168Q594 1369 809 1473Q880 1492 919 1492Z",
  diamond: "M918 1492 1421 839Q1490 754 1490 741L918 0Q906 8 344 741Q344 755 455 893Z",
};

const SUIT_UNITS = 1492; // altura do desenho no sistema de coordenadas original

/** Bloco <defs> com os quatro naipes, para ser referenciado por suit(). */
export function suitDefs() {
  return Object.entries(SUIT_PATHS)
    .map(([name, d]) => `<path id="dj-${name}" d="${d}"/>`)
    .join('\n');
}

/** Instancia um naipe com a base em (x, y) e `size` pixels de altura. */
export function suit(name, x, y, size, fill, extra = '') {
  const k = (size / SUIT_UNITS).toFixed(6);
  return `<use xlink:href="#dj-${name}" fill="${fill}" transform="translate(${x} ${y}) scale(${k} -${k})"${extra ? ' ' + extra : ''}/>`;
}
