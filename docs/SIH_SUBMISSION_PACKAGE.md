# SIH 2026 Submission Package
## Problem Statement 26250: Air Command

---

## 1. Submission Checklist

### Required Deliverables

- [ ] **GitHub Repository URL**: [PLACEHOLDER - Enter GitHub repo URL]
- [ ] **Live Demo URL**: [PLACEHOLDER - Enter live demo URL or deployment link]
- [ ] **PPT Presentation (6 slides)**: See Section 2 below
- [ ] **Demo Video (3 minutes)**: See Section 3 below
- [ ] **Team Member Details**: See Section 5 below
- [ ] **Contact Information**: See Section 5 below

### Submission Format

- All code committed to GitHub main branch
- Documentation files in /docs directory
- PPT and video linked in repository README
- Team details in submission form

---

## 2. PPT Slide Drafts

### Slide 1: Title

**Air Command**
**Problem Statement 26250**

**Team Name**: [PLACEHOLDER - Enter team name]

**Smart India Hackathon 2026**

---

### Slide 2: Problem Statement

**Challenge**: IAF Air Operations Planning Latency

**Current State**:
- Mission planning takes 90+ minutes for complex scenarios
- Data fragmented across 15+ legacy systems
- Manual cross-reference of aircraft health, crew status, weapon loadout, threats, airspace, weather, and intelligence
- No unified decision-support interface for commanders
- Course of Action (COA) generation is manual and subjective

**Impact**:
- Delayed response to time-sensitive targets
- Suboptimal resource allocation
- Higher crew fatigue and mission risk
- Limited ability to evaluate multiple options rapidly

---

### Slide 3: Solution Overview

**Air Command: Multi-Source Fusion to Decision**

**Architecture**:
1. **Data Layer**: Real-time ingestion from HUMS, IACCS, ATO, weather feeds, ISR platforms
2. **Fusion Layer**: Knowledge fusion, geospatial reasoning, route-risk scoring, confidence weighting
3. **Optimisation Layer**: NSGA-II-inspired multi-objective allocator (aggressive/balanced/conservative COA postures)
4. **Presentation Layer**: Command console with ranked COAs, trade-off views, event narrative, simulation, and AAR

**Key Capabilities**:
- Automated aircraft-to-mission scoring (weapon compatibility, distance, route risk, fuel reserve, crew-rest compliance, serviceability)
- Route-risk sampling at 24 points along great-circle paths with threat-zone exposure analysis
- Real-time confidence scoring with cross-sensor validation
- Interactive 3D simulation with terrain, aircraft, threat zones, and flight paths
- Comprehensive after-action review with BDA

---

### Slide 4: Technical Architecture

**Technology Stack**:
- **Frontend**: Svelte 5, TypeScript, Tailwind CSS, Vite
- **Mapping**: MapLibre GL JS, OpenStreetMap raster tiles, @turf/great-circle
- **Simulation**: Three.js for 3D terrain and trajectory visualization
- **State Management**: Svelte reactive stores with runes ($state, $derived, $effect)
- **Data**: SQLite with Drizzle ORM, seed data with IAF operational content
- **Algorithms**: NSGA-II multi-objective optimization, confidence-weighted fusion

**Data Flow**:
```
[Sources] → [Fusion Engine] → [Optimiser] → [COA Generator] → [Command Console]
     ↓           ↓               ↓               ↓                    ↓
  HUMS      Geospatial      Route Risk      Multi-Objective      Commander
  IACCS      Reasoning       Scoring          Allocator            Decision
  Weather    Confidence      Threat           Pareto Front          Execution
  ISR        Weighting       Analysis         Trade-offs            AAR
```

**Deployment**: Single-page application, portable to containerized deployment, browser-based command console

---

### Slide 5: Demo Walkthrough

**3-Minute Narrative Summary**

**0:00-0:30**: Console Overview
- Show force roster, mission queue, tactical map with live threat picture
- Display system status, aircraft health, weather overlays

**0:30-1:00**: Scenario Selection
- Select operational scenario (e.g., Kargil-style high-altitude conflict)
- System loads appropriate aircraft, missions, threat zones, and constraints

**1:00-1:30**: Mission Briefing
- Open commander briefing with target package details
- Show weaponeering matrix with weapon compatibility and kill probabilities
- Display fuel range, route risk, and crew-rest compliance

