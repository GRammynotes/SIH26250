// Top-down aircraft silhouettes. viewBox 0 0 40 40, nose pointing UP (north).
// Each path is a simplified silhouette recognisable at tactical display scale.

export const AIRCRAFT_SVG: Record<string, string> = {
  'Su-30MKI': `
    <svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
      <path d="M20 2 L21 14 L32 20 L32 22 L21 22 L22 34 L18 34 L19 22 L8 22 L8 20 L19 14 Z"
        fill="CURRENT" stroke="CURRENT" stroke-width="0.5"/>
    </svg>`,

  'Rafale': `
    <svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
      <path d="M20 2 L21 13 L30 18 L34 20 L34 21 L21 21 L22 35 L18 35 L19 21 L6 21 L6 20 L10 18 L19 13 Z"
        fill="CURRENT" stroke="CURRENT" stroke-width="0.5"/>
    </svg>`,

  'Tejas': `
    <svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
      <path d="M20 4 L21 15 L29 19 L29 21 L21 21 L21 34 L19 34 L19 21 L11 21 L11 19 L19 15 Z"
        fill="CURRENT" stroke="CURRENT" stroke-width="0.5"/>
    </svg>`,

  'Mirage-2000': `
    <svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
      <path d="M20 2 L21 12 L32 18 L32 20 L21 20 L22 36 L18 36 L19 20 L8 20 L8 18 L19 12 Z"
        fill="CURRENT" stroke="CURRENT" stroke-width="0.5"/>
    </svg>`,

  'Jaguar': `
    <svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
      <path d="M20 3 L22 14 L30 19 L30 21 L22 21 L23 34 L17 34 L18 21 L10 21 L10 19 L18 14 Z"
        fill="CURRENT" stroke="CURRENT" stroke-width="0.5"/>
    </svg>`,

  'MiG-29UPG': `
    <svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
      <path d="M20 2 L21 14 L31 19 L33 20 L33 21 L21 21 L22 34 L18 34 L19 21 L7 21 L7 20 L9 19 L19 14 Z"
        fill="CURRENT" stroke="CURRENT" stroke-width="0.5"/>
    </svg>`,
};

export function getAircraftSvg(type: string, color: string, heading: number, size = 26): string {
  const raw = AIRCRAFT_SVG[type] ?? AIRCRAFT_SVG['Su-30MKI'];
  return `<div style="width:${size}px;height:${size}px;transform:rotate(${heading}deg);transform-origin:50% 50%;color:${color};filter:drop-shadow(0 0 5px ${color});">${raw.replaceAll('CURRENT', color)}</div>`;
}
