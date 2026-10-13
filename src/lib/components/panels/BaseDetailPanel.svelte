<script lang="ts">
  import { system } from '../../stores/systemStore.svelte';
  import { IAF_BASES } from '../../data/bases';
  import { AIRCRAFT_TYPES } from '../../data/aircraft';
  import { weaponsForAircraft, getTargetLabel, optimalWeaponFor } from '../../data/weapons';

  let { onLoadoutClick }: { onLoadoutClick?: (type: string, tail: string) => void } = $props();

  let base = $derived(IAF_BASES.find((b) => b.id === system.selectedBaseId) ?? null);
  let roster = $derived(base ? system.aircraft.filter((a) => a.base === base!.id) : []);

  function statusColor(s: string) {
    return s === 'FMC' ? 'var(--accent-green)' : s === 'PMC' ? 'var(--accent-amber)' : 'var(--accent-red)';
  }

  function missionFit(aircraftType: string) {
    return system.missions.map((m) => ({
      mission: m,
      weapon: optimalWeaponFor(aircraftType, m.targetType),
    })).filter((x) => x.weapon !== null);
  }
</script>

{#if base}
  <aside class="panel corners">
    <div class="hdr">
      <div class="hdr-left">
        <span class="eyebrow">BASE DETAIL</span>
        <span class="code">{base.code}</span>
      </div>
      <button class="close" onclick={() => system.selectBase(null)} aria-label="Close">×</button>
    </div>

    <div class="meta">
      <div class="row"><span class="lbl">NAME</span><span>{base.name}</span></div>
      <div class="row"><span class="lbl">COORD</span><span class="mono">{base.lat.toFixed(3)}N · {base.lng.toFixed(3)}E</span></div>
      <div class="row"><span class="lbl">ELEV</span><span class="mono">{base.elevation} m</span></div>
      <div class="row"><span class="lbl">ROSTER</span><span class="mono">{roster.length} airframes</span></div>
    </div>

    <div class="sec-label">ASSIGNED AIRCRAFT</div>
    <div class="roster">
      {#each roster as ac (ac.id)}
        {@const type = AIRCRAFT_TYPES[ac.type]}
        <div class="ac-card">
          <div class="ac-top">
            <span class="tail">{ac.tailNumber}</span>
            <span class="status" style="color:{statusColor(ac.status)};">{ac.status}</span>
          </div>
          <div class="ac-sub">{ac.type} · {type.role.toUpperCase()}</div>

          <button class="loadout-btn" onclick={() => onLoadoutClick?.(ac.type, ac.tailNumber)}>◈ LOADOUT DIAGRAM</button>

          <div class="fit-label">COMPATIBLE LOADOUT</div>
          <div class="weapons">
            {#each weaponsForAircraft(ac.type).slice(0, 4) as w (w.id)}
              <div class="w-pill" class:standoff={w.standoff}>
                <span>{w.name}</span>
                <span class="w-range">{w.rangeKm}km</span>
              </div>
            {/each}
          </div>

          <div class="fit-label">MISSION FIT ({missionFit(ac.type).length}/{system.missions.length})</div>
          <div class="missions">
            {#each missionFit(ac.type) as f (f.mission.id)}
              <div class="m-row">
                <span class="m-name">{f.mission.name}</span>
                <span class="m-target">{getTargetLabel(f.mission.targetType)}</span>
                <span class="m-weapon">{f.weapon!.name}</span>
              </div>
            {/each}
          </div>
        </div>
      {/each}
    </div>
  </aside>
{/if}

<style>
  .panel {
    grid-area: left;
    background: var(--bg-panel);
    display: flex; flex-direction: column;
    overflow-y: auto;
    position: relative;
  }
  .panel::-webkit-scrollbar { width: 3px; }
  .panel::-webkit-scrollbar-thumb { background: var(--border-strong); }

  .hdr {
    display: flex; justify-content: space-between; align-items: flex-start;
    padding: 10px 12px;
    border-bottom: 1px solid var(--border-subtle);
  }
  .hdr-left { display: flex; flex-direction: column; gap: 2px; }
  .eyebrow { font-family: var(--font-mono); font-size: 9px; letter-spacing: 0.2em; color: var(--accent-cyan); }
  .code { font-family: var(--font-mono); font-size: 16px; letter-spacing: 0.18em; color: var(--text-primary); font-weight: 700; }
  .close { background: transparent; border: 0; color: var(--text-muted); font-size: 20px; cursor: pointer; line-height: 1; padding: 0 6px; }
  .close:hover { color: var(--accent-red); }

  .meta { padding: 8px 12px; border-bottom: 1px solid var(--border-subtle); font-family: var(--font-mono); }
  .meta .row { display: flex; justify-content: space-between; padding: 3px 0; font-size: 10px; }
  .lbl { color: var(--text-muted); letter-spacing: 0.15em; }
  .mono { color: var(--text-secondary); }

  .sec-label {
    padding: 10px 12px 6px;
    font-family: var(--font-mono); font-size: 9px; letter-spacing: 0.18em;
    color: var(--text-muted); text-transform: uppercase;
  }

  .roster { padding: 0 12px 12px; display: flex; flex-direction: column; gap: 8px; }
  .ac-card { border: 1px solid var(--border-subtle); background: #0c1015; padding: 10px; font-family: var(--font-mono); }
  .ac-top { display: flex; justify-content: space-between; align-items: center; }
  .tail { color: var(--accent-cyan); font-size: 11px; letter-spacing: 0.1em; }
  .status { font-size: 9px; letter-spacing: 0.12em; }
  .ac-sub { color: var(--text-muted); font-size: 9px; margin-top: 2px; letter-spacing: 0.08em; }

  .loadout-btn {
    margin-top: 8px;
    background: transparent;
    border: 1px solid var(--border-strong);
    color: var(--accent-cyan);
    font-family: var(--font-mono);
    font-size: 8px;
    letter-spacing: 0.18em;
    padding: 4px 8px;
    cursor: pointer;
    width: 100%;
    transition: all 0.15s;
  }
  .loadout-btn:hover {
    border-color: var(--accent-cyan);
    background: rgba(0, 212, 255, 0.06);
    box-shadow: 0 0 8px rgba(0, 212, 255, 0.3);
  }

  .fit-label { font-size: 8px; letter-spacing: 0.18em; color: var(--text-muted); margin-top: 8px; margin-bottom: 4px; }
  .weapons { display: flex; flex-wrap: wrap; gap: 3px; }
  .w-pill { display: flex; gap: 4px; align-items: center; padding: 2px 6px; border: 1px solid var(--border-strong); font-size: 9px; color: var(--text-secondary); background: rgba(255,184,0,0.05); }
  .w-pill.standoff { background: rgba(57,255,20,0.06); border-color: rgba(57,255,20,0.4); color: var(--accent-green); }
  .w-range { color: var(--text-muted); font-size: 8px; }
  .missions { display: flex; flex-direction: column; gap: 2px; }
  .m-row { display: flex; gap: 6px; font-size: 9px; align-items: center; }
  .m-name { color: var(--accent-amber); letter-spacing: 0.08em; flex: 1; }
  .m-target { color: var(--text-muted); font-size: 8px; }
  .m-weapon { color: var(--accent-cyan); }
</style>
