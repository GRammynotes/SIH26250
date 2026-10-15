import type maplibregl from 'maplibre-gl';

export interface TacticalSymbolPalette {
  cyan: string;
  amber: string;
  red: string;
  green: string;
  base: string;
}

/**
 * Register the map's tactical marks as canvas-rendered rasters. Drawing these
 * locally avoids browser-dependent SVG decoding while keeping symbol shape
 * as the primary affiliation/readiness cue.
 */
export async function registerTacticalSymbolSprites(map: maplibregl.Map, palette: TacticalSymbolPalette): Promise<void> {
  const entries: Array<[string, string]> = [
    ['symbol-aircraft-fmc', palette.cyan], ['symbol-aircraft-pmc', palette.amber], ['symbol-aircraft-nmc', palette.red],
    ['symbol-hostile-aircraft', palette.red], ['symbol-unknown-aircraft', palette.amber], ['symbol-sam', palette.red],
    ['symbol-radar', palette.red], ['symbol-tank', palette.green], ['symbol-uav', palette.green], ['symbol-c2', palette.red],
    ['symbol-base', palette.cyan], ['symbol-mission-p1', palette.red], ['symbol-mission-p2', palette.amber], ['symbol-mission-p3', palette.amber],
  ];
  for (const [id, color] of entries) {
    if (map.hasImage(id)) continue;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 64;
    const context = canvas.getContext('2d');
    if (!context) continue;
    context.lineWidth = 4;
    context.lineJoin = 'round';
    context.lineCap = 'round';
    context.strokeStyle = palette.base;
    context.fillStyle = color;

    if (id.startsWith('symbol-aircraft-')) {
      context.beginPath(); context.moveTo(8, 50); context.arc(32, 50, 24, Math.PI, 0); context.closePath(); context.fill(); context.stroke();
      context.beginPath(); context.moveTo(32, 8); context.lineTo(32, 26); context.moveTo(23, 19); context.lineTo(32, 26); context.lineTo(41, 19); context.stroke();
    } else if (id === 'symbol-hostile-aircraft') {
      context.beginPath(); context.moveTo(32, 5); context.lineTo(59, 32); context.lineTo(32, 59); context.lineTo(5, 32); context.closePath(); context.fill(); context.stroke();
      context.beginPath(); context.moveTo(18, 32); context.lineTo(46, 32); context.moveTo(32, 18); context.lineTo(32, 46); context.stroke();
    } else if (id === 'symbol-unknown-aircraft') {
      context.beginPath();
      for (let i = 0; i < 24; i++) { const a = (i * Math.PI) / 12 - Math.PI / 2; const r = i % 2 ? 21 : 27; const x = 32 + Math.cos(a) * r; const y = 32 + Math.sin(a) * r; i ? context.lineTo(x, y) : context.moveTo(x, y); }
      context.closePath(); context.fill(); context.stroke();
    } else if (id === 'symbol-sam' || id === 'symbol-uav') {
      context.beginPath(); context.moveTo(32, 7); context.lineTo(57, 55); context.lineTo(7, 55); context.closePath();
      if (id === 'symbol-uav') context.stroke(); else { context.strokeStyle = color; context.stroke(); }
      if (id === 'symbol-sam') { context.beginPath(); context.moveTo(32, 20); context.lineTo(32, 38); context.moveTo(23, 38); context.lineTo(41, 38); context.stroke(); }
      else { context.beginPath(); context.arc(32, 36, 4, 0, Math.PI * 2); context.fill(); }
    } else if (id === 'symbol-radar') {
      context.beginPath(); context.arc(32, 32, 23, 0, Math.PI * 2); context.stroke();
      context.beginPath(); context.moveTo(32, 9); context.lineTo(32, 55); context.moveTo(9, 32); context.lineTo(55, 32); context.moveTo(16, 16); context.lineTo(48, 48); context.moveTo(48, 16); context.lineTo(16, 48); context.stroke();
    } else if (id === 'symbol-tank') {
      context.strokeStyle = color; context.strokeRect(11, 11, 42, 42);
      context.beginPath(); context.moveTo(18, 39); context.lineTo(46, 39); context.moveTo(24, 32); context.lineTo(40, 32); context.moveTo(36, 25); context.lineTo(51, 25); context.stroke();
    } else if (id === 'symbol-c2') {
      context.beginPath(); context.moveTo(32, 6); context.lineTo(54, 19); context.lineTo(54, 45); context.lineTo(32, 58); context.lineTo(10, 45); context.lineTo(10, 19); context.closePath(); context.strokeStyle = color; context.stroke();
      context.beginPath(); context.moveTo(22, 32); context.lineTo(42, 32); context.moveTo(32, 22); context.lineTo(32, 42); context.stroke();
    } else if (id === 'symbol-base') {
      context.beginPath(); context.arc(32, 50, 24, Math.PI, 0); context.strokeStyle = color; context.stroke();
      context.beginPath(); context.moveTo(18, 50); context.lineTo(46, 50); context.moveTo(32, 20); context.lineTo(32, 42); context.stroke();
    } else if (id.startsWith('symbol-mission-')) {
      context.beginPath(); context.arc(32, 32, 22, 0, Math.PI * 2);
      if (id !== 'symbol-mission-p3') { context.fill(); context.stroke(); } else { context.strokeStyle = color; context.stroke(); }
      context.beginPath(); context.moveTo(32, 15); context.lineTo(32, 49); context.moveTo(15, 32); context.lineTo(49, 32); context.stroke();
    }
    if (!map.hasImage(id)) map.addImage(id, context.getImageData(0, 0, 64, 64), { pixelRatio: 2 });
  }
}
