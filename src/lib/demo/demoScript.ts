import { system } from '../stores/systemStore.svelte';

export interface DemoStep {
  element?: string; // CSS selector; omit for centered steps
  title: string;
  description: string;
  side?: 'top' | 'bottom' | 'left' | 'right';
  action?: () => void; // called when step is shown
  actionDelay?: number; // ms to wait after action before user can advance
}

export const DEMO_STEPS: DemoStep[] = [
  // STEP 1 — WELCOME
  {
    title: 'WELCOME TO AIR COMMAND',
    description:
      'A dynamic decision-support system for air operations planning. Built for SIH 2026 Problem Statement 26250. This 60-second demo walks through the operational workflow.',
  },

  // STEP 2 — THE OPERATIONAL PICTURE
  {
    element: '.center',
    side: 'left',
    title: 'OPERATIONAL PICTURE',
    description:
      'The centre display is a live tactical map. Hexagons are IAF airbases. Triangles are aircraft, colour-coded by status: green FMC, amber PMC, red NMC. Layered red rings are threat zones. Click any base to drill into its roster.',
  },

  // STEP 3 — ASSET INVENTORY
  {
    element: '.left',
    side: 'right',
    title: 'ASSET INVENTORY',
    description:
      'The left column shows 14 aircraft across 10 bases, sorted by mission capability. Below it, the mission queue lists 6 pending targets with priority and risk scores. Click a mission to open its briefing.',
  },

  // STEP 4 — GENERATE COURSES OF ACTION
  {
    element: 'button.gen',
    side: 'left',
    title: 'MULTI-OBJECTIVE OPTIMISATION',
    description:
      'The system computes three distinct Courses of Action using an NSGA-II style optimiser. Each mode (aggressive, balanced, conservative) weighs mission success, risk exposure, fuel reserve, and crew fatigue differently. The result is a Pareto front, not a single answer.',
    action: () => {
      system.generateCOAs();
    },
    actionDelay: 2000,
  },

  // STEP 5 — COA COMPARISON
  {
    element: '.coa-card',
    side: 'left',
    title: 'THREE STRATEGIC POSTURES',
    description:
      'Balanced (green) weighs everything equally. Aggressive (red) maximises mission throughput and accepts high exposure. Conservative (amber) preserves airframes and defers low-priority missions. Note the different success probabilities and risk scores.',
  },

  // STEP 6 — WEAPONEERING INTEGRITY
  {
    element: '.coa-missions',
    side: 'left',
    title: 'WEAPONEERING-FIRST LOGIC',
    description:
      'The optimiser refuses to assign an aircraft that cannot kill the target. A Jaguar with Harpoon cannot hit a bunker. A Mirage with Spice-2000 cannot hit a ship. Only compatible platform-weapon pairs are considered. This is what makes the COA operationally real.',
  },

  // STEP 7 — HISTORICAL DOCTRINE
  {
    element: 'button.ref-btn',
    side: 'bottom',
    title: 'DOCTRINAL REFERENCE LIBRARY',
    description:
      'Five SVG references are built in: mission planning flow, Su-30MKI and Rafale loadout diagrams, Operation Sindoor strike geometry, and the command post layout. Every mission template maps to a real precedent.',
  },

  // STEP 8 — COMMANDER BRIEFING
  {
    element: '.mission-block .row',
    side: 'right',
    title: 'PRE-LAUNCH BRIEFING',
    description:
      'Before any mission launches, the commander sees a briefing: target package, threat envelope, assigned forces with weaponeering assessment, historical precedent, and the decision points that will occur in flight. Approval is required.',
  },

  // STEP 9 — IN-FLIGHT DECISIONS
  {
    title: 'IN-FLIGHT COMMAND DECISIONS',
    description:
      'Missions pause at phase boundaries. The commander chooses between branches. Each branch mutates state: some add threats, some delay the mission, some abort it. This is the human-in-the-loop.',
  },

  // STEP 10 — AFTER-ACTION REVIEW
  {
    title: 'AFTER-ACTION REVIEW',
    description:
      'When a mission completes, an AAR opens automatically. Decision trail, mission narrative, force recovery, risk accounting. Exportable as text. Replayable with the same template. This is what the system delivers to the commander.',
  },

  // STEP 11 — CLOSE
  {
    title: 'READY TO EXPLORE',
    description:
      'You have seen the complete workflow. Click GENERATE COA to start planning, or open the REFERENCE library to inspect the loadout diagrams and mission flow. The system is live.',
  },
];
