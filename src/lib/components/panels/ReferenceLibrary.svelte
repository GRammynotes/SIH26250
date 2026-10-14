<script lang="ts">
  let { open = false, onClose }: { open?: boolean; onClose?: () => void } = $props();

  interface Reference {
    id: string;
    title: string;
    subtitle: string;
    src: string;
    category: string;
    description: string;
  }

  const REFERENCES: Reference[] = [
    {
      id: 'flow',
      title: 'MISSION PLANNING FLOW',
      subtitle: 'N1 → N6 PIPELINE',
      src: '/assets/lazy/mission_planning_flow.svg',
      category: 'PROCESS',
      description: 'End-to-end decision pipeline: target intake, intel gate, weaponeering, COA generation, commander decision, execution.',
    },
    {
      id: 'su30',
      title: 'SU-30MKI · LOADOUT ALPHA',
      subtitle: '6 / 12 STATIONS · 3,285 KG',
      src: '/assets/lazy/su30mki_loadout_alpha.svg',
      category: 'PLATFORM',
      description: 'Air-dominance loadout: BrahMos-A centreline, R-77 BVRAAM × 3, R-73 SRAAM × 2.',
    },
    {
      id: 'rafale',
      title: 'RAFALE · LOADOUT BRAVO',
      subtitle: '9 / 14 STATIONS · 2,808 KG',
      src: '/assets/lazy/rafale_loadout_bravo.svg',
      category: 'PLATFORM',
      description: 'Deep-strike loadout: SCALP centreline, Meteor × 2, MICA RF × 2, MICA IR × 2, HAMMER × 2.',
    },
    {
      id: 'sindoor',
      title: 'OPERATION SINDOOR',
      subtitle: 'DEEP STRIKE · 07 MAY 2025',
      src: '/assets/lazy/op_sindoor_map.svg',
      category: 'HISTORICAL',
      description: 'Rafale standoff employment: 24 SCALP released at 280 km from Bahawalpur. Full threat geometry.',
    },
    {
      id: 'commandpost',
      title: 'COMMAND POST LAYOUT',
      subtitle: 'AIR-GAPPED ENCLAVE',
      src: '/assets/lazy/command_post_schematic.svg',
      category: 'DEPLOYMENT',
      description: 'Where AIR COMMAND sits inside an operational C2 node. IACCS, AWACS, satellite, IMMOLS feed integration.',
    },
  ];

  let selected = $state<Reference>(REFERENCES[0]);

  let grouped = $derived(
    REFERENCES.reduce<Record<string, Reference[]>>((acc, r) => {
      (acc[r.category] ??= []).push(r);
      return acc;
    }, {})
  );
</script>

