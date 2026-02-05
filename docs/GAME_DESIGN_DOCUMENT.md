# Galaxy Empire - Game Design Document

## 1. Introduction

> Derived from `description.md`

### Overview

This is a sci-fi strategy MMO (Massively Multiplayer Online) game played on mobile devices. The game focuses on base building, resource management, fleet construction, and galactic exploration/conquest. Players assume the role of a commander or emperor of a planetary colony, tasked with expanding their influence across the galaxy.

### Core Concept

The game combines classic 4X strategy elements (Explore, Expand, Exploit, Exterminate) with mobile-friendly mechanics. Players start with a home planet, build infrastructure to gather resources (Metal, Gas, Crystal, Energy), research technologies, and build fleets of spaceships. The ultimate goal is to grow from a single planet to a powerful galactic empire, interacting with other players through alliances, trade, or warfare.

### Visual Style

The game features a 2.5D isometric art style for the planetary base view, with detailed, futuristic industrial structures. The galactic and system views use a deep space aesthetic with nebulae, stars, and planets rendered in a semi-realistic style. The UI is heavy on "sci-fi blue" tones, holographic effects, and metallic borders, evoking a high-tech atmosphere.

### Key Gameplay Loops

1.  **Base Development:** Constructing and upgrading buildings (Mines, Solar Plants, Shipyards, Research Labs) to increase production and capabilities.
2.  **Resource Management:** Balancing the inflow and outflow of Metal, Crystal, Gas, and Energy to sustain growth.
3.  **Fleet Management:** Building various classes of ships for defense, gathering, and attacking other players or NPCs.
4.  **Exploration:** Navigating through Galaxy, System, and Planet views to find new targets for colonization or raiding.

---

## 2. Game Features

> Derived from `features.md`

### 2.1. Resource System

The economy is driven by four primary resources, displayed prominently in the UI:

- **Metal:** Basic building material for structures and ships.
- **Crystal:** Advanced material for research and high-tech components.
- **Gas (Deuterium/Hydrogen):** Fuel for fleets and resource for specific research.
- **Energy:** Power required to run buildings; produced by Solar Plants.
- **Dark Matter/Premium Currency:** (Indicated by the purple icon) Used for speed-ups or premium items.

### 2.2. Planetary Base Building

Players manage a grid-less but spatial planetary surface where they place and upgrade structures:

- **Resource Production:** Metal Mines, Crystal Mines, Gas Synthesizers, Solar Power Plants.
- **Military & Industry:** Shipyards (Schiffswerft), Robot Factories (Roboterfabrik).
- **Storage:** Metal Storage (Metalllager), Gas Storage (Gaslager), Crystal Storage.
- **Research:** Research Lab (Forschungszentrum).
- **Defense:** Planetary defenses (turrets, shields) visible on the perimeter.

### 2.3. Navigation & Map System

The game utilizes a hierarchical map system:

- **Galaxy View:** A macro view of different solar systems or galaxies (e.g., spiral galaxies, nebulae).
- **System View:** A view of a specific solar system showing individual planets and their owners (e.g., "Guest33945's Home").
- **Planet View:** The detailed base building view.
- **Coordinate System:** Navigation uses a [Galaxy : System : Planet] coordinate format (e.g., 1:1:10) to locate specific destinations.

### 2.4. Fleet & Combat

- **Ship Construction:** Players build ships in the Shipyard.
- **Fleet Missions:** Options likely include Attack, Transport, Espionage, Colonize, and Recycle debris fields.
- **Fleet Movement:** Ships travel between coordinates, taking real-time to arrive.

### 2.5. Social & Multiplayer

- **Chat System:** Global or alliance chat visible at the bottom of the screen.
- **Mail/Messages:** Inbox for combat reports, alliance messages, and system notifications.
- **Alliances:** Players can join groups for protection and coordinated attacks.
- **Player Profiles:** Avatars and ranks.

### 2.6. Progression

- **Quests/Missions:** A tutorial or quest system (indicated by the "!" icon) guides players through early game steps.
- **Tech Tree:** Research unlocks new buildings and ship types.
- **Commander/Avatar:** Character portraits representing the player.
- **Galactonite System:** A gem/equipment system where players fuse crystals (Galactonite) to boost stats.
- **PvE Content:** "Alien Brood" targets appear on the system map for players to attack for rewards.
- **Star Gate:** A high-level feature involving "Star Fortresses" and "Star Systems", likely for alliance raids or endgame content.

---

## 3. Detailed Game Design

> Derived from `game-design.md`

### 3.1. Core Mechanics

#### Time-Based Progression

- **Construction Time:** Building and upgrading structures takes real-time (seconds to days).
- **Research Time:** Technologies take time to research.
- **Travel Time:** Fleets take time to travel between coordinates based on distance and engine speed.
- **Speed-ups:** Players can use premium currency to skip timers.

#### Economy Balance

- **Production Rates:** Buildings produce X resources per hour.
- **Storage Limits:** Storage buildings cap the maximum resources a planet can hold.
- **Energy Dependency:** If Energy is negative, production of mines drops efficiently.

#### Universe Architecture

- **Galaxies:** The universe consists of multiple galaxies (likely numbered 1-9+), featuring 8 distinct visual themes (Spiral, Elliptical, Nebula, etc.).
- **Systems per Galaxy:** Each Galaxy contains **499 Solar Systems**.
- **Planets per System:** Each System has **15 Planet Slots**.
  - **Slots 1-3:** Hot planets (close to sun).
  - **Slots 4-6:** Temperate/Terrestrial planets.
  - **Slots 7-15:** Cold/Gas Giant planets.
