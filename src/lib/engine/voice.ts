export type VoiceTier = 'WARNING' | 'CAUTION' | 'ADVISORY';
export type VoiceOwner = 'system' | 'demo' | 'training' | 'simulation' | 'mission';
export type VoiceCharacter = 'commander' | 'agent';
export type VoiceFocusTarget = { selector: string; duration: number };
type QueuedLine = { text: string; caption: string; tier: VoiceTier; source: string; owner: VoiceOwner; focus?: VoiceFocusTarget; speaker?: VoiceCharacter };

let enabled = true;
let narrationSpeed: 1 | 2 | 4 = 1;
let activeOwner: VoiceOwner = 'system';
let mutedTiers = new Set<VoiceTier>();
let speaking = false;
let speakingLine: QueuedLine | null = null;
let queue: QueuedLine[] = [];
let generation = 0;
let nextCaptionId = 0;
const lastAccepted = new Map<string, number>();
const MAX_DEDUPE_ENTRIES = 250;

export function setNarrationSpeed(speed: 1 | 2 | 4): void { narrationSpeed = speed; }
export function clearVoiceDedupe(): void { lastAccepted.clear(); }
export function isVoiceEnabled(): boolean { return enabled; }
export function isVoiceTierMuted(tier: VoiceTier): boolean { return mutedTiers.has(tier); }

function publishVoiceState(): void {
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('aircommand:voice-state', { detail: { enabled, owner: activeOwner, mutedTiers: [...mutedTiers] } }));
}

function cancelCurrent(requeue: boolean): void {
  const interrupted = speakingLine;
  generation += 1;
  speaking = false;
  speakingLine = null;
  if (typeof window !== 'undefined') window.speechSynthesis?.cancel();
  if (requeue && interrupted?.owner === activeOwner && !mutedTiers.has(interrupted.tier) && enabled) insertByPriority(interrupted);
}

export function setVoiceOwner(owner: VoiceOwner): void {
  if (activeOwner === owner) return;
  const previous = activeOwner;
  activeOwner = owner;
  queue = [];
  cancelCurrent(false);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('aircommand:caption-clear'));
    window.dispatchEvent(new CustomEvent('aircommand:voice-owner', { detail: { previous, owner } }));
  }
  publishVoiceState();
}

export function stopVoice(): void {
  queue = [];
  cancelCurrent(false);
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('aircommand:caption-clear'));
}

export function stopVoiceForOwner(owner: string): void {
  queue = queue.filter((line) => line.owner !== owner);
  if (speakingLine?.owner === owner) cancelCurrent(false);
  void drain();
}

export function setVoiceEnabled(value: boolean): void {
  enabled = value;
  if (!enabled) {
    queue = [];
    cancelCurrent(false);
  } else {
    void drain();
  }
  publishVoiceState();
}

export function setVoiceTierMuted(tier: VoiceTier, muted: boolean): void {
  if (muted) mutedTiers.add(tier); else mutedTiers.delete(tier);
  if (muted) {
    queue = queue.filter((line) => line.tier !== tier);
    if (speakingLine?.tier === tier) cancelCurrent(false);
  }
  publishVoiceState();
  void drain();
}

