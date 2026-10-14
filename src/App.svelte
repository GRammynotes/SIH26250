<script lang="ts">
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

  let pending = $derived(system.activeMissions.find((m) => m.pendingDecision) ?? null);
  let flowOpen = $state(false);
  let referenceOpen = $state(false);
  let metricsOpen = $state(false);
  let loadoutOpen = $state(false);
  let loadoutType = $state('Su-30MKI');
  let loadoutTail = $state('');
  let briefingMissionId = $state<string | null>(null);
  let aarMissionId = $state<string | null>(null);
  let trackLossOpen = $state(false);

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
    const ids = coa.assignments[missionId] ?? [];
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
      onDestroyStarted: () => {
        driverObj.destroy();
      },
    });

    driverObj.drive();
  }
</script>

<div class="shell">
  <TopBar
    aircraftCount={system.aircraft.length}
    missionCount={system.missions.length}
    threatCount={system.threats.length}
    onFlowClick={() => (flowOpen = true)}
    onReferenceClick={() => (referenceOpen = true)}
    onMetricsClick={() => (metricsOpen = true)}
    onDemoClick={startDemo}
  />

  {#if system.selectedBaseId}
    <BaseDetailPanel onLoadoutClick={openLoadout} />
  {:else}
    <aside class="left">
      <AircraftPanel />
      <MissionPanel onMissionSelect={(id) => (briefingMissionId = id)} />
    </aside>
  {/if}

  <section class="center">
    <TacticalMap
      onBaseSelect={(id) => system.selectBase(id)}
      onLoadoutClick={openLoadout}
    />
    <ScenarioControls />
    {#if system.computing}
      <div class="computing mono">◢ COMPUTING COA · NSGA-II · 4 OBJECTIVES</div>
    {/if}
  </section>

  {#if system.activeMissions.length > 0}
    <ExecutionPanel />
  {:else}
    <COAPanel />
  {/if}

  <EventLog />
</div>

{#if pending?.pendingDecision}
  <DecisionPrompt
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
  />
{/if}

{#if system.trackLossAnalysis}
  <DecisionPrompt
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
  />
{/if}

<MissionFlowModal open={flowOpen} onClose={() => (flowOpen = false)} />
<LoadoutModal open={loadoutOpen} aircraftType={loadoutType} tailNumber={loadoutTail} onClose={() => (loadoutOpen = false)} />
<ReferenceLibrary open={referenceOpen} onClose={() => (referenceOpen = false)} />
<CommanderBriefing
  open={briefingMissionId !== null}
  missionId={briefingMissionId}
  onApprove={handleApprove}
  onClose={() => (briefingMissionId = null)}
/>
<AfterActionReview
  missionId={aarMissionId}
  onClose={() => (aarMissionId = null)}
  onReplay={(id) => {
    system.replayMission(id);
    aarMissionId = null;
  }}
/>
<MetricsDashboard open={metricsOpen} onClose={() => (metricsOpen = false)} />

<style>
  :global(html, body) { margin: 0; padding: 0; overflow: hidden; background: var(--bg-base); }
  :global(#app) { width: 100vw; height: 100vh; }

  .shell {
    width: 100vw; height: 100vh;
    display: grid;
    grid-template-rows: 32px 1fr 96px;
    grid-template-columns: 260px 1fr 340px;
    grid-template-areas:
      "topbar topbar topbar"
      "left   center right"
      "log    log    log";
    background: #1a242e;
    gap: 1px;
  }
  .left { grid-area: left; display: grid; grid-template-rows: minmax(0, 1.15fr) minmax(0, 1fr); gap: 1px; background: #1a242e; overflow: hidden; }
  .center { grid-area: center; position: relative; overflow: hidden; background: #05080f; }

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
