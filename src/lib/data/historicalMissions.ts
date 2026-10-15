import type { TargetType, Position } from '../types';

export interface DecisionBranch {
  id: string;
  label: string;
  description: string;
  tag: string;
  tagColor: string;
  outcome: 'success' | 'partial' | 'abort' | 'escalate';
  consequence: string;
  effect: {
    missionDelayMin?: number;
    riskDelta?: number;
    addThreat?: boolean;
    killAircraft?: string;
    lossProbability?: number;
  };
}

export interface DecisionPoint {
  atPhase: string;
  context: string;
  title: string;
  message: string;
  branches: DecisionBranch[];
}

export interface HistoricalMission {
  id: string;
  codename: string;
  date: string | null;
  reference: string;
  targetType: TargetType;
  target: Position;
  narrative: string;
  decisions: DecisionPoint[];
}

export const HISTORICAL_MISSIONS: Record<string, HistoricalMission> = {
  balakot: {
    id: 'balakot',
    codename: 'BANDAR',
    date: '2019-02-26',
    reference: 'BALAKOT · OP BANDAR',
    targetType: 'troop-concentration',
    target: { lat: 34.45, lng: 73.35 },
    narrative: 'Pre-dawn Mirage-2000 strike on a Jaish-e-Mohammed facility in Balakot. Public reporting differs on the munition details; this training template models late intelligence changes and a compressed strike window without asserting a specific weapon release.',
    decisions: [
      {
        atPhase: 'INGRESS',
        context: 'T-42 MIN FROM WEZ · INTEL UPDATE',
        title: 'TARGET PACKAGE REVISED',
        message: 'Ground intel now indicates the primary target building is empty. A secondary building 400m east has shown activity in the last two hours. Original satellite imagery is 36 hours old. Recommend a decision.',
        branches: [
          {
            id: 'stick',
            label: 'PROCEED AS PLANNED',
            description: 'Strike the original coordinates. Preserves mission integrity, but intelligence confidence is now Medium.',
            tag: 'LOW RISK',
            tagColor: 'var(--accent-amber)',
            outcome: 'partial',
            consequence: 'Strike conducted on original coordinates. BDA unclear. Political messaging weaker than intended.',
            effect: { riskDelta: +8 },
          },
          {
            id: 'shift',
            label: 'SHIFT TO SECONDARY TARGET',
            description: 'Re-task the package to the new building. Requires 12-minute course correction but hits the current intel.',
            tag: 'RECOMMENDED',
            tagColor: 'var(--accent-green)',
            outcome: 'success',
            consequence: 'Strike conducted on active target. High BDA confidence. Mission narrative preserved.',
            effect: { missionDelayMin: 12 },
          },
          {
            id: 'abort',
            label: 'ABORT AND RTB',
            description: 'Return to base. No strike. Political cost of a cancelled operation is high.',
            tag: 'ABORT',
            tagColor: 'var(--accent-red)',
            outcome: 'abort',
            consequence: 'Mission aborted. Strike package recalled. Intelligence opportunity lost.',
            effect: {},
          },
        ],
      },
      {
        atPhase: 'WEZ',
        context: 'T-0 · WEAPON RELEASE WINDOW',
        title: 'PACKAGE INSIDE WEZ',
        message: 'Aircraft are inside the release envelope. Local air defence radar has just gone active — but no lock detected. You have 30 seconds before the release window closes.',
        branches: [
          {
            id: 'release',
            label: 'RELEASE WEAPONS NOW',
            description: 'Release the approved precision-munition package. Meets the timeline. Radar may lock during egress.',
            tag: 'COMMIT',
            tagColor: 'var(--accent-green)',
            outcome: 'success',
            consequence: 'Weapons released. Target destroyed. Egress through detection but no engagement.',
            effect: {},
          },
          {
            id: 'hold',
            label: 'HOLD · RE-ATTACK RUN',
            description: 'Break off, reposition 8 km east, re-enter for a second pass. Fuel state permits one more attempt.',
            tag: 'RISK',
            tagColor: 'var(--accent-amber)',
            outcome: 'partial',
            consequence: 'Second pass successful but one aircraft below bingo fuel. Diverted to alternate base.',
            effect: { missionDelayMin: 18, riskDelta: +15 },
          },
        ],
      },
    ],
  },

  sindoor_deep: {
    id: 'sindoor_deep',
    codename: 'SINDOOR DEEP',
    date: '2025-05-07',
    reference: 'OP SINDOOR · DEEP STRIKE',
    targetType: 'hardened-bunker',
    target: { lat: 32.45, lng: 74.55 },
    narrative: 'Rafales launched SCALP cruise missiles against a hardened facility 200+ km inside hostile airspace. Standoff employment meant no aircraft entered the threat envelope. The deciding factor was weapon range versus threat geometry.',
    decisions: [
      {
        atPhase: 'INGRESS',
        context: 'T-90 MIN · TANKER TRACK',
        title: 'TANKER UNAVAILABLE',
        message: 'Planned air-to-air refuelling has been cancelled. The alternate tanker is 40 minutes away. Package has fuel for the mission but no reserve. Options: continue without reserve, wait for tanker, or reduce loadout.',
        branches: [
          {
            id: 'continue',
            label: 'CONTINUE WITHOUT RESERVE',
            description: 'Accept no divert fuel. Egress must be direct. Loss of aircraft if engaged.',
            tag: 'HIGH RISK',
            tagColor: 'var(--accent-red)',
            outcome: 'partial',
            consequence: 'Strike succeeds. Egress was uncontested. Single aircraft returned with 4% fuel.',
            effect: { riskDelta: +20 },
          },
          {
            id: 'wait',
            label: 'DELAY 40 MIN · WAIT FOR TANKER',
            description: 'Refuel en route. Preserves reserves. Extends exposure window by 40 minutes.',
            tag: 'SLOW',
            tagColor: 'var(--accent-amber)',
            outcome: 'success',
            consequence: 'Refuelling complete. Strike on timeline. Package returned with healthy reserves.',
            effect: { missionDelayMin: 40 },
          },
        ],
      },
      {
        atPhase: 'WEZ',
        context: 'T-0 · STANDOFF RELEASE',
        title: 'SCALP RELEASE OUTSIDE ENVELOPE',
        message: 'Aircraft are at 280 km from target, still 100 km outside the outermost SAM ring. SCALP can be released now, or the package can close to 180 km for a tighter CEP.',
        branches: [
          {
            id: 'early',
            label: 'RELEASE NOW · STANDOFF',
            description: 'Fire from maximum range. Preserves aircrew. Terminal accuracy depends on mid-course updates.',
            tag: 'OPTIMAL',
            tagColor: 'var(--accent-green)',
            outcome: 'success',
            consequence: 'SCALP released at 280 km. Cruise phase successful. Target destroyed. Package egressed clean.',
            effect: {},
          },
          {
            id: 'close',
            label: 'CLOSE TO 180 KM',
            description: 'Improves CEP by 40%. Aircraft enter the outer radar ring but stay outside SAM engagement range.',
            tag: 'PRECISION',
            tagColor: 'var(--accent-cyan)',
            outcome: 'success',
            consequence: 'Strike hit within 2m CEP. Radar detected the package but could not engage.',
            effect: { riskDelta: +10 },
          },
        ],
      },
    ],
  },

  sead_template: {
    id: 'sead_template',
    codename: 'SEAD TRAINING',
    date: null,
    reference: 'HYPOTHETICAL · SEAD TRAINING TEMPLATE',
    targetType: 'radar-site',
    target: { lat: 33.90, lng: 74.20 },
    narrative: 'Hypothetical training template for managing radar emissions during a Suppression of Enemy Air Defences (SEAD) sequence. This is not a dated historical event or a claim about an actual operation.',
    decisions: [
      {
        atPhase: 'INGRESS',
        context: 'EXERCISE · EMISSION DETECT',
        title: 'RADAR EMISSION LOST',
        message: 'Exercise inject: the target radar went silent 90 seconds ago. It may have shut down or relocated. Last known position is 4 minutes old.',
        branches: [
          {
            id: 'loiter',
            label: 'LOITER · WAIT FOR RE-EMISSION',
            description: 'Hold orbit 40 km east. If radar resumes, engage immediately. Consumes 15 minutes of fuel.',
            tag: 'PATIENT',
            tagColor: 'var(--accent-cyan)',
            outcome: 'success',
            consequence: 'In this illustrative branch the radar resumes and the exercise package engages the emitter.',
            effect: { missionDelayMin: 8 },
          },
          {
            id: 'engage_last',
            label: 'ENGAGE LAST KNOWN POSITION',
            description: 'Fire Rudram at recorded coordinates. May miss if radar has moved. Consumes the missile.',
            tag: 'AGGRESSIVE',
            tagColor: 'var(--accent-amber)',
            outcome: 'partial',
            consequence: 'In this illustrative branch the recorded position is empty; update the threat picture before continuing.',
            effect: { addThreat: true },
          },
        ],
      },
    ],
  },

  kargil_1999: {
    id: 'kargil_1999',
    codename: 'VIJAY',
    date: '1999-06-19–20',
    reference: 'OPERATION VIJAY · TIGER HILL',
    targetType: 'troop-concentration',
    target: { lat: 34.60, lng: 76.20 },
    narrative: 'Mirage-2000s dropped laser-guided bombs on enemy positions on Tiger Hill during the Kargil War. The operation required precise strike coordination with forward air controllers and ground forces in high-altitude terrain.',
    decisions: [
      {
        atPhase: 'INGRESS',
        context: 'T-35 MIN · WEATHER UPDATE',
        title: 'DETERIORATING WEATHER',
        message: 'Cloud cover has thickened over the target area. Visibility dropped from 8 km to 3 km. Laser guidance may be compromised. Forward air controller reports intermittent target visibility.',
        branches: [
          {
            id: 'hold',
            label: 'HOLD · AWAIT CLEARANCE',
            description: 'Wait for weather to improve. Risks mission timeline but preserves weapon effectiveness.',
            tag: 'CAUTIOUS',
            tagColor: 'var(--accent-amber)',
            outcome: 'partial',
            consequence: 'Weather cleared after 45 minutes. Strike conducted but daylight window reduced.',
            effect: { missionDelayMin: 45 },
          },
          {
            id: 'proceed',
            label: 'PROCEED · TRUST LGB',
            description: 'Continue with laser-guided bombs. FAC will provide terminal guidance. Higher risk of miss.',
            tag: 'AGGRESSIVE',
            tagColor: 'var(--accent-red)',
            outcome: 'success',
            consequence: 'Strike hit target despite weather. One bomb missed due to laser dropout.',
            effect: { riskDelta: +15 },
          },
        ],
      },
      {
        atPhase: 'WEZ',
        context: 'T-0 · WEAPON RELEASE',
        title: 'ENEMY FLAK DETECTED',
        message: 'Anti-aircraft fire detected from nearby ridge. No lock yet but intensity increasing. You have 15 seconds before the release window closes.',
        branches: [
          {
            id: 'release',
            label: 'RELEASE · EVASIVE EGRESS',
            description: 'Drop bombs immediately and execute defensive maneuvers. May reduce accuracy.',
            tag: 'COMMIT',
            tagColor: 'var(--accent-green)',
            outcome: 'success',
            consequence: 'Bombs released. Egress through flak. Minor damage to one aircraft but mission successful.',
            effect: { riskDelta: +10 },
          },
          {
            id: 'delay',
            label: 'DELAY · RE-ALIGN',
            description: 'Reposition for cleaner approach. Extends exposure to flak by 30 seconds.',
            tag: 'RISK',
            tagColor: 'var(--accent-amber)',
            outcome: 'partial',
            consequence: 'Second pass successful. One aircraft sustained flak damage, returned safely.',
            effect: { missionDelayMin: 12, riskDelta: +20 },
          },
        ],
      },
    ],
  },

  surgical_2016: {
    id: 'surgical_2016',
    codename: 'NANGA PARBAT',
    date: '2016-09-29',
    reference: 'ARMY PARA-SF · CROSS-LoC RAID',
    targetType: 'troop-concentration',
    target: { lat: 34.15, lng: 73.80 },
    narrative: 'Army Para-SF conducted cross-LoC raids on terrorist launch pads on 29 September 2016. Official accounts describe an Army ground operation; this record does not claim an IAF strike or aircrew support. The decision points below are hypothetical joint-planning prompts, not a record of actions during the raid.',
    decisions: [
      {
        atPhase: 'INGRESS',
        context: 'EXERCISE · MOVEMENT DETECTED',
        title: 'GROUND TEAM UPDATE',
        message: 'Hypothetical training inject: the primary site appears inactive while movement is reported near a secondary site. Confirm the ground team’s report before updating the joint plan.',
        branches: [
          {
            id: 'relocate',
            label: 'VERIFY SECONDARY SITE',
            description: 'Request confirmation from the ground team before changing the exercise plan.',
            tag: 'RECOMMENDED',
            tagColor: 'var(--accent-green)',
            outcome: 'success',
            consequence: 'Illustrative branch: the ground team confirms the secondary site and the joint plan is updated.',
            effect: { missionDelayMin: 20 },
          },
          {
            id: 'original',
            label: 'HOLD PRIMARY PLAN',
            description: 'Continue the exercise plan using the original ground-team report.',
            tag: 'RISK',
            tagColor: 'var(--accent-amber)',
            outcome: 'partial',
            consequence: 'Illustrative branch: the report is stale and the exercise pauses for reassessment.',
            effect: { riskDelta: +5 },
          },
        ],
      },
      {
        atPhase: 'WEZ',
        context: 'EXERCISE · WITHDRAWAL',
        title: 'WITHDRAWAL WINDOW',
        message: 'Hypothetical training inject: the ground team reports increased pressure near its withdrawal route. Compare a coordinated support request with an immediate withdrawal.',
        branches: [
          {
            id: 'coordinate',
            label: 'COORDINATE SUPPORT',
            description: 'Request joint-force coordination before the simulated withdrawal.',
            tag: 'SUPPORTED',
            tagColor: 'var(--accent-green)',
            outcome: 'success',
            consequence: 'Illustrative branch: coordination is completed and the ground team withdraws in the exercise.',
            effect: { missionDelayMin: 8 },
          },
          {
            id: 'rapid',
            label: 'WITHDRAW IMMEDIATELY',
            description: 'Begin the simulated withdrawal before joint coordination is complete.',
            tag: 'HIGH RISK',
            tagColor: 'var(--accent-red)',
            outcome: 'partial',
            consequence: 'Illustrative branch: the ground team withdraws sooner but the exercise records elevated risk.',
            effect: { riskDelta: +25 },
          },
        ],
      },
    ],
  },
};