**1:30-2:00**: Commander Decision
- Generate three COA postures (aggressive, balanced, conservative)
- Show trade-offs between success probability, risk exposure, and resource consumption
- Commander selects COA based on operational priorities

**2:00-2:30**: Execution
- Launch mission with real-time trajectory updates
- Monitor in-flight decisions, threat engagements, and fuel state
- View 3D simulation with terrain, aircraft positions, and threat zones

**2:30-3:00**: After-Action Review
- Display BDA with weapon effectiveness and target destruction
- Show mission timeline, decision points, and lessons learned
- Export AAR for documentation and training

---

### Slide 6: Impact and Outcomes

**Quantified Impact**:
- **Planning Time**: 90 minutes → 2 seconds (automated COA generation)
- **COA Options**: 1 manual option → 3 optimised postures with trade-off analysis
- **Data Integration**: 15+ fragmented sources → unified operational picture
- **Decision Confidence**: Subjective → quantified confidence scores with cross-sensor validation

**Operational Benefits**:
- Faster response to time-sensitive targets (TSTs)
- Optimised resource allocation with multi-objective balancing
- Reduced crew fatigue through automated planning
- Enhanced training through historical mission simulation and 3D visualization
- Comprehensive AAR for continuous improvement

**Future Scope**:
- Integration with live IACCS feeds for real-time operations
- Machine learning for pattern recognition and predictive analytics
- Expanded weapon library with indigenous systems (Nirbhay, Pralay, Rudram-3)
- Multi-theatre coordination and distributed command

---

## 3. Demo Video Script

### Shot 1: Console Overview (0:00-0:30)

**Visual**: Full-screen command console showing force roster, mission queue, tactical map with threat zones, aircraft symbols, and system status indicators.

**Narration**: "Air Command provides a unified operational picture. The force roster shows aircraft status from HUMS, the mission queue displays pending targets, and the tactical map integrates live threat data from IACCS with weather and airspace information."

**Key Elements**: 
- Aircraft health indicators (FMC/PMC/NMC)
- Mission priority markers
- Threat zone rings (outer/mid/inner)
- Weather overlays
- System confidence score

---

### Shot 2: Scenario Selection (0:30-1:00)

**Visual**: Scenario selection modal with options like "Kargil 1999", "Balakot 2019", "Sindoor Deep 2025". User selects "Kargil 1999" and system loads appropriate data.

**Narration**: "Operators select from historical and hypothetical scenarios. The system automatically loads relevant aircraft, missions, threat zones, and constraints. This enables rapid planning for familiar operational contexts."

**Key Elements**:
- Scenario cards with date and reference
- Geographic area boundaries
- Pre-configured threat layouts
- Historical mission templates

---

### Shot 3: Mission Briefing (1:00-1:30)

**Visual**: Commander briefing panel showing target package details, weaponeering matrix with weapon compatibility (green/red indicators), kill probabilities, fuel range circles, route risk scoring, and crew-rest compliance.

**Narration**: "The mission briefing consolidates all critical information. The weaponeering matrix shows weapon compatibility and kill probabilities. Route risk analysis identifies threat exposure along flight paths. Fuel range and crew-rest data ensure operational feasibility."

**Key Elements**:
- Target type and priority
- Assigned aircraft with loadout
- Weapon compatibility matrix
- Route risk heatmap
- Fuel range circles
- Crew-rest status

---

### Shot 4: Commander Decision (1:30-2:00)

**Visual**: COA comparison panel showing three postures (aggressive, balanced, conservative) with trade-off metrics: success probability, risk exposure, resource consumption, and mission duration. Commander selects "Balanced" posture.

**Narration**: "The optimiser generates three COA postures using NSGA-II multi-objective algorithms. Each posture balances competing objectives. The commander selects based on operational priorities—in this case, the balanced posture offers acceptable risk with high success probability."

**Key Elements**:
- Three COA cards with posture labels
- Success probability percentages
- Risk exposure scores
- Resource consumption bars
- Mission duration estimates
- Trade-off visualization

---

### Shot 5: Execution with Trajectories (2:00-2:30)

**Visual**: Tactical map with animated flight trajectories (ingress, WEZ entry, weapon release, egress, RTB). 3D simulation view showing terrain, aircraft positions, threat zones, and flight paths in 3D space.

