<script lang="ts">
  import { onMount } from 'svelte';
  import type { Component } from 'svelte';
  import { system } from './lib/stores/systemStore.svelte';
  import TopBar from './lib/components/layout/TopBar.svelte';
  import ScenarioBar from './lib/components/layout/ScenarioBar.svelte';
  import AircraftPanel from './lib/components/panels/AircraftPanel.svelte';
  import MissionPanel from './lib/components/panels/MissionPanel.svelte';
  import BaseDetailPanel from './lib/components/panels/BaseDetailPanel.svelte';
  import COAPanel from './lib/components/panels/COAPanel.svelte';
  import ExecutionPanel from './lib/components/panels/ExecutionPanel.svelte';
  import DecisionPrompt from './lib/components/panels/DecisionPrompt.svelte';
  import EventLog from './lib/components/panels/EventLog.svelte';
  import CommanderBriefing from './lib/components/panels/CommanderBriefing.svelte';
  import { PaneGroup, Pane, PaneResizer } from 'paneforge';
  import ShortcutHelp from './lib/components/panels/ShortcutHelp.svelte';
  import GlossaryModal from './lib/components/panels/GlossaryModal.svelte';
  import CommandPalette, { type PaletteCommand } from './lib/components/panels/CommandPalette.svelte';
  import { IAF_BASES } from './lib/data/bases';
  import ModalLayer from './lib/components/panels/ModalLayer.svelte';
  import TooltipLayer from './lib/components/layout/TooltipLayer.svelte';
  import WeaponMatrix from './lib/components/panels/WeaponMatrix.svelte';
  import PrioritizationSlider from './lib/components/panels/PrioritizationSlider.svelte';
  import CyberPanel from './lib/components/panels/CyberPanel.svelte';
  import CommandStatus from './lib/components/panels/CommandStatus.svelte';
  import CaptionLayer from './lib/components/overlay/CaptionLayer.svelte';
  import FocusPointer from './lib/components/overlay/FocusPointer.svelte';
  import SystemGuide from './lib/components/panels/SystemGuide.svelte';
import MissionIOFlow from './lib/components/panels/MissionIOFlow.svelte';
  import ComprehensiveDemo from './lib/components/rail/ComprehensiveDemo.svelte';
  import ArcViewer from './lib/components/rail/ArcViewer.svelte';
  import EntityDetail from './lib/components/rail/EntityDetail.svelte';
  import WeaponDetail from './lib/components/panels/WeaponDetail.svelte';
  import { preloadModelAssets } from './lib/three/modelAssets';
