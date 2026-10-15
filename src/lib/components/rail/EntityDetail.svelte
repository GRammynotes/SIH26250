<script lang="ts">
  import { system } from '../../stores/systemStore.svelte';
  import { IAF_BASES } from '../../data/bases';
  import { GROUND_ASSETS } from '../../data/groundAssets';
  import { WEAPONS } from '../../data/weapons';
  import { MODEL_MAP } from '../../three/modelAssets';
  import ModelViewer3D from './ModelViewer3D.svelte';
  import ArcViewer from './ArcViewer.svelte';

  let { entityType, entityId, onBack }: { entityType: string; entityId: string; onBack: () => void } = $props();
  let modelFailed = $state(false);
  $effect(() => { entityId; modelFailed = false; });
  const aircraft = $derived(system.aircraft.find((item) => item.id === entityId || item.tailNumber === entityId) ?? null);
  const mission = $derived(system.missions.find((item) => item.id === entityId) ?? null);
  const threat = $derived(system.threats.find((item) => item.id === entityId) ?? null);
  const base = $derived(IAF_BASES.find((item) => [item.id, item.code, item.name].some((name) => name.toLowerCase() === entityId.toLowerCase())) ?? null);
  const baseAircraft = $derived(base ? system.aircraft.filter((item) => item.base.toLowerCase() === base.id || item.base.toLowerCase() === base.name.toLowerCase() || item.base.toLowerCase() === base.code.toLowerCase()) : []);
  const assignments = $derived(mission ? system.coas.find((coa) => coa.id === system.selectedCoaId)?.assignments[mission.id] ?? [] : []);
  const assignedAircraft = $derived(assignments.map((id) => system.aircraft.find((item) => item.id === id)).filter((item): item is NonNullable<typeof item> => !!item));
  const assessment = $derived(threat ? [
    { label: 'RANGE', value: threat.radius, weight: threat.radius },
    { label: 'KILL PROBABILITY', value: threat.probability, weight: threat.probability },
    { label: 'CONFIDENCE', value: threat.confidence, weight: threat.confidence },
  ].sort((a, b) => b.weight - a.weight) : []);
  const groundAsset = $derived(GROUND_ASSETS.find((item) => item.id === entityId) ?? null);
  const hasT90Model = $derived(groundAsset?.id.startsWith('t90-') ?? false);
  const coords = (position: { lat: number; lng: number }) => `${position.lat.toFixed(3)}°N · ${position.lng.toFixed(3)}°E`;
  const verbal = (value: number) => value >= 80 ? 'HIGH' : value >= 60 ? 'MEDIUM' : 'LOW';
</script>

