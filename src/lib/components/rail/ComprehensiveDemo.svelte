<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { COMPREHENSIVE_DEMO_STEPS, getStepGlossaryTerms } from '../../demo/comprehensiveDemoScript';
  import { narrateUtterance, stopVoice } from '../../engine/voice';

  let { open = false, simSpeed = 1, onSpeedChange, onClose, onComplete }: { open?: boolean; simSpeed?: 0 | 1 | 2 | 4; onSpeedChange?: (speed: 0 | 1 | 2 | 4) => void; onClose?: () => void; onComplete?: () => void } = $props();

  // Demo state
  let currentStepIndex = $state(0);
  let isPaused = $state(false);
  let isPlaying = $state(false);
  let isComplete = $state(false);
  let autoAdvance = $state(true);
  let stepTimer: ReturnType<typeof setTimeout> | undefined;
  let actionTimer: ReturnType<typeof setTimeout> | undefined;

  // Current step data
  let currentStep = $derived(COMPREHENSIVE_DEMO_STEPS[currentStepIndex] ?? null);
  let progress = $derived(Math.round(((currentStepIndex + 1) / COMPREHENSIVE_DEMO_STEPS.length) * 100));
  let glossaryTerms = $derived(currentStep ? getStepGlossaryTerms(currentStep) : []);

  // Voice enabled state
  let voiceEnabled = $state(true);

  // Start the demo
  function startDemo() {
    if (isPlaying) return;
    isPlaying = true;
    isPaused = false;
    isComplete = false;
    currentStepIndex = 0;
    document.body.classList.add('demo-active');
    executeStep();
  }

  // Execute current step
  function executeStep() {
    if (!currentStep || isPaused || !isPlaying) return;

    window.dispatchEvent(new CustomEvent('aircommand:focus', {
      detail: { selector: currentStep.element ?? '.center', duration: currentStep.duration || 5000, text: currentStep.title },
    }));

    // Dispatch caption event
    if (!voiceEnabled) window.dispatchEvent(
      new CustomEvent('aircommand:caption', {
        detail: {
          source: 'DEMO',
          text: currentStep.caption,
        },
      })
    );

    // Voice narration
    if (voiceEnabled) {
      narrateUtterance(currentStep.narration, {
        source: 'DEMO',
        speaker: 'agent',
        priority: 'info',
      });
    }

    // Execute step action if defined
    if (currentStep.action) {
      currentStep.action();
      if (currentStep.actionDelay) {
        actionTimer = setTimeout(() => {
          scheduleNextStep();
        }, simSpeed === 0 ? 2147483647 : currentStep.actionDelay / simSpeed);
      } else {
        scheduleNextStep();
      }
    } else {
      scheduleNextStep();
    }
  }

  // Schedule next step
  function scheduleNextStep() {
    if (!autoAdvance || isPaused || !isPlaying || simSpeed === 0) return;

    const duration = currentStep?.duration || 5000;
    stepTimer = setTimeout(() => {
      advanceStep();
    }, duration / simSpeed);
  }

  // Advance to next step
  function advanceStep() {
    if (currentStepIndex < COMPREHENSIVE_DEMO_STEPS.length - 1) {
      currentStepIndex++;
      executeStep();
    } else {
      completeDemo();
    }
  }

  // Go to previous step
  function previousStep() {
    if (currentStepIndex > 0) {
      clearTimeout(stepTimer);
      clearTimeout(actionTimer);
      currentStepIndex--;
      executeStep();
    }
  }

  // Jump to specific step
  function jumpToStep(index: number) {
    clearTimeout(stepTimer);
    clearTimeout(actionTimer);
    currentStepIndex = index;
    executeStep();
  }

  // Pause/Resume
  function togglePause() {
    isPaused = !isPaused;
    if (isPaused) {
      clearTimeout(stepTimer);
      clearTimeout(actionTimer);
      window.dispatchEvent(
        new CustomEvent('aircommand:caption', {
          detail: {
            source: 'DEMO',
            text: 'DEMO PAUSED',
          },
        })
      );
    } else {
      executeStep();
    }
  }

  // Stop demo
  function stopDemo() {
    clearTimeout(stepTimer);
    clearTimeout(actionTimer);
    isPlaying = false;
    isPaused = false;
    stopVoice();
    document.body.classList.remove('demo-active');
    // Clear focus pointer
    window.dispatchEvent(new CustomEvent('aircommand:focus-clear'));
    onClose?.();
  }

  // Complete demo
  function completeDemo() {
    clearTimeout(stepTimer);
    clearTimeout(actionTimer);
    isPlaying = false;
    isComplete = true;
    document.body.classList.remove('demo-active');
    // Clear focus pointer
    window.dispatchEvent(new CustomEvent('aircommand:focus-clear'));
    window.dispatchEvent(
      new CustomEvent('aircommand:caption', {
        detail: {
          source: 'DEMO',
          text: 'DEMO COMPLETE - System unlocked',
        },
      })
    );
    onComplete?.();
  }

  // Restart demo
  function restartDemo() {
    clearTimeout(stepTimer);
    clearTimeout(actionTimer);
    isComplete = false;
    startDemo();
  }

  // Toggle voice
  function toggleVoice() {
    voiceEnabled = !voiceEnabled;
  }

  // Toggle auto-advance
  function toggleAutoAdvance() {
    autoAdvance = !autoAdvance;
    if (!autoAdvance) {
      clearTimeout(stepTimer);
      clearTimeout(actionTimer);
    }
  }

  // Keyboard controls
  function handleKeydown(e: KeyboardEvent) {
    if (!open) return;
    switch (e.key) {
      case 'Escape':
        stopDemo();
        break;
      case ' ':
        e.preventDefault();
        if (isComplete) restartDemo();
        else togglePause();
        break;
      case 'ArrowRight':
        if (!autoAdvance) advanceStep();
        break;
      case 'ArrowLeft':
        if (!autoAdvance) previousStep();
        break;
    }
  }

  onMount(() => {
    window.addEventListener('keydown', handleKeydown);
    if (open) {
      startDemo();
    }
  });

  onDestroy(() => {
    document.body.classList.remove('demo-active');
    stopVoice();
    window.removeEventListener('keydown', handleKeydown);
    clearTimeout(stepTimer);
    clearTimeout(actionTimer);
    window.dispatchEvent(new CustomEvent('aircommand:focus-clear'));
  });

  // Watch for open state changes
  $effect(() => {
    if (open && !isPlaying && !isComplete) {
      startDemo();
    }
  });

  $effect(() => {
    const speed = simSpeed;
    if (!isPlaying || isPaused || !autoAdvance) return;
    clearTimeout(stepTimer);
    clearTimeout(actionTimer);
    if (speed > 0) scheduleNextStep();
  });
