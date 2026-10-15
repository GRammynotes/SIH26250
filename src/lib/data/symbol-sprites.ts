import type maplibregl from 'maplibre-gl';

export interface TacticalSymbolPalette {
  cyan: string;
  amber: string;
  red: string;
  green: string;
  base: string;
}

const svg = (body: string) => `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">${body}</svg>`;
const stroke = (color: string, width = 4) => `stroke="${color}" stroke-width="${width}" stroke-linejoin="round" stroke-linecap="round"`;

/**
 * Shape is the primary discriminator. Colours only reinforce the affiliation
 * and readiness already represented by the MIL-STD style frame.
 */
function definitions(palette: TacticalSymbolPalette): Array<[string, string]> {
  const { cyan, amber, red, green, base } = palette;
  const friendly = (color: string) => svg(`<path d="M8 50a24 24 0 0 1 48 0Z" fill="${color}" ${stroke(base, 3)}/><path d="M32 8v18M23 19l9 7 9-7" fill="none" ${stroke(base, 3)}/>`);
  return [
    ['symbol-aircraft-fmc', friendly(cyan)],
    ['symbol-aircraft-pmc', friendly(amber)],
    ['symbol-aircraft-nmc', friendly(red)],
    ['symbol-hostile-aircraft', svg(`<path d="M32 5 59 32 32 59 5 32Z" fill="${red}" ${stroke(base, 3)}/><path d="M18 32h28M32 18v28" ${stroke(base, 2)}/>`)],
    ['symbol-unknown-aircraft', svg(`<path d="M32 12c7-10 20-3 16 7 10-4 17 9 7 16 10 7 3 20-7 16 4 10-9 17-16 7-7 10-20 3-16-7-10 4-17-9-7-16-10-7-3-20 7-16-4-10 9-17 16-7Z" fill="${amber}" ${stroke(base, 3)}/>`)],
    ['symbol-sam', svg(`<path d="M32 56 7 12h50Z" fill="none" ${stroke(red)}/><path d="M32 20v18M23 38h18" ${stroke(red, 3)}/>`)],
    ['symbol-radar', svg(`<circle cx="32" cy="32" r="23" fill="none" ${stroke(red)}/><path d="M32 9v46M9 32h46M16 16l32 32M48 16 16 48" ${stroke(red, 2)}/>`)],
    ['symbol-tank', svg(`<rect x="11" y="11" width="42" height="42" fill="none" ${stroke(green)}/><path d="M18 39h28M24 33h16M36 27h15" ${stroke(green, 3)}/>`)],
    ['symbol-uav', svg(`<path d="M32 8 56 53H8Z" fill="none" ${stroke(green)}/><circle cx="32" cy="35" r="4" fill="${green}"/>`)],
    ['symbol-c2', svg(`<path d="M32 6 54 19v26L32 58 10 45V19Z" fill="none" ${stroke(red)}/><path d="M22 32h20M32 22v20" ${stroke(red, 3)}/>`)],
    ['symbol-base', svg(`<path d="M8 50a24 24 0 0 1 48 0Z" fill="none" ${stroke(cyan)}/><path d="M18 50h28M32 20v22" ${stroke(cyan, 3)}/>`)],
    ['symbol-mission-p1', svg(`<circle cx="32" cy="32" r="22" fill="${red}" ${stroke(base, 3)}/><path d="M32 15v34M15 32h34" ${stroke(base, 3)}/>`)],
    ['symbol-mission-p2', svg(`<circle cx="32" cy="32" r="22" fill="${amber}" ${stroke(base, 3)}/><path d="M32 15v34M15 32h34" ${stroke(base, 3)}/>`)],
    ['symbol-mission-p3', svg(`<circle cx="32" cy="32" r="22" fill="none" ${stroke(amber)}/><path d="M32 15v34M15 32h34" ${stroke(amber, 3)}/>`)],
  ];
}

export async function registerTacticalSymbolSprites(map: maplibregl.Map, palette: TacticalSymbolPalette): Promise<void> {
  for (const [id, source] of definitions(palette)) {
    if (map.hasImage(id)) continue;
    const bitmap = await createImageBitmap(new Blob([source], { type: 'image/svg+xml' }));
    if (!map.hasImage(id)) map.addImage(id, bitmap, { pixelRatio: 2 });
  }
}