function narrationFor(source: string, message: string): Omit<QueuedLine, 'source' | 'owner' | 'caption'> & { caption?: string } | null {
  if (/MISSION ABORTED|MISSION ABORT/i.test(message)) return { text: `Mission aborted. ${message.split('·').slice(1).join(' ').trim()}.`, tier: 'WARNING' };
  if (/SPOOFED TRACK|TRACK.*SPOOF/i.test(message)) return { text: `Spoofed track warning. ${message.split('·').slice(1).join(' ').trim()}.`, tier: 'WARNING' };
  if (/SAM LOCK|MISSILE LOCK/i.test(message)) return { text: `SAM lock warning. ${message.split('·').slice(1).join(' ').trim()}.`, tier: 'WARNING' };
  if (message.startsWith('THREAT ALERT ·') || (source === 'THREAT' && message.includes('NEW THREAT'))) return { text: `Threat alert. ${message.split('·').slice(1).join(' ').trim()}.`, tier: 'WARNING', focus: { selector: '.map-wrap', duration: 3000 } };
  if (message.startsWith('MISSION LAUNCHED ·')) {
    const [, name = 'Mission', aircraft = '0 AC'] = message.split('·').map((part) => part.trim());
    return { text: `Mission ${name} launched. ${Number.parseInt(aircraft, 10) || 0} aircraft tasked.`, tier: 'CAUTION', focus: { selector: '.trajectory-dot, .map-wrap', duration: 3000 } };
  }
  if (message.startsWith('WEAPON RELEASED ·')) {
    const [, weapon = 'weapon', target = 'unknown target'] = message.split('·').map((part) => part.trim());
    return { text: `Weapon release. ${weapon}. Target ${target}.`, tier: 'CAUTION', focus: { selector: '.map-wrap', duration: 3000 } };
  }
  if (message.startsWith('IMPACT CONFIRMED ·') || message.startsWith('BDA COMPLETE ·')) return { text: `Battle damage assessment update. ${message.split('·').slice(1).join(' ').trim()}.`, tier: 'CAUTION' };
  if (source === 'DECISION' && message.startsWith('AWAITING COMMAND ·')) return { text: `Commander decision required. ${message.split('·').slice(1).join(' ').trim()}.`, tier: 'CAUTION', focus: { selector: '.layer:not(.hidden) [role="dialog"]', duration: 3000 } };
  if (message.startsWith('MISSION COMPLETE ·')) return { text: `${message.split('·')[1]?.trim() ?? 'Mission'} complete. Review battle damage assessment.`, tier: 'CAUTION' };
  if (source === 'EXEC' && message.includes(' ENTERED ')) {
    const [, phase = 'next phase'] = message.split(' ENTERED ');
    const explanations: Record<string, string> = {
      INGRESS: 'Aircraft are following the planned route toward the operating area.',
      WEZ: 'The package is at the weapon engagement zone. Confirm the release decision.',
      RELEASE: 'The weapon release sequence is active.',
      EGRESS: 'The aircraft are leaving the target area along the egress route.',
      RTB: 'The package is returning to base. Monitor fuel and recovery status.',
    };
    return { text: `${phase}. ${explanations[phase] ?? 'Mission phase updated.'}`, tier: 'ADVISORY' };
  }
  if (source === 'COMMAND' && message.startsWith('COA RECOMPUTED')) return { text: 'COA regenerated. Recommended option is ready for review.', tier: 'ADVISORY', focus: { selector: '.right-tab-content', duration: 3000 } };
  return null;
}

function playTone(speaker: VoiceCharacter = 'agent'): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') { resolve(); return; }
    const AudioContextConstructor = window.AudioContext;
    if (!AudioContextConstructor) { window.setTimeout(resolve, 180); return; }
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
    } catch { window.setTimeout(resolve, 180); }
  });
}

function tierRank(tier: VoiceTier): number { return tier === 'WARNING' ? 3 : tier === 'CAUTION' ? 2 : 1; }
function insertByPriority(line: QueuedLine): void {
  const index = queue.findIndex((item) => tierRank(item.tier) < tierRank(line.tier));
  if (index < 0) queue.push(line); else queue.splice(index, 0, line);
}