</script>

{#if open}
  <div class="demo-overlay" aria-label="AIR COMMAND Demo">
    <!-- Demo Control Panel -->
    <div class="demo-panel">
      <!-- Header -->
      <header>
        <div class="header-left">
          <span class="demo-badge">DEMO MODE</span>
          <h2>AIR COMMAND WALKTHROUGH</h2>
        </div>
        <button class="close-btn" onclick={stopDemo} aria-label="Stop demo">✕</button>
      </header>

      <!-- Progress Bar -->
      <div class="progress-section">
        <div class="progress-bar">
          <div class="progress-fill" style="width: {progress}%"></div>
        </div>
        <div class="progress-text">
          Step {currentStepIndex + 1} of {COMPREHENSIVE_DEMO_STEPS.length} ({progress}%)
        </div>
      </div>

      <!-- Current Step Content -->
      <div class="step-content">
        <div class="step-number">STEP {currentStepIndex + 1}</div>
        <h3 class="step-title">{currentStep?.title || ''}</h3>
        <div class="step-narration">
          <p>{currentStep?.narration || ''}</p>
        </div>

        <!-- Glossary Terms -->
        {#if glossaryTerms.length > 0}
          <div class="glossary-section">
            <div class="glossary-header">TERMS EXPLAINED:</div>
            {#each glossaryTerms as term}
              <div class="glossary-term" tabindex="0" aria-label="{term.term}: {term.definition}">
                <span class="term-name">[{term.term}]</span>
                <span class="term-def">{term.definition}</span>
              </div>
            {/each}
          </div>
        {/if}
      </div>

      <!-- Step Navigation -->
      <div class="step-list">
        {#each COMPREHENSIVE_DEMO_STEPS as step, index}
          <button
            class="step-item"
            class:active={index === currentStepIndex}
            class:completed={index < currentStepIndex}
            onclick={() => jumpToStep(index)}
            aria-label="Go to step {index + 1}: {step.title}"
          >
            <span class="step-index">{index + 1}</span>
            <span class="step-label">{step.title}</span>
          </button>
        {/each}
      </div>

      <!-- Controls -->
      <footer>
        <div class="control-row">
          <button
            class="control-btn"
            onclick={previousStep}
            disabled={currentStepIndex === 0 || isComplete}
            aria-label="Previous step"
          >
            ◀ PREV
          </button>
          <button
            class="control-btn primary"
            onclick={isPaused ? togglePause : advanceStep}
            disabled={isComplete || (autoAdvance && !isPaused)}
            aria-label={isPaused ? 'Resume' : 'Next step'}
          >
            {isPaused ? '▶ RESUME' : '▶ NEXT'}
          </button>
          <button
            class="control-btn"
            onclick={advanceStep}
            disabled={currentStepIndex === COMPREHENSIVE_DEMO_STEPS.length - 1 || isComplete}
            aria-label="Skip to next"
          >
            SKIP ▶
          </button>
        </div>

        <div class="control-row secondary">
          <button
            class="control-btn"
            class:active={autoAdvance}
            onclick={toggleAutoAdvance}
            aria-label="Toggle auto-advance"
          >
            {autoAdvance ? '◉ AUTO-ADVANCE ON' : '○ AUTO-ADVANCE OFF'}
          </button>
          <button
            class="control-btn"
            class:active={voiceEnabled}
            onclick={toggleVoice}
            aria-label="Toggle voice narration"
          >
            {voiceEnabled ? '◉ VOICE ON' : '○ VOICE OFF'}
          </button>
          <span class="control-speed" aria-live="polite">{simSpeed === 0 ? 'PAUSED' : `${simSpeed}X PLAYBACK`}</span>
          <button
            class="control-btn"
            onclick={togglePause}
            disabled={isComplete}
            aria-label="Pause demo"
          >
            {isPaused ? '▶ RESUME' : 'Ⅱ PAUSE'}
          </button>
          <button
            class="control-btn warning"
            onclick={stopDemo}
            aria-label="Stop demo"
          >
            ✕ STOP
          </button>
        </div>

        {#if isComplete}
          <div class="complete-actions">
            <button class="control-btn success" onclick={restartDemo}>
              ↻ RESTART DEMO
            </button>
            <button class="control-btn" onclick={onClose}>
              ✓ CLOSE & USE SYSTEM
            </button>
          </div>
        {/if}
      </footer>
    </div>

  </div>
{/if}

<style>
  :global(body.demo-active .shell) { pointer-events: none; }
  :global(body.demo-active .demo-overlay), :global(body.demo-active .demo-panel), :global(body.demo-active .demo-panel button), :global(body.demo-active .captions) { pointer-events: auto; }
  :global(body.demo-active .focus-layer) { z-index: 501; }

  .demo-overlay { position:relative; inset:auto; z-index:auto; display:block; height:100%; background:transparent; backdrop-filter:none; }

  .demo-panel {
    width: 100%;
    height: 100%;
    max-height: none;
    display: flex;
    flex-direction: column;
    background: var(--bg-panel);
    border: 0;
    box-shadow: none;
    font-family: var(--font-mono);
    overflow: hidden;
  }

  /* Header */
  header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 20px;
    border-bottom: 1px solid var(--border-subtle);
    background: color-mix(in srgb, var(--accent-cyan) 5%, transparent);
  }

  .header-left {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .demo-badge {
    color: var(--accent-amber);
    font: 9px var(--font-mono);
    letter-spacing: 0.18em;
  }

  h2 {
    margin: 0;
    font: 600 18px var(--font-mono);
    letter-spacing: 0.08em;
    color: var(--text-primary);
  }

  .close-btn {
    border: 0;
    color: var(--text-muted);
    background: transparent;
    font-size: 24px;
    cursor: pointer;
    padding: 4px 8px;
  }

  .close-btn:hover {
    color: var(--accent-red);
  }

  /* Progress */
  .progress-section {
    padding: 12px 20px;
    border-bottom: 1px solid var(--border-subtle);
  }

  .progress-bar {
    height: 4px;
    background: var(--border-subtle);
    border-radius: 2px;
    overflow: hidden;
    margin-bottom: 6px;
  }

  .progress-fill {
    height: 100%;
    background: linear-gradient(90deg, var(--accent-cyan), var(--accent-green));
    transition: width 0.3s ease;
  }

  .progress-text {
    font: 9px var(--font-mono);
    color: var(--text-muted);
    letter-spacing: 0.12em;
  }

  /* Step Content */
  .step-content {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    padding: 20px;
  }

  .step-number {
    color: var(--accent-cyan);
    font: 9px var(--font-mono);
    letter-spacing: 0.18em;
    margin-bottom: 8px;
  }

  .step-title {
    margin: 0 0 16px;
    font: 600 20px var(--font-mono);
    letter-spacing: 0.08em;
    color: var(--text-primary);
  }

  .step-narration {
    margin-bottom: 20px;
  }

  .step-narration p {
    font: 13px/1.6 var(--font-sans);
    color: var(--text-secondary);
    margin: 0;
  }

  /* Glossary */
  .glossary-section {
    padding: 12px;
    background: color-mix(in srgb, var(--accent-amber) 5%, transparent);
    border: 1px solid var(--accent-amber);
    border-radius: 4px;
  }

  .glossary-header {
    color: var(--accent-amber);
    font: 9px var(--font-mono);
    letter-spacing: 0.14em;
    margin-bottom: 10px;
  }

  .glossary-term {
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin-bottom: 8px;
    padding-bottom: 8px;
    border-bottom: 1px solid var(--border-subtle);
  }

  .glossary-term:last-child {
    margin-bottom: 0;
    padding-bottom: 0;
    border-bottom: none;
  }

  .term-name {
    color: var(--accent-cyan);
    font: 11px var(--font-mono);
    font-weight: 600;
    letter-spacing: 0.1em;
  }

  .term-def {
    font: 12px/1.5 var(--font-sans);
    color: var(--text-secondary);
    display: none;
  }
  .glossary-term:hover .term-def, .glossary-term:focus-visible .term-def { display:block; }

  /* Step List */
  .step-list {
    max-height: 120px;
    overflow-y: auto;
    padding: 0 20px;
    border-top: 1px solid var(--border-subtle);
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 6px;
    padding: 12px 20px;
  }

  .step-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 10px;
    background: transparent;
    border: 1px solid var(--border-subtle);
    color: var(--text-secondary);
    font: 9px var(--font-mono);
    cursor: pointer;
    text-align: left;
    transition: all 0.2s;
  }

  .step-item:hover {
    border-color: var(--accent-cyan);
    color: var(--text-primary);
  }

  .step-item.active {
    background: color-mix(in srgb, var(--accent-cyan) 10%, transparent);
    border-color: var(--accent-cyan);
    color: var(--accent-cyan);
  }

  .step-item.completed {
    border-color: var(--accent-green);
    color: var(--accent-green);
  }

  .step-index {
    font: 8px var(--font-mono);
    opacity: 0.7;
  }

  .step-label {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* Footer Controls */
  footer {
    padding: 16px 20px;
    border-top: 1px solid var(--border-subtle);
    background: rgba(0, 0, 0, 0.2);
  }

  .control-row {
    display: flex;
    gap: 8px;
    margin-bottom: 8px;
  }

  .control-row.secondary {
    margin-bottom: 0;
  }

  .control-btn {
    flex: 1;
    padding: 10px 12px;
    color: var(--text-secondary);
    background: transparent;
    border: 1px solid var(--border-subtle);
    font: 9px var(--font-mono);
    letter-spacing: 0.08em;
    cursor: pointer;
    transition: all 0.2s;
  }

  .control-btn:hover:not(:disabled) {
    border-color: var(--accent-cyan);
    color: var(--accent-cyan);
  }

  .control-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .control-btn.primary {
    background: color-mix(in srgb, var(--accent-cyan) 10%, transparent);
    border-color: var(--accent-cyan);
    color: var(--accent-cyan);
  }

  .control-btn.primary:hover:not(:disabled) {
    background: color-mix(in srgb, var(--accent-cyan) 20%, transparent);
  }

  .control-btn.active {
    background: color-mix(in srgb, var(--accent-cyan) 10%, transparent);
    border-color: var(--accent-cyan);
    color: var(--accent-cyan);
  }

  .control-btn.warning {
    border-color: var(--accent-red);
    color: var(--accent-red);
  }

  .control-btn.warning:hover {
    background: rgba(255, 0, 0, 0.1);
  }

  .control-btn.success {
    border-color: var(--accent-green);
    color: var(--accent-green);
  }

  .control-btn.success:hover {
    background: rgba(0, 255, 0, 0.1);
  }

  .complete-actions {
    display: flex;
    gap: 8px;
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px solid var(--border-subtle);
  }

  /* System Lock Overlay */
  .system-lock {
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 501;
  }

  .lock-indicator {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 16px;
    background: rgba(5, 8, 15, 0.95);
    border: 1px solid var(--accent-red);
    box-shadow: 0 4px 20px rgba(255, 0, 0, 0.3);
    font: 10px var(--font-mono);
    letter-spacing: 0.12em;
    color: var(--accent-red);
  }

  .lock-icon {
    font-size: 16px;
  }

  .lock-indicator small {
    color: var(--text-muted);
    font-size: 8px;
    margin-left: 8px;
  }

  /* Scrollbar styling */
  .step-content::-webkit-scrollbar,
  .step-list::-webkit-scrollbar {
    width: 6px;
  }

  .step-content::-webkit-scrollbar-track,
  .step-list::-webkit-scrollbar-track {
    background: var(--border-subtle);
  }

  .step-content::-webkit-scrollbar-thumb,
  .step-list::-webkit-scrollbar-thumb {
    background: var(--accent-cyan);
    border-radius: 3px;
  }
</style>
