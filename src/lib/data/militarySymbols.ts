import ms from 'milsymbol';

/** 2525D frame identity mappings used by this training display. */
export const MILITARY_SYMBOLS = {
  friendlyAir: { affiliation: 'F', dimension: 'A', label: 'FRIENDLY AIR' },
  hostileAir: { affiliation: 'H', dimension: 'A', label: 'HOSTILE AIR' },
  unknownAir: { affiliation: 'U', dimension: 'A', label: 'UNKNOWN AIR' },
  hostileGround: { affiliation: 'H', dimension: 'G', label: 'HOSTILE GROUND' },
  friendlyInstallation: { affiliation: 'F', dimension: 'G', label: 'FRIENDLY INSTALLATION' },
} as const;

export type MilitarySymbolKind = keyof typeof MILITARY_SYMBOLS;

// Numeric 2525D identity/dimension codes supported by milsymbol.
const sidcByKind: Record<MilitarySymbolKind, number> = {
  friendlyAir: 100301, hostileAir: 100601, unknownAir: 100101,
  hostileGround: 100610, friendlyInstallation: 100320,
};

export function militarySymbolSvg(kind: MilitarySymbolKind, size = 34): string {
  return new ms.Symbol(String(sidcByKind[kind]), { size, infoFields: false }).asSVG();
}

export function militarySymbolElement(kind: MilitarySymbolKind, size = 34): HTMLDivElement {
  const wrapper = document.createElement('div');
  wrapper.className = `mil-symbol mil-symbol-${kind}`;
  wrapper.setAttribute('role', 'img');
  wrapper.setAttribute('aria-label', MILITARY_SYMBOLS[kind].label);
  wrapper.innerHTML = militarySymbolSvg(kind, size);
  return wrapper;
}