function accept(line: QueuedLine): void {
  if (line.owner !== activeOwner) return;
  const now = Date.now();
  for (const [key, timestamp] of lastAccepted) if (now - timestamp > 2000) lastAccepted.delete(key);
  const dedupeKey = `${line.owner}:${line.tier}:${line.text}`;
  const previous = lastAccepted.get(dedupeKey);
  if (previous !== undefined && now - previous < 1500) return;
  lastAccepted.set(dedupeKey, now);
  if (lastAccepted.size > MAX_DEDUPE_ENTRIES) lastAccepted.delete(lastAccepted.keys().next().value!);
  window.dispatchEvent(new CustomEvent('aircommand:caption', { detail: { id: ++nextCaptionId, source: line.source, text: line.caption, owner: line.owner } }));
  if (!enabled || mutedTiers.has(line.tier)) return;

  if ((line.tier === 'WARNING' && speaking) || (line.tier === 'CAUTION' && speakingLine?.tier === 'ADVISORY')) cancelCurrent(true);
  if (line.tier === 'ADVISORY' && queue.filter((item) => item.tier === 'ADVISORY').length >= 5) {
    const oldest = queue.findIndex((item) => item.tier === 'ADVISORY');
    if (oldest >= 0) queue.splice(oldest, 1);
  }
  insertByPriority(line);
  void drain();
}

async function drain(): Promise<void> {
  if (speaking || !enabled || typeof window === 'undefined') return;
  while (queue.length) {
    const index = queue.findIndex((line) => line.owner === activeOwner && !mutedTiers.has(line.tier));
    if (index < 0) { queue = []; return; }
    const item = queue.splice(index, 1)[0];
    const token = generation;
    speaking = true;
    speakingLine = item;
    await playTone(item.speaker);
    if (token !== generation || !enabled || item.owner !== activeOwner) return;
    if (!('speechSynthesis' in window)) { finishLine(token); return; }
    const utterance = new SpeechSynthesisUtterance(item.text);
    if (item.focus) window.dispatchEvent(new CustomEvent('aircommand:focus', { detail: { ...item.focus, text: item.text } }));
    utterance.rate = narrationSpeed === 1 ? 0.95 : narrationSpeed === 2 ? 1.15 : 1.35;
    utterance.pitch = item.speaker === 'commander' ? 0.82 : 1.12;
    utterance.lang = 'en-IN';
    const voices = window.speechSynthesis.getVoices();
    const indian = voices.filter((voice) => voice.lang.toLowerCase().startsWith('en-in'));
    const english = voices.filter((voice) => voice.lang.toLowerCase().startsWith('en'));
    const available = indian.length ? indian : english;
    const hints = item.speaker === 'commander' ? ['male', 'man', 'rishi', 'prabhat'] : ['female', 'woman', 'neerja', 'heera'];
    const voice = available.find((candidate) => hints.some((hint) => candidate.name.toLowerCase().includes(hint))) ?? available[item.speaker === 'commander' ? 0 : Math.min(1, available.length - 1)];
    if (voice) utterance.voice = voice;
    utterance.onend = () => finishLine(token);
    utterance.onerror = () => finishLine(token);
    window.speechSynthesis.cancel();
    await new Promise<void>((resolve) => window.setTimeout(resolve, 20));
    if (token !== generation || !enabled || item.owner !== activeOwner) return;
    window.speechSynthesis.speak(utterance);
    return;
  }
}

function finishLine(token: number): void {
  if (token !== generation) return;
  speaking = false;
  speakingLine = null;
  void drain();
}

export function narrateEvent(source: string, message: string, _interrupt = false, owner?: string): void {
  if (typeof window === 'undefined') return;
  const narration = narrationFor(source, message);
  if (!narration) return;
  const lineOwner = (owner ?? activeOwner) as VoiceOwner;
  if (!['system', 'demo', 'training', 'simulation', 'mission'].includes(lineOwner)) return;
  const caption = narration.caption ?? narration.text;
  accept({ ...narration, caption, source, owner: lineOwner });
}

export function narrateUtterance(text: string, options: { source?: string; tier?: VoiceTier; focus?: VoiceFocusTarget; speaker?: VoiceCharacter; owner?: VoiceOwner; caption?: string } = {}): void {
  if (typeof window === 'undefined' || !text.trim()) return;
  const source = options.source ?? (options.speaker === 'commander' ? 'COMMANDER' : 'OPS AGENT');
  accept({ text, caption: options.caption ?? text, source, owner: options.owner ?? activeOwner, tier: options.tier ?? 'ADVISORY', focus: options.focus, speaker: options.speaker });
}
