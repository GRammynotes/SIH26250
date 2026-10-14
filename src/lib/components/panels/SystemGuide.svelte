<script lang="ts">
  import { system } from '../../stores/systemStore.svelte';
  import { narrateUtterance } from '../../engine/voice';
  let { open = false, onClose, onNavigate }: { open?: boolean; onClose?: () => void; onNavigate?: (panel: string) => void } = $props();
  type Message = { from: 'guide' | 'user'; text: string; actions?: { label: string; panel: string }[] };
  let messages = $state<Message[]>([{ from: 'guide', text: 'AIR COMMAND SYSTEM GUIDE. Ask how to use the map, scenarios, aircraft, missions, COA, threats, or simulation. I answer only questions about this console.' }]);
  let query = $state('');
  function answer(raw: string) {
    const q = raw.trim(); if (!q) return;
    messages = [...messages, { from: 'user', text: q }]; query = '';
    const text = q.toLowerCase();
    let response = 'I can help only with AIR COMMAND system use: map layers, scenarios, aircraft readiness, missions, threats, courses of action, execution, voice, and the training simulation. Try one of those topics.';
    let actions: Message['actions'] = [];
    if (/map|zoom|layer|symbol|diagram/.test(text)) { response = 'The theater map shows the current scenario picture. Use VIEW to toggle overlays, select a scenario to focus its area, or select a diagram area in Reference to zoom and read its tactical context.'; actions = [{ label: 'OPEN REFERENCE', panel: 'reference' }]; }
    else if (/scenario|radar loss|aircraft nmc|deep strike|sead|multi.crisis|track loss|data poisoning/.test(text)) { response = `Scenario filter: ${system.activeScenarioFilter?.replaceAll('_', ' ').toUpperCase() ?? 'GLOBAL VIEW'}. Select a scenario bar entry to align map, roster, mission list, and event log; select GLOBAL VIEW to clear it.`; actions = [{ label: 'MISSION FLOW', panel: 'flow' }]; }
    else if (/aircraft|roster|fmc|pmc|nmc|fuel|tail/.test(text)) { response = `Force roster: ${system.scenarioAircraft.length} aircraft in the current view (${system.scenarioAircraft.filter((item) => item.status === 'FMC').length} FMC). Open a tail for loadout and readiness; use ASSIGN to pair it with a mission.`; actions = [{ label: 'FORCE ROSTER', panel: 'roster' }]; }
    else if (/mission|target|execute|launch|brief/.test(text)) { response = `${system.scenarioMissions.length} missions are in the current scenario. Open a mission briefing to inspect target and constraints, assign aircraft, then approve the tasking. Active packages: ${system.activeMissions.length}.`; actions = [{ label: 'MISSION FLOW', panel: 'flow' }]; }
    else if (/coa|course|recommend|plan|optimi/.test(text)) { response = `${system.coas.length} courses of action are available. Compare risk, time, and mission coverage; the highlighted recommendation is a decision aid. The commander retains the selection.`; actions = [{ label: 'OPEN COA', panel: 'coa' }]; }
    else if (/threat|sam|enemy|red view/.test(text)) { response = `${system.scenarioThreats.length} threats are in the current scenario picture. Threat overlays and rings are map context; RED VIEW summarizes adversary response assumptions.`; actions = [{ label: 'RED VIEW', panel: 'red' }]; }
    else if (/voice|narrat|caption/.test(text)) response = 'Voice narration is controlled by the ◈ VOICE toggle in the top bar. Narration also produces synchronized captions; browser speech availability depends on installed system voices.';
    else if (/simulation|history|historical/.test(text)) { response = 'The autonomous historical exercise briefs a case, starts a training mission, explains phase changes, and pauses at historical decision points. Recommendations are shown and can be overridden.'; actions = [{ label: 'START TRAINING', panel: 'simulation' }]; }
    else if (/demo|walkthrough|tour|comprehensive/.test(text)) { response = 'The comprehensive demo provides a full walkthrough of the AIR COMMAND system, explaining all components, military terminology, and the complete operational workflow from planning to execution. The system is locked during the demo.'; actions = [{ label: 'START DEMO', panel: 'demo' }]; }
    messages = [...messages, { from: 'guide', text: response, actions }].slice(-30);
    narrateUtterance(response, { source: 'SYSTEM GUIDE', speaker: 'agent' });
  }
  function navigate(panel: string) { onNavigate?.(panel); }
