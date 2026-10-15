<script lang="ts">
  type Category = 'aircraft' | 'crew' | 'weapons' | 'airspace' | 'weather' | 'threats' | 'missions';
  let { onGo }: { onGo?: (category: Category) => void } = $props();
  const rows: { icon: string; name: string; home: string; category: Category }[] = [
    { icon: '✈', name: 'AIRCRAFT AVAILABILITY', home: 'FORCE ROSTER · FMC / PMC / NMC', category: 'aircraft' },
    { icon: '◷', name: 'CREW STATUS', home: 'FORCE ROSTER ROW · REST HOURS', category: 'crew' },
    { icon: '⌖', name: 'WEAPON LOADS', home: 'FORCE ROSTER BADGE · LOADOUT DETAIL', category: 'weapons' },
    { icon: '▱', name: 'AIRSPACE', home: 'MAP LAYER · AIRSPACE', category: 'airspace' },
    { icon: '☁', name: 'WEATHER', home: 'MAP LAYER · WEATHER', category: 'weather' },
    { icon: '▲', name: 'THREATS', home: 'MAP LAYER · THREAT + RED VIEW', category: 'threats' },
    { icon: '◎', name: 'MISSION PRIORITIES', home: 'MISSIONS PANEL + COA', category: 'missions' },
  ];
</script>

<section class="ps-map" aria-label="PS 26250 category map">
  <header><span>PS 26250 · DATA CATEGORY MAP</span><small>7 REQUIRED CATEGORIES</small></header>
  <p>Each problem-statement category has a visible home in the console.</p>
  {#each rows as row (row.category)}<div class="category"><span class="icon" aria-hidden="true">{row.icon}</span><div><b>{row.name}</b><small>{row.home}</small></div><button onclick={() => onGo?.(row.category)}>→ GO</button></div>{/each}
</section>

<style>
  .ps-map{height:100%;overflow:auto;background:var(--bg-panel);color:var(--text-secondary);font:8px var(--font-mono)}header{display:flex;justify-content:space-between;gap:6px;padding:11px;border-bottom:1px solid var(--border-subtle);color:var(--accent-cyan);letter-spacing:.12em}header small,.category small{color:var(--text-muted);font-size:7px}p{padding:0 11px;color:var(--text-muted);line-height:1.5}.category{display:grid;grid-template-columns:20px 1fr auto;align-items:center;gap:7px;padding:9px 10px;border-top:1px solid var(--border-subtle)}.icon{display:grid;place-items:center;width:18px;height:18px;border:1px solid var(--accent-cyan);color:var(--accent-cyan);font-size:10px}.category div{display:grid;gap:4px}.category b{font-size:8px;color:var(--text-primary);letter-spacing:.08em}.category button{padding:5px 7px;border:1px solid var(--border-strong);background:transparent;color:var(--accent-cyan);font:8px var(--font-mono);cursor:pointer}.category button:hover,.category button:focus-visible{border-color:var(--accent-cyan);outline:2px solid color-mix(in srgb,var(--accent-cyan) 35%,transparent)}
</style>
