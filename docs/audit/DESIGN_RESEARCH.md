# C2 Design Research

## Topic 1 — SINGLE-ACTIVE-MODE PATTERN IN C2

### Question
How do real C2 systems prevent two modes from running at once?

### Findings

**Standard Pattern: C2 Approach Space and Mode Exclusivity**

NATO research through SAS-085 and SAS-065 established the "C2 Approach Space" as the foundational framework for mode management in command and control systems. The research defines C2 Approaches as categories of how decision rights are distributed, how entities interact, and how information is shared. The key finding is that modes are **mutually exclusive at any given level of hierarchy** - only one C2 approach can be active at a time.

The NATO NEC C2 Maturity Model (N2C2M2) defines five increasingly network-enabled approaches to Collective C2:
1. Conflicted C2 (a state to be avoided)
2. De-Conflicted C2
3. Coordinated C2
4. Collaborative C2
5. Edge C2

These approaches are positioned along a diagonal in the Collective's 3D C2 Approach Space. The model emphasizes that entities must **recognize changes in missions and circumstances** that require corresponding changes in their C2 approach, and then **transition to a more appropriate approach**. This transition is explicit and controlled - you cannot be in "Coordinated" and "Collaborative" modes simultaneously.

**Mode Transition Mechanism**

The research identifies that successful C2 Agility requires:
1. Recognizing the significance of changes in circumstances that affect the appropriateness of one's C2 Approach
2. Understanding which C2 Approach(es), given the new mission and/or circumstances, are now more appropriate
3. Being able to transition, as necessary, to a more appropriate approach

Transitions are not automatic - they require explicit recognition and deliberate movement within the C2 Approach Space. The cube model of C2 approach allows entities to move up or down on the diagonal to converge on whatever C2 approach is appropriate in the situation at hand.

**State vs Mode Hierarchy**

System engineering standards clarify that modes exist within states, and at any given level of the hierarchy, **only one state can exist at any one time**. States are exclusive. Modes are "the way in which functions are performed" and exist within states. While modes may be exclusive or concurrent, the overarching state ensures that the system is in a single operational condition at any moment.

### Sources

1. **NATO SAS-085 Final Report on C2 Agility** - Establishes the C2 Approach Space framework and the principle that entities must transition between approaches based on mission and circumstance changes. Available: http://www.dodccrp.org/sas-085/sas-085_report_final.pdf

2. **NATO NEC C2 Maturity Model (N2C2M2)** - Defines the five C2 approaches (Conflicted, De-Conflicted, Coordinated, Collaborative, Edge) and their exclusive positioning in the C2 Approach Space. Available: http://www.dodccrp.org/files/N2C2M2_web_optimized.pdf

3. **INCOSE System Architecture Framework - Operational State Viewpoint** - Provides formal definitions: "State: the overall condition of a system or subsystem. States may be related hierarchically. States are exclusive - only one state (at a given level of the hierarchy) can exist at any one time." Available: https://saf.gfse.org/version/TdSE2025/devdoc/Operational%20Domain/Operational%20State%20Viewpoint.html

### IMPLICATION FOR AIR COMMAND
Air Command must implement explicit mode transitions with state machines that prevent concurrent mode activation, requiring deliberate operator action to switch between planning, execution, and training modes.

---

## Topic 2 — PANEL DISCIPLINE / INFORMATION DENSITY

### Question
Is there a max panel count guidance? What is the standard for readability under stress?

### Findings

**MIL-STD-1472 Human Engineering Design Criteria**

MIL-STD-1472 is the Department of Defense standard establishing general human engineering design criteria for military systems, subsystems, equipment, and facilities. The standard's purpose is to present human engineering design criteria, principles, and practices to optimize system performance with full consideration of inherent human capabilities and limitations.

However, the standard does **not specify a maximum panel count**. Instead, it provides guidance on:

- Achieving required performance by operator, control, and maintenance personnel
- Achieving required manpower readiness for system performance
- Achieving required reliability of personnel-equipment combinations
- Fostering design standardization within and among systems

The standard focuses on the integration of the human into the system design trade space, but does not prescribe specific numerical limits on the number of displays or panels.

**Real-World Tactical Display Configurations**

Examining deployed tactical systems reveals panel counts driven by operational role rather than a standard maximum:

- **Individual tactical displays**: 6.4" to 18.5" ruggedized displays for mounted environments (Leonardo DRS RSD series)
- **Vehicle consoles**: Typically 2-4 displays per operator station (MILCOTS panel mount configurations show 7" to 24" displays in console setups)
- **Command post displays**: Large-format 40" displays for C2 nodes and mobile TOCs optimized for multi-source visualization
- **Aircraft cockpits**: Multi-function displays (MFDs) with specific sizes (10.1", 12.1", 15.6") determined by aircraft type and mission role

**Information Density Standards**

While MIL-STD-1472 does not provide specific panel count limits, it does provide guidance on information presentation principles. Alarm systems guidance (derived from MIL-STD-1472F) states:

- "The number of priority levels for alarm messages should be limited to four" (Source: DOE STD HFAC, 1992)
- Alarms should be automatically organized and presented in prioritized form
- Display of alarms with higher current operational significance should automatically override the display of alarms with lower current operational significance

**Stress Readability Considerations**

The standard emphasizes that systems must function under the stress of combat operations, with designs that:
- Minimize cognitive load
- Use clear, unambiguous symbology
- Provide progressive disclosure of information
- Support rapid decision-making under time pressure

Real systems like the Aegis combat system use a dual-screen approach (left: comprehensive situational map, right: detailed target view) rather than cramming all information onto a single display. The Navy abandoned full 3D displays because operators need a stable, quickly interpretable view under stress.

### Sources

1. **MIL-STD-1472H (2020)** - Department of Defense Design Criteria Standard: Human Engineering. Establishes general human engineering design criteria but does not specify maximum panel counts. Available: https://everyspec.com/MIL-STD/MIL-STD-1400-1499/MIL-STD-1472H_57041/

2. **Leonardo DRS Rugged Mission Displays** - Shows real-world deployment of 10.1" to 40" displays across vehicle, command post, and aircraft roles, indicating panel count is determined by operational context rather than a standard maximum. Available: https://www.leonardodrs.com/what-we-do/products-and-services/rugged-mission-displays/

3. **MILCOTS Rugged Displays** - Console mount configurations for multi-function consoles in combat systems, ground control stations, and airborne command and control stations. Available: https://www.milcots.com/products/rugged-displays.html

4. **Chapter 7: Alarms, Audio and Voice (HFDS)** - Derived from MIL-STD-1472F, states "The number of priority levels for alarm messages should be limited to four" and provides guidance on prioritized presentation. Available: https://hf.tc.faa.gov/hfds/download-hfds/hfds_pdfs/Ch7_Alarms_audio_and_voice.pdf

### IMPLICATION FOR AIR COMMAND
Air Command should limit concurrent panels to what can be monitored without cognitive overload (typically 2-4 primary displays per operator), use progressive disclosure for detailed information, and restrict alarm priority levels to four tiers for stress readability.

---

## Topic 3 — VOICE PRIORITY IN OPERATIONAL SYSTEMS

### Question
How do real systems handle multiple simultaneous audio alerts?

### Findings

**Standard Priority Tiers: WARNING / CAUTION / ADVISORY**

The FAA and DoD have established a three-tier audio alert hierarchy that is universally adopted in operational systems:

1. **WARNING**: For conditions that require immediate flightcrew awareness and immediate flightcrew response. These are the highest priority alerts.

2. **CAUTION**: For conditions that require immediate flightcrew awareness and subsequent flightcrew response. Lower priority than warnings.

3. **ADVISORY**: For conditions that require flightcrew awareness and may require subsequent flightcrew response. Lowest priority tier.

This hierarchy is codified in 14 CFR 25.1322(b) and reinforced in Advisory Circular AC 25.1322-1.

**Alert Prioritization Rules**

When multiple alerts exist simultaneously, systems must:

- Prioritize alerts so that the most urgent alert is presented first to the flightcrew
- Normally, time-critical warnings are first, other warnings are second, cautions are third, and advisories are last
- When multiple alerts exist in a specific category, prioritize within that category based on urgency
- A more critical message shall override the presentation of any message having a lower priority

**Interrupt Behavior**

Systems implement strict interrupt policies:

- **Only ONE message is produced at any one time** (BendixKing KTA 910)
- The highest priority voice message takes precedence and may **IMMEDIATELY interrupt** any lower priority message
- If multiple conditions are met simultaneously, the higher priority message will be heard until that condition is resolved
- Only after the higher priority condition is resolved will lower priority messages be heard
- Preface voices are always given prior to the warning voice

**Repetition and Termination**

Research on cockpit voice warnings indicates:
- Voice messages may repeat (e.g., every 7 seconds) to ensure acquisition
- Pilots prefer a cancel button to deactivate voice warnings at their discretion, especially for high-priority warnings
- High priority voice warnings should be non-cancellable, while lesser priority warnings should have a cancel button

**Priority Level Limits**

Alarm system guidance specifies:
- "The number of priority levels for alarm messages should be limited to four" (DOE STD HFAC, 1992)
- When two or more incidents occur simultaneously, the one generating a message of higher priority shall be presented first
- After presentation of the highest priority message, remaining messages shall be presented in descending order of priority

### Sources

1. **FAA Human Factors Guidance - Flight Deck Displays and Controls** - Establishes the three-tier hierarchy (Warning, Caution, Advisory) and prioritization rules: "Prioritize alerts so that the most urgent alert is presented first to the flightcrew." Available: https://hfcc.dot.gov/publications/docs/GeneralGuidance/zz_FAA_GeneralGuidanceDoc_Chapter_04_Section_02.html

2. **BendixKing KTA 910 System User Manual** - States "Only ONE message is produced at any one time" and "The highest priority voice message takes precedence, and may IMMEDIATELY interrupt any lower priority message." Available: https://www.manualsdir.com/manuals/651193/bendixking-kta-910-system-kta-970-kta-810-system-kta-870-kmh-820-system-kmh-880.html?page=65

3. **Human Factors Issues with Speech Technology in the Cockpit (NASA)** - Research on voiced message priorities, repetition, and termination preferences. Available: http://hdl.handle.net/2060/19840009365

4. **Chapter 7: Alarms, Audio and Voice (HFDS)** - Derived from MIL-STD-1472F: "The number of priority levels for alarm messages should be limited to four" and "When two or more incidents occur simultaneously, the one generating a message of higher priority shall be presented first." Available: https://hf.tc.faa.gov/hfds/download-hfds/hfds_pdfs/Ch7_Alarms_audio_and_voice.pdf

### IMPLICATION FOR AIR COMMAND
Air Command must implement a three-tier audio priority system (Warning/Caution/Advisory) with strict single-message playback, immediate interruption of lower-priority alerts by higher-priority ones, and queuing of lower-priority messages until higher-priority conditions are resolved.

---

## Topic 4 — 3D MODELS IN TACTICAL UIs

### Question
Where do real systems actually use 3D models? (not games)

### Findings

**Deployment Patterns: 3D is Limited to Specific Use Cases**

Real military C2 systems use 3D models selectively, not as the primary interface paradigm. The research reveals three main deployment scenarios:

**1. Terrain and Geospatial Visualization (Most Common)**

- **Sysverve C2**: Provides "2D and 3D mapping" with a flat tactical map plus a 3D terrain globe with live aircraft attitude. The 3D globe is used for terrain awareness and altitude visualization, not as the primary tactical display.

- **Examind C2**: Offers "4D multi-environment Visualization" with dynamic 2D, 3D, and 4D representations that visualize interactions between air, land, sea, and space. The 3D component is used for cross-domain situational awareness.

- **LORAN**: A self-hosted 3D globe console for live air traffic that displays aircraft at their true altitude above the ellipsoid over a dark bathymetric basemap. The 3D view is specifically designed to be "read like an instrument rather than browsed like a website."

**2. Training and Simulation (Extensive Use)**

- **Saab Gripen Simulators**: Use Rapid 3D Mapping™ to generate 3D models from aerial images for highly realistic visualization in simulators. Varjo's human-eye-resolution mixed reality technology is integrated into all Gripen E/F simulators. The 3D perception Atlas display system provides dome-based 3D visualization for training.

- **Boeing Training**: The Constant Resolution Visual System (CRVS) uses 8K projection technology to surround pilots in an "eggshell-like environment" that visually transforms into cities, landscapes, and combat scenarios. Boeing and Red 6 are developing augmented reality training (ATARS and ARCADE) that allows pilots to see virtual aircraft, targets, and threats while flying in actual aircraft.

- **Lockheed Martin Prepar3D**: A visualization platform used for battle management and C2 solutions, primarily for training and simulation scenarios.

**3. Specialized Depth-Perception Applications**

- **KC-46 Remote Vision System (RVS)**: Rockwell Collins developed large-area, high-resolution 3D displays linked with remote sensors to enhance operator visual acuity for precise aerial refueling control. Boom operators watch a large stereoscopic 3D display to control the refueling boom. The 3D display provides enhanced depth perception critical for the refueling task.

- **Lockheed Martin DIAMONDShield C2**: Provides visualization in "user-optimized graphical displays with selectable features in 2D, 3D, and 4D." The 3D option is available but not the default.

**What Real Systems AVOID: Full 3D as Primary Interface**

The US Navy's Aegis combat system deliberately chose 2D over 3D for its primary interface. After years of research, the Navy abandoned full 3D displays because:
- Operators need a stable, quickly interpretable view
- 3D adds confusion and latency
- A dual-screen 2D approach (comprehensive situational map + detailed target view) is more effective under stress

The Aegis CIC uses a left-hand comprehensive situational map (2D top-down) and a right-hand detailed view of a selected target, with 16 target blocks at the bottom for rapid threat assessment.

**Modern Trends: Mixed Reality and Augmented Reality**

Recent developments show movement toward AR/MR rather than pure 3D displays:
- Boeing and Red 6: Augmented reality training that overlays virtual threats on the real world
- Saab and Varjo: Mixed reality for Gripen simulators
- Patriot WMI: 3D visuals that are more familiar to gamers, but still within a tactical context

### Sources

1. **Sysverve C2 Ground Control Station** - "2D and 3D mapping. Flat tactical map plus a 3D terrain globe with live aircraft attitude." Available: https://www.sysverve.com/software

2. **Examind C2 Platform** - "4D multi-environment Visualisation. The platform visualizes the interactions between air, land, sea and space, with dynamic 2D, 3D and 4D representations." Available: https://www.examind.com/en/examind-c2/

3. **LORAN 3D Globe Console** - "A self-hosted 3D globe console for live air traffic, built to be read like an instrument rather than browsed like a website." Available: https://github.com/iamneilroberts/LORAN

4. **Saab Rapid 3D Mapping for Gripen Simulators** - "3D-models will give the simulators a highly realistic visualisation model." Available: https://www.saab.com/newsroom/press-releases/2010/saab-receives-breakthrough-rapid-3d-mapping-order-for-gripen-simulators

5. **Saab and Varjo VR for Gripen Simulators** - "Varjo's technology will be integrated in Saab's new Gripen E/F simulators." Available: https://www.saab.com/newsroom/press-releases/2021/saab-and-varjo-bring-virtual-reality-to-flight-simulators

6. **KC-46 3D Display Considerations** - "The system utilizes large-area, high-resolution 3D displays linked with remote sensors to enhance the operator's visual acuity for precise aerial refueling control." Available: https://doi.org/10.1117/12.2180613

7. **Lockheed Martin DIAMONDShield C2** - "Visualization is presented in a set of user-optimized graphical displays with selectable features in 2D, 3D, and 4D." Available: https://news.lockheedmartin.com/2012-10-22-Lockheed-Martin-Introduces-Advanced-Air-And-Missile-C2-System-That-Provides-Commanding-View-Of-The-Battlespace

8. **Why the US Navy's Aegis UI Chooses 2D Over 3D** - "After years of research, the Navy abandoned full 3D displays because operators need a stable, quickly interpretable view; 3D adds confusion and latency." Available: https://www.besthub.dev/articles/why-the-us-navy-s-aegis-ui-chooses-2d-over-3d-lessons-for-high-stakes-interface-design-0c043aaf2b80

### IMPLICATION FOR AIR COMMAND
Air Command should limit 3D visualization to terrain awareness, altitude visualization, and training scenarios, while maintaining 2D as the primary tactical interface for real-time operations to ensure rapid interpretation under stress.

---

## Topic 5 — WEAPON TARGET MATRIX UI PATTERNS

### Question
How is weapon-to-target assignment shown in real systems?

### Findings

**Standard Visual Pattern: Matrix-Based Assignment**

Real weapon systems use matrix-based UI patterns for weapon-to-target assignment, though the specific implementation varies by system type.

**Patent-Based Method: Real-Time Optimization Table**

A patent for real-time weapon system-target pairing describes a method that:
- Populates a database with available weapon systems, targets, and threats
- Enters inputs into a table
- Pre-processes inputs to create formatted data within the table
- Runs an optimization engine to solve a mathematical model
- Displays weapon system-target pairing recommendations on a user interface
- The database is arranged in a table, chart, or graph format
- Display is in order of available weapon systems, targets, and threats in separate formats

The system can complete the entire process (populating, entering, pre-processing, running, receiving, and displaying) in less than 1 second for real-time operation.

**Aegis Combat System: Target Block Display**

The Aegis system uses a target block pattern rather than a traditional matrix:
- Sixteen target blocks at the bottom of the screens let operators pick the most threatening targets
- Each block acts as a soft button and shows brief threat data
- This avoids dense tables that require precise numeric reading
- The design lets even low-skill crew grasp target priority instantly
- Targets are assigned to engagement plans based on target distance
- As a target closes, the system automatically triggers alerts, activates weapons, or prompts the commander following pre-loaded engagement scripts (over 90 plans)

**Mathematical Optimization Approaches**

Research on weapon-target pairing optimization indicates:
- Algorithms assign weapons to targets based on desired kill probabilities
- The goal is to satisfy desired kill probabilities while minimizing overkill
- Computational results for up to 120 weapons and 120 targets show algorithm improvements of 26.8% over greedy algorithms
- Execution times remain on the order of milliseconds

**Modern C2 Interfaces: Progressive Disclosure**

Raytheon's Patriot Warfighter-Machine Interface (WMI) represents a modern approach:
- Replaces pixelated shapes and complex directory systems with 3D visuals and easy-to-read status pages
- Uses search functions familiar to gamers
- Puts summary of key information (heading, speed, altitude) at the bottom of the screen
- Provides bookmarked displays of more detailed information
- Elevates anomalies instead of displaying every airborne object
- Uses progressive disclosure to ensure only the most relevant information surfaces when needed

**Common UI Elements Across Systems**

1. **Target Lists/Blocks**: Most systems present targets in a list or block format with key parameters (heading, speed, altitude, threat level)

2. **Weapon Availability**: Clear indication of which weapons are available and their status (ready, firing, reloaded)

3. **Assignment Controls**: Mechanisms to assign weapons to targets (click-to-assign, drag-and-drop, or automated recommendation)

4. **Effectiveness Indicators**: Visual or numerical indicators of weapon effectiveness against specific target types

5. **Engagement Plans**: Pre-configured or dynamically generated engagement plans that automate weapon-target assignment based on rules

### Sources

1. **Method for Weapon System-Target Pairing in Real-Time (Patent)** - Describes table-based UI with real-time optimization: "The database is arranged in a table, chart or graph format. Displayed in order of available weapon systems, targets, and threats in separate formats." Available: https://www.patentsencyclopedia.com/app/20140081608

2. **Optimization of Weapon-Target Pairings Based on Kill Probabilities (IEEE)** - Mathematical optimization approach for assigning weapons to targets. Available: https://ieeexplore.ieee.org/document/6392482

3. **Why the US Navy's Aegis UI Chooses 2D Over 3D** - Describes Aegis target block pattern: "Sixteen target blocks at the bottom of the screens let operators pick the most threatening targets. Each block acts as a soft button and shows brief threat data." Available: https://www.besthub.dev/articles/why-the-us-navy-s-aegis-ui-chooses-2d-over-3d-lessons-for-high-stakes-interface-design-0c043aaf2b80

4. **Raytheon Patriot WMI Upgrade** - Describes modern C2 interface with 3D visuals, easy-to-read status pages, and progressive disclosure. Available: https://raytheon.mediaroom.com/2019-06-17-Patriot-TM-air-and-missile-defense-system-upgrading-to-gamer-style-interface

5. **Raytheon Patriot C2 UX Redesign (Visual Logic)** - Case study on upgrading Patriot C2 to maximize situational awareness and minimize cognitive load using progressive disclosure. Available: https://visuallogic.com/case-studies/raytheon-missile-defense/

### IMPLICATION FOR AIR COMMAND
Air Command should implement a matrix-based or target-block interface for weapon-target assignment with clear effectiveness indicators, automated engagement plans, and progressive disclosure of detailed information to support rapid decision-making.
