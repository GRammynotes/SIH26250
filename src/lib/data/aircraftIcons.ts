// Top-down aircraft silhouettes. viewBox 0 0 40 40, nose pointing UP.
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

  'Il-78': `
    <svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
      <path d="M20 2C21.8 2 22.6 4 22.6 7L22.6 13L24.9 14.4L24.9 11.8L27.1 11.8L27.1 15.7L29.4 17.1L29.4 15.2L31.6 15.2L31.6 18.4L35.6 20.8L35.6 19.2L37.6 19.2L37.6 24.6L36 24.6L22.6 26.5L22.6 31.5L29.5 33.8L29.5 36L21.4 35.6L21.2 37.8L20 38.4L18.8 37.8L18.6 35.6L10.5 36L10.5 33.8L17.4 31.5L17.4 26.5L4 24.6L2.4 24.6L2.4 19.2L4.4 19.2L4.4 20.8L8.4 18.4L8.4 15.2L10.6 15.2L10.6 17.1L12.9 15.7L12.9 11.8L15.1 11.8L15.1 14.4L17.4 13L17.4 7C17.4 4 18.2 2 20 2Z"/>
    </svg>`,

  'Netra': `
    <svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
      <path d="M20 2C21.6 2 22 3.4 22 5.6L22 10L24.8 15.2L24.8 16.2L22 17.6L22 19L35.4 24.4L35.4 26L22 26.2L22 27.2L24.8 27.6L24.8 32.4L22 32.4L22 33.2L28.8 35.2L28.8 36.8L21.2 36.4L20.8 38.4L20 38.9L19.2 38.4L18.8 36.4L11.2 36.8L11.2 35.2L18 33.2L18 32.4L15.2 32.4L15.2 27.6L18 27.2L18 26.2L4.6 26L4.6 24.4L18 19L18 17.6L15.2 16.2L15.2 15.2L18 10L18 5.6C18 3.4 18.4 2 20 2Z"/>
    </svg>`,

  'P-8I': `
    <svg viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
      <path d="M20 1.8C21.7 1.8 22 3.6 22 6.2L22 15.4L25.4 17.1L25.4 14L28.2 14L28.2 18.5L36.4 22.6L35.8 24.6L22 26.2L22 31.4L28.4 34L28.4 35.4L21.4 35.2L20.8 36L20.7 39.6L19.3 39.6L19.2 36L18.6 35.2L11.6 35.4L11.6 34L18 31.4L18 26.2L4.2 24.6L3.6 22.6L11.8 18.5L11.8 14L14.6 14L14.6 17.1L18 15.4L18 6.2C18 3.6 18.3 1.8 20 1.8Z"/>
    </svg>`,
};

export function getAircraftSvg(type: string, color: string, heading: number, size = 26): string {
  const raw = AIRCRAFT_SVG[type] ?? AIRCRAFT_SVG['Su-30MKI'];
  return `<div style="width:${size}px;height:${size}px;transform:rotate(${heading}deg);transform-origin:50% 50%;color:${color};filter:drop-shadow(0 0 5px ${color});">${raw.replaceAll('CURRENT', color)}</div>`;
}
