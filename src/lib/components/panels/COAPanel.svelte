<div class="panel">
  <div class="hdr">
    <span>COA</span>
    <span class="count">AWAITING GENERATION</span>
  </div>
  <div class="body">
    <div class="empty">
      No course of action generated.<br/>
      Click <b>GENERATE COA</b> to compute optimal mission allocations based on current aircraft availability, crew rest, weapons inventory, and threat picture.
    </div>
  </div>
  <button class="gen">GENERATE COA</button>
</div>

<style>
  .panel {
    grid-area: right;
    background: var(--bg-panel);
    border-left: 1px solid var(--border-subtle);
    display: flex; flex-direction: column;
  }
  .hdr {
    display: flex; justify-content: space-between; align-items: center;
    padding: 10px 12px;
    border-bottom: 1px solid var(--border-subtle);
    font-family: var(--font-mono); font-size: 9px; letter-spacing: 0.18em;
    color: var(--text-muted); text-transform: uppercase;
  }
  .hdr .count { color: var(--text-muted); }
  .body { flex: 1; padding: 16px 12px; overflow-y: auto; }
  .empty {
    font-family: var(--font-mono); font-size: 10px; line-height: 1.7;
    color: var(--text-muted);
  }
  .empty b { color: var(--accent-cyan); font-weight: 500; }
  .gen {
    margin: 12px;
    padding: 12px;
    background: transparent;
    border: 1px solid var(--accent-cyan);
    color: var(--accent-cyan);
    font-family: var(--font-mono); font-size: 10px; letter-spacing: 0.2em;
    cursor: pointer;
    transition: background 0.15s, box-shadow 0.15s;
  }
  .gen:hover {
    background: rgba(0, 240, 255, 0.08);
    box-shadow: 0 0 12px rgba(0, 240, 255, 0.3), inset 0 0 12px rgba(0, 240, 255, 0.1);
  }
</style>
