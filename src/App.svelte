<script lang="ts">
  import { onMount } from 'svelte';
  import { system } from './lib/stores/systemStore.svelte';
  import TopBar from './lib/components/layout/TopBar.svelte';
  import TacticalMap from './lib/components/map/TacticalMap.svelte';
  import ScenarioControls from './lib/components/map/ScenarioControls.svelte';
  import AircraftPanel from './lib/components/panels/AircraftPanel.svelte';
  import MissionPanel from './lib/components/panels/MissionPanel.svelte';
  import BaseDetailPanel from './lib/components/panels/BaseDetailPanel.svelte';
  import COAPanel from './lib/components/panels/COAPanel.svelte';
  import ExecutionPanel from './lib/components/panels/ExecutionPanel.svelte';
  import DecisionPrompt from './lib/components/panels/DecisionPrompt.svelte';
  import MissionFlowModal from './lib/components/panels/MissionFlowModal.svelte';
  import LoadoutModal from './lib/components/panels/LoadoutModal.svelte';
  import ReferenceLibrary from './lib/components/panels/ReferenceLibrary.svelte';
  import EventLog from './lib/components/panels/EventLog.svelte';
  import CommanderBriefing from './lib/components/panels/CommanderBriefing.svelte';
  import AfterActionReview from './lib/components/panels/AfterActionReview.svelte';
  import MetricsDashboard from './lib/components/panels/MetricsDashboard.svelte';
  import { driver } from 'driver.js';
  import 'driver.js/dist/driver.css';
  import { DEMO_STEPS } from './lib/demo/demoScript';
  import { demoConfig } from './lib/demo/demoConfig';
  import { PaneGroup, Pane, PaneResizer } from 'paneforge';
  import ShortcutHelp from './lib/components/panels/ShortcutHelp.svelte';
  import GlossaryModal from './lib/components/panels/GlossaryModal.svelte';
  import CommandPalette, { type PaletteCommand } from './lib/components/panels/CommandPalette.svelte';
  import { IAF_BASES } from './lib/data/bases';
  import ModalLayer from './lib/components/panels/ModalLayer.svelte';

  let pending = $derived(system.activeMissions.find((m) => m.pendingDecision) ?? null);
  let flowOpen = $state(false);
  let referenceOpen = $state(false);
  let metricsOpen = $state(false);
  let loadoutOpen = $state(false);
  let loadoutType = $state('Su-30MKI');
  let loadoutTail = $state('');
  let briefingMissionId = $state<string | null>(null);
  let aarMissionId = $state<string | null>(null);
  let assignedAircraftId = $state<string | null>(null);
  let trackLossOpen = $state(false);
  let shortcutHelpOpen = $state(false);
  let glossaryOpen = $state(false);
  let demoCompleteOpen = $state(false);
  let commandPaletteOpen = $state(false);
  let modalStack = $state<string[]>([]);
  let minimizedModals = $state<string[]>([]);
  let leftCollapsed = $state(false);
  let rightCollapsed = $state(false);
  let logCollapsed = $state(false);
  let rightTab = $state<'coa' | 'red' | 'metrics' | 'execution'>('coa');
  let leftPane: { resize: (size: number) => void } | undefined;
  let rightPane: { resize: (size: number) => void } | undefined;
  let logPane: { resize: (size: number) => void } | undefined;
  let shortcutToast = $state('');
  let toastTimer: ReturnType<typeof setTimeout> | undefined;
  let paletteCommands = $derived<PaletteCommand[]>([
    { id: 'act-generate', label: 'Generate COA', category: 'ACTION', keywords: 'plan optimise course of action', kind: 'action' },
    { id: 'act-reference', label: 'Open Reference Library', category: 'ACTION', keywords: 'doctrine reference', kind: 'action' },
    { id: 'act-flow', label: 'Open Mission Flow', category: 'ACTION', keywords: 'timeline phases', kind: 'action' },
    { id: 'act-metrics', label: 'Open Metrics Dashboard', category: 'ACTION', keywords: 'analytics stats', kind: 'action' },
    { id: 'act-glossary', label: 'Open Glossary', category: 'ACTION', keywords: 'terms definitions help', kind: 'action' },
    { id: 'act-shortcuts', label: 'Show Keyboard Shortcuts', category: 'ACTION', keywords: 'hotkeys help', kind: 'action' },
    { id: 'act-demo', label: 'Start Demo', category: 'ACTION', keywords: 'tour walkthrough', kind: 'action' },
    { id: 'act-auto', label: 'Toggle Auto-Opt', category: 'ACTION', keywords: 'continuous reoptimisation', kind: 'action' },
    { id: 'act-degraded', label: 'Toggle Degraded Mode', category: 'ACTION', keywords: 'sensor edge mode', kind: 'action' },
    { id: 'act-reset', label: 'Reset System', category: 'ACTION', keywords: 'restore baseline', kind: 'action' },
    ...system.missions.map((item) => ({ id: `mission-${item.id}`, label: item.name, category: 'MISSION', keywords: `${item.id} ${item.targetType} priority ${item.priority}`, kind: 'mission' as const, targetId: item.id })),
    ...system.aircraft.map((item) => ({ id: `aircraft-${item.id}`, label: `${item.tailNumber} · ${item.type}`, category: 'AIRCRAFT', keywords: `${item.base} ${item.status} ${item.type}`, kind: 'aircraft' as const, targetId: item.id })),
    ...IAF_BASES.map((item) => ({ id: `base-${item.id}`, label: `${item.name} · ${item.code}`, category: 'BASE', keywords: item.id, kind: 'base' as const, targetId: item.id })),
  ]);
  let activeModalIds = $derived([
    ...(pending ? ['decision'] : []), ...(trackLossOpen ? ['track-loss'] : []),
    ...(flowOpen ? ['mission-flow'] : []), ...(loadoutOpen ? ['loadout'] : []),
    ...(referenceOpen ? ['reference'] : []), ...(briefingMissionId ? ['briefing'] : []),
    ...(aarMissionId ? ['aar'] : []), ...(metricsOpen ? ['metrics'] : []),
    ...(shortcutHelpOpen ? ['shortcuts'] : []), ...(glossaryOpen ? ['glossary'] : []),
    ...(demoCompleteOpen ? ['demo-complete'] : []), ...(commandPaletteOpen ? ['command-palette'] : []),
  ]);
  let visibleModalIds = $derived(modalStack.filter((id) => activeModalIds.includes(id) && !minimizedModals.includes(id)).slice(-3));
  let dockedModalIds = $derived(activeModalIds.filter((id) => minimizedModals.includes(id) || !visibleModalIds.includes(id)));
  const modalLabels: Record<string, string> = { decision: 'DECISION', 'track-loss': 'TRACK LOSS', 'mission-flow': 'MISSION FLOW', loadout: 'LOADOUT', reference: 'REFERENCE', briefing: 'BRIEFING', aar: 'AFTER ACTION', metrics: 'METRICS', shortcuts: 'SHORTCUTS', glossary: 'GLOSSARY', 'demo-complete': 'DEMO COMPLETE', 'command-palette': 'COMMAND PALETTE' };

  $effect(() => {
    const open = activeModalIds;
    const next = [...modalStack.filter((id) => open.includes(id)), ...open.filter((id) => !modalStack.includes(id))];
    if (next.join('|') !== modalStack.join('|')) modalStack = next;
    minimizedModals = minimizedModals.filter((id) => open.includes(id));
  });

  function isModalVisible(id: string) { return visibleModalIds.includes(id); }
  function modalZ(id: string) { return 200 + Math.max(0, modalStack.indexOf(id)); }
  function minimizeModal(id: string) { minimizedModals = [...new Set([...minimizedModals, id])]; }
  function restoreModal(id: string) { minimizedModals = minimizedModals.filter((item) => item !== id); modalStack = [...modalStack.filter((item) => item !== id), id]; }
  function closeModal(id: string) {
    if (id === 'decision' && pending) system.dismissDecision(pending.id);
    else if (id === 'track-loss') { system.trackLossAnalysis = null; trackLossOpen = false; }
    else if (id === 'mission-flow') flowOpen = false;
    else if (id === 'loadout') loadoutOpen = false;
    else if (id === 'reference') referenceOpen = false;
    else if (id === 'briefing') briefingMissionId = null;
    else if (id === 'aar') aarMissionId = null;
    else if (id === 'metrics') metricsOpen = false;
    else if (id === 'shortcuts') shortcutHelpOpen = false;
    else if (id === 'glossary') glossaryOpen = false;
    else if (id === 'demo-complete') demoCompleteOpen = false;
    else if (id === 'command-palette') commandPaletteOpen = false;
  }

  function readCollapsedState() {
    try { return JSON.parse(localStorage.getItem('aircommand.panels.v1') ?? '{}') as { left?: boolean; right?: boolean; log?: boolean }; }
    catch { return {}; }
  }

  function persistCollapsedState() {
    localStorage.setItem('aircommand.panels.v1', JSON.stringify({ left: leftCollapsed, right: rightCollapsed, log: logCollapsed }));
  }

  onMount(() => {
    const saved = readCollapsedState();
    leftCollapsed = saved.left ?? false; rightCollapsed = saved.right ?? false; logCollapsed = saved.log ?? false;
    requestAnimationFrame(() => {
      if (leftCollapsed) leftPane?.resize(3);
      if (rightCollapsed) rightPane?.resize(3);
      if (logCollapsed) logPane?.resize(3);
    });
  });

  function toggleLeftPane() { leftCollapsed = !leftCollapsed; persistCollapsedState(); leftPane?.resize(leftCollapsed ? 3 : 18); }
  function toggleRightPane() { rightCollapsed = !rightCollapsed; persistCollapsedState(); rightPane?.resize(rightCollapsed ? 3 : 22); }
  function toggleLogPane() { logCollapsed = !logCollapsed; persistCollapsedState(); logPane?.resize(logCollapsed ? 3 : 15); }

  $effect(() => {
    if (system.aarQueue.length > 0 && !aarMissionId) {
      aarMissionId = system.consumeAAR();
    }
  });

  $effect(() => {
    if (system.trackLossAnalysis && !trackLossOpen) {
      trackLossOpen = true;
    }
  });

  function handleDecision(branchId: string) {
    if (pending) system.resolveDecision(pending.id, branchId);
  }

  function handleTrackLossDecision(option: { id: string; label: string }) {
    if (!system.trackLossAnalysis) return;
    const analysis = system.trackLossAnalysis;
    
    if (option.id === 'investigate') {
      system.pushEvent('COMMAND', `RE-TASK AIRCRAFT TO INVESTIGATE · ${analysis.trackId}`, 'info');
      system.addThreat({
        id: `th-investigate-${Date.now()}`,
        type: 'RADAR',
        position: { lat: analysis.context.includes('34.2000') ? 34.2 : 34.2, lng: analysis.context.includes('77.8000') ? 77.8 : 77.8 },
        radius: 40,
        probability: 65,
        confidence: 70,
      });
    } else if (option.id === 'backup') {
      system.pushEvent('RADAR', 'BACKUP RADAR ACTIVATED · SEARCH PATTERN INITIATED', 'ok');
    } else if (option.id === 'reallocate') {
      system.pushEvent('DEFENCE', 'DEFENCES REALLOCATED · ASSUME HOSTILE PENETRATION', 'alert');
      system.threats = [...system.threats, {
        id: `th-spoof-${Date.now()}`,
        type: 'AIR',
        position: { lat: 34.2, lng: 77.8 },
        radius: 60,
        probability: 75,
        confidence: 60,
      }];
    }
    
    system.trackLossAnalysis = null;
    trackLossOpen = false;
  }

  function openLoadout(type: string, tail: string) {
    loadoutType = type;
    loadoutTail = tail;
    loadoutOpen = true;
  }

  function handleApprove() {
    if (!briefingMissionId) return;
    const missionId = briefingMissionId;
    const coa = system.coas.find((c) => c.id === system.selectedCoaId) ?? system.coas[0];
    if (!coa) return;
    const ids = assignedAircraftId ? [assignedAircraftId] : coa.assignments[missionId] ?? [];
    if (ids.length === 0) return;
    const mission = system.missions.find((m) => m.id === missionId);
    if (!mission) return;

    const map: Record<string, string> = {
      'hardened-bunker': 'sindoor_deep',
      'radar-site': 'sead_suppression',
      'troop-concentration': 'balakot',
      'c2-node': 'sindoor_deep',
      'bridge': 'sindoor_deep',
      'fuel-depot': 'sindoor_deep',
      'runway': 'sindoor_deep',
      'ship': 'sead_suppression',
      'aircraft': 'sead_suppression',
    };
    const templateId = map[mission.targetType] ?? 'sindoor_deep';
    system.startMission(missionId, ids, templateId);
    assignedAircraftId = null;
    briefingMissionId = null;
  }

  function startDemo() {
    const steps = DEMO_STEPS.map((s) => ({
      element: s.element,
      popover: {
        title: s.title,
        description: s.description,
        side: s.side,
        align: 'center' as const,
      },
      onHighlightStarted: () => {
        if (s.action) {
          s.action();
        }
      },
    }));

    const driverObj = driver({
      ...demoConfig,
      steps,
      onNextClick: (_element, _step, { driver }) => {
        if (driver.getActiveIndex() === DEMO_STEPS.length - 1) {
          driver.destroy();
          demoCompleteOpen = true;
        } else driver.moveNext();
      },
      onDestroyStarted: () => {
        driverObj.destroy();
      },
    });

    driverObj.drive();
  }

  function runShortcut(key: string) {
    const actions: Record<string, () => void> = {
      g: () => system.generateCOAs(), r: () => referenceOpen = true,
      f: () => flowOpen = true, m: () => metricsOpen = true, d: startDemo,
    };
    actions[key]?.();
    const labels: Record<string, string> = { g: 'GENERATE COA', r: 'REFERENCE', f: 'MISSION FLOW', m: 'METRICS', d: 'DEMO' };
    if (labels[key]) {
      shortcutToast = `SHORTCUT: ${labels[key]}`;
      if (toastTimer) clearTimeout(toastTimer);
      toastTimer = setTimeout(() => shortcutToast = '', 1200);
    }
  }

  function handleGlobalKeydown(event: KeyboardEvent) {
    if (event.ctrlKey && event.key.toLowerCase() === 'k') { event.preventDefault(); commandPaletteOpen = true; return; }
    const target = event.target as HTMLElement | null;
    if (target?.matches('input, textarea, [contenteditable]')) return;
    if (event.key === 'Escape') {
      const topModal = [...modalStack].reverse().find((id) => activeModalIds.includes(id) && !minimizedModals.includes(id));
      if (topModal) { closeModal(topModal); return; }
      if (commandPaletteOpen) { commandPaletteOpen = false; return; }
      if (glossaryOpen) glossaryOpen = false;
      else if (shortcutHelpOpen) shortcutHelpOpen = false;
      else if (metricsOpen) metricsOpen = false;
      else if (referenceOpen) referenceOpen = false;
      else if (flowOpen) flowOpen = false;
      else if (loadoutOpen) loadoutOpen = false;
      else if (trackLossOpen) { system.trackLossAnalysis = null; trackLossOpen = false; }
      else if (demoCompleteOpen) demoCompleteOpen = false;
      else if (pending) system.dismissDecision(pending.id);
      return;
    }
    if (event.ctrlKey && event.key.toLowerCase() === 'b') { event.preventDefault(); toggleLogPane(); return; }
    if (event.ctrlKey && event.key.toLowerCase() === 'l') { event.preventDefault(); toggleLeftPane(); return; }
    if (event.ctrlKey && ['1', '2', '3', '4'].includes(event.key)) {
      event.preventDefault();
      rightTab = ({ '1': 'coa', '2': 'red', '3': 'metrics', '4': 'execution' } as const)[event.key as '1' | '2' | '3' | '4'];
      return;
    }
    if (event.key === '?') { shortcutHelpOpen = true; return; }
    if (['1', '2', '3'].includes(event.key)) {
      const coa = system.coas.find((item) => item.rank === Number(event.key));
      if (coa) system.selectCOA(coa.id);
      return;
    }
    runShortcut(event.key.toLowerCase());
  }

  function selectPaletteCommand(command: PaletteCommand) {
    commandPaletteOpen = false;
    if (command.kind === 'mission' && command.targetId) { briefingMissionId = command.targetId; return; }
    if (command.kind === 'aircraft' && command.targetId) {
      const aircraft = system.aircraft.find((item) => item.id === command.targetId);
      if (aircraft) openLoadout(aircraft.type, aircraft.tailNumber);
      return;
    }
    if (command.kind === 'base' && command.targetId) { system.selectBase(command.targetId); return; }
    const actions: Record<string, () => void> = {
      'act-generate': () => system.generateCOAs(), 'act-reference': () => referenceOpen = true,
      'act-flow': () => flowOpen = true, 'act-metrics': () => metricsOpen = true,
      'act-glossary': () => glossaryOpen = true, 'act-shortcuts': () => shortcutHelpOpen = true,
      'act-demo': startDemo, 'act-auto': () => system.toggleContinuousReoptimization(),
      'act-degraded': () => system.setMode(system.mode === 'DEGRADED' ? 'NORMAL' : 'DEGRADED'),
      'act-reset': () => system.reset(),
    };
    actions[command.id]?.();
  }

  function toggleMapLayer(layer: string) {
    window.dispatchEvent(new CustomEvent('aircommand:map-layer', { detail: layer }));
  }