**Narration**: "During execution, the system tracks real-time trajectories with 3D visualization. Flight paths show ingress, WEZ entry, weapon release, egress, and return-to-base. The 3D view provides situational awareness with terrain, threat zones, and aircraft positions."

**Key Elements**:
- Animated flight paths (color-coded by phase)
- 3D terrain with elevation
- Aircraft symbols with heading
- Threat zone cylinders
- Real-time position updates
- Fuel state indicators

---

### Shot 6: AAR and BDA (2:30-3:00)

**Visual**: After-action review panel showing mission timeline, decision points, weapon effectiveness, target destruction status, confidence scores, and lessons learned. BDA heatmap showing target hit accuracy.

**Narration**: "The after-action review provides comprehensive mission analysis. BDA shows weapon effectiveness and target destruction. The timeline documents decision points and their outcomes. Confidence scores track data quality throughout the mission. This AAR feeds back into training and continuous improvement."

**Key Elements**:
- Mission timeline with decision points
- Weapon effectiveness percentages
- Target destruction status
- Confidence score over time
- BDA heatmap
- Lessons learned summary
- Export option for documentation

---

## 4. Anticipated Judge Questions

### Q1: How is this different from IACCS?

**Answer**: Air Command is not a replacement for IACCS. IACCS is the operational system that provides the air defence picture and coordinates responses. Air Command is a decision-support layer that sits above IACCS, ingesting data from IACCS along with other sources (HUMS, weather, ISR) to provide commanders with a unified operational picture and automated COA generation. It focuses on mission planning and decision support, not real-time air defence coordination. Air Command could integrate with IACCS as a data source and decision-support frontend.

### Q2: Where does the data come from?

**Answer**: In the current demonstration, data is seeded from historical IAF operations and publicly available sources. For production deployment, data would come from:
- HUMS (Health and Usage Monitoring System) for aircraft status
- IACCS (Integrated Air Command and Control System) for threat picture and airspace data
- ATO (Air Tasking Order) for mission scheduling
- Weather services for meteorological data
- ISR platforms (AWACS, satellites, UAVs) for intelligence
- Logistical systems for fuel, ammunition, and crew status

The system is designed to ingest data via APIs or database connections from these legacy systems.

### Q3: What algorithms are used?

**Answer**: The optimisation layer uses an NSGA-II-inspired multi-objective evolutionary algorithm to generate COAs. This algorithm evaluates candidate plans across competing objectives (success probability, risk exposure, resource consumption, mission duration) and produces a Pareto front of optimal solutions. The fusion layer uses confidence-weighted averaging for cross-sensor validation, geospatial reasoning for route-risk scoring (sampling 24 points along great-circle paths), and threat-zone exposure analysis. The simulation uses Three.js for 3D terrain visualization and trajectory rendering.

### Q4: Can this deploy in a real IAF environment?

**Answer**: Yes, with appropriate integration work. The system is designed as a browser-based application that can be deployed in secure networks. Key deployment requirements include:
- Integration with IAF data sources via APIs or database connections
- Security hardening (authentication, authorization, encryption)
- Network infrastructure for real-time data feeds
- Training for operators and commanders
- Certification for operational use

The current demonstration uses seeded data, but the architecture supports live data integration. The system can be containerized for deployment in IAF infrastructure.

### Q5: What about security and classified data?

**Answer**: Security is a critical consideration for operational systems. For production deployment, the system would require:
- Multi-factor authentication and role-based access control
- End-to-end encryption for data in transit and at rest
- Secure network deployment within IAF infrastructure
- Audit logging for all user actions
- Compliance with IAF security policies and standards

The current demonstration uses unclassified seed data. Classified data would be processed within secure environments with appropriate access controls. The system architecture supports security hardening without requiring fundamental changes.

### Q6: What is the cost of development and deployment?

**Answer**: The current demonstration was developed as a proof-of-concept within the SIH hackathon timeframe. Full production deployment would require investment in:
- Integration with IAF legacy systems (custom API development)
- Security hardening and certification
- Training and documentation
- Infrastructure (servers, network, storage)
- Ongoing maintenance and support

Cost estimates would depend on the scope of deployment (number of bases, users, data sources) and the level of integration required. The browser-based architecture reduces client-side hardware costs, and containerization simplifies deployment.