import { narrateUtterance, setVoiceOwner } from './lib/engine/voice';
  import { distanceKm, focusMapElements } from './lib/engine/mapNarrative';
  import { HISTORICAL_MISSIONS, type DecisionBranch } from './lib/data/historicalMissions';

  let pending = $derived(system.activeMissions.find((m) => m.pendingDecision) ?? null);
  let decisionProcessing = $state(false);
  let decisionImpact = $state<{ lines: string[]; branchLabel: string } | null>(null);
  let decisionTimer: ReturnType<typeof setTimeout> | undefined;
  let impactTimer: ReturnType<typeof setTimeout> | undefined;
  let TacticalMap = $state<Component<any> | null>(null);
  let MissionFlowModal = $state<Component<any> | null>(null);
  let LoadoutModal = $state<Component<any> | null>(null);
  let ReferenceLibrary = $state<Component<any> | null>(null);
  let AfterActionReview = $state<Component<any> | null>(null);
  let MetricsDashboard = $state<Component<any> | null>(null);
  let metricsImportError = $state(false);
  let SimulationModal = $state<Component<any> | null>(null);
  let ProbabilisticSimulation = $state<Component<any> | null>(null);
  let simulationOpen = $state(false);
  let probabilisticSimOpen = $state(false);
  let systemGuideOpen = $state(false);
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
  let demoActive = $state(false);
  let comprehensiveDemoOpen = $state(false);
  let railMode = $state<'demo' | 'training' | 'sim' | null>(null);
  let arcViewer = $state<{ entityType: 'aircraft' | 'missile'; entityId: string; missionId: string } | null>(null);
  let entityDetail = $state<{ type: string; id: string } | null>(null);
  let weaponDetail = $state<string | null>(null);
  let detailPreviousRail = $state<'demo' | 'training' | 'sim' | null>(null);
  let railExitTimer: ReturnType<typeof setTimeout> | undefined;
  type PastDecision = { at: number; title: string; choice: string };
  let pastDecisions = $state<PastDecision[]>([]);
  let pastDecisionsExpanded = $state(false);
  let welcomeOpen = $state(false);
  let mapFocusLocked = $state(true);
  let commandPaletteOpen = $state(false);
  let modalStack = $state<string[]>([]);
  let minimizedModals = $state<string[]>([]);
  let leftCollapsed = $state(false);
  let rightCollapsed = $state(false);
  let logCollapsed = $state(false);
  let bottomExpanded = $state(false);
  let mapFullscreen = $state(false);
  let panelVisibility = $state({ forceRoster: true, missions: true, theaterMap: true, coa: true, missionLog: true, commandStatus: true, scenarioBar: true });
  let savedLeftSize = 18;
  let savedRightSize = 22;
  let rightTab = $state<'coa' | 'red' | 'metrics' | 'execution' | 'weapons' | 'cyber' | 'flow'>('coa');
  let focusMode = $state(false);
  let leftPanelTab = $state<'roster' | 'missions'>('roster');
  let leftPane = $state<{ resize: (size: number) => void; getSize?: () => number }>();
  let rightPane = $state<{ resize: (size: number) => void; getSize?: () => number }>();
  let shortcutToast = $state('');
  let exitExperienceConfirm = $state(false);
  let resetConfirm = $state(false);
  let unreadLogCount = $state(0);
  let previousLogCount = system.events.length;
  let dockOverflowOpen = $state(false);
  let toastTimer: ReturnType<typeof setTimeout> | undefined;
  let paletteCommands = $derived<PaletteCommand[]>([
    { id: 'act-generate', label: 'Generate COA', category: 'ACTION', keywords: 'plan optimise course of action', kind: 'action' },
    { id: 'act-reference', label: 'Open Reference Library', category: 'ACTION', keywords: 'doctrine reference', kind: 'action' },
    { id: 'act-flow', label: 'Open Mission Flow', category: 'ACTION', keywords: 'timeline phases', kind: 'action' },
    { id: 'act-metrics', label: 'Open Metrics Dashboard', category: 'ACTION', keywords: 'analytics stats', kind: 'action' },
    { id: 'act-glossary', label: 'Open Glossary', category: 'ACTION', keywords: 'terms definitions help', kind: 'action' },
    { id: 'act-shortcuts', label: 'Show Keyboard Shortcuts', category: 'ACTION', keywords: 'hotkeys help', kind: 'action' },
    { id: 'act-demo', label: 'Start Comprehensive Demo', category: 'ACTION', keywords: 'tour walkthrough comprehensive', kind: 'action' },
    { id: 'act-simulation', label: 'Start Training Simulation', category: 'ACTION', keywords: 'training historical exercise', kind: 'action' },
    { id: 'act-auto', label: 'Toggle Auto-Opt', category: 'ACTION', keywords: 'continuous reoptimisation', kind: 'action' },
    { id: 'act-degraded', label: 'Toggle Degraded Mode', category: 'ACTION', keywords: 'sensor edge mode', kind: 'action' },
    { id: 'act-reset', label: 'Reset System', category: 'ACTION', keywords: 'restore baseline', kind: 'action' },
    ...system.missions.map((item) => ({ id: `mission-${item.id}`, label: item.name, category: 'MISSION', keywords: `${item.id} ${item.targetType} priority ${item.priority}`, kind: 'mission' as const, targetId: item.id })),
    ...system.aircraft.map((item) => ({ id: `aircraft-${item.id}`, label: `${item.tailNumber} · ${item.type}`, category: 'AIRCRAFT', keywords: `${item.base} ${item.status} ${item.type}`, kind: 'aircraft' as const, targetId: item.id })),
    ...IAF_BASES.map((item) => ({ id: `base-${item.id}`, label: `${item.name} · ${item.code}`, category: 'BASE', keywords: item.id, kind: 'base' as const, targetId: item.id })),
  ]);
  let activeModalIds = $derived([
    ...(pending && !railMode && !simulationOpen && !probabilisticSimOpen ? ['decision'] : []), ...(trackLossOpen ? ['track-loss'] : []),
    ...(flowOpen ? ['mission-flow'] : []), ...(loadoutOpen ? ['loadout'] : []),
    ...(referenceOpen ? ['reference'] : []), ...(briefingMissionId ? ['briefing'] : []),
    ...(aarMissionId ? ['aar'] : []), ...(metricsOpen ? ['metrics'] : []),
    ...(shortcutHelpOpen ? ['shortcuts'] : []), ...(glossaryOpen ? ['glossary'] : []),
    ...(demoCompleteOpen ? ['demo-complete'] : []), ...(commandPaletteOpen ? ['command-palette'] : []),
    ...(comprehensiveDemoOpen ? ['comprehensive-demo'] : []),
  ]);
  let previousModalIds: string[] = [];
  let previousRightTab: typeof rightTab = 'coa';
  let previousLeftPanelTab: typeof leftPanelTab = 'roster';
  let previousScenarioFilter: string | null = null;
  let visibleModalIds = $derived(modalStack.filter((id) => activeModalIds.includes(id) && !minimizedModals.includes(id)).slice(-3));
  let dockedModalIds = $derived(activeModalIds.filter((id) => minimizedModals.includes(id) || !visibleModalIds.includes(id)));
  let dockVisibleIds = $derived(dockedModalIds.slice(-5));
  let dockOverflowIds = $derived(dockedModalIds.slice(0, Math.max(0, dockedModalIds.length - 5)));
  const modalLabels: Record<string, string> = { decision: 'DECISION', 'track-loss': 'TRACK LOSS', 'mission-flow': 'MISSION FLOW', loadout: 'LOADOUT', reference: 'REFERENCE', briefing: 'BRIEFING', aar: 'AFTER ACTION', metrics: 'METRICS', shortcuts: 'SHORTCUTS', glossary: 'GLOSSARY', 'demo-complete': 'DEMO COMPLETE', 'command-palette': 'COMMAND PALETTE', simulation: 'SIMULATION', 'probabilistic-sim': 'PROBABILITY SIMULATION', 'comprehensive-demo': 'COMPREHENSIVE DEMO' };

  $effect(() => {
    const open = activeModalIds;
    const next = [...modalStack.filter((id) => open.includes(id)), ...open.filter((id) => !modalStack.includes(id))];
    if (next.join('|') !== modalStack.join('|')) modalStack = next;
    const nextMinimized = minimizedModals.filter((id) => open.includes(id));
    if (nextMinimized.join('|') !== minimizedModals.join('|')) minimizedModals = nextMinimized;
  });

  $effect(() => {
    const current = activeModalIds;
    for (const id of current.filter((item) => !previousModalIds.includes(item))) {
      if (id !== 'command-palette') narrateUtterance(`${modalLabels[id] ?? id} opened.`, { source: 'SYSTEM', speaker: 'agent' });
    }
    for (const id of previousModalIds.filter((item) => !current.includes(item))) {
      if (id !== 'command-palette') narrateUtterance(`${modalLabels[id] ?? id} closed.`, { source: 'SYSTEM', speaker: 'agent' });
    }
    previousModalIds = [...current];
  });
  $effect(() => {
    const count = system.events.length;
    if ((!bottomExpanded || !panelVisibility.missionLog) && count > previousLogCount) unreadLogCount += count - previousLogCount;
    previousLogCount = count;
  });
  let previousLayoutExperience = 'idle';
  $effect(() => {
    const experience = system.activeExperience;
    setVoiceOwner(experience === 'idle' ? 'system' : experience);
    if (experience === previousLayoutExperience) return;
    previousLayoutExperience = experience;
    if (experience === 'mission') leftPanelTab = 'missions';
    rightTab = experience === 'idle' ? 'coa' : experience === 'mission' ? 'execution' : experience === 'simulation' ? 'metrics' : 'flow';
    requestAnimationFrame(() => leftPane?.resize(experience === 'idle' ? 18 : 29));
  });
  $effect(() => {
    const tab = rightTab;
    if (tab !== previousRightTab) { previousRightTab = tab; narrateUtterance(`${tab.toUpperCase()} panel selected.`, { source: 'SYSTEM', speaker: 'agent' }); }
  });
  $effect(() => {
    const tab = leftPanelTab;
    if (tab !== previousLeftPanelTab) { previousLeftPanelTab = tab; narrateUtterance(`${tab === 'roster' ? 'Force roster' : 'Missions'} panel selected.`, { source: 'SYSTEM', speaker: 'agent' }); }
  });
  $effect(() => {
    const filter = system.activeScenarioFilter;
    if (filter !== previousScenarioFilter) { previousScenarioFilter = filter; if (filter !== null) narrateUtterance(`${filter.replaceAll('_', ' ')} scenario selected. Map and console panels are aligning to this exercise.`, { source: 'SYSTEM', speaker: 'agent' }); }
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
    else if (id === 'simulation') { simulationOpen = false; demoActive = false; }
    else if (id === 'shortcuts') shortcutHelpOpen = false;
    else if (id === 'glossary') glossaryOpen = false;
    else if (id === 'demo-complete') demoCompleteOpen = false;
    else if (id === 'command-palette') commandPaletteOpen = false;
  }

  function readCollapsedState() {
    try { return JSON.parse(localStorage.getItem('aircommand.panels.v1') ?? '{}') as { left?: boolean; right?: boolean; log?: boolean; visibility?: Partial<typeof panelVisibility> }; }
    catch { return {}; }
  }

  function persistCollapsedState() {
    localStorage.setItem('aircommand.panels.v1', JSON.stringify({ left: leftCollapsed, right: rightCollapsed, visibility: panelVisibility }));
  }

  function setPanelVisibility(key: keyof typeof panelVisibility, visible: boolean) {
    panelVisibility = { ...panelVisibility, [key]: visible };
    if (key === 'coa' && !visible && rightTab === 'coa') rightTab = 'red';
    if (key === 'forceRoster' && !visible && leftPanelTab === 'roster' && panelVisibility.missions) leftPanelTab = 'missions';
    if (key === 'missions' && !visible && leftPanelTab === 'missions' && panelVisibility.forceRoster) leftPanelTab = 'roster';
    persistCollapsedState();
  }

  function setAllPanels(visible: boolean) {
    panelVisibility = { forceRoster: visible, missions: visible, theaterMap: visible, coa: visible, missionLog: visible, commandStatus: visible, scenarioBar: visible };
    if (visible) { leftPanelTab = 'roster'; rightTab = 'coa'; }
    persistCollapsedState();
  }

  function flashHint(message: string) {
    shortcutToast = message;
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => shortcutToast = '', 1800);
  }

  function showBusyToast(message: string) {
    shortcutToast = message;
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => shortcutToast = '', 3000);
  }

  function cleanupExperience() {
    system.exitExperience();
    railMode = null; demoActive = false; comprehensiveDemoOpen = false;
    simulationOpen = false; probabilisticSimOpen = false; arcViewer = null;
    rightTab = 'coa';
    exitExperienceConfirm = false;
    for (const event of ['aircommand:arc-viewer-clear', 'aircommand:diagram-focus-clear', 'aircommand:temporary-overlay-clear']) window.dispatchEvent(new CustomEvent(event));
    if (railExitTimer) clearTimeout(railExitTimer);
  }

  function closeExperienceRail() {
    if (system.activeExperience === 'idle') { cleanupExperience(); return; }
    const missionId = system.experienceMissionId;
    const mission = missionId && system.activeMissions.find((item) => item.missionId === missionId && !['COMPLETE', 'ABORTED'].includes(item.phase));
    if (mission) { exitExperienceConfirm = true; return; }
    cleanupExperience();
  }

  function requestReset() {
    exitExperienceConfirm = false;
    resetConfirm = true;
  }

  function confirmExperienceExit() {
    cleanupExperience();
  }

  function confirmSystemReset() {
    resetConfirm = false;
    cleanupExperience();
    system.reset();
    entityDetail = null; weaponDetail = null; detailPreviousRail = null; arcViewer = null;
    briefingMissionId = null; aarMissionId = null; assignedAircraftId = null;
    trackLossOpen = false; shortcutHelpOpen = false; glossaryOpen = false;
    flowOpen = false; referenceOpen = false; metricsOpen = false; loadoutOpen = false;
    systemGuideOpen = false; demoCompleteOpen = false; commandPaletteOpen = false;
    pastDecisions = []; pastDecisionsExpanded = false;
  }

  function resetLayout() {
    mapFullscreen = false;
    leftCollapsed = false; rightCollapsed = false; logCollapsed = true; bottomExpanded = false;
    panelVisibility = { forceRoster: true, missions: true, theaterMap: true, coa: true, missionLog: true, commandStatus: true, scenarioBar: true };
    leftPanelTab = 'roster'; rightTab = 'coa'; unreadLogCount = 0;
    if (railMode) setMapFocusLock(true);
    persistCollapsedState();
    requestAnimationFrame(() => { leftPane?.resize(18); rightPane?.resize(28); });
    flashHint('LAYOUT RESET TO DEFAULT');
  }

  function restoreLeftPanel(tab: 'roster' | 'missions') {
    setPanelVisibility(tab === 'roster' ? 'forceRoster' : 'missions', true);
    leftPanelTab = tab; leftCollapsed = false;
    requestAnimationFrame(() => leftPane?.resize(system.activeExperience === 'idle' ? 18 : 29));
  }

  function restoreRightTab(tab: typeof rightTab) {
    if (tab === 'coa') setPanelVisibility('coa', true);
    rightTab = tab; rightCollapsed = false;
    requestAnimationFrame(() => rightPane?.resize(28));
  }

  $effect(() => {
    if (flowOpen && !MissionFlowModal) void import('./lib/components/panels/MissionFlowModal.svelte').then((module) => MissionFlowModal = module.default);
    if (loadoutOpen && !LoadoutModal) void import('./lib/components/panels/LoadoutModal.svelte').then((module) => LoadoutModal = module.default);
    if (referenceOpen && !ReferenceLibrary) void import('./lib/components/panels/ReferenceLibrary.svelte').then((module) => ReferenceLibrary = module.default);
    if (aarMissionId && !AfterActionReview) void import('./lib/components/panels/AfterActionReview.svelte').then((module) => AfterActionReview = module.default);
    if (simulationOpen && !SimulationModal) void import('./lib/components/rail/SimulationModal.svelte').then((module) => SimulationModal = module.default);
    if (probabilisticSimOpen && !ProbabilisticSimulation) void import('./lib/components/rail/ProbabilisticSimulation.svelte').then((module) => ProbabilisticSimulation = module.default);
    if ((metricsOpen || rightTab === 'metrics') && !MetricsDashboard && !metricsImportError) void import('./lib/components/panels/MetricsDashboard.svelte').then((module) => MetricsDashboard = module.default).catch((error) => { console.error('Metrics dashboard failed to load', error); metricsImportError = true; });
  });

  onMount(() => {
    void preloadModelAssets();
    try { if (localStorage.getItem('aircommand.seen') !== 'true') welcomeOpen = true; } catch { welcomeOpen = true; }
    void import('./lib/components/map/TacticalMap.svelte').then((module) => TacticalMap = module.default);
    const handleMissionBrief = (event: Event) => briefingMissionId = (event as CustomEvent<string>).detail;
    const handleBusyToast = (event: Event) => showBusyToast(String((event as CustomEvent<string>).detail ?? 'EXPERIENCE IS ACTIVE'));
    const handleResetRequest = () => requestReset();
    window.addEventListener('aircommand:busy-toast', handleBusyToast);
    window.addEventListener('aircommand:reset-request', handleResetRequest);
    const handleEntityDetail = (event: Event) => {
      const detail = (event as CustomEvent<{ type: string; id: string }>).detail;
      if (!detail?.type || !detail.id) return;
      entityDetail = detail;
      weaponDetail = null;
      arcViewer = null;
    };
    const handleWeaponDetail = (event: Event) => {
      weaponDetail = String((event as CustomEvent<string>).detail ?? '');
      entityDetail = null;
    };
    const handleSelectRightTab = (event: Event) => rightTab = (event as CustomEvent<typeof rightTab>).detail;
    const handleMapOpenPanel = (event: Event) => {
      const panel = (event as CustomEvent<'roster' | 'missions'>).detail;
      if (panel === 'roster' || panel === 'missions') restoreLeftPanel(panel);
    };
    const handleTourTarget = (event: Event) => {
      const target = String((event as CustomEvent<string>).detail);
      if (target.includes('roster')) { setPanelVisibility('forceRoster', true); leftPanelTab = 'roster'; leftCollapsed = false; requestAnimationFrame(() => leftPane?.resize(15)); }
      else if (target.includes('missions')) { setPanelVisibility('missions', true); leftPanelTab = 'missions'; leftCollapsed = false; requestAnimationFrame(() => leftPane?.resize(15)); }
      else if (target.includes('coa') || target.includes('generate-coa')) { setPanelVisibility('coa', true); rightTab = 'coa'; rightCollapsed = false; requestAnimationFrame(() => rightPane?.resize(28)); }
      else if (target.includes('log')) { setPanelVisibility('missionLog', true); bottomExpanded = true; logCollapsed = false; }
      else if (target.includes('command-status')) setPanelVisibility('commandStatus', true);
      else if (target.includes('scenario-bar')) setPanelVisibility('scenarioBar', true);
    };
    window.addEventListener('aircommand:mission-brief', handleMissionBrief);
    window.addEventListener('aircommand:entity-detail', handleEntityDetail);
    window.addEventListener('aircommand:weapon-detail', handleWeaponDetail);
    window.addEventListener('aircommand:select-right-tab', handleSelectRightTab);
    window.addEventListener('aircommand:map-open-panel', handleMapOpenPanel);
    window.addEventListener('aircommand:tour-target', handleTourTarget);
    const handleArcViewer = (event: Event) => { arcViewer = (event as CustomEvent<NonNullable<typeof arcViewer>>).detail; };
    const clearArcViewer = () => arcViewer = null;
    window.addEventListener('aircommand:arc-viewer', handleArcViewer);
    window.addEventListener('aircommand:arc-viewer-clear', clearArcViewer);
    const saved = readCollapsedState();
    leftCollapsed = saved.left ?? false; rightCollapsed = saved.right ?? false; logCollapsed = true; bottomExpanded = false;
    panelVisibility = { ...panelVisibility, ...(saved.visibility ?? {}) };
    requestAnimationFrame(() => {
      if (leftCollapsed) leftPane?.resize(3);
      if (rightCollapsed) rightPane?.resize(3);
    });
    return () => { window.removeEventListener('aircommand:busy-toast', handleBusyToast); window.removeEventListener('aircommand:reset-request', handleResetRequest); window.removeEventListener('aircommand:mission-brief', handleMissionBrief); window.removeEventListener('aircommand:entity-detail', handleEntityDetail); window.removeEventListener('aircommand:weapon-detail', handleWeaponDetail); window.removeEventListener('aircommand:select-right-tab', handleSelectRightTab); window.removeEventListener('aircommand:map-open-panel', handleMapOpenPanel); window.removeEventListener('aircommand:tour-target', handleTourTarget); window.removeEventListener('aircommand:arc-viewer', handleArcViewer); window.removeEventListener('aircommand:arc-viewer-clear', clearArcViewer); };
  });

  function closeEntityDetail() { entityDetail = null; arcViewer = null; detailPreviousRail = null; }
  function closeWeaponDetail() { weaponDetail = null; }

  function toggleLeftPane() { leftCollapsed = !leftCollapsed; persistCollapsedState(); leftPane?.resize(leftCollapsed ? 3 : 15); }
  function toggleRightPane() { rightCollapsed = !rightCollapsed; persistCollapsedState(); rightPane?.resize(rightCollapsed ? 3 : 28); }
  function toggleLogPane() { bottomExpanded = !bottomExpanded; logCollapsed = !bottomExpanded; if (bottomExpanded) unreadLogCount = 0; }
  function toggleMapFullscreen() {
    if (!mapFullscreen) { savedLeftSize = leftPane?.getSize?.() ?? (leftCollapsed ? 3 : 15); savedRightSize = rightPane?.getSize?.() ?? (rightCollapsed ? 3 : 28); mapFullscreen = true; }
    else { mapFullscreen = false; requestAnimationFrame(() => { leftPane?.resize(savedLeftSize); rightPane?.resize(savedRightSize); }); }
  }

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

  function decisionPreview(branch: DecisionBranch) {
    const riskDelta = branch.effect.riskDelta ?? 0;
    const etaDelta = Math.round((branch.effect.missionDelayMin ?? 0) / 5);
    const successDelta = Math.round((branch.outcome === 'success' ? 12 : branch.outcome === 'partial' ? 0 : branch.outcome === 'escalate' ? -10 : -22) - riskDelta * 0.35 - etaDelta * 0.3);
    const baseline = Math.max(20, Math.min(90, 66 - ((pending?.riskDelta ?? 0) * 0.3)));
    return { successDelta, successProbability: Math.max(5, Math.min(98, baseline + successDelta)), riskDelta, etaDelta };
  }

  function decisionOptions() {
    const point = pending?.pendingDecision;
    if (!point) return [];
    return point.branches.map((branch) => ({ id: branch.id, label: branch.label, description: branch.description, tag: branch.tag, tagColor: branch.tagColor, preview: decisionPreview(branch) }));
  }

  function resolveDecisionWithLatency(branchId: string) {
    if (!pending?.pendingDecision || decisionProcessing) return;
    const activeMission = pending;
    const point = activeMission.pendingDecision;
    const branch = point.branches.find((item) => item.id === branchId);
    if (!branch) return;
    decisionProcessing = true;
    if (decisionTimer) clearTimeout(decisionTimer);
    decisionTimer = setTimeout(() => {
      pastDecisions = [...pastDecisions, { at: Date.now(), title: point.title, choice: branch.label }];
      const mission = system.missions.find((item) => item.id === activeMission.missionId);
      const aircraft = system.aircraft.find((item) => activeMission.aircraftIds.includes(item.id));
      focusMapElements([
        ...(aircraft && mission ? [{ type: 'aircraft' as const, id: aircraft.tailNumber, label: `${aircraft.tailNumber} · ${distanceKm(aircraft.position, mission.target)} km` }] : []),
        ...(mission ? [{ type: 'target' as const, id: mission.name, label: mission.name }] : []),
      ]);
      const before = { threats: system.scenarioThreats.length, risk: activeMission.riskDelta, probability: Math.max(5, Math.min(98, 66 - activeMission.riskDelta * 0.3)), aircraft: [...activeMission.aircraftIds] };
      system.resolveDecision(activeMission.id, branch.id);
      const after = { threats: system.scenarioThreats.length, risk: activeMission.riskDelta, probability: Math.max(5, Math.min(98, 66 - activeMission.riskDelta * 0.3)), aircraft: [...activeMission.aircraftIds] };
      const lines = [
        `Threat count ${before.threats} → ${after.threats}${after.threats > before.threats ? ' (new SAM spawned)' : ''}`,
        ...(branch.effect.killAircraft ? [`Aircraft reassigned: ${branch.effect.killAircraft} removed from ${activeMission.missionName}`] : []),
        `Success probability ${before.probability}% → ${after.probability}%`,
        `Risk ${before.risk} → ${after.risk}`,
        `Timeline shifted ${branch.effect.missionDelayMin ? `${branch.effect.missionDelayMin > 0 ? '+' : ''}${branch.effect.missionDelayMin}m` : 'no change'}`,
      ];
      decisionImpact = { lines, branchLabel: branch.label };
      if (impactTimer) clearTimeout(impactTimer);
      impactTimer = setTimeout(() => decisionImpact = null, 3000);
      setTimeout(() => system.pushEvent('INTEL', 'INTEL: threat assessment updated', 'info'), 1500);
      setTimeout(() => system.pushEvent('COMMAND', 'COMMAND: COA regenerated', 'info'), 3500);
      setTimeout(() => system.pushEvent('EXEC', 'EXEC: mission resumed', 'ok'), 5500);
      decisionProcessing = false;
      narrateUtterance(`Commander selected ${branch.label}. ${branch.consequence}`, { source: 'COMMANDER', speaker: 'commander', tier: 'CAUTION' });
      window.dispatchEvent(new CustomEvent('aircommand:rail-decision-resolved', { detail: { missionId: activeMission.missionId, branchId: branch.id } }));
    }, 1200);
  }

  function handleDecision(branchId: string) { resolveDecisionWithLatency(branchId); }
  function handleRailDecision(option: { id: string }) { resolveDecisionWithLatency(option.id); }

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
      'radar-site': 'sead_template',
      'troop-concentration': 'balakot',
      'c2-node': 'sindoor_deep',
      'bridge': 'sindoor_deep',
      'fuel-depot': 'sindoor_deep',
      'runway': 'sindoor_deep',
      'ship': 'sead_template',
      'aircraft': 'sead_template',
    };
    const templateId = map[mission.targetType] ?? 'sindoor_deep';
    system.startMission(missionId, ids, templateId);
    if (system.activeExperience === 'mission') rightTab = 'execution';
    assignedAircraftId = null;
    briefingMissionId = null;
  }

  function startDemo() {
    if (!system.enterExperience('demo')) return;
    rightTab = 'flow';
    closeWelcome(); pastDecisions = []; pastDecisionsExpanded = false;
    demoActive = true;
    if (system.activeScenarioFilter !== 'deep_strike') system.runScenario('deep_strike', true);
    const demoMission = system.scenarioMissions.find((item) => item.targetType === HISTORICAL_MISSIONS.sindoor_deep.targetType) ?? system.scenarioMissions[0];
    system.enterFocusMode(demoMission?.id ?? null);
    if (demoMission) system.revealElement('target', demoMission.id);
    railMode = 'demo';
    comprehensiveDemoOpen = true;
  }

  function startSimulation() {
    if (!system.enterExperience('training')) return;
    rightTab = 'flow';
    closeWelcome(); pastDecisions = []; pastDecisionsExpanded = false;
    if (system.activeScenarioFilter !== 'deep_strike') system.runScenario('deep_strike', true);
    const trainingMission = system.scenarioMissions.find((item) => item.targetType === HISTORICAL_MISSIONS.sindoor_deep.targetType) ?? system.scenarioMissions[0];
    system.enterFocusMode(trainingMission?.id ?? null);
    if (trainingMission) system.revealElement('target', trainingMission.id);
    demoActive = false;
    railMode = 'training';
    comprehensiveDemoOpen = false;
    simulationOpen = true;
  }

  function startProbabilisticSimulation() { if (!system.enterExperience('simulation')) return; rightTab = 'metrics'; closeWelcome(); pastDecisions = []; pastDecisionsExpanded = false; demoActive = false; if (system.activeScenarioFilter !== 'deep_strike') system.runScenario('deep_strike', true); const mission = system.scenarioMissions[0]; system.enterFocusMode(mission?.id ?? null); if (mission) system.revealElement('target', mission.id); railMode = 'sim'; comprehensiveDemoOpen = false; probabilisticSimOpen = true; }
  function closeWelcome() { welcomeOpen = false; try { localStorage.setItem('aircommand.seen', 'true'); } catch {} }
  function replayWelcome() { try { localStorage.removeItem('aircommand.seen'); } catch {} welcomeOpen = true; }
  function selectRailMode(mode: 'demo' | 'training' | 'sim') {
    if (mode === 'demo') startDemo();
    else if (mode === 'training') startSimulation();
    else startProbabilisticSimulation();
  }

  function navigateGuide(panel: string) {
    systemGuideOpen = false;
    if (panel === 'simulation') { startSimulation(); return; }
    if (panel === 'demo') { startDemo(); return; }
    const routes: Record<string, () => void> = {
      reference: () => referenceOpen = true, flow: () => flowOpen = true,
      roster: () => { leftPanelTab = 'roster'; panelVisibility = { ...panelVisibility, forceRoster: true }; },
      coa: () => rightTab = 'coa', red: () => rightTab = 'red',
    };
    routes[panel]?.();
  }

  function runShortcut(key: string) {
    const actions: Record<string, () => void> = {
      g: () => system.generateCOAs(), r: () => referenceOpen = true,
      f: () => flowOpen = true, m: () => metricsOpen = true, d: startDemo,
      s: startSimulation,
    };
    actions[key]?.();
    if (labelsForShortcut[key]) narrateUtterance(`${labelsForShortcut[key]} opened.`, { source: 'SYSTEM', speaker: 'agent' });
    const labels: Record<string, string> = { g: 'GENERATE COA', r: 'REFERENCE', f: 'MISSION FLOW', m: 'METRICS', d: 'DEMO', s: 'SIMULATION' };
    if (labels[key]) {
      shortcutToast = `SHORTCUT: ${labels[key]}`;
      if (toastTimer) clearTimeout(toastTimer);
      toastTimer = setTimeout(() => shortcutToast = '', 1200);
    }
  }
  const labelsForShortcut: Record<string, string> = { r: 'Reference library', f: 'Mission flow', m: 'Metrics dashboard', d: 'Comprehensive demo', s: 'Historical simulation' };

  function handleGlobalKeydown(event: KeyboardEvent) {
    if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'r') { event.preventDefault(); resetLayout(); return; }
    if (event.ctrlKey && event.key.toLowerCase() === 'k') { event.preventDefault(); commandPaletteOpen = true; return; }
    const target = event.target as HTMLElement | null;
    if (event.key === 'Escape') {
      if (exitExperienceConfirm) { exitExperienceConfirm = false; return; }
      if (resetConfirm) { resetConfirm = false; return; }
      if (entityDetail) { closeEntityDetail(); return; }
      if (commandPaletteOpen) { commandPaletteOpen = false; return; }
      if (arcViewer) { arcViewer = null; return; }
      const topModal = [...modalStack].reverse().find((id) => activeModalIds.includes(id) && !minimizedModals.includes(id) && id !== 'comprehensive-demo');
      if (topModal) { closeModal(topModal); return; }
      if (system.activeExperience !== 'idle') {
        if (system.activeExperience === 'demo' && system.simSpeed !== 0) {
          window.dispatchEvent(new CustomEvent('aircommand:experience-pause-request'));
          showBusyToast('PAUSED · PRESS EXIT TO STOP THIS EXPERIENCE');
        } else if (system.simSpeed !== 0) { system.setSimSpeed(0); showBusyToast('PAUSED · PRESS EXIT TO STOP THIS EXPERIENCE'); }
        else showBusyToast('EXPERIENCE IS ACTIVE · USE EXIT TO STOP IT');
        return;
      }
      if (system.focusMode?.active) { system.exitFocusMode(); event.stopImmediatePropagation(); return; }
      if (comprehensiveDemoOpen || railMode) { closeExperienceRail(); return; }
      if (mapFullscreen) { toggleMapFullscreen(); return; }
      if (commandPaletteOpen) { commandPaletteOpen = false; return; }
      if (mapFullscreen) { toggleMapFullscreen(); return; }
      if (railMode) { closeExperienceRail(); return; }
      if (system.trackLossAnalysis) { system.trackLossAnalysis = null; trackLossOpen = false; return; }
      if (pending) { system.dismissDecision(pending.id); return; }
      flashHint('Press ? for keyboard shortcuts');
      return;
    }
    if (target?.matches('input, textarea, [contenteditable]')) return;
    if (!event.ctrlKey && !event.altKey && event.key.toLowerCase() === 'f') { focusMode = !focusMode; return; }
    if (event.ctrlKey && event.key.toLowerCase() === 'b') { event.preventDefault(); toggleLogPane(); return; }
    if (event.ctrlKey && event.key.toLowerCase() === 'l') { event.preventDefault(); toggleLeftPane(); return; }
    if (event.ctrlKey && ['1', '2', '3', '4'].includes(event.key)) {
      event.preventDefault();
      rightTab = ({ '1': 'coa', '2': 'red', '3': 'metrics', '4': 'execution' } as const)[event.key as '1' | '2' | '3' | '4'];
      return;
    }
    if (event.ctrlKey && event.key === '5') { event.preventDefault(); rightTab = 'weapons'; return; }
    if (event.ctrlKey && event.key === '6') { event.preventDefault(); rightTab = 'cyber'; return; }
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
      'act-demo': startDemo, 'act-simulation': startSimulation, 'act-auto': () => system.toggleContinuousReoptimization(),
      'act-degraded': () => system.setMode(system.mode === 'DEGRADED' ? 'NORMAL' : 'DEGRADED'),
      'act-reset': requestReset,
    };
    actions[command.id]?.();
  }

  function toggleMapLayer(layer: string) {
    window.dispatchEvent(new CustomEvent('aircommand:map-layer', { detail: layer }));
  }

  function setMapFocusLock(locked: boolean) {
    mapFocusLocked = locked;
    window.dispatchEvent(new CustomEvent('aircommand:focus-lock', { detail: locked }));
  }
  function refocusMap() { window.dispatchEvent(new CustomEvent('aircommand:refocus')); }
  $effect(() => {
    const mode = railMode;
    const scenario = system.activeScenarioFilter;
    window.dispatchEvent(new CustomEvent('aircommand:experience-mode', { detail: { mode, scenario } }));
    if (mode) setMapFocusLock(true);
    else setMapFocusLock(false);
  });
