import { system } from '../stores/systemStore.svelte';
import { GLOSSARY } from '../data/glossary';

export interface DemoStep {
  id: string;
  element?: string; // CSS selector for focus pointer
  title: string;
  narration: string; // Voice over text
  caption: string; // Displayed caption
  glossaryTerms?: string[]; // Terms to highlight/explain
  action?: () => void; // Called when step starts
  actionDelay?: number; // Wait time after action
  duration?: number; // Auto-advance time (optional)
  side?: 'top' | 'bottom' | 'left' | 'right'; // For tooltip positioning
}

/**
 * Comprehensive Demo Scenario - Full Mission Walkthrough
 * This script demonstrates the complete AIR COMMAND workflow from planning to execution.
 * The demo locks the system and guides the commander through each component.
 */
export const COMPREHENSIVE_DEMO_STEPS: DemoStep[] = [
  // ==================================================================
  // INTRODUCTION
  // ==================================================================
  {
    id: 'intro-1',
    title: 'WELCOME TO AIR COMMAND',
    narration: 'Welcome to AIR COMMAND, a dynamic decision-support system for air operations planning. This demo will guide you through the complete operational workflow, from mission planning to execution.',
    caption: 'AIR COMMAND SYSTEM - Tactical Console for Air Operations',
    duration: 8000,
  },
  {
    id: 'intro-2',
    title: 'DEMO MODE ACTIVE',
    narration: 'Demo mode is now active. The system is locked - you cannot interact until the demo completes or you manually stop it. The demo will demonstrate each component and explain military terminology used in the system.',
    caption: 'SYSTEM LOCKED - Demo in progress. Press ESC to exit demo.',
    duration: 6000,
  },

  // ==================================================================
  // OPERATIONAL PICTURE
  // ==================================================================
  {
    id: 'map-1',
    element: '[data-tour="map"]',
    side: 'left',
    title: 'THE TACTICAL MAP',
    narration: 'The center display is the tactical map showing the operational picture. Hexagons represent IAF airbases. Triangles are aircraft, color-coded by status. Red rings indicate threat zones from enemy air defenses.',
    caption: 'TACTICAL MAP - Live operational picture of airspace',
    glossaryTerms: ['IACCS'],
    duration: 10000,
  },
  {
    id: 'map-2',
    element: '[data-tour="map"]',
    side: 'left',
    title: 'AIRCRAFT STATUS CODES',
    narration: 'Aircraft are marked with status codes. Green indicates FMC - Fully Mission Capable, meaning the aircraft is ready for its assigned task. Amber indicates PMC - Partially Mission Capable, with restricted capability. Red indicates NMC - Not Mission Capable, unavailable for operations.',
    caption: 'AIRCRAFT STATUS: FMC (green), PMC (amber), NMC (red)',
    glossaryTerms: ['FMC', 'PMC', 'NMC', 'HUMS'],
    duration: 12000,
  },
  {
    id: 'map-3',
    element: '[data-tour="map"]',
    side: 'left',
    title: 'THREAT ZONES',
    narration: 'The red rings show threat zones from enemy Surface-to-Air Missile sites. Each ring represents a WEZ - Weapon Engagement Zone - the area where the enemy can engage aircraft. The system calculates route risk scores based on exposure to these zones.',
    caption: 'THREAT ZONES - Enemy SAM coverage and WEZ rings',
    glossaryTerms: ['WEZ', 'SEAD'],
    duration: 11000,
  },

  // ==================================================================
  // ASSET INVENTORY - LEFT PANEL
  // ==================================================================
  {
    id: 'left-1',
    element: '[data-tour="roster"]',
    side: 'right',
    title: 'FORCE ROSTER',
    narration: 'The left panel shows the force roster - all available aircraft across bases. Each aircraft entry shows its tail number, type, base location, and current status. Clicking an aircraft reveals its loadout configuration and readiness details.',
    caption: 'FORCE ROSTER - Available aircraft inventory',
    duration: 9000,
  },
  {
    id: 'left-2',
    element: '[data-tour="missions"]',
    side: 'right',
    title: 'MISSION QUEUE',
    narration: 'Below the roster is the mission queue - pending targets requiring air strikes. Each mission shows the target type, priority level, and risk score. Priority levels indicate operational urgency - Priority 1 is the most critical, requiring immediate action.',
    caption: 'MISSION QUEUE - Pending targets with priority and risk scores',
    glossaryTerms: ['TST', 'ATO'],
    duration: 10000,
  },

  // ==================================================================
  // COURSES OF ACTION GENERATION
  // ==================================================================
  {
    id: 'coa-1',
    element: '[data-tour="generate-coa"]',
    side: 'left',
    title: 'GENERATING COURSES OF ACTION',
    narration: 'The system generates multiple Courses of Action using multi-objective optimization. This algorithm, inspired by NSGA-II, evaluates hundreds of possible allocations and finds the Pareto-optimal set - plans where improving one objective requires compromising another.',
    caption: 'COA GENERATION - Multi-objective optimization running',
    glossaryTerms: ['COA', 'NSGA-II', 'Pareto front'],
    action: () => {
      system.generateCOAs();
    },
    actionDelay: 3000,
    duration: 12000,
  },
  {
    id: 'coa-2',
    element: '[data-tour="coa-panel"]',
    side: 'left',
    title: 'THREE STRATEGIC OPTIONS',
    narration: 'The system presents three distinct COAs: Aggressive maximizes mission throughput but accepts higher risk. Balanced is the recommended default, weighing all objectives equally. Conservative preserves airframes and may defer lower-priority missions.',
    caption: 'THREE COA OPTIONS: Aggressive, Balanced, Conservative',
    duration: 11000,
  },
  {
    id: 'coa-3',
    element: '[data-tour="coa-panel"]',
    side: 'left',
    title: 'UNDERSTANDING THE METRICS',
    narration: 'Each COA shows success probability, total risk exposure, and mission coverage. These metrics help the commander understand trade-offs. The balanced COA is highlighted as the system recommendation, but the commander retains final authority.',
    caption: 'COA METRICS - Success probability, risk, and coverage',
    glossaryTerms: ['Pk'],
    duration: 10000,
  },

  // ==================================================================
  // WEAPONEERING AND COMPATIBILITY
  // ==================================================================
  {
    id: 'weapon-1',
    element: '[data-tour="coa-panel"]',
    side: 'left',
    title: 'WEAPONEERING-FIRST LOGIC',
    narration: 'The optimizer enforces weapon-target compatibility. A Jaguar with Harpoon anti-ship missiles cannot engage a hardened bunker. A Mirage with Spice-2000 cannot hit a ship. Only compatible platform-weapon pairs are considered - this ensures operational realism.',
    caption: 'WEAPONEERING - Weapon-target compatibility enforced',
    glossaryTerms: ['Standoff', 'Anti-radiation', 'BVRAAM', 'SRAAM'],
    duration: 12000,
  },
  {
    id: 'weapon-2',
    element: '[data-tour="coa-panel"]',
    side: 'left',
    title: 'LAUNCH ENVELOPE CALCULATIONS',
    narration: 'For each aircraft-target pair, the system calculates whether the aircraft is within the weapon launch envelope. It considers distance, threat exposure, fuel state, and crew rest compliance. Aircraft outside the envelope are not assigned to that mission.',
    caption: 'LAUNCH ENVELOPE - Range and risk calculations',
    duration: 10000,
  },

  // ==================================================================
  // HISTORICAL DOCTRINE
  // ==================================================================
  {
    id: 'ref-1',
    element: '[data-tour="reference-library"]',
    side: 'bottom',
    title: 'DOCTRINAL REFERENCE LIBRARY',
    narration: 'The Reference Library contains tactical diagrams and historical mission precedents. These include mission planning flowcharts, aircraft loadout diagrams, and strike geometry from real operations like Operation Balakot and Operation Sindoor.',
    caption: 'REFERENCE LIBRARY - Doctrinal precedents and diagrams',
    duration: 10000,
  },
  {
    id: 'ref-2',
    element: '[data-tour="reference-library"]',
    side: 'bottom',
    title: 'HISTORICAL PRECEDENTS',
    narration: 'Each mission template maps to a historical precedent. When you open a mission briefing, you see the real-world case it was modeled on, including the decisions commanders faced and the outcomes of those decisions. This connects operational planning to doctrine.',
    caption: 'HISTORICAL PRECEDENTS - Real-world mission cases',
    duration: 11000,
  },

  // ==================================================================
  // COMMANDER BRIEFING
  // ==================================================================
  {
    id: 'briefing-1',
    element: '[data-tour="missions"]',
    side: 'right',
    title: 'PRE-LAUNCH BRIEFING',
    narration: 'Before approving any mission, the commander sees a comprehensive briefing. This includes the target package with coordinates, collateral damage estimates, threat analysis, assigned forces with weaponeering assessment, and historical precedent.',
    caption: 'COMMANDER BRIEFING - Complete mission package',
    glossaryTerms: ['BDA'],
    duration: 11000,
  },
  {
    id: 'briefing-2',
    element: '[data-tour="missions"]',
    side: 'right',
    title: 'TARGET PACKAGE DETAILS',
    narration: 'The briefing shows the target grid coordinates with intelligence accuracy estimates, collateral damage classification, and route risk score. Threats within 100 kilometers are listed with their intercept probabilities. This ensures full situational awareness before committing forces.',
    caption: 'TARGET PACKAGE - Coordinates, threats, and risk assessment',
    duration: 12000,
  },
  {
    id: 'briefing-3',
    element: '[data-tour="missions"]',
    side: 'right',
    title: 'ASSIGNED FORCES',
    narration: 'Each assigned aircraft is shown with its tail number, type, base, and status. The weaponeering assessment indicates whether the pairing is optimal, feasible, or marginal based on weapon range, target type, and threat exposure. Reason codes explain the assessment.',
    caption: 'ASSIGNED FORCES - Aircraft-weapon pairings with assessment',
    duration: 11000,
  },
  {
    id: 'briefing-4',
    element: '[data-tour="missions"]',
    side: 'right',
    title: 'DECISION POINTS PREVIEW',
    narration: 'The briefing also previews the decision points that will occur during the mission. These are gates where the commander must choose between branches - each branch affects the mission outcome, threat picture, or force status. This prepares the commander for in-flight decisions.',
    caption: 'DECISION POINTS - In-flight command gates previewed',
    duration: 10000,
  },

  // ==================================================================
  // MISSION EXECUTION
  // ==================================================================
  {
    id: 'exec-1',
    title: 'MISSION EXECUTION PHASE',
    narration: 'Once approved, the mission enters execution. The system tracks the package through phases: ingress, weapon employment zone entry, weapons release, and egress. The tactical map shows the package trajectory in real-time.',
    caption: 'MISSION EXECUTION - Tracking package through phases',
    duration: 9000,
  },
  {
    id: 'exec-2',
    title: 'IN-FLIGHT DECISIONS',
    narration: 'Missions pause at phase boundaries when a decision is required. The commander chooses between branches - each branch has different consequences. Some add threats, some delay the mission, some abort it. This is the human-in-the-loop control.',
    caption: 'IN-FLIGHT DECISIONS - Commander retains authority',
    duration: 10000,
  },
  {
    id: 'exec-3',
    title: 'REAL-TIME THREAT UPDATES',
    narration: 'During execution, the threat picture can change. New SAM sites may appear, aircraft may go NMC due to mechanical issues, or intelligence may update target status. The system automatically re-optimizes when conditions change.',
    caption: 'DYNAMIC RE-OPTIMIZATION - Responds to changing conditions',
    duration: 9000,
  },

  // ==================================================================
  // AFTER-ACTION REVIEW
  // ==================================================================
  {
    id: 'aar-1',
    title: 'AFTER-ACTION REVIEW',
    narration: 'When a mission completes, an After-Action Review opens automatically. This shows the complete decision trail, mission narrative, force recovery status, and risk accounting. It captures what happened and why, for learning and debriefing.',
    caption: 'AFTER-ACTION REVIEW - Complete mission record',
    glossaryTerms: ['BDA'],
    duration: 10000,
  },
  {
    id: 'aar-2',
    title: 'BATTLE DAMAGE ASSESSMENT',
    narration: 'The AAR includes Battle Damage Assessment - evaluation of the strike results. It shows target destruction probability, collateral effects, and whether the mission achieved its objectives. This is exported for operational records.',
    caption: 'BATTLE DAMAGE ASSESSMENT - Strike outcome evaluation',
    duration: 9000,
  },

  // ==================================================================
  // SCENARIO MANAGEMENT
  // ==================================================================
  {
    id: 'scenario-1',
    element: '[data-tour="scenario-bar"]',
    side: 'bottom',
    title: 'SCENARIO FILTER',
    narration: 'The scenario bar at the top allows filtering the operational picture. You can select specific scenarios like Deep Strike, SEAD Suppression, or Multi-Crisis. Each scenario has different threat configurations, mission sets, and force availability.',
    caption: 'SCENARIO FILTER - Switch between operational contexts',
    duration: 10000,
  },
  {
    id: 'scenario-2',
    element: '[data-tour="scenario-bar"]',
    side: 'bottom',
    title: 'SCENARIO: AIRCRAFT NMC',
    narration: 'For example, the Aircraft NMC scenario simulates an engine anomaly that changes aircraft availability. The system detects the status change, re-evaluates force readiness, and automatically re-generates COAs with the new constraints.',
    caption: 'AIRCRAFT NMC SCENARIO - Dynamic availability changes',
    duration: 11000,
  },
  {
    id: 'scenario-3',
    element: '[data-tour="scenario-bar"]',
    side: 'bottom',
    title: 'SCENARIO: MULTI-CRISIS',
    narration: 'The Multi-Crisis scenario adds complexity: a new SAM site appears, an ingress corridor closes, and multiple aircraft availability changes simultaneously. The system handles multiple concurrent changes and presents updated COAs.',
    caption: 'MULTI-CRISIS SCENARIO - Multiple concurrent changes',
    duration: 10000,
  },

  // ==================================================================
  // RIGHT PANEL FEATURES
  // ==================================================================
  {
    id: 'right-1',
    element: '[data-tour="coa-panel"]',
    side: 'left',
    title: 'RIGHT PANEL TABS',
    narration: 'The right panel provides multiple views. The COA tab shows courses of action. Red View summarizes adversary response assumptions. The Execution tab tracks active missions. Metrics shows analytics. Weapons displays the compatibility matrix.',
    caption: 'RIGHT PANEL - Multiple analytical views',
    duration: 10000,
  },
  {
    id: 'right-2',
    element: '[data-tour="coa-panel"]',
    side: 'left',
    title: 'WEAPON MATRIX',
    narration: 'The Weapon Matrix shows which weapons are compatible with which target types and which aircraft can carry those weapons. This transparency helps commanders understand why certain assignments are made or rejected.',
    caption: 'WEAPON MATRIX - Platform-weapon-target compatibility',
    duration: 9000,
  },

  // ==================================================================
  // EVENT LOG AND SYSTEM STATUS
  // ==================================================================
  {
    id: 'log-1',
    element: '[data-tour="log"]',
    side: 'right',
    title: 'EVENT LOG',
    narration: 'The event log at the bottom right records all system events and commander decisions. This provides an audit trail of the planning process, showing when COAs were generated, missions approved, and decisions made.',
    caption: 'EVENT LOG - Complete audit trail of operations',
    duration: 8000,
  },
  {
    id: 'status-1',
    element: '[data-tour="command-status"]',
    side: 'top',
    title: 'COMMAND STATUS',
    narration: 'The command status bar shows system health, active mission count, and optimization mode. It also indicates when the system is in degraded mode - relying on single sensor sources without cross-validation.',
    caption: 'COMMAND STATUS - System health and mode indicators',
    glossaryTerms: ['Cross-sensor validation', 'Single-source mode', 'Track loss'],
    duration: 9000,
  },

  // ==================================================================
  // TRAINING SIMULATION
  // ==================================================================
  {
    id: 'sim-1',
    element: '[data-tour="simulation"]',
    side: 'bottom',
    title: 'TRAINING SIMULATION',
    narration: 'The system includes an autonomous training simulation based on historical cases. It briefs a mission, starts a training run, advances through phases, and pauses at historical decision points. The commander can accept or override system recommendations.',
    caption: 'TRAINING SIMULATION - Historical case-based learning',
    duration: 11000,
  },
  {
    id: 'sim-2',
    element: '[data-tour="simulation"]',
    side: 'bottom',
    title: 'LEARNING FROM HISTORY',
    narration: 'The simulation uses real operations like Operation Balakot and Operation Sindoor. By replaying these cases, commanders can practice decision-making in realistic scenarios. The system shows what actually happened and the consequences of different choices.',
    caption: 'HISTORICAL CASES - Learn from real operations',
    duration: 10000,
  },

  // ==================================================================
  // VOICE AND ACCESSIBILITY
  // ==================================================================
  {
    id: 'voice-1',
    element: '[data-tour="voice-toggle"]',
    side: 'top',
    title: 'VOICE NARRATION',
    narration: 'The system includes voice narration for accessibility and hands-free operation. The voice toggle in the top bar enables or disables narration. Captions are synchronized with voice for clarity. This allows commanders to operate the system while maintaining situational awareness.',
    caption: 'VOICE NARRATION - Hands-free accessibility',
    duration: 9000,
  },

  // ==================================================================
  // GLOSSARY AND HELP
  // ==================================================================
  {
    id: 'glossary-1',
    element: '[data-tour="help-menu"]',
    side: 'bottom',
    title: 'INTERACTIVE GLOSSARY',
    narration: 'The system includes an interactive glossary of military terms. Throughout this demo, technical terms like FMC, WEZ, and COA have been highlighted. The glossary provides definitions for all terminology used in the system.',
    caption: 'INTERACTIVE GLOSSARY - Military terminology explained',
    duration: 8000,
  },
  {
    id: 'help-1',
    element: '[data-tour="help-menu"]',
    side: 'bottom',
    title: 'SYSTEM GUIDE',
    narration: 'The System Guide is an AI assistant that answers questions about how to use the console. It can explain map layers, scenarios, aircraft readiness, missions, threats, and simulation. It only answers questions about this system.',
    caption: 'SYSTEM GUIDE - AI-powered help assistant',
    duration: 8000,
  },

  // ==================================================================
  // CONCLUSION
  // ==================================================================
  {
    id: 'end-1',
    title: 'DEMO COMPLETE',
    narration: 'You have now seen the complete AIR COMMAND workflow. The system integrates data fusion, multi-objective optimization, weaponeering, historical doctrine, and human-in-the-loop decision support into a unified console.',
    caption: 'DEMO COMPLETE - Full system demonstrated',
    duration: 9000,
  },
  {
    id: 'end-2',
    title: 'READY TO OPERATE',
    narration: 'The demo is now ending. You can interact with the system freely. Generate COAs, review missions, open the reference library, or start a training simulation. The system is live and ready for operational planning.',
    caption: 'SYSTEM UNLOCKED - Ready for use',
    duration: 8000,
  },
];

export const DEMO_STEPS = COMPREHENSIVE_DEMO_STEPS;

/**
 * Get glossary definition for a term
 */
export function getGlossaryDefinition(term: string): string | null {
  const entry = GLOSSARY.find((g) => g.term.toLowerCase() === term.toLowerCase());
  return entry ? entry.definition : null;
}

/**
 * Get all glossary terms mentioned in a step
 */
export function getStepGlossaryTerms(step: DemoStep): Array<{ term: string; definition: string }> {
  if (!step.glossaryTerms || step.glossaryTerms.length === 0) return [];
  return step.glossaryTerms
    .map((term) => {
      const def = getGlossaryDefinition(term);
      return def ? { term, definition: def } : null;
    })
    .filter((item): item is { term: string; definition: string } => item !== null);
}