<section class="detail" aria-label="Selected map entity details">
  <header><button class="back" onclick={onBack}>← BACK</button><span>ENTITY DETAIL</span></header>
  {#if aircraft}
    {@const aircraftMission = system.activeMissions.find((item) => item.aircraftIds.includes(aircraft.id))}
    {@const aircraftWeapons = aircraft.weapons.map((id) => WEAPONS[id] ?? Object.values(WEAPONS).find((weapon) => weapon.name === id)).filter((item) => !!item)}
    {#if MODEL_MAP[aircraft.type] && !modelFailed}<ModelViewer3D modelPath={MODEL_MAP[aircraft.type]} designation={aircraft.type} entityType="aircraft" trajectory={aircraftMission?.phase.toLowerCase() as 'ingress' | 'wez' | 'release' | 'egress' | null} fuel={`${aircraft.fuel}%`} eta={aircraftMission ? `${Math.max(1, Math.round((1 - aircraftMission.progress) * 22))} MIN` : '—'} onLoadError={() => modelFailed = true} />{:else}<ArcViewer entityType="aircraft" entityId={aircraft.tailNumber} missionId={aircraftMission?.missionId ?? ''} />{/if}
    <h2>{aircraft.tailNumber}</h2><span class="badge" class:critical={aircraft.status === 'NMC'}>{aircraft.status}</span>
    <dl><div><dt>TYPE</dt><dd>{aircraft.type}</dd></div><div><dt>BASE</dt><dd>{aircraft.base}</dd></div><div><dt>FUEL</dt><dd>{aircraft.fuel}%</dd></div><div><dt>CREW</dt><dd>{aircraft.crewRest}H REST</dd></div><div><dt>MISSION</dt><dd>{aircraftMission?.missionName ?? 'UNASSIGNED'}</dd></div></dl>
    <h3>WEAPONS FIT</h3>{#if aircraftWeapons.length}<ul>{#each aircraftWeapons as weapon (weapon!.id)}<li><button class="link" title="Open {weapon!.name} specification" onclick={() => window.dispatchEvent(new CustomEvent('aircommand:weapon-detail', { detail: weapon!.id }))}>{weapon!.name}</button><span>{weapon!.rangeKm} KM</span><em>LOADED</em></li>{/each}</ul>{:else}<p class="muted">NO WEAPONS RECORDED</p>{/if}
    <button class="action" onclick={() => window.dispatchEvent(new CustomEvent('aircommand:mission-brief', { detail: aircraftMission?.missionId ?? '' }))}>◈ FULL BRIEFING</button>
  {:else if base}
    <div class="base-icon" aria-hidden="true">✚</div><h2>{base.name}</h2><p>{base.code} · {base.elevation} M ELEVATION</p><p class="muted">{coords({ lat: base.lat, lng: base.lng })}</p>
    <h3>FLEET READINESS · {baseAircraft.length} AIRCRAFT</h3><div class="readiness"><span>FMC <b>{baseAircraft.filter((item) => item.status === 'FMC').length}</b></span><span>PMC <b>{baseAircraft.filter((item) => item.status === 'PMC').length}</b></span><span>NMC <b>{baseAircraft.filter((item) => item.status === 'NMC').length}</b></span></div>
    <h3>ROSTER</h3><ul>{#each baseAircraft as item (item.id)}<li><button class="link" title="Open aircraft detail" onclick={() => window.dispatchEvent(new CustomEvent('aircommand:entity-detail', { detail: { type: 'aircraft', id: item.id } }))}>{item.tailNumber}</button><span>{item.type}</span><em>{item.status}</em></li>{/each}</ul>
    <h3>ASSIGNED MISSIONS</h3><ul>{#each system.missions.filter((item) => item.assignedAircraft.some((id) => baseAircraft.some((ac) => ac.id === id))) as item (item.id)}<li><button class="link" title="Open mission brief" onclick={() => window.dispatchEvent(new CustomEvent('aircommand:mission-brief', { detail: item.id }))}>{item.name}</button><span>{item.status}</span></li>{/each}</ul>
  {:else if threat}
    <h2>{threat.type} · {threat.id}</h2><span class="badge critical">{verbal(threat.confidence)} CONFIDENCE</span><p class="muted">{coords(threat.position)}</p><h3>ASSESSMENT CUES</h3>
    {#each assessment as cue (cue.label)}<div class="cue"><div><span>{cue.label}</span><b>{cue.label === 'RANGE' ? `${cue.value} KM` : `${cue.value}%`}</b></div><div class="bar"><i style={`width:${Math.min(100, cue.value)}%`}></i></div></div>{/each}
    <p>Assessment confidence is {verbal(threat.confidence).toLowerCase()} at {threat.confidence}%.</p>
  {:else if mission}
    <h2>{mission.name}</h2><span class="badge">P{mission.priority} · {mission.status}</span><h3>TARGET</h3><dl><div><dt>TYPE</dt><dd>{mission.targetType}</dd></div><div><dt>COORDINATES</dt><dd>{coords(mission.target)}</dd></div><div><dt>RISK</dt><dd>{mission.riskLevel}%</dd></div><div><dt>COLLATERAL</dt><dd>REFER TO BRIEFING</dd></div></dl>
    <h3>ASSIGNED AIRCRAFT · {assignedAircraft.length}</h3><ul>{#each assignedAircraft as item (item.id)}<li><button class="link" title="Open aircraft detail" onclick={() => window.dispatchEvent(new CustomEvent('aircommand:entity-detail', { detail: { type: 'aircraft', id: item.id } }))}>{item.tailNumber}</button><span>{item.type}</span><em>{item.status}</em></li>{/each}</ul>
    {#if assignedAircraft[0]}<ArcViewer entityType="aircraft" entityId={assignedAircraft[0].tailNumber} missionId={mission.id} />{/if}
  {:else if groundAsset}
    {#if hasT90Model && !modelFailed}<ModelViewer3D modelPath={MODEL_MAP['T-90']} designation={groundAsset.designation} entityType="ground" trajectory={null} fuel="—" eta="—" onLoadError={() => modelFailed = true} />{:else if hasT90Model}<svg class="ground-fallback" viewBox="0 0 280 140" role="img" aria-label="2D T-90 ground asset illustration"><g fill="none" stroke="var(--accent-cyan)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M28 94h216l-10 22H42zM45 92l18-27h113l26 27M103 65l16-24h49l19 24M142 41l4-12h47l19 12M207 42l53 4M67 67h-20M32 116h216"/><circle cx="73" cy="104" r="10"/><circle cx="105" cy="104" r="10"/><circle cx="137" cy="104" r="10"/><circle cx="169" cy="104" r="10"/><circle cx="201" cy="104" r="10"/></g></svg>{:else}<div class="base-icon" aria-label="No local 3D model for this asset">⌖</div>{/if}
    <h2>{groundAsset.designation}</h2><span class="badge">{groundAsset.type.toUpperCase()} · {groundAsset.status}</span><h3>PLATFORM SPECS</h3><dl><div><dt>DETAILS</dt><dd>{groundAsset.specs}</dd></div><div><dt>ARMAMENT</dt><dd>{groundAsset.armament}</dd></div><div><dt>RANGE</dt><dd>{groundAsset.range_km} KM</dd></div><div><dt>POSITION</dt><dd>{groundAsset.base}</dd></div></dl>
  {:else}
    <h2>{entityId || entityType.toUpperCase()}</h2><span class="badge">{entityType.toUpperCase()}</span><p class="muted">Select a supported operational track for its detailed profile.</p>
  {/if}
</section>

<style>
  .detail{height:100%;overflow:auto;padding:10px;color:var(--text-primary);font-family:var(--font-mono);font-size:10px}header{display:flex;align-items:center;justify-content:space-between;padding-bottom:9px;border-bottom:1px solid var(--border-subtle);color:var(--accent-cyan);font-size:8px;letter-spacing:.14em}.back,.action{padding:6px 8px;border:1px solid var(--border-strong);background:transparent;color:var(--accent-cyan);font:8px var(--font-mono);cursor:pointer}.link{padding:0;border:0;background:transparent;color:var(--accent-cyan);font:inherit;cursor:pointer}.link:hover{text-decoration:underline}h2{display:inline-block;margin:12px 8px 7px 0;font-size:15px;color:var(--text-primary)}h3{margin:14px 0 7px;padding-bottom:5px;border-bottom:1px solid var(--border-subtle);font-size:8px;letter-spacing:.13em;color:var(--text-secondary)}p{line-height:1.5}.muted{color:var(--text-muted)}.badge{display:inline-block;padding:4px 6px;border:1px solid var(--accent-green);color:var(--accent-green);font-size:8px}.badge.critical{border-color:var(--accent-red);color:var(--accent-red)}dl{display:grid;gap:0;margin:9px 0}dl div{display:flex;justify-content:space-between;gap:8px;padding:7px 0;border-bottom:1px solid var(--border-subtle)}dt{color:var(--text-muted);font-size:8px}dd{margin:0;text-align:right;color:var(--accent-cyan)}ul{margin:0;padding:0;list-style:none}li{display:flex;align-items:center;justify-content:space-between;gap:6px;padding:7px 0;border-bottom:1px solid var(--border-subtle)}li b{color:var(--accent-cyan)}li span{color:var(--text-muted)}li em{color:var(--accent-green);font-style:normal;font-size:8px}.base-icon{display:grid;place-items:center;width:52px;height:52px;margin:16px auto;border:1px solid var(--accent-cyan);border-radius:50%;color:var(--accent-cyan);font-size:24px;animation:rotate 12s linear infinite}@keyframes rotate{to{transform:rotate(360deg)}}.readiness{display:flex;justify-content:space-around;padding:10px 0}.readiness span{color:var(--text-muted)}.readiness b{color:var(--accent-cyan)}.cue{margin:9px 0}.cue>div:first-child{display:flex;justify-content:space-between;margin-bottom:4px}.cue span{color:var(--text-muted)}.cue b{color:var(--accent-cyan)}.bar{height:5px;background:var(--bg-elevated)}.bar i{display:block;height:100%;background:var(--accent-red)}.action{margin-top:12px}
  .ground-fallback{display:block;width:100%;max-height:210px;margin:18px auto}
</style>