</script>

{#if open}
  <div class="guide" role="dialog" aria-modal="false" aria-label="AIR COMMAND System Guide">
    <header><div><span>◈ AIR COMMAND · HELP DESK</span><small>SYSTEM KNOWLEDGE ONLY</small></div><button aria-label="Close system guide" title="Close system guide" onclick={() => onClose?.()}>×</button></header>
    <div class="quick" aria-label="Common system guide topics">{#each ['Map layers', 'Scenarios', 'Aircraft readiness', 'COA', 'Simulation', 'Demo'] as item}<button onclick={() => answer(item)}>{item}</button>{/each}</div>
    <div class="messages" aria-live="polite">{#each messages as message, index (`${index}-${message.from}`)}<article class:mine={message.from === 'user'}><small>{message.from === 'user' ? 'COMMANDER' : 'OPS GUIDE'}</small><p>{message.text}</p>{#if message.actions?.length}<div class="actions">{#each message.actions as action}<button onclick={() => navigate(action.panel)}>{action.label} ↗</button>{/each}</div>{/if}</article>{/each}</div>
    <form onsubmit={(event) => { event.preventDefault(); answer(query); }}><input bind:value={query} aria-label="Ask about AIR COMMAND" placeholder="Ask about this system…" /><button type="submit" aria-label="Send system question">SEND</button></form>
    <footer>OUT OF SCOPE QUESTIONS ARE NOT ANSWERED</footer>
  </div>
{/if}

<style>
  .guide { position:fixed; z-index:170; right:14px; bottom:50px; width:min(380px,calc(100vw - 24px)); height:min(560px,calc(100vh - 90px)); display:flex; flex-direction:column; color:var(--text-primary); background:rgba(5,8,15,.98); border:1px solid var(--accent-cyan); box-shadow:0 12px 45px rgba(0,0,0,.6); font-family:var(--font-sans); }
  header { display:flex; justify-content:space-between; padding:11px 12px; border-bottom:1px solid var(--border-subtle); } header span,footer { color:var(--accent-cyan); font:9px var(--font-mono); letter-spacing:.12em; } header small { display:block; margin-top:4px; color:var(--text-muted); font:8px var(--font-mono); letter-spacing:.1em; } header button { border:0; color:var(--text-muted); background:none; font-size:20px; cursor:pointer; }
  .quick { display:flex; gap:5px; padding:7px; overflow:auto; border-bottom:1px solid var(--border-subtle); } button { cursor:pointer; } .quick button,.actions button { white-space:nowrap; padding:6px; color:var(--text-secondary); background:transparent; border:1px solid var(--border-subtle); font:8px var(--font-mono); } .quick button:hover,.actions button:hover { color:var(--accent-cyan); border-color:var(--accent-cyan); }
  .messages { flex:1; overflow:auto; padding:10px; } article { margin-bottom:8px; padding:8px; border-left:2px solid var(--accent-cyan); background:rgba(0,212,255,.035); } article.mine { border-left-color:var(--accent-amber); background:rgba(255,184,0,.035); } article small { color:var(--accent-cyan); font:8px var(--font-mono); letter-spacing:.12em; } article.mine small { color:var(--accent-amber); } article p { margin:4px 0 0; color:var(--text-secondary); font:11px/1.5 var(--font-sans); } .actions { display:flex; gap:5px; margin-top:7px; }
  form { display:flex; gap:6px; padding:8px; border-top:1px solid var(--border-subtle); } input { min-width:0; flex:1; padding:8px; color:var(--text-primary); background:#0b111d; border:1px solid var(--border-strong); font:11px var(--font-sans); } input:focus { outline:1px solid var(--accent-cyan); } form button { padding:0 9px; color:var(--accent-cyan); background:transparent; border:1px solid var(--accent-cyan); font:8px var(--font-mono); } footer { padding:7px 9px; font-size:7px; color:var(--text-muted); border-top:1px solid var(--border-subtle); }
</style>