- **Total Scale:** ~7,485 planets per galaxy.

#### Empire Expansion

- **Starting State:** Player begins with 1 Home Planet (cannot be abandoned).
- **Colonization:** Players build "Colony Ships" to settle empty planet slots (1-15) in any system.
- **Planet Limit:** Capped by Research level (e.g., Astrophysics).
  - Early Game: 1-3 Planets.
  - Mid Game: 5-8 Planets.
  - Late Game: 9-12+ Planets.

#### System View Mechanics

- **Coordinate System:** Navigation uses [Galaxy : System : Planet] (e.g., 1:78:5).
- **Slot Types:**
  - **Occupied:** Shows Planet 3D model, Player Name, and Status.
  - **Empty:** Shows a generic planet with a "?" icon.
  - **Expedition:** "Mysterious Nebula" slot for random event missions.
- **Interactions:** Espionage, Attack, Transport, Colonize.

### 3.2. Entities

#### Resources

- **Metal:** Basic structure material.
- **Crystal:** Advanced material.
- **Gas (Deuterium):** Fuel and high-tech resource.
- **Energy:** Power cap.
- **Dark Matter:** Premium currency.

#### Buildings

- **Resource:** Metal Mine, Crystal Mine, Gas Extractor, Solar Plant, Metal Storage, Crystal Storage, Gas Storage.
- **Facilities:** Shipyard, Research Lab, Robotics Facility, Radar Facility (Espionage), The Star Gate.

#### Ships

**Combat Ships**

- **Light Fighter:** Basic combat unit.
- **Heavy Fighter:** Upgraded fighter.
- **Cruiser:** Medium-class warship.
- **Battleship:** Heavy warship.
- **Destroyer:** Advanced heavy ship.

**Civilian & Support Ships**

- **Cargo Ship (Small):** Fast transport with limited capacity.
- **L Cargo Ship (Large):** Slower transport with massive cargo capacity.
- **Colony Ship:** Consumed to establish a new planet colony.
- **Recycler:** Harvests resources (debris fields).
- **Probe:** Fast, unarmed ship used for espionage missions.

#### Commanders & Officers

- **The Commander:** Enables +1 Building Queue slot.
- **The Technocrat:** Upgrades Espionage Tech level and reduces research time.
- **The Fleet Admiral:** Increases max fleet slots (+2) and fleet speed.
- **The Engineer:** Protects defense units/resources after defeat (75% recovery).
- **The Geologist:** Increases resource production.

#### Research Technologies

- **Basic:** Energy, Laser, Ion, Hyperspace, Plasma.
- **Drive:** Combustion, Impulse, Hyperspace.
- **Advanced:** Espionage, Computer, Astrophysics/Expedition, Intergalactic Research Network, Graviton.
- **Combat:** Weapons, Shielding, Armour.

### 3.3. User Flow

1.  **Login:** Land on Home Planet View.
2.  **Collect:** Tap resources/buildings to collect output.
3.  **Build:** Open Build menu -> Select Building -> Place/Upgrade.
4.  **Research:** Open Research menu -> Start project.
5.  **Fleet:** Switch to Fleet menu -> Select Ships -> Select Target -> Launch.
6.  **Wait:** Close app or chat while timers tick down.

### 3.4. Special Systems

- **Galactonite:** Progression system with gems.
- **PvE Encounters:** Alien Brood.
- **Mission Reports:** Espionage, Combat, Colonization reports logic.

---

## 4. UI/UX

> Derived from `ui-ux.md`

### 4.1. Layout & Navigation

- **Top Bar (HUD):** Rank, Player Name, Officers, Mail.
- **Resource Bar:** Resources (Metal, Crystal, Gas, Energy, DM).
- **Main Viewport:** Isometric Planet / Flat System or Galaxy map.
- **Bottom Navigation Bar:** Planets, System, Fleet, Store, Capsule, More.
- **Chat Overlay:** Small preview above nav bar.

### 4.2. Visual Language

- **Colors:** Deep Blues, Neon Cyan, Metallic Greys.
- **Typography:** Sans-serif.
- **Feedback:** Highlights on selection, "!" alerts.

### 4.3. View Hierarchy

Detailed screen flows for Planet, System, Galaxy, Fleet, Store, etc. (See `ui-ux.md` for full details).

---

## 5. Game Formulas

> Derived from `game-formulas.md`

### 5.1. Resource Production

- **Metal Mine:** `30 * Level * 1.1 ^ Level`
- **Crystal Mine:** `20 * Level * 1.1 ^ Level`
- **Gas Extractor:** `10 * Level * 1.1 ^ Level * (1.44 - 0.004 * MaxTemperature)`
- **Solar Plant:** `20 * Level * 1.1 ^ Level`

### 5.2. Building Costs

`Cost = BaseCost * 1.5 ^ (Level - 1)`

### 5.3. Research Costs

`Cost = BaseCost * 2 ^ (Level - 1)`

### 5.4. Fleet Mechanics

- **Flight Time:** `Duration = 10 + (3500 / %Speed) * sqrt((10 * Distance) / Speed)`
- **Distance Logic:** Based on system/galaxy difference.
- **Fuel Consumption:** Formula provided in original doc.

### 5.5. Combat Logic

- **Rounds:** Max 6.
- **Mechanic:** Attack -> Shields -> Hull.
- **Explosion:** Chance if Hull < 70%.