</script>

<svelte:window onkeydown={handleGlobalKeydown} />
<TooltipLayer />
<CaptionLayer />
<FocusPointer />
<div class="shell" class:fullscreen={mapFullscreen} class:focus-mode={focusMode} class:demo-locked={comprehensiveDemoOpen} data-experience={system.activeExperience} data-fullscreen={mapFullscreen ? 'true' : 'false'}>
  {#if !mapFullscreen}
  <TopBar
    aircraftCount={system.aircraft.length}
    missionCount={system.missions.length}
    threatCount={system.threats.length}
    onFlowClick={() => (flowOpen = true)}
    onReferenceClick={() => (referenceOpen = true)}
    onMetricsClick={() => (metricsOpen = true)}
    onDemoClick={startDemo}
    onSimulationClick={startSimulation}
    onProbabilisticSimulationClick={startProbabilisticSimulation}
    onGlossaryClick={() => glossaryOpen = true}
    onShortcutHelpClick={() => shortcutHelpOpen = true}
    onGuideClick={() => { systemGuideOpen = !systemGuideOpen; narrateUtterance(systemGuideOpen ? 'System guide opened.' : 'System guide closed.', { source: 'SYSTEM', speaker: 'agent' }); }}
    onReplayWelcome={replayWelcome}
    onGenerate={() => system.generateCOAs()}
    onReset={requestReset}
    onDegradedToggle={() => system.setMode(system.mode === 'DEGRADED' ? 'NORMAL' : 'DEGRADED')}
    onLayerToggle={toggleMapLayer}
    onPanelToggle={(key, visible) => setPanelVisibility(key as keyof typeof panelVisibility, visible)}
    onShowAllPanels={() => setAllPanels(true)}
    onHideAllPanels={() => setAllPanels(false)}
    panelVisibility={panelVisibility}
    onResetLayout={resetLayout}
    onToggleFocusLock={() => setMapFocusLock(!mapFocusLocked)}
    focusLocked={mapFocusLocked}
    railActive={!!railMode}
    onBottomToggle={toggleLogPane}
    {bottomExpanded}
    {unreadLogCount}
    demoActive={demoActive}
    modalCount={activeModalIds.length}
  />
  {/if}

  <div class="workspace-layout" class:bottom-expanded={bottomExpanded}>
    <PaneGroup direction="horizontal" autoSaveId="aircommand.layout.v1.panels" class="content-layout">
      {#if !mapFullscreen && (system.activeExperience !== 'idle' || panelVisibility.forceRoster || panelVisibility.missions)}<Pane bind:this={leftPane} defaultSize={18} minSize={3} maxSize={36}>
        {#if leftCollapsed}<div class="collapsed-rail"><button title="Expand work area" aria-label="Expand left work area" onclick={toggleLeftPane}>»</button><span>{railMode ? railMode.toUpperCase().slice(0,1) : leftPanelTab === 'roster' ? 'A' : 'M'}</span></div>
        {:else if railMode}
          <section class="experience-workspace" aria-label={`${railMode} experience`}>
            <header class="experience-workspace-header">
              <strong>{railMode === 'training' ? 'HISTORICAL TRAINING' : railMode === 'sim' ? 'OUTCOME SIMULATION' : 'GUIDED DEMO'}</strong>
              <div class="experience-actions">
                <button class="rail-focus-lock" class:active={mapFocusLocked} aria-pressed={mapFocusLocked} onclick={() => setMapFocusLock(!mapFocusLocked)} title="Toggle map focus lock">{mapFocusLocked ? '🔒' : '🔓'}</button>
                {#if !mapFocusLocked}<button aria-label="Re-focus map to the scenario area" title="Re-focus map" onclick={refocusMap}>⌖</button>{/if}
                <div class="sim-speed" role="group" aria-label="Simulation speed">{#each [0, 1, 2, 4] as speed}<button class:active={system.simSpeed === speed} aria-pressed={system.simSpeed === speed} aria-label={speed === 0 ? 'Pause simulation' : `Set simulation speed to ${speed}x`} onclick={() => system.setSimSpeed(speed as 0 | 1 | 2 | 4)}>{speed === 0 ? 'Ⅱ' : `${speed}x`}</button>{/each}</div>
                <button class="rail-close" aria-label="Exit experience" title="Exit experience" onclick={closeExperienceRail}>✕ EXIT</button>
              </div>
            </header>
            {#if arcViewer}<ArcViewer {...arcViewer} />{/if}
              {#if railMode === 'demo'}<ComprehensiveDemo open={comprehensiveDemoOpen} simSpeed={system.simSpeed} onSpeedChange={(speed) => system.setSimSpeed(speed)} onClose={closeExperienceRail} onComplete={() => { if (railExitTimer) clearTimeout(railExitTimer); railExitTimer = setTimeout(closeExperienceRail, 5000); }} />
              {:else if railMode === 'training'}<div class="experience-content">{#if SimulationModal}<SimulationModal open={simulationOpen} simSpeed={system.simSpeed} onSpeedChange={(speed) => system.setSimSpeed(speed)} onClose={closeExperienceRail} />{/if}</div>
              {:else if railMode === 'sim'}<div class="experience-content">{#if ProbabilisticSimulation}<ProbabilisticSimulation open={probabilisticSimOpen} simSpeed={system.simSpeed} onSpeedChange={(speed) => system.setSimSpeed(speed)} onClose={closeExperienceRail} />{/if}</div>{/if}
              {#if railMode !== 'demo' && pending?.pendingDecision}<div class="rail-decision"><DecisionPrompt open={true} rail title={pending.pendingDecision.title} context={pending.pendingDecision.context} message={pending.pendingDecision.message} options={decisionOptions()} processing={decisionProcessing} onSelect={handleRailDecision} onClose={() => system.dismissDecision(pending!.id)} /></div>{/if}
              {#if railMode !== 'demo' && pastDecisions.length}<section class="past-decisions" aria-label="Past decisions"><button aria-expanded={pastDecisionsExpanded} onclick={() => pastDecisionsExpanded = !pastDecisionsExpanded}>DECISIONS MADE ({pastDecisions.length}) {pastDecisionsExpanded ? '▴' : '▾'}</button>{#if pastDecisionsExpanded}<ol>{#each pastDecisions as decision, index (`${decision.at}-${index}`)}<li><span>{['①','②','③','④','⑤','⑥','⑦','⑧'][index] ?? `${index + 1}.`}</span><b>{decision.title}</b><i>→ {decision.choice}</i></li>{/each}</ol>{/if}</section>{/if}
          </section>
        {:else if system.selectedBaseId}<BaseDetailPanel onLoadoutClick={openLoadout} />
        {:else}<aside class="left">
          {#if system.activeExperience === 'idle' && panelVisibility.scenarioBar}<ScenarioBar collapsed={true} />{/if}
          {#if system.activeExperience === 'mission'}
            <div class="mission-experience-header"><span>MISSION ACTIVE</span><button onclick={closeExperienceRail}>EXIT</button></div>
            <MissionPanel onMissionSelect={(id) => (briefingMissionId = id)} onCollapse={toggleLeftPane} onToggleVisibility={() => setPanelVisibility('missions', false)} />
          {:else}
            <div class="left-tabs" role="tablist" aria-label="Left panel">
              {#if panelVisibility.forceRoster}<button role="tab" aria-selected={leftPanelTab === 'roster'} class:active={leftPanelTab === 'roster'} onclick={() => leftPanelTab = 'roster'}>FORCE ROSTER</button>{/if}
              {#if panelVisibility.missions}<button role="tab" aria-selected={leftPanelTab === 'missions'} class:active={leftPanelTab === 'missions'} onclick={() => leftPanelTab = 'missions'}>MISSIONS</button>{/if}
            </div>
            {#if leftPanelTab === 'roster' && panelVisibility.forceRoster}<AircraftPanel onCollapse={toggleLeftPane} onToggleVisibility={() => setPanelVisibility('forceRoster', false)} onLoadout={openLoadout} onAssign={(aircraftId, missionId) => { assignedAircraftId = aircraftId; briefingMissionId = missionId; }} />
            {:else if panelVisibility.missions}<MissionPanel onMissionSelect={(id) => (briefingMissionId = id)} onCollapse={toggleLeftPane} onToggleVisibility={() => setPanelVisibility('missions', false)} />{:else if panelVisibility.forceRoster}<AircraftPanel onCollapse={toggleLeftPane} onToggleVisibility={() => setPanelVisibility('forceRoster', false)} onLoadout={openLoadout} onAssign={(aircraftId, missionId) => { assignedAircraftId = aircraftId; briefingMissionId = missionId; }} />{/if}
          {/if}
        </aside>{/if}
      </Pane><PaneResizer class="pane-resizer" />{/if}
      <Pane defaultSize={mapFullscreen ? 100 : 54} minSize={40}>
        <section class="center">
          {#if TacticalMap}<TacticalMap onBaseSelect={(id) => system.selectBase(id)} onLoadoutClick={openLoadout} onFullscreenClick={toggleMapFullscreen} onToggleTheaterVisibility={() => setPanelVisibility('theaterMap', !panelVisibility.theaterMap)} theaterMapVisible={panelVisibility.theaterMap} fullscreen={mapFullscreen} />{:else}<div class="map-loading mono">INITIALISING TACTICAL MAP · SECURE DATA LINK</div>{/if}
          {#if system.computing}<div class="computing mono">◢ COMPUTING COA · NSGA-II · 4 OBJECTIVES</div>{/if}
        </section>
      </Pane>
      {#if !mapFullscreen}<PaneResizer class="pane-resizer" />
      {#if panelVisibility.coa || rightTab !== 'coa'}<Pane bind:this={rightPane} defaultSize={28} minSize={3} maxSize={38}>
        {#if rightCollapsed}<div class="collapsed-rail"><button title="Expand supporting detail" aria-label="Expand right work area" onclick={toggleRightPane}>«</button><span>{rightTab.slice(0,1).toUpperCase()}</span></div>
        {:else}<div class="right-wrap">
          <div class="right-tabs" role="tablist" aria-label="Supporting detail">
            {#if panelVisibility.coa}<button role="tab" aria-selected={rightTab === 'coa'} class:active={rightTab === 'coa'} onclick={() => rightTab = 'coa'}>COA</button>{/if}
            <button role="tab" aria-selected={rightTab === 'red'} class:active={rightTab === 'red'} onclick={() => rightTab = 'red'}>RED VIEW</button>
            <button role="tab" aria-selected={rightTab === 'weapons'} class:active={rightTab === 'weapons'} onclick={() => rightTab = 'weapons'}>WEAPONS</button>
            <button role="tab" aria-selected={rightTab === 'cyber'} class:active={rightTab === 'cyber'} onclick={() => rightTab = 'cyber'}>CYBER</button>
            <button role="tab" aria-selected={rightTab === 'metrics'} class:active={rightTab === 'metrics'} onclick={() => rightTab = 'metrics'}>METRICS</button>
            <button role="tab" aria-selected={rightTab === 'execution'} class:active={rightTab === 'execution'} onclick={() => rightTab = 'execution'}>EXECUTION</button>
            <button role="tab" aria-selected={rightTab === 'flow'} class:active={rightTab === 'flow'} onclick={() => rightTab = 'flow'}>FLOW</button>
            <button class="right-collapse" aria-label="Collapse right panel" title="Collapse right panel" onclick={toggleRightPane}>›</button>
          </div>
          <div class="right-tab-content">
            {#if entityDetail}<EntityDetail entityType={entityDetail.type} entityId={entityDetail.id} onBack={closeEntityDetail} />
            {:else if weaponDetail}<WeaponDetail weaponId={weaponDetail} onClose={closeWeaponDetail} />
            {:else if rightTab === 'coa' && panelVisibility.coa}<COAPanel mode="blue" onToggleVisibility={() => setPanelVisibility('coa', false)} />
            {:else if rightTab === 'red'}<COAPanel mode="red" />
            {:else if rightTab === 'metrics'}{#if MetricsDashboard}<MetricsDashboard open={true} inline={true} />{:else if metricsImportError}<div class="map-loading mono">METRICS FAILED TO LOAD · RELOAD TO RETRY</div>{:else}<div class="map-loading mono">LOADING ANALYTICS</div>{/if}
            {:else if rightTab === 'execution'}<ExecutionPanel />
            {:else if rightTab === 'weapons'}<div class="weapon-workspace"><WeaponMatrix /><PrioritizationSlider /></div>
            {:else if rightTab === 'flow'}<MissionIOFlow />
            {:else}<CyberPanel />{/if}
          </div>
        </div>{/if}
      </Pane>{/if}{/if}
    </PaneGroup>
    {#if bottomExpanded && !mapFullscreen && (panelVisibility.missionLog || panelVisibility.commandStatus)}
      <PaneGroup direction="horizontal" autoSaveId="aircommand.command-row" class="command-row">
        {#if panelVisibility.missionLog}<Pane defaultSize={panelVisibility.commandStatus ? 70 : 100} minSize={48}><EventLog collapsed={false} onToggle={toggleLogPane} onToggleVisibility={() => setPanelVisibility('missionLog', false)} /></Pane>{/if}
        {#if panelVisibility.missionLog && panelVisibility.commandStatus}<PaneResizer class="pane-resizer" />{/if}
        {#if panelVisibility.commandStatus}<Pane defaultSize={panelVisibility.missionLog ? 30 : 100} minSize={22}><CommandStatus onToggleVisibility={() => setPanelVisibility('commandStatus', false)} /></Pane>{/if}
      </PaneGroup>
    {/if}
  </div>
</div>
{#if welcomeOpen}<div class="welcome-shade"><div class="welcome-card" role="dialog" aria-modal="true" aria-labelledby="welcome-title" tabindex="-1"><span>◈ AIR COMMAND · ORIENTATION</span><h1 id="welcome-title">WELCOME TO AIR COMMAND</h1><p>Choose a mode to begin:</p><button onclick={startDemo}>▶ GUIDED DEMO <small>See the system walkthrough</small></button><button onclick={startSimulation}>▷ TRAINING <small>Run a historical mission</small></button><button onclick={startProbabilisticSimulation}>◈ SIM <small>Test probabilistic outcomes</small></button><button class="explore" onclick={closeWelcome}>↻ EXPLORE <small>Skip and use the console directly</small></button></div></div>{/if}
{#if comprehensiveDemoOpen}<div class="lock-bar"><span>SYSTEM LOCKED · PRESS ESC TO EXIT</span></div>{/if}
{#if pending?.pendingDecision && !railMode && !simulationOpen && !probabilisticSimOpen}
  <ModalLayer label={modalLabels.decision} zIndex={modalZ('decision')} visible={isModalVisible('decision')} onMinimize={() => minimizeModal('decision')}><DecisionPrompt
    open={true}
    title={pending.pendingDecision.title}
    context={pending.pendingDecision.context}
    message={pending.pendingDecision.message}
    options={decisionOptions()}
    processing={decisionProcessing}
    onSelect={(o) => handleDecision(o.id)}
    onClose={() => system.dismissDecision(pending!.id)}
  /></ModalLayer>
{/if}

{#if decisionImpact}<aside class="decision-impact" role="status" aria-live="polite"><header><b>DECISION IMPACT</b><span>{decisionImpact.branchLabel}</span></header>{#each decisionImpact.lines as line}<p>→ {line}</p>{/each}</aside>{/if}

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

{#if flowOpen}<ModalLayer label={modalLabels['mission-flow']} zIndex={modalZ('mission-flow')} visible={isModalVisible('mission-flow')} onMinimize={() => minimizeModal('mission-flow')}>{#if MissionFlowModal}<MissionFlowModal open={flowOpen} onClose={() => (flowOpen = false)} />{:else}<div class="map-loading mono">LOADING MISSION FLOW</div>{/if}</ModalLayer>{/if}
{#if loadoutOpen}<ModalLayer label={modalLabels.loadout} zIndex={modalZ('loadout')} visible={isModalVisible('loadout')} onMinimize={() => minimizeModal('loadout')}>{#if LoadoutModal}<LoadoutModal open={loadoutOpen} aircraftType={loadoutType} tailNumber={loadoutTail} onClose={() => (loadoutOpen = false)} />{:else}<div class="map-loading mono">LOADING LOADOUT</div>{/if}</ModalLayer>{/if}
{#if referenceOpen}<ModalLayer label={modalLabels.reference} zIndex={modalZ('reference')} visible={isModalVisible('reference')} onMinimize={() => minimizeModal('reference')}>{#if ReferenceLibrary}<ReferenceLibrary open={referenceOpen} onClose={() => (referenceOpen = false)} />{:else}<div class="map-loading mono">LOADING REFERENCE DATA</div>{/if}</ModalLayer>{/if}
{#if briefingMissionId}<ModalLayer label={modalLabels.briefing} zIndex={modalZ('briefing')} visible={isModalVisible('briefing')} onMinimize={() => minimizeModal('briefing')}><CommanderBriefing
  open={briefingMissionId !== null}
  missionId={briefingMissionId}
  onApprove={handleApprove}
  onClose={() => (briefingMissionId = null)}
/></ModalLayer>{/if}
{#if aarMissionId}<ModalLayer label={modalLabels.aar} zIndex={modalZ('aar')} visible={isModalVisible('aar')} onMinimize={() => minimizeModal('aar')}>{#if AfterActionReview}<AfterActionReview
  missionId={aarMissionId}
  onClose={() => (aarMissionId = null)}
  onReplay={(id) => {
    system.replayMission(id);
    aarMissionId = null;
  }}
/>{:else}<div class="map-loading mono">LOADING AFTER ACTION REVIEW</div>{/if}</ModalLayer>{/if}
{#if metricsOpen}<ModalLayer label={modalLabels.metrics} zIndex={modalZ('metrics')} visible={isModalVisible('metrics')} onMinimize={() => minimizeModal('metrics')}>{#if MetricsDashboard}<MetricsDashboard open={metricsOpen} onClose={() => (metricsOpen = false)} />{:else if metricsImportError}<div class="map-loading mono">METRICS FAILED TO LOAD · RELOAD TO RETRY</div>{:else}<div class="map-loading mono">LOADING METRICS</div>{/if}</ModalLayer>{/if}
{#if shortcutHelpOpen}<ModalLayer label={modalLabels.shortcuts} zIndex={modalZ('shortcuts')} visible={isModalVisible('shortcuts')} onMinimize={() => minimizeModal('shortcuts')}><ShortcutHelp open={shortcutHelpOpen} onClose={() => shortcutHelpOpen = false} /></ModalLayer>{/if}
{#if glossaryOpen}<ModalLayer label={modalLabels.glossary} zIndex={modalZ('glossary')} visible={isModalVisible('glossary')} onMinimize={() => minimizeModal('glossary')}><GlossaryModal open={glossaryOpen} onClose={() => glossaryOpen = false} /></ModalLayer>{/if}
{#if commandPaletteOpen}<ModalLayer label={modalLabels['command-palette']} zIndex={modalZ('command-palette')} visible={isModalVisible('command-palette')} onMinimize={() => minimizeModal('command-palette')}><CommandPalette open={commandPaletteOpen} commands={paletteCommands} onClose={() => commandPaletteOpen = false} onSelect={selectPaletteCommand} /></ModalLayer>{/if}
<SystemGuide open={systemGuideOpen} onClose={() => { systemGuideOpen = false; narrateUtterance('System guide closed.', { source: 'SYSTEM', speaker: 'agent' }); }} onNavigate={navigateGuide} />
{#if demoCompleteOpen}
  <ModalLayer label={modalLabels['demo-complete']} zIndex={modalZ('demo-complete')} visible={isModalVisible('demo-complete')} onMinimize={() => minimizeModal('demo-complete')}><div class="overlay" role="presentation">
    <section class="demo-complete" role="dialog" aria-modal="true" aria-label="Demo complete">
      <h2>DEMO COMPLETE</h2><p>You are now free to explore.</p>
      <div><button onclick={() => { demoCompleteOpen = false; system.generateCOAs(); }}>▸ GENERATE COA NOW</button><button onclick={() => demoCompleteOpen = false}>◈ EXPLORE FREELY</button></div>
    </section>
  </div></ModalLayer>
{/if}
{#if system.activeExperience !== 'idle'}<div class="experience-dock" aria-label="Active experience controls"><span><i aria-hidden="true">●</i>{system.activeExperience.toUpperCase()} ACTIVE</span><button aria-label="Exit {system.activeExperience} experience" title="Exit experience" onclick={closeExperienceRail}>✕ EXIT</button></div>{/if}
{#if dockedModalIds.length > 0}<div class="modal-dock" aria-label="Minimized modals">{#each dockVisibleIds as id (id)}<button title={modalLabels[id]} aria-label="Restore {modalLabels[id]}" onclick={() => restoreModal(id)}>{modalLabels[id]?.slice(0, 2)}</button>{/each}{#if dockOverflowIds.length}<div class="dock-overflow"><button aria-label={`Show ${dockOverflowIds.length} older minimized modals`} title="Older minimized modals" onclick={() => dockOverflowOpen = !dockOverflowOpen}>+{dockOverflowIds.length}</button>{#if dockOverflowOpen}<div class="dock-overflow-list">{#each dockOverflowIds as id (id)}<button title={modalLabels[id]} onclick={() => restoreModal(id)}>{modalLabels[id]}</button>{/each}</div>{/if}</div>{/if}</div>{/if}
  {#if shortcutToast}<div class="shortcut-toast">{shortcutToast}</div>{/if}
  {#if exitExperienceConfirm}<div class="experience-confirm-shade" role="presentation"><div class="experience-confirm" role="dialog" aria-modal="true" aria-labelledby="experience-confirm-title"><h2 id="experience-confirm-title">{system.activeExperience === 'mission' ? 'MISSION IN PROGRESS' : system.activeExperience.toUpperCase() + ' IN PROGRESS'}</h2><p>{system.activeExperience === 'training' ? 'Training in progress. Exit will abort the current mission.' : system.activeExperience === 'mission' ? 'Mission in progress. Exit will abort the current mission.' : `${system.activeExperience[0]?.toUpperCase()}${system.activeExperience.slice(1)} is in progress. Exit will stop this experience.`}</p><div><button onclick={() => exitExperienceConfirm = false}>CANCEL</button><button class="danger" onclick={confirmExperienceExit}>EXIT</button></div></div></div>{/if}
  {#if resetConfirm}<div class="experience-confirm-shade" role="presentation"><div class="experience-confirm" role="dialog" aria-modal="true" aria-labelledby="reset-confirm-title"><h2 id="reset-confirm-title">RESET SYSTEM?</h2><p>Reset will stop all active experiences and clear all state.</p><div><button onclick={() => resetConfirm = false}>CANCEL</button><button class="danger" onclick={confirmSystemReset}>RESET</button></div></div></div>{/if}

<style>
  :global(html, body) { margin: 0; padding: 0; overflow: hidden; background: var(--bg-base); }
  :global(#app) { width: 100vw; height: 100vh; }

  .shell {
    width: 100vw; height: 100vh;
    display: grid;
    grid-template-rows:32px minmax(0,1fr);
    grid-template-columns:minmax(0,1fr);
    background: #1a242e;
    gap: 0;
  }
  .experience-confirm-shade { position:fixed; inset:0; z-index:500; display:grid; place-items:center; background:rgba(0,0,0,.72); }
  .experience-confirm { width:min(420px,calc(100vw - 32px)); padding:20px; border:1px solid var(--accent-amber); background:var(--bg-panel); color:var(--text-primary); font-family:var(--font-mono); box-shadow:0 12px 40px rgba(0,0,0,.6); }
  .experience-confirm h2 { margin:0 0 10px; color:var(--accent-amber); font-size:12px; letter-spacing:.12em; }
  .experience-confirm p { color:var(--text-secondary); font:12px/1.5 var(--font-sans); }
  .experience-confirm div { display:flex; justify-content:flex-end; gap:8px; margin-top:18px; }
  .experience-confirm button { padding:8px 12px; border:1px solid var(--border-strong); background:transparent; color:var(--text-primary); font:9px var(--font-mono); cursor:pointer; }
  .experience-confirm button.danger { border-color:var(--accent-red); color:var(--accent-red); }
  :global(.workspace-layout) { grid-row:2; position:relative; display:flex; flex-direction:column; width:100%; height:100%; min-height:0; }
  :global(.content-layout) { flex:none; width:100%; height:100%; min-height:0; }
  .workspace-layout.bottom-expanded :global(.content-layout) { height:85%; }
  :global(.shell.fullscreen > .workspace-layout) { grid-row:1; }
  .shell.fullscreen .workspace-layout.bottom-expanded :global(.content-layout) { height:100%; }
  :global(.command-row) { position:absolute; left:0; right:0; bottom:0; height:15%; width:100%; border-top:1px solid var(--border-strong); background:var(--bg-panel); }
  .experience-workspace { height:100%; min-height:0; display:flex; flex-direction:column; overflow:hidden; background:var(--bg-panel); }
  .experience-workspace-header { display:flex; align-items:center; justify-content:space-between; gap:5px; min-height:38px; padding:0 6px 0 10px; border-bottom:1px solid var(--border-subtle); background:var(--bg-base); color:var(--accent-cyan); font:8px var(--font-mono); letter-spacing:.1em; }
  .experience-actions { display:flex; align-items:center; gap:3px; }
  .experience-actions>button { min-width:24px; height:23px; padding:0 5px; border:1px solid var(--border-subtle); background:transparent; color:var(--text-secondary); font:8px var(--font-mono); cursor:pointer; }
  .experience-actions>button:hover,.experience-actions>button.active { border-color:var(--accent-cyan); color:var(--accent-cyan); }
  .experience-actions .rail-close { border-color:var(--accent-red); color:var(--accent-red); }
  .experience-content { flex:1; min-height:0; overflow:auto; }
  .mission-experience-header { display:flex; justify-content:space-between; align-items:center; flex:none; padding:8px 12px; color:var(--accent-amber); font:8px var(--font-mono); letter-spacing:.12em; border-bottom:1px solid var(--border-subtle); }
  .mission-experience-header button { border:1px solid var(--accent-red); padding:5px 8px; background:transparent; color:var(--accent-red); font:8px var(--font-mono); cursor:pointer; }
  .sim-speed { flex:none; display:flex; gap:1px; }
  .sim-speed button { min-width:22px; height:22px; padding:0 3px; border:1px solid var(--border-subtle); color:var(--text-muted); background:transparent; font:7px var(--font-mono); cursor:pointer; }
  .sim-speed button.active { color:var(--accent-cyan); border-color:var(--accent-cyan); }
  .rail-close { width:auto; padding:0 7px; border:0; border-left:1px solid var(--border-subtle); background:transparent; color:var(--text-secondary); font:9px var(--font-mono); letter-spacing:.06em; white-space:nowrap; cursor:pointer; }
  .experience-dock { position:fixed; z-index:250; left:10px; bottom:10px; display:flex; align-items:center; gap:8px; padding:4px 5px 4px 9px; border:1px solid var(--border-strong); background:rgba(5,8,15,.96); font:8px var(--font-mono); letter-spacing:.08em; }
  .experience-dock span { display:flex; align-items:center; gap:6px; color:var(--accent-cyan); white-space:nowrap; }
  .experience-dock i { color:var(--accent-green); font-size:8px; font-style:normal; }
  .experience-dock button { padding:6px 8px; border:1px solid var(--accent-red); background:transparent; color:var(--accent-red); font:8px var(--font-mono); letter-spacing:.08em; cursor:pointer; }
  .experience-dock button:hover,.experience-dock button:focus-visible { outline:1px solid var(--accent-red); outline-offset:1px; }
  .rail-decision { flex:0 0 62%; height:62%; min-height:0; max-height:62%; overflow:auto; border-top:1px solid var(--border-strong); }
  .decision-impact { position:fixed; z-index:150; left:50%; bottom:112px; transform:translateX(-50%); width:min(560px,90vw); padding:12px 14px; border:1px solid var(--accent-cyan); background:rgba(5,8,15,.96); box-shadow:0 8px 32px rgba(0,0,0,.45); animation:decision-impact-in .18s ease-out; font-family:var(--font-mono); }
  .decision-impact header { display:flex; justify-content:space-between; gap:12px; padding:0 0 7px; border-bottom:1px solid var(--border-subtle); color:var(--accent-cyan); font-size:9px; letter-spacing:.12em; }
  .decision-impact header span { color:var(--text-muted); font-size:8px; }
  .decision-impact p { margin:6px 0 0; color:var(--text-secondary); font-size:8px; letter-spacing:.03em; }
  @keyframes decision-impact-in { from { opacity:0; transform:translate(-50%,6px); } to { opacity:1; transform:translate(-50%,0); } }
  .past-decisions { margin:8px 10px 12px; border-top:1px solid var(--border-subtle); font:8px var(--font-mono); }.past-decisions>button { width:100%; padding:8px 4px; border:0; background:transparent; color:var(--text-secondary); text-align:left; font:inherit; cursor:pointer; }.past-decisions ol { list-style:none; padding:0; margin:0; }.past-decisions li { display:grid; grid-template-columns:20px minmax(0,1fr); gap:4px; padding:5px 4px; color:var(--text-muted); }.past-decisions li span { color:var(--accent-cyan); }.past-decisions li b { color:var(--text-secondary); }.past-decisions li i { grid-column:2; color:var(--accent-amber); font-style:normal; }
  .welcome-shade { position:fixed; inset:0; z-index:1000; display:grid; place-items:center; background:rgba(0,0,0,.6); }.shell:has(~ .welcome-shade) { filter:brightness(.4); }.welcome-card { width:min(440px,92vw); padding:24px; background:var(--bg-panel); border:1px solid var(--accent-cyan); box-shadow:0 12px 60px #000b; font-family:var(--font-mono); }.welcome-card>span { color:var(--accent-cyan); font-size:9px; letter-spacing:.14em; }.welcome-card h1 { color:var(--text-primary); font-size:18px; margin:14px 0 8px; }.welcome-card p { color:var(--text-secondary); font:12px var(--font-sans); }.welcome-card button { display:flex; align-items:center; justify-content:space-between; gap:12px; width:100%; margin-top:7px; padding:11px; color:var(--text-primary); background:var(--bg-base); border:1px solid var(--border-subtle); font:10px var(--font-mono); cursor:pointer; }.welcome-card button:hover { border-color:var(--accent-cyan); }.welcome-card small { color:var(--text-muted); font:10px var(--font-sans); }.welcome-card .explore { color:var(--text-secondary); }
  .shell.fullscreen { grid-template-rows:1fr; grid-template-columns:minmax(0,1fr); grid-template-areas:"center"; gap:0; }
  .shell { min-width:0; overflow:hidden; }
  :global(.workspace-layout),:global(.content-layout) { min-width:0; max-width:100%; overflow:hidden; }
  :global(.content-layout [data-pane]),:global(.workspace-layout [data-pane]) { min-width:0 !important; }
  :global(.content-layout [data-pane]) { transition:flex-basis .2s ease; }
  .left { display:flex; flex-direction:column; gap:1px; background:#1a242e; overflow:visible; height:100%; position:relative; }
  .left-tabs { display:flex; flex:none; gap:1px; background:var(--border-subtle); }
  .left-tabs button { flex:1; padding:8px 4px; border:0; border-bottom:2px solid transparent; background:var(--bg-base); color:var(--text-muted); font:8px var(--font-mono); letter-spacing:.08em; cursor:pointer; }
  .left-tabs button.active { color:var(--accent-cyan); border-bottom-color:var(--accent-cyan); }
  .left > :global(.panel), .left > :global(.mission-block) { flex:1; min-height:0; }
  .right-wrap { position:relative; height:100%; display:flex; flex-direction:column; background:var(--bg-panel); }
  .right-tabs { display:flex; align-items:stretch; flex:none; border-bottom:1px solid var(--border-subtle); background:var(--bg-base); }
  .right-tabs { overflow-x:auto; }
  .right-tabs button { flex:1; min-width:58px; padding:9px 4px; border:0; border-bottom:2px solid transparent; background:transparent; color:var(--text-muted); font:8px var(--font-mono); letter-spacing:.1em; cursor:pointer; transition:color .18s,border-color .18s; }
  .right-tabs button:hover,.right-tabs button.active { color:var(--accent-cyan); }
  .right-tabs button.active { border-bottom-color:var(--accent-cyan); }
  .right-tabs button.right-collapse { flex:none; padding:0 8px; font-size:14px; }
  .right-tab-content { flex:1; min-height:0; overflow:hidden; position:relative; }
  .weapon-workspace { display:flex; flex-direction:column; height:100%; min-height:0; overflow:hidden; }
  .weapon-workspace > :global(.matrix-panel) { flex:1; min-height:0; }
  .weapon-workspace > :global(.priority-control) { flex:none; }
  .right-tabs kbd { display:block; font:6px var(--font-mono); color:var(--accent-cyan); }
  :global(.collapsed-rail) { display:flex; flex-direction:column; align-items:center; gap:12px; height:100%; padding:8px 0; background:var(--bg-panel); color:var(--accent-cyan); font:9px var(--font-mono); box-sizing:border-box; }
  :global(.collapsed-rail button), :global(.collapse-btn) { background:transparent; border:0; color:var(--accent-cyan); font:14px var(--font-mono); cursor:pointer; padding:4px; }
  :global(.collapsed-rail button:focus-visible), :global(.collapse-btn:focus-visible) { outline:1px solid var(--accent-cyan); }
  .lock-bar { position:fixed; z-index:600; left:0; right:0; top:0; padding:7px; text-align:center; color:var(--accent-amber); background:var(--bg-base); border-bottom:1px solid var(--accent-amber); font:9px var(--font-mono); letter-spacing:.12em; pointer-events:none; }
  .shell.demo-locked { pointer-events:none; }
  .shell.demo-locked .experience-workspace { pointer-events:auto; }
  .shell.focus-mode > :global(*) { opacity:.16; filter:saturate(.35); transition:opacity .18s; }
  .shell.focus-mode > :global(.workspace-layout) { opacity:1; filter:none; }
  .shell.focus-mode .left,.shell.focus-mode .right-wrap,.shell.focus-mode .command-row { opacity:.16; }
  .shell.focus-mode .center { opacity:1; box-shadow:0 0 0 1px var(--accent-cyan); }
  .center { position: relative; overflow: hidden; background: #05080f; height: 100%; }
  .map-loading { display:grid; place-items:center; width:100%; height:100%; color:var(--accent-cyan); background:var(--bg-base); font:9px var(--font-mono); letter-spacing:.15em; }
  :global(.pane-resizer) { width: 2px; height: 2px; background: var(--border-subtle); flex-shrink: 0; transition: background .15s; }
  :global(.pane-resizer:hover), :global(.pane-resizer[data-resize-handle-active]) { background: var(--accent-cyan); }
  :global(.vertical-resizer) { width: 100%; }
  .shortcut-toast { position: fixed; top: 46px; left: 50%; transform: translateX(-50%); z-index: 100; padding: 8px 14px; color: var(--accent-cyan); background: var(--bg-panel); border: 1px solid var(--accent-cyan); font: 10px var(--font-mono); letter-spacing: .14em; }
  .modal-dock { position:fixed; z-index:260; right:48px; bottom:28px; display:flex; align-items:end; gap:5px; padding:4px; border:1px solid var(--border-subtle); background:rgba(5,8,15,.94); }
  .modal-dock>button,.dock-overflow>button { width:32px; height:32px; padding:0; border:1px solid var(--border-strong); background:var(--bg-panel); color:var(--accent-cyan); font:8px var(--font-mono); cursor:pointer; }
  .dock-overflow { position:relative; }
  .dock-overflow-list { position:absolute; right:0; bottom:36px; display:flex; flex-direction:column; max-height:240px; overflow:auto; background:var(--bg-panel); border:1px solid var(--accent-cyan); }
  .dock-overflow-list button { padding:7px 10px; border:0; border-bottom:1px solid var(--border-subtle); color:var(--text-primary); background:transparent; white-space:nowrap; font:8px var(--font-mono); cursor:pointer; }
  .overlay { position:fixed; inset:0; z-index:95; display:grid; place-items:center; background:rgba(0,0,0,.72); }
  .demo-complete { width:min(500px,92vw); padding:26px; text-align:center; background:var(--bg-panel); border:1px solid var(--accent-cyan); color:var(--text-secondary); font-family:var(--font-mono); }
  .demo-complete h2 { color:var(--accent-cyan); letter-spacing:.18em; font-size:13px; }
  .demo-complete p { color:var(--text-muted); font-size:11px; }
  .demo-complete div { display:flex; justify-content:center; gap:10px; margin-top:22px; }
  .demo-complete button { padding:9px 12px; background:transparent; border:1px solid var(--border-strong); color:var(--accent-cyan); font:9px var(--font-mono); cursor:pointer; }

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