{#if open}
  <div class="overlay">
    <div class="frame">
      <header>
        <div>
          <span class="eyebrow">TACTICAL REFERENCE LIBRARY</span>
          <h2>{selected.title}</h2>
          <span class="sub">{selected.subtitle}</span>
        </div>
        <button class="close" onclick={() => onClose?.()} aria-label="Close">×</button>
      </header>

      <div class="content">
        <aside class="sidebar">
          {#each Object.entries(grouped) as [category, items]}
            <div class="group">
              <div class="cat">{category}</div>
              {#each items as r (r.id)}
                <button
                  class="entry"
                  class:active={r.id === selected.id}
                  onclick={() => (selected = r)}
                >
                  <span class="entry-title">{r.title}</span>
                  <span class="entry-sub">{r.subtitle}</span>
                </button>
              {/each}
            </div>
          {/each}
        </aside>

        <main class="viewer">
          <div class="img-wrap">
            <img src={selected.src} alt={selected.title} />
          </div>
          <div class="desc">
            <span class="desc-label">CONTEXT</span>
            <p>{selected.description}</p>
          </div>
        </main>
      </div>
    </div>
  </div>
{/if}

<style>
  .overlay {
    position: fixed; inset: 0;
    background: rgba(5, 8, 15, 0.94);
    backdrop-filter: blur(4px);
    display: grid; place-items: center;
    z-index: 250;
    animation: fadein 0.15s ease-out;
  }
  @keyframes fadein { from { opacity: 0; } to { opacity: 1; } }

  .frame {
    width: min(1400px, 96vw);
    height: min(900px, 94vh);
    background: var(--bg-panel);
    border: 1px solid var(--accent-cyan);
    box-shadow: 0 0 60px rgba(0, 212, 255, 0.25);
    display: flex; flex-direction: column;
    overflow: hidden;
  }

  header {
    display: flex; justify-content: space-between; align-items: flex-start;
    padding: 14px 20px;
    border-bottom: 1px solid var(--border-subtle);
    background: rgba(0, 212, 255, 0.03);
  }
  .eyebrow {
    display: block;
    font-family: var(--font-mono); font-size: 9px;
    letter-spacing: 0.22em; color: var(--accent-cyan);
    margin-bottom: 4px;
  }
  h2 {
    margin: 0;
    font-family: var(--font-mono); font-size: 15px;
    letter-spacing: 0.1em; color: var(--text-primary);
    font-weight: 500;
  }
  .sub {
    font-family: var(--font-mono); font-size: 10px;
    letter-spacing: 0.14em; color: var(--text-muted);
    margin-top: 2px; display: block;
  }
  .close {
    background: transparent; border: 0;
    color: var(--text-muted); font-size: 24px; line-height: 1;
    cursor: pointer; padding: 0 6px;
  }
  .close:hover { color: var(--accent-red); }

  .content { flex: 1; display: grid; grid-template-columns: 240px 1fr; overflow: hidden; }

  .sidebar {
    background: #05080f;
    border-right: 1px solid var(--border-subtle);
    overflow-y: auto;
    padding: 12px 0;
  }
  .sidebar::-webkit-scrollbar { width: 3px; }
  .sidebar::-webkit-scrollbar-thumb { background: var(--border-strong); }

  .group { margin-bottom: 14px; }
  .cat {
    padding: 6px 14px;
    font-family: var(--font-mono); font-size: 9px;
    letter-spacing: 0.22em; color: var(--accent-cyan);
    text-transform: uppercase;
  }
  .entry {
    display: flex; flex-direction: column; gap: 2px;
    width: 100%;
    padding: 8px 14px;
    background: transparent;
    border: 0;
    border-left: 2px solid transparent;
    text-align: left;
    cursor: pointer;
    font-family: var(--font-mono);
    transition: all 0.12s;
  }
  .entry:hover { background: var(--bg-elevated); }
  .entry.active {
    border-left-color: var(--accent-cyan);
    background: rgba(0, 212, 255, 0.06);
  }
  .entry-title {
    font-size: 10px; color: var(--text-primary);
    letter-spacing: 0.1em;
  }
  .entry.active .entry-title { color: var(--accent-cyan); }
  .entry-sub {
    font-size: 8px; color: var(--text-muted);
    letter-spacing: 0.12em;
  }

  .viewer {
    display: flex; flex-direction: column;
    background: #05080f;
    overflow: hidden;
  }
  .img-wrap {
    flex: 1;
    display: grid; place-items: center;
    padding: 16px;
    overflow: auto;
    min-height: 0;
  }
  .img-wrap img {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
    filter: saturate(1.05);
    background: #05080f;
  }
  .desc {
    border-top: 1px solid var(--border-subtle);
    padding: 12px 20px;
    background: rgba(0, 212, 255, 0.02);
  }
  .desc-label {
    display: block;
    font-family: var(--font-mono); font-size: 9px;
    letter-spacing: 0.22em; color: var(--accent-cyan);
    margin-bottom: 4px;
  }
  .desc p {
    font-family: var(--font-sans); font-size: 12px;
    line-height: 1.6; color: var(--text-secondary);
    margin: 0;
  }
</style>
