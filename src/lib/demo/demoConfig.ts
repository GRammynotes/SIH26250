import type { Config } from 'driver.js';

export const demoConfig: Config = {
  overlayColor: 'rgba(5, 8, 15, 0.85)',
  overlayOpacity: 1,
  stagePadding: 8,
  stageRadius: 0,
  popoverClass: 'air-command-popover',
  showProgress: true,
  progressText: '{{current}} / {{total}}',
  nextBtnText: '▸ NEXT',
  prevBtnText: '◂ PREV',
  doneBtnText: '✓ CLOSE',
  showButtons: ['next', 'previous', 'close'],
  allowClose: true,
  smoothScroll: true,
  disableActiveInteraction: true,
};
