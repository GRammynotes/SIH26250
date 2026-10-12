<div class="panel corners">
  <div class="hdr">
    <span>COA ANALYSIS</span>
    <span class="count">STANDBY</span>
  </div>
  <div class="body">
    <div class="section">
      <div class="sec-label">STATUS</div>
      <div class="sec-value">AWAITING GENERATION</div>
    </div>
    <div class="section">
      <div class="sec-label">INPUTS</div>
      <div class="inputs">
        <div class="input-row"><span>· AIRCRAFT AVAILABILITY</span><span class="chk">READY</span></div>
        <div class="input-row"><span>· CREW REST STATUS</span><span class="chk">READY</span></div>
        <div class="input-row"><span>· WEAPONS INVENTORY</span><span class="chk">READY</span></div>
        <div class="input-row"><span>· THREAT PICTURE</span><span class="chk">READY</span></div>
        <div class="input-row"><span>· AIRSPACE & WEATHER</span><span class="chk">READY</span></div>
      </div>
    </div>
    <div class="section">
      <div class="sec-label">OPTIMISATION</div>
      <div class="sec-value muted">NSGA-II MULTI-OBJECTIVE · 4 OBJECTIVES</div>
    </div>
  </div>
  <button class="gen">
    <span>▸ GENERATE COA</span>
  </button>
</div>

<style>
  .panel {
    background: var(--bg-panel);
    display: flex; flex-direction: column;
    overflow: hidden; position: relative;
    height: 100%;
  }
  .hdr {
    display: flex; justify-content: space-between; align-items: center;
    padding: 10px 14px;
    border-bottom: 1px solid var(--border-subtle);
    font-family: var(--font-mono); font-size: 9px; letter-spacing: 0.18em;
    color: var(--text-muted); text-transform: uppercase;
  }
  .hdr .count { color: var(--accent-amber); }
  .body { flex: 1; padding: 14px; overflow-y: auto; }
  .section { margin-bottom: 18px; }
  .sec-label {
    font-family: var(--font-mono); font-size: 9px; letter-spacing: 0.18em;
    color: var(--text-muted); text-transform: uppercase; margin-bottom: 6px;
  }
  .sec-value {
    font-family: var(--font-mono); font-size: 10px; color: var(--text-secondary);
    letter-spacing: 0.05em;
  }
  .sec-value.muted { color: var(--text-muted); }
  .inputs { display: flex; flex-direction: column; gap: 4px; }
  .input-row {
    display: flex; justify-content: space-between; align-items: center;
    font-family: var(--font-mono); font-size: 10px;
    color: var(--text-secondary);
    padding: 3px 0;
  }
  .chk {
    font-size: 9px; letter-spacing: 0.15em;
    color: var(--accent-green);
  }
  .gen {
    margin: 14px;
    padding: 14px;
    background: transparent;
    border: 1px solid var(--accent-cyan);
    color: var(--accent-cyan);
    font-family: var(--font-mono); font-size: 10px; letter-spacing: 0.22em;
    cursor: pointer;
    transition: background 0.15s, box-shadow 0.15s, color 0.15s;
    text-align: center;
  }
  .gen:hover {
    background: rgba(0, 240, 255, 0.08);
    box-shadow: 0 0 16px rgba(0, 240, 255, 0.35), inset 0 0 16px rgba(0, 240, 255, 0.08);
  }
  .gen:active { color: #ffffff; }
</style>