</script>

<svelte:window onkeydown={handleGlobalKeydown} />
<div class="shell">
  <TopBar
    aircraftCount={system.aircraft.length}
    missionCount={system.missions.length}
    threatCount={system.threats.length}
    onFlowClick={() => (flowOpen = true)}
    onReferenceClick={() => (referenceOpen = true)}
    onMetricsClick={() => (metricsOpen = true)}
    onDemoClick={startDemo}
    onGlossaryClick={() => glossaryOpen = true}
    onShortcutHelpClick={() => shortcutHelpOpen = true}
    onGenerate={() => system.generateCOAs()}
    onReset={() => system.reset()}
    onDegradedToggle={() => system.setMode(system.mode === 'DEGRADED' ? 'NORMAL' : 'DEGRADED')}
    onLayerToggle={toggleMapLayer}
    demoActive={false}
    modalCount={activeModalIds.length}
  />

  <PaneGroup direction="vertical" autoSaveId="aircommand.layout.v1" class="workspace-layout">
    <Pane defaultSize={85} minSize={60}>
      <PaneGroup direction="horizontal" autoSaveId="aircommand.layout.v1.panels" class="content-layout">
        <Pane bind:this={leftPane} defaultSize={18} minSize={3} maxSize={30}>
          {#if leftCollapsed}<div class="collapsed-rail"><button title="Expand aircraft and mission panels" aria-label="Expand left panels" onclick={toggleLeftPane}>»</button><span>A</span><span>M</span></div>
          {:else if system.selectedBaseId}<BaseDetailPanel onLoadoutClick={openLoadout} />
          {:else}<aside class="left"><AircraftPanel onCollapse={toggleLeftPane} onLoadout={openLoadout} onAssign={(aircraftId, missionId) => { assignedAircraftId = aircraftId; briefingMissionId = missionId; }} /><MissionPanel onMissionSelect={(id) => (briefingMissionId = id)} onCollapse={toggleLeftPane} /></aside>{/if}
        </Pane>
        <PaneResizer class="pane-resizer" />
        <Pane defaultSize={60} minSize={40}>
          <section class="center">
            <TacticalMap onBaseSelect={(id) => system.selectBase(id)} onLoadoutClick={openLoadout} />
            <ScenarioControls />
            {#if system.computing}<div class="computing mono">◢ COMPUTING COA · NSGA-II · 4 OBJECTIVES</div>{/if}
          </section>
        </Pane>
        <PaneResizer class="pane-resizer" />
        <Pane bind:this={rightPane} defaultSize={22} minSize={3} maxSize={35}>
          {#if rightCollapsed}<div class="collapsed-rail"><button title="Expand COA panel" aria-label="Expand right panel" onclick={toggleRightPane}>«</button><span>C</span></div>
          {:else}
            <div class="right-wrap">
              <div class="right-tabs" role="tablist" aria-label="Right panel">
                <button role="tab" aria-selected={rightTab === 'coa'} class:active={rightTab === 'coa'} onclick={() => rightTab = 'coa'}>COA</button>
                <button role="tab" aria-selected={rightTab === 'red'} class:active={rightTab === 'red'} onclick={() => rightTab = 'red'}>RED VIEW</button>
                <button role="tab" aria-selected={rightTab === 'metrics'} class:active={rightTab === 'metrics'} onclick={() => rightTab = 'metrics'}>METRICS</button>
                <button role="tab" aria-selected={rightTab === 'execution'} class:active={rightTab === 'execution'} onclick={() => rightTab = 'execution'}>EXECUTION</button>
                <button class="right-collapse" aria-label="Collapse right panel" title="Collapse right panel" onclick={toggleRightPane}>›</button>
              </div>
              <div class="right-tab-content">
                {#if rightTab === 'coa'}<COAPanel mode="blue" />
                {:else if rightTab === 'red'}<COAPanel mode="red" />
                {:else if rightTab === 'metrics'}<MetricsDashboard open={true} inline={true} />
                {:else}<ExecutionPanel />{/if}
              </div>
            </div>
          {/if}
        </Pane>
      </PaneGroup>
    </Pane>
    <PaneResizer class="pane-resizer vertical-resizer" />
    <Pane bind:this={logPane} defaultSize={15} minSize={3} maxSize={40}><EventLog collapsed={logCollapsed} onToggle={toggleLogPane} /></Pane>
  </PaneGroup>
</div>

{#if pending?.pendingDecision}
  <ModalLayer label={modalLabels.decision} zIndex={modalZ('decision')} visible={isModalVisible('decision')} onMinimize={() => minimizeModal('decision')}><DecisionPrompt
    open={true}
    title={pending.pendingDecision.title}
    context={pending.pendingDecision.context}
    message={pending.pendingDecision.message}
    options={pending.pendingDecision.options ?? pending.pendingDecision.branches.map((b) => ({
      id: b.id,
      label: b.label,
      description: b.description,
      tag: b.tag,
      tagColor: b.tagColor,
    }))}
    onSelect={(o) => handleDecision(o.id)}
    onClose={() => system.dismissDecision(pending!.id)}
  /></ModalLayer>
{/if}

{#if system.trackLossAnalysis}
  <ModalLayer label={modalLabels['track-loss']} zIndex={modalZ('track-loss')} visible={isModalVisible('track-loss')} onMinimize={() => minimizeModal('track-loss')}><DecisionPrompt
    open={trackLossOpen}
    title="TRACK LOSS ANALYSIS"
    context={system.trackLossAnalysis.context}
    message={`Bayesian hypothesis analysis indicates ${system.trackLossAnalysis.topHypothesis} with ${Math.round(system.trackLossAnalysis.confidence * 100)}% confidence. Hypotheses: CRASH ${Math.round(system.trackLossAnalysis.hypotheses.CRASH * 100)}%, ELECTRONIC JAMMING ${Math.round(system.trackLossAnalysis.hypotheses.ELECTRONIC_JAMMING * 100)}%, STEALTH MANEUVER ${Math.round(system.trackLossAnalysis.hypotheses.STEALTH_MANEUVER * 100)}%, TERRAIN MASKING ${Math.round(system.trackLossAnalysis.hypotheses.TERRAIN_MASKING * 100)}%.`}
    options={[
      { id: 'investigate', label: 'Re-task aircraft to investigate', description: 'Dispatch nearest asset to last known position for visual confirmation.' },
      { id: 'backup', label: 'Activate backup radar', description: 'Bring secondary surveillance radar online to search the sector.' },
      { id: 'reallocate', label: 'Assume hostile penetration', description: 'Reallocate defensive assets assuming track represents hostile aircraft.' },
    ]}
    onSelect={handleTrackLossDecision}
    onClose={() => { system.trackLossAnalysis = null; trackLossOpen = false; }}
  /></ModalLayer>
{/if}

{#if flowOpen}<ModalLayer label={modalLabels['mission-flow']} zIndex={modalZ('mission-flow')} visible={isModalVisible('mission-flow')} onMinimize={() => minimizeModal('mission-flow')}><MissionFlowModal open={flowOpen} onClose={() => (flowOpen = false)} /></ModalLayer>{/if}
{#if loadoutOpen}<ModalLayer label={modalLabels.loadout} zIndex={modalZ('loadout')} visible={isModalVisible('loadout')} onMinimize={() => minimizeModal('loadout')}><LoadoutModal open={loadoutOpen} aircraftType={loadoutType} tailNumber={loadoutTail} onClose={() => (loadoutOpen = false)} /></ModalLayer>{/if}
{#if referenceOpen}<ModalLayer label={modalLabels.reference} zIndex={modalZ('reference')} visible={isModalVisible('reference')} onMinimize={() => minimizeModal('reference')}><ReferenceLibrary open={referenceOpen} onClose={() => (referenceOpen = false)} /></ModalLayer>{/if}
{#if briefingMissionId}<ModalLayer label={modalLabels.briefing} zIndex={modalZ('briefing')} visible={isModalVisible('briefing')} onMinimize={() => minimizeModal('briefing')}><CommanderBriefing
  open={briefingMissionId !== null}
  missionId={briefingMissionId}
  onApprove={handleApprove}
  onClose={() => (briefingMissionId = null)}
/></ModalLayer>{/if}
{#if aarMissionId}<ModalLayer label={modalLabels.aar} zIndex={modalZ('aar')} visible={isModalVisible('aar')} onMinimize={() => minimizeModal('aar')}><AfterActionReview
  missionId={aarMissionId}
  onClose={() => (aarMissionId = null)}
  onReplay={(id) => {
    system.replayMission(id);
    aarMissionId = null;
  }}
/></ModalLayer>{/if}
{#if metricsOpen}<ModalLayer label={modalLabels.metrics} zIndex={modalZ('metrics')} visible={isModalVisible('metrics')} onMinimize={() => minimizeModal('metrics')}><MetricsDashboard open={metricsOpen} onClose={() => (metricsOpen = false)} /></ModalLayer>{/if}
{#if shortcutHelpOpen}<ModalLayer label={modalLabels.shortcuts} zIndex={modalZ('shortcuts')} visible={isModalVisible('shortcuts')} onMinimize={() => minimizeModal('shortcuts')}><ShortcutHelp open={shortcutHelpOpen} onClose={() => shortcutHelpOpen = false} /></ModalLayer>{/if}
{#if glossaryOpen}<ModalLayer label={modalLabels.glossary} zIndex={modalZ('glossary')} visible={isModalVisible('glossary')} onMinimize={() => minimizeModal('glossary')}><GlossaryModal open={glossaryOpen} onClose={() => glossaryOpen = false} /></ModalLayer>{/if}
{#if commandPaletteOpen}<ModalLayer label={modalLabels['command-palette']} zIndex={modalZ('command-palette')} visible={isModalVisible('command-palette')} onMinimize={() => minimizeModal('command-palette')}><CommandPalette open={commandPaletteOpen} commands={paletteCommands} onClose={() => commandPaletteOpen = false} onSelect={selectPaletteCommand} /></ModalLayer>{/if}
{#if demoCompleteOpen}
  <ModalLayer label={modalLabels['demo-complete']} zIndex={modalZ('demo-complete')} visible={isModalVisible('demo-complete')} onMinimize={() => minimizeModal('demo-complete')}><div class="overlay" role="presentation">
    <section class="demo-complete" role="dialog" aria-modal="true" aria-label="Demo complete">
      <h2>DEMO COMPLETE</h2><p>You are now free to explore.</p>
      <div><button onclick={() => { demoCompleteOpen = false; system.generateCOAs(); }}>▸ GENERATE COA NOW</button><button onclick={() => demoCompleteOpen = false}>◈ EXPLORE FREELY</button></div>
    </section>
  </div></ModalLayer>
{/if}
{#if dockedModalIds.length > 0}<div class="modal-dock" aria-label="Minimized modals">{#each dockedModalIds as id (id)}<button title="Restore {modalLabels[id]}" aria-label="Restore {modalLabels[id]}" onclick={() => restoreModal(id)}>{modalLabels[id]}</button>{/each}</div>{/if}
{#if shortcutToast}<div class="shortcut-toast">{shortcutToast}</div>{/if}

<style>
  :global(html, body) { margin: 0; padding: 0; overflow: hidden; background: var(--bg-base); }
  :global(#app) { width: 100vw; height: 100vh; }

  .shell {
    width: 100vw; height: 100vh;
    display: flex;
    flex-direction: column;
    background: #1a242e;
    gap: 1px;
  }
  :global(.workspace-layout) { flex: 1; min-height: 0; }
  :global(.content-layout) { width: 100%; height: 100%; }
  :global(.content-layout [data-pane]), :global(.workspace-layout [data-pane]) { transition:flex-basis .2s ease; }
  .left { display: grid; grid-template-rows: minmax(0, 1.15fr) minmax(0, 1fr); gap: 1px; background: #1a242e; overflow: hidden; height: 100%; }
  .right-wrap { position:relative; height:100%; display:flex; flex-direction:column; background:var(--bg-panel); }
  .right-tabs { display:flex; align-items:stretch; flex:none; border-bottom:1px solid var(--border-subtle); background:var(--bg-base); }
  .right-tabs button { flex:1; padding:9px 4px; border:0; border-bottom:2px solid transparent; background:transparent; color:var(--text-muted); font:8px var(--font-mono); letter-spacing:.1em; cursor:pointer; transition:color .18s,border-color .18s; }
  .right-tabs button:hover,.right-tabs button.active { color:var(--accent-cyan); }
  .right-tabs button.active { border-bottom-color:var(--accent-cyan); }
  .right-tabs button.right-collapse { flex:none; padding:0 8px; font-size:14px; }
  .right-tab-content { flex:1; min-height:0; overflow:hidden; position:relative; }
  :global(.collapsed-rail) { display:flex; flex-direction:column; align-items:center; gap:12px; height:100%; padding:8px 0; background:var(--bg-panel); color:var(--accent-cyan); font:9px var(--font-mono); box-sizing:border-box; }
  :global(.collapsed-rail button), :global(.collapse-btn) { background:transparent; border:0; color:var(--accent-cyan); font:14px var(--font-mono); cursor:pointer; padding:4px; }
  :global(.collapsed-rail button:focus-visible), :global(.collapse-btn:focus-visible) { outline:1px solid var(--accent-cyan); }
  .center { position: relative; overflow: hidden; background: #05080f; height: 100%; }
  :global(.pane-resizer) { width: 2px; height: 2px; background: var(--border-subtle); flex-shrink: 0; transition: background .15s; }
  :global(.pane-resizer:hover), :global(.pane-resizer[data-resize-handle-active]) { background: var(--accent-cyan); }
  :global(.vertical-resizer) { width: 100%; }
  .shortcut-toast { position: fixed; top: 46px; left: 50%; transform: translateX(-50%); z-index: 100; padding: 8px 14px; color: var(--accent-cyan); background: var(--bg-panel); border: 1px solid var(--accent-cyan); font: 10px var(--font-mono); letter-spacing: .14em; }
  .overlay { position:fixed; inset:0; z-index:95; display:grid; place-items:center; background:rgba(0,0,0,.72); }
  .demo-complete { width:min(500px,92vw); padding:26px; text-align:center; background:var(--bg-panel); border:1px solid var(--accent-cyan); color:var(--text-secondary); font-family:var(--font-mono); }
  .demo-complete h2 { color:var(--accent-cyan); letter-spacing:.18em; font-size:13px; }
  .demo-complete p { color:var(--text-muted); font-size:11px; }
  .demo-complete div { display:flex; justify-content:center; gap:10px; margin-top:22px; }
  .demo-complete button { padding:9px 12px; background:transparent; border:1px solid var(--border-strong); color:var(--accent-cyan); font:9px var(--font-mono); cursor:pointer; }
  .modal-dock { position:fixed; right:12px; bottom:12px; z-index:500; display:flex; flex-direction:column; gap:5px; }
  .modal-dock button { padding:7px 9px; background:var(--bg-panel); border:1px solid var(--accent-cyan); color:var(--accent-cyan); font:8px var(--font-mono); cursor:pointer; }

  .computing {
    position: absolute; top: 16px; left: 50%; transform: translateX(-50%);
    font-family: var(--font-mono); font-size: 10px; letter-spacing: 0.18em;
    color: var(--accent-cyan);
    background: rgba(5,6,8,0.9);
    border: 1px solid var(--accent-cyan);
    padding: 6px 14px;
    box-shadow: 0 0 16px rgba(0,212,255,0.4);
    animation: pulse 0.9s ease-in-out infinite;
    z-index: 6;
  }
  .mono { font-family: var(--font-mono); }
</style>
