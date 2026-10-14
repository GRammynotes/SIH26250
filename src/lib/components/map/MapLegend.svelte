<script lang="ts">
  let { open = false, onClose }: { open?: boolean; onClose?: () => void } = $props();
</script>

{#if open}
  <div class="legend-overlay" role="dialog" aria-modal="true" aria-label="Map Legend">
    <div class="legend-panel">
      <header>
        <h2>MAP LEGEND</h2>
        <button onclick={onClose} aria-label="Close legend">✕</button>
      </header>

      <div class="legend-content">
        <!-- Markers -->
        <section class="legend-section">
          <h3>MARKE​RS</h3>
          <div class="legend-item">
            <div class="legend-symbol base"></div>
            <div class="legend-info">
              <span class="legend-name">Airbase</span>
              <span class="legend-desc">IAF airbases with radar sweep animation</span>
            </div>
          </div>
          <div class="legend-item">
            <div class="legend-symbol aircraft-fmc"></div>
            <div class="legend-info">
              <span class="legend-name">Aircraft (FMC)</span>
              <span class="legend-desc">Fully Mission Capable - green checkmark</span>
            </div>
          </div>
          <div class="legend-item">
            <div class="legend-symbol aircraft-pmc"></div>
            <div class="legend-info">
              <span class="legend-name">Aircraft (PMC)</span>
              <span class="legend-desc">Partially Mission Capable - amber circle</span>
            </div>
          </div>
          <div class="legend-item">
            <div class="legend-symbol aircraft-nmc"></div>
            <div class="legend-info">
              <span class="legend-name">Aircraft (NMC)</span>
              <span class="legend-desc">Not Mission Capable - red X</span>
            </div>
          </div>
          <div class="legend-item">
            <div class="legend-symbol mission-p1"></div>
            <div class="legend-info">
              <span class="legend-name">Mission (Priority 1)</span>
              <span class="legend-desc">High priority target with pulsing effect</span>
            </div>
          </div>
          <div class="legend-item">
            <div class="legend-symbol mission-p2"></div>
            <div class="legend-info">
              <span class="legend-name">Mission (Priority 2)</span>
              <span class="legend-desc">Medium priority target</span>
            </div>
          </div>
          <div class="legend-item">
            <div class="legend-symbol mission-p3"></div>
            <div class="legend-info">
              <span class="legend-name">Mission (Priority 3)</span>
              <span class="legend-desc">Low priority target</span>
            </div>
          </div>
          <div class="legend-item">
            <div class="legend-symbol threat"></div>
            <div class="legend-info">
              <span class="legend-name">Threat Zone</span>
              <span class="legend-desc">Enemy SAM/anti-aircraft coverage area</span>
            </div>
          </div>
        </section>

        <!-- Lines -->
        <section class="legend-section">
          <h3>LINES & PATHS</h3>
          <div class="legend-item">
            <div class="legend-symbol line-cyan"></div>
            <div class="legend-info">
              <span class="legend-name">Ingress Route</span>
              <span class="legend-desc">Flight path to target area</span>
            </div>
          </div>
          <div class="legend-item">
            <div class="legend-symbol line-amber"></div>
            <div class="legend-info">
              <span class="legend-name">WEZ Entry</span>
              <span class="legend-desc">Weapon Engagement Zone approach</span>
            </div>
          </div>
          <div class="legend-item">
            <div class="legend-symbol line-red"></div>
            <div class="legend-info">
              <span class="legend-name">Weapon Release</span>
              <span class="legend-desc">Weapon release trajectory</span>
            </div>
          </div>
          <div class="legend-item">
            <div class="legend-symbol line-green"></div>
            <div class="legend-info">
              <span class="legend-name">Egress/RTB</span>
              <span class="legend-desc">Return to base path (dashed)</span>
            </div>
          </div>
          <div class="legend-item">
            <div class="legend-symbol line-trail"></div>
            <div class="legend-info">
              <span class="legend-name">Aircraft Trail</span>
              <span class="legend-desc">Recent flight path history</span>
            </div>
          </div>
          <div class="legend-item">
            <div class="legend-symbol line-fuel"></div>
            <div class="legend-info">
              <span class="legend-name">Fuel Range</span>
              <span class="legend-desc">Maximum fuel range circle (dashed)</span>
            </div>
          </div>
        </section>

        <!-- Shapes -->
        <section class="legend-section">
          <h3>SHAPES & ZONES</h3>
          <div class="legend-item">
            <div class="legend-symbol threat-zone"></div>
            <div class="legend-info">
              <span class="legend-name">Threat Zone (3-tier)</span>
              <span class="legend-desc">Outer (100%), Mid (66%), Inner (33%) risk rings</span>
            </div>
          </div>
          <div class="legend-item">
            <div class="legend-symbol airspace-corridor"></div>
            <div class="legend-info">
              <span class="legend-name">Airspace Corridor</span>
              <span class="legend-desc">Approved flight corridor (cyan)</span>
            </div>
          </div>
          <div class="legend-item">
            <div class="legend-symbol airspace-killbox"></div>
            <div class="legend-info">
              <span class="legend-name">Kill Box</span>
              <span class="legend-desc">Active engagement area (amber)</span>
            </div>
          </div>
          <div class="legend-item">
            <div class="legend-symbol airspace-restricted"></div>
            <div class="legend-info">
              <span class="legend-name">Restricted Zone</span>
              <span class="legend-desc">No-fly zone (red)</span>
            </div>
          </div>
          <div class="legend-item">
            <div class="legend-symbol weather-storm"></div>
            <div class="legend-info">
              <span class="legend-name">Storm System</span>
              <span class="legend-desc">Severe weather area (cyan)</span>
            </div>
          </div>
          <div class="legend-item">
            <div class="legend-symbol weather-fog"></div>
            <div class="legend-info">
              <span class="legend-name">Fog</span>
              <span class="legend-desc">Low visibility area (gray)</span>
            </div>
          </div>
          <div class="legend-item">
            <div class="legend-symbol scenario-area"></div>
            <div class="legend-info">
              <span class="legend-name">Scenario Area</span>
              <span class="legend-desc">Operational exercise boundary (cyan dashed)</span>
            </div>
          </div>
        </section>

        <!-- Status Indicators -->
        <section class="legend-section">
          <h3>STATUS INDICATORS</h3>
          <div class="legend-item">
            <div class="legend-symbol checkmark"></div>
            <div class="legend-info">
              <span class="legend-name">✓ Active/Ready</span>
              <span class="legend-desc">System or asset is operational</span>
            </div>
          </div>
          <div class="legend-item">
            <div class="legend-symbol circle-half"></div>
            <div class="legend-info">
              <span class="legend-name">◐ Partial/Standby</span>
              <span class="legend-desc">Limited capability or standby mode</span>
            </div>
          </div>
          <div class="legend-item">
            <div class="legend-symbol cross"></div>
            <div class="legend-info">
              <span class="legend-name">× Inactive/Failed</span>
              <span class="legend-desc">System offline or asset unavailable</span>
            </div>
          </div>
          <div class="legend-item">
            <div class="legend-symbol diamond"></div>
            <div class="legend-info">
              <span class="legend-name">◆ Threat Center</span>
              <span class="legend-desc">Enemy threat zone center point</span>
            </div>
          </div>
        </section>
      </div>

      <footer>
        <p>Hover over any map element for detailed information</p>
      </footer>
    </div>
  </div>
{/if}

<style>
  .legend-overlay {
    position: fixed;
    inset: 0;
    z-index: 200;
    display: grid;
    place-items: center;
    background: rgba(3, 6, 12, 0.9);
    backdrop-filter: blur(4px);
  }

  .legend-panel {
    width: min(500px, 90vw);
    max-height: 85vh;
    display: flex;
    flex-direction: column;
    background: var(--bg-panel);
    border: 1px solid var(--accent-cyan);
    box-shadow: 0 0 40px color-mix(in srgb, var(--accent-cyan) 20%, transparent);
    font-family: var(--font-mono);
    overflow: hidden;
  }

  header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 20px;
    border-bottom: 1px solid var(--border-subtle);
    background: color-mix(in srgb, var(--accent-cyan) 5%, transparent);
  }

  h2 {
    margin: 0;
    font: 600 18px var(--font-mono);
    letter-spacing: 0.08em;
    color: var(--text-primary);
  }

  header button {
    border: 0;
    color: var(--text-muted);
    background: transparent;
    font-size: 24px;
    cursor: pointer;
    padding: 4px 8px;
  }

  header button:hover {
    color: var(--accent-red);
  }

  .legend-content {
    flex: 1;
    overflow-y: auto;
    padding: 20px;
  }

  .legend-section {
    margin-bottom: 24px;
  }

  .legend-section:last-child {
    margin-bottom: 0;
  }

  h3 {
    margin: 0 0 12px;
    font: 600 12px var(--font-mono);
    letter-spacing: 0.12em;
    color: var(--accent-cyan);
    text-transform: uppercase;
  }

  .legend-item {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    margin-bottom: 12px;
  }

  .legend-symbol {
    width: 32px;
    height: 32px;
    flex-shrink: 0;
    display: grid;
    place-items: center;
    border: 1px solid var(--border-subtle);
    background: rgba(5, 8, 15, 0.5);
    font-size: 16px;
  }

  .legend-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .legend-name {
    font: 10px var(--font-mono);
    font-weight: 600;
    letter-spacing: 0.08em;
    color: var(--text-primary);
  }

  .legend-desc {
    font: 9px var(--font-sans);
    color: var(--text-muted);
    line-height: 1.4;
  }

  /* Symbol styles */
  .base {
    color: var(--accent-cyan);
    font-size: 18px;
  }

  .aircraft-fmc {
    color: var(--accent-green);
  }

  .aircraft-pmc {
    color: var(--accent-amber);
  }

  .aircraft-nmc {
    color: var(--accent-red);
  }

  .mission-p1 {
    border: 2px solid var(--accent-red);
    border-radius: 50%;
  }

  .mission-p2 {
    border: 2px solid var(--accent-amber);
    border-radius: 50%;
  }

  .mission-p3 {
    border: 2px dashed var(--text-muted);
    border-radius: 50%;
  }

  .threat {
    color: var(--accent-red);
  }

  .line-cyan {
    height: 2px;
    background: var(--accent-cyan);
  }

  .line-amber {
    height: 2px;
    background: var(--accent-amber);
  }

  .line-red {
    height: 2px;
    background: var(--accent-red);
  }

  .line-green {
    height: 2px;
    background: var(--accent-green);
    border-top: 2px dashed var(--accent-green);
  }

  .line-trail {
    height: 2px;
    background: var(--accent-cyan);
    opacity: 0.6;
  }

  .line-fuel {
    height: 2px;
    background: var(--accent-green);
    border-top: 2px dashed var(--accent-green);
    opacity: 0.4;
  }

  .threat-zone {
    border: 2px solid var(--accent-red);
    border-radius: 50%;
    position: relative;
  }

  .threat-zone::after {
    content: '';
    position: absolute;
    inset: 4px;
    border: 1px solid var(--accent-red);
    border-radius: 50%;
    opacity: 0.6;
  }

  .airspace-corridor {
    background: color-mix(in srgb, var(--accent-cyan) 20%, transparent);
    border: 1px solid var(--accent-cyan);
  }

  .airspace-killbox {
    background: color-mix(in srgb, var(--accent-amber) 20%, transparent);
    border: 1px solid var(--accent-amber);
  }

  .airspace-restricted {
    background: color-mix(in srgb, var(--accent-red) 20%, transparent);
    border: 1px solid var(--accent-red);
  }

  .weather-storm {
    background: rgba(40, 120, 255, 0.2);
    border: 1px solid var(--accent-cyan);
  }

  .weather-fog {
    background: rgba(148, 163, 184, 0.2);
    border: 1px solid var(--text-secondary);
  }

  .scenario-area {
    border: 2px dashed var(--accent-cyan);
    opacity: 0.6;
  }

  .checkmark {
    color: var(--accent-green);
  }

  .circle-half {
    color: var(--accent-amber);
  }

  .cross {
    color: var(--accent-red);
  }

  .diamond {
    color: var(--accent-red);
  }

  footer {
    padding: 12px 20px;
    border-top: 1px solid var(--border-subtle);
    background: rgba(0, 0, 0, 0.2);
  }

  footer p {
    margin: 0;
    font: 9px var(--font-sans);
    color: var(--text-muted);
    text-align: center;
  }

  /* Scrollbar */
  .legend-content::-webkit-scrollbar {
    width: 6px;
  }

  .legend-content::-webkit-scrollbar-track {
    background: var(--border-subtle);
  }

  .legend-content::-webkit-scrollbar-thumb {
    background: var(--accent-cyan);
    border-radius: 3px;
  }
</style>
