export type VoicePriority = 'critical' | 'info';
export type VoiceFocusTarget = { selector: string; duration: number };
type QueuedLine = { text: string; priority: VoicePriority; source: string; focus?: VoiceFocusTarget };

let enabled = true;
let speaking = false;
let speakingPriority: VoicePriority | null = null;
let queue: QueuedLine[] = [];
let generation = 0;

export function isVoiceEnabled(): boolean { return enabled; }

export function setVoiceEnabled(value: boolean): void {
  enabled = value;
  if (!enabled) {
    generation += 1;
    queue = [];
    speaking = false;
    speakingPriority = null;
    if (typeof window !== 'undefined') window.speechSynthesis?.cancel();
  }
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('aircommand:voice-state', { detail: enabled }));
}

function narrationFor(source: string, message: string): Omit<QueuedLine, 'source'> | null {
  const critical: VoicePriority = 'critical';
  if (message.startsWith('MISSION LAUNCHED ·')) {
    const [, name = 'Mission', aircraft = '0 AC'] = message.split('·').map((part) => part.trim());
    return { text: `Mission ${name} launched. ${Number.parseInt(aircraft, 10) || 0} aircraft tasked.`, priority: 'info', focus: { selector: '.trajectory-dot, .map-wrap', duration: 3000 } };
  }
  if (message.startsWith('WEAPON RELEASED ·')) {
    const [, weapon = 'weapon', target = 'unknown target'] = message.split('·').map((part) => part.trim());
    return { text: `Weapon release. ${weapon}. Target ${target}.`, priority: critical, focus: { selector: '.map-wrap', duration: 3000 } };
  }
  if (message.startsWith('IMPACT CONFIRMED ·')) return { text: 'Impact confirmed. Target destroyed.', priority: critical };
  if (source === 'DECISION' && message.startsWith('AWAITING COMMAND ·')) return { text: `Commander decision required. ${message.split('·').slice(1).join(' ').trim()}.`, priority: critical, focus: { selector: '.layer:not(.hidden) [role="dialog"]', duration: 3000 } };
  if (message.startsWith('THREAT ALERT ·')) return { text: `New threat detected. ${message.split('·').slice(1).join(' ').trim()}.`, priority: critical, focus: { selector: '.map-wrap', duration: 3000 } };
  if (message.startsWith('TRACK LOSS HYPOTHESIS ·')) return { text: `Track lost. Hypothesis: ${message.split('·').slice(1).join(' ').trim()}.`, priority: critical };
  if (message.startsWith('MISSION COMPLETE ·')) {
    const name = message.split('·')[1]?.trim() ?? 'Mission';
    return { text: `${name} complete. Return to base.`, priority: 'info' };
  }
  if (source === 'THREAT' && message.includes('NEW THREAT')) return { text: `New threat detected. ${message.split('·').slice(1).join(' ').trim()}.`, priority: critical };
  if (source === 'COMMAND' && message.startsWith('COA RECOMPUTED')) return { text: 'COA regenerated. Recommended option is ready for review.', priority: 'info', focus: { selector: '.right-tab-content', duration: 3000 } };
  return null;
}

function playTone(token: number): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') { resolve(); return; }
    const AudioContextConstructor = window.AudioContext;
    if (!AudioContextConstructor) { window.setTimeout(resolve, 750); return; }
    try {
      const context = new AudioContextConstructor();
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.frequency.value = 680;
      oscillator.type = 'sine';
      gain.gain.setValueAtTime(0.0001, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.035, context.currentTime + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.72);
      oscillator.connect(gain); gain.connect(context.destination);
      oscillator.start(); oscillator.stop(context.currentTime + 0.75);
      window.setTimeout(() => { void context.close(); resolve(); }, 750);
      void token;
    } catch { window.setTimeout(resolve, 750); }
  });
}

async function drain(): Promise<void> {
  if (speaking || !enabled || queue.length === 0 || typeof window === 'undefined') return;
  const item = queue.shift()!;
  const token = generation;
  speaking = true;
  speakingPriority = item.priority;
  await playTone(token);
  if (token !== generation || !enabled) { speaking = false; speakingPriority = null; void drain(); return; }
  if (!('speechSynthesis' in window)) { speaking = false; speakingPriority = null; void drain(); return; }
  const utterance = new SpeechSynthesisUtterance(item.text);
  window.dispatchEvent(new CustomEvent('aircommand:caption', { detail: { source: item.source, text: item.text } }));
  if (item.focus) window.dispatchEvent(new CustomEvent('aircommand:focus', { detail: { ...item.focus, text: item.text } }));
  utterance.rate = 0.95;
  utterance.lang = 'en-IN';
  const voice = window.speechSynthesis.getVoices().find((candidate) => candidate.lang.toLowerCase() === 'en-in')
    ?? window.speechSynthesis.getVoices().find((candidate) => candidate.lang.toLowerCase().startsWith('en-in'));
  if (voice) utterance.voice = voice;
  const finish = () => { if (token !== generation) return; speaking = false; speakingPriority = null; void drain(); };
  utterance.onend = finish;
  utterance.onerror = finish;
  window.speechSynthesis.speak(utterance);
}

export function narrateEvent(source: string, message: string, interrupt = false): void {
  if (!enabled || typeof window === 'undefined') return;
  const narration = narrationFor(source, message);
  if (!narration) return;
  const line: QueuedLine = { ...narration, source };
  const critical = interrupt || line.priority === 'critical';
  if (critical && speaking && speakingPriority !== 'critical') {
    generation += 1;
    speaking = false;
    speakingPriority = null;
    window.speechSynthesis?.cancel();
    queue = [];
  }
  const queued = { ...line, priority: critical ? 'critical' as const : 'info' as const };
  if (critical && !speaking) queue.unshift(queued);
  else queue.push(queued);
  void drain();
}
