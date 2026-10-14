export type VoicePriority = 'critical' | 'info';
export type VoiceCharacter = 'commander' | 'agent';
export type VoiceFocusTarget = { selector: string; duration: number };
type QueuedLine = { text: string; priority: VoicePriority; source: string; focus?: VoiceFocusTarget; speaker?: VoiceCharacter };

let enabled = true;
let speaking = false;
let speakingPriority: VoicePriority | null = null;
let queue: QueuedLine[] = [];
let generation = 0;
const lastSpoken = new Map<string, number>();
const MAX_DEDUPE_ENTRIES = 250;

export function clearVoiceDedupe(): void { lastSpoken.clear(); }

export function stopVoice(): void {
  generation += 1;
  queue = [];
  speaking = false;
  speakingPriority = null;
  if (typeof window !== 'undefined') window.speechSynthesis?.cancel();
}

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
  if (source === 'EXEC' && message.includes(' ENTERED ')) {
    const [, phase = 'next phase'] = message.split(' ENTERED ');
    const explanations: Record<string, string> = {
      INGRESS: 'Aircraft are following the planned route toward the operating area.',
      WEZ: 'The package is at the weapon engagement zone. Confirm the release decision.',
      RELEASE: 'The weapon release sequence is active.',
      EGRESS: 'The aircraft are leaving the target area along the egress route.',
      RTB: 'The package is returning to base. Monitor fuel and recovery status.',
    };
    return { text: `${phase}. ${explanations[phase] ?? 'Mission phase updated.'}`, priority: 'info' };
  }
  if (source === 'THREAT' && message.includes('NEW THREAT')) return { text: `New threat detected. ${message.split('·').slice(1).join(' ').trim()}.`, priority: critical };
  if (source === 'COMMAND' && message.startsWith('COA RECOMPUTED')) return { text: 'COA regenerated. Recommended option is ready for review.', priority: 'info', focus: { selector: '.right-tab-content', duration: 3000 } };
  return null;
}

function playTone(token: number, speaker: VoiceCharacter = 'agent'): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') { resolve(); return; }
    const AudioContextConstructor = window.AudioContext;
    if (!AudioContextConstructor) { window.setTimeout(resolve, 750); return; }
    try {
      const context = new AudioContextConstructor();
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.frequency.value = speaker === 'commander' ? 440 : 840;
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
  const now = Date.now();
  for (const [text, timestamp] of lastSpoken) if (now - timestamp > 2000) lastSpoken.delete(text);
  const previous = lastSpoken.get(item.text);
  if (previous !== undefined && now - previous < 2000) { void drain(); return; }
  lastSpoken.set(item.text, now);
  if (lastSpoken.size > MAX_DEDUPE_ENTRIES) lastSpoken.delete(lastSpoken.keys().next().value!);
  const token = generation;
  speaking = true;
  speakingPriority = item.priority;
  await playTone(token, item.speaker);
  if (token !== generation || !enabled) { speaking = false; speakingPriority = null; void drain(); return; }
  if (!('speechSynthesis' in window)) { speaking = false; speakingPriority = null; void drain(); return; }
  const utterance = new SpeechSynthesisUtterance(item.text);
  window.dispatchEvent(new CustomEvent('aircommand:caption', { detail: { source: item.source, text: item.text } }));
  if (item.focus) window.dispatchEvent(new CustomEvent('aircommand:focus', { detail: { ...item.focus, text: item.text } }));
  utterance.rate = item.speaker === 'commander' ? 0.9 : 0.97;
  utterance.pitch = item.speaker === 'commander' ? 0.82 : 1.12;
  utterance.lang = 'en-IN';
  const voices = window.speechSynthesis.getVoices();
  const indianVoices = voices.filter((candidate) => candidate.lang.toLowerCase().startsWith('en-in'));
  const englishVoices = voices.filter((candidate) => candidate.lang.toLowerCase().startsWith('en'));
  const availableVoices = indianVoices.length ? indianVoices : englishVoices;
  const nameHints = item.speaker === 'commander' ? ['male', 'man', 'rishi', 'prabhat'] : ['female', 'woman', 'neerja', 'heera'];
  const hintedVoice = availableVoices.find((candidate) => nameHints.some((hint) => candidate.name.toLowerCase().includes(hint)));
  const alternateVoice = availableVoices[item.speaker === 'commander' ? 0 : Math.min(1, availableVoices.length - 1)];
  const voice = hintedVoice ?? alternateVoice;
  if (voice) utterance.voice = voice;
  const finish = () => { if (token !== generation) return; speaking = false; speakingPriority = null; void drain(); };
  utterance.onend = finish;
  utterance.onerror = finish;
  window.speechSynthesis.cancel();
  await new Promise<void>((resolve) => window.setTimeout(resolve, 20));
  if (token !== generation || !enabled) { speaking = false; speakingPriority = null; void drain(); return; }
  window.speechSynthesis.speak(utterance);
}

export function narrateEvent(source: string, message: string, interrupt = false): void {
  if (!enabled || typeof window === 'undefined') return;
  const narration = narrationFor(source, message);
  if (!narration) return;
  const line: QueuedLine = { ...narration, source };
  enqueue(line, interrupt);
}

export function narrateUtterance(text: string, options: { source?: string; priority?: VoicePriority; focus?: VoiceFocusTarget; speaker?: VoiceCharacter } = {}): void {
  if (!enabled || typeof window === 'undefined' || !text.trim()) return;
  enqueue({ text, source: options.source ?? (options.speaker === 'commander' ? 'COMMANDER' : 'OPS AGENT'), priority: options.priority ?? 'info', focus: options.focus, speaker: options.speaker }, options.priority === 'critical');
}

function enqueue(line: QueuedLine, interrupt: boolean): void {
  if (!enabled || typeof window === 'undefined') return;
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