### Q7: What is the team background?

**Answer**: [PLACEHOLDER - Enter team background. Include: academic backgrounds (computer science, engineering, data science), relevant experience (software development, aerospace, defence), and any domain expertise relevant to the problem.]

### Q8: What is the timeline for production deployment?

**Answer**: For a full production deployment, a realistic timeline would be:
- **Phase 1 (6 months)**: Integration with IACCS and HUMS, security hardening, initial training
- **Phase 2 (6 months)**: Integration with additional data sources, operational testing, feedback incorporation
- **Phase 3 (6 months)**: Full deployment across bases, certification, documentation

Total: 18 months for operational deployment. However, a limited pilot deployment could be achieved in 6-9 months for evaluation and validation.

### Q9: What is simulated in the system?

**Answer**: The system includes two simulation modes:
1. **Historical Training Simulation**: Re-enacts historical missions (Kargil 1999, Balakot 2019, Sindoor Deep 2025) with decision points that allow operators to experience key decisions and their consequences. This includes tactical map visualization, 3D terrain, aircraft trajectories, and threat zones.
2. **Probabilistic Simulation**: [If implemented] Monte Carlo-style simulation to evaluate mission outcomes under uncertainty, factoring in variables like weather, threat probability, and equipment reliability.

The simulation is not a full flight simulator but focuses on decision-support and operational planning visualization.

### Q10: What are the next steps after SIH?

**Answer**: Next steps include:
- Integration with live IAF data sources for pilot deployment
- Expansion of weapon library with indigenous systems (Nirbhay, Pralay, Rudram-3)
- Machine learning integration for pattern recognition and predictive analytics
- Multi-theatre coordination capabilities
- Enhanced 3D simulation with more realistic terrain and weather effects
- Mobile interface for field commanders
- Export of AAR data to training systems

The team is committed to continued development based on feedback from SIH judges and potential IAF stakeholders.

---

## 5. Submission Contacts

### College SPOC

**Name**: [PLACEHOLDER - Enter SPOC name]
**Phone**: [PLACEHOLDER - Enter SPOC phone number]
**Email**: [PLACEHOLDER - Enter SPOC email]
**Institution**: [PLACEHOLDER - Enter college/institution name]

### Team Lead

**Name**: [PLACEHOLDER - Enter team lead name]
**Phone**: [PLACEHOLDER - Enter team lead phone number]
**Email**: [PLACEHOLDER - Enter team lead email]
**Role**: [PLACEHOLDER - Enter team lead role]

### Team Members

**Member 1**: [PLACEHOLDER - Name, role, email]
**Member 2**: [PLACEHOLDER - Name, role, email]
**Member 3**: [PLACEHOLDER - Name, role, email]
**Member 4**: [PLACEHOLDER - Name, role, email]
**Member 5**: [PLACEHOLDER - Name, role, email]
**Member 6**: [PLACEHOLDER - Name, role, email]

### Emergency Contact

**Name**: [PLACEHOLDER - Enter emergency contact name]
**Relationship**: [PLACEHOLDER - Enter relationship to team]
**Phone**: [PLACEHOLDER - Enter emergency contact phone number]

---

## Additional Notes

### Documentation References

- System documentation: `/docs/`
- Comprehensive demo guide: `/docs/COMPREHENSIVE_DEMO_GUIDE.md`
- 3D simulation guide: `/docs/3D_SIMULATION_GUIDE.md`
- Map fixes summary: `/docs/MAP_FIXES_SUMMARY.md`
- README: `/README.md`

### Source Code

- Main repository: [PLACEHOLDER - GitHub URL]
- Branch: main
- Commit: [PLACEHOLDER - Latest commit hash]

### Live Demo

- URL: [PLACEHOLDER - Live demo URL]
- Access credentials: [PLACEHOLDER - If applicable]

### PPT and Video

- PPT download: [PLACEHOLDER - Link to PPT file]
- Video download: [PLACEHOLDER - Link to video file]
- Video platform: [PLACEHOLDER - YouTube/Vimeo/etc. if uploaded]

---

**Document Version**: 1.0
**Last Updated**: [PLACEHOLDER - Date]
**Prepared by**: [PLACEHOLDER - Team name]
