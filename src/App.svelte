<script lang="ts">
  import { generateSystemState } from './lib/data/seed';
  const state = generateSystemState();
</script>

<main style="padding: 32px; font-family: var(--font-mono); color: var(--text-primary);">
  <div style="color: var(--accent-cyan); font-size: 12px; letter-spacing: 0.2em;">
    AIR COMMAND // PHASE 1
  </div>
  <div style="color: var(--text-muted); font-size: 11px; margin-top: 8px; margin-bottom: 24px;">
    Data layer online. Seed generated.
  </div>

  <div style="display: grid; grid-template-columns: repeat(3, 200px); gap: 16px;">
    <div style="border: 1px solid var(--border-subtle); padding: 12px; background: var(--bg-panel);">
      <div style="color: var(--text-muted); font-size: 10px;">AIRCRAFT</div>
      <div style="color: var(--accent-cyan); font-size: 24px;">{state.aircraft.length}</div>
    </div>
    <div style="border: 1px solid var(--border-subtle); padding: 12px; background: var(--bg-panel);">
      <div style="color: var(--text-muted); font-size: 10px;">MISSIONS</div>
      <div style="color: var(--accent-amber); font-size: 24px;">{state.missions.length}</div>
    </div>
    <div style="border: 1px solid var(--border-subtle); padding: 12px; background: var(--bg-panel);">
      <div style="color: var(--text-muted); font-size: 10px;">THREATS</div>
      <div style="color: var(--accent-red); font-size: 24px;">{state.threats.length}</div>
    </div>
  </div>

  <div style="margin-top: 32px; border: 1px solid var(--border-subtle); padding: 16px; background: var(--bg-panel);">
    <div style="color: var(--text-muted); font-size: 10px; margin-bottom: 12px;">AIRCRAFT ROSTER</div>
    <table style="width: 100%; font-size: 11px; border-collapse: collapse;">
      <thead>
        <tr style="color: var(--text-muted); text-align: left;">
          <th style="padding: 6px;">TAIL</th>
          <th style="padding: 6px;">TYPE</th>
          <th style="padding: 6px;">BASE</th>
          <th style="padding: 6px;">STATUS</th>
          <th style="padding: 6px;">FUEL</th>
          <th style="padding: 6px;">CREW REST</th>
        </tr>
      </thead>
      <tbody>
        {#each state.aircraft as ac}
          <tr style="border-top: 1px solid var(--border-subtle);">
            <td style="padding: 6px; color: var(--accent-cyan);">{ac.tailNumber}</td>
            <td style="padding: 6px;">{ac.type}</td>
            <td style="padding: 6px;">{ac.base}</td>
            <td style="padding: 6px; color: {ac.status === 'FMC' ? 'var(--accent-green)' : ac.status === 'PMC' ? 'var(--accent-amber)' : 'var(--accent-red)'};">{ac.status}</td>
            <td style="padding: 6px;">{ac.fuel}%</td>
            <td style="padding: 6px;">{ac.crewRest}h</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</main>
