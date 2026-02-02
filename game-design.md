# Game Design Document

## 1. Core Mechanics

### 1.1. Time-Based Progression

- **Construction Time:** Building and upgrading structures takes real-time (seconds to days).
- **Research Time:** Technologies take time to research.
- **Travel Time:** Fleets take time to travel between coordinates based on distance and engine speed.
- **Speed-ups:** Players can use premium currency to skip timers.

### 1.2. Economy Balance

- **Production Rates:** Buildings produce X resources per hour.
- **Storage Limits:** Storage buildings cap the maximum resources a planet can hold.
- **Energy Dependency:** If Energy is negative, production of mines drops efficiently.

### 1.3. Universe Architecture

- **Galaxies:** The universe consists of multiple galaxies (likely numbered 1-9+), featuring 8 distinct visual themes (Spiral, Elliptical, Nebula, etc.).
- **Systems per Galaxy:** Each Galaxy contains **499 Solar Systems**.
- **Planets per System:** Each System has **15 Planet Slots**.
  - **Slots 1-3:** Hot planets (close to sun).
  - **Slots 4-6:** Temperate/Terrestrial planets.
  - **Slots 7-15:** Cold/Gas Giant planets.
- **Total Scale:** ~7,485 planets per galaxy.
- **Fog of War:** Unexplored areas or "Mysterious Nebulae" may contain events or pirates.

### 1.4. Empire Expansion

- **Starting State:** Player begins with 1 Home Planet (cannot be abandoned).
- **Colonization:** Players build "Colony Ships" to settle empty planet slots (1-15) in any system.
- **Planet Limit:** Capped by Research level (e.g., Astrophysics).
  - Early Game: 1-3 Planets.
  - Mid Game: 5-8 Planets.
  - Late Game: 9-12+ Planets.
- **Strategy:** Spread planets across galaxies for better fleet reach.

### 1.5. System View Mechanics

- **Coordinate System:** Navigation uses [Galaxy : System : Planet] (e.g., 1:78:5).
- **Navigation:** Players can jump to specific coordinates or scroll sequentially through systems (1:78 -> 1:79).
- **Slot Types:**
  - **Occupied:** Shows Planet 3D model, Player Name, and Status (Vacation/Noob Protection).
  - **Empty:** Shows a generic planet with a "?" icon. Target for Colonization.
  - **Expedition:** "Mysterious Nebula" slot for random event missions.
- **Interactions:**
  - **Espionage:** Send probes to check resources/defense.
  - **Attack:** Send fleet to raid.
  - **Transport:** Send resources.
  - **Colonize:** Send Colony Ship to empty slot.

## 2. Entities

### 2.1. Resources

- **Metal (Metall):** Basic structure material. Used for buildings and ship hulls. Produced by Metal Mines.
- **Crystal (Kristall):** Advanced material. Used for research, electronics, and shields. Produced by Crystal Mines.
- **Gas (Deuterium):** Fuel and high-tech resource. Used for fleet movement and special ships. Produced by Gas Extractors.
- **Energy (Energie):** Power cap. Required to run mines. Produced by Solar Plants. Negative energy reduces production efficiency.
- **Dark Matter:** Premium currency. Used for speed-ups and officers.

### 2.2. Buildings

- **Resource:** Metal Mine, Crystal Mine, Gas Extractor, Solar Plant, Metal Storage, Crystal Storage, Gas Storage.
- **Facilities:** Shipyard, Research Lab, Robotics Facility (speeds up construction), Radar Facility (Espionage), The Star Gate (Endgame/Alliance).

### 2.3. Ships

**Combat Ships**

- **Light Fighter:** Basic combat unit. Fast and cheap.
- **Heavy Fighter:** Upgraded fighter with better armor and attack.
- **Cruiser:** Medium-class warship. Fast, likely effective against fighters.
- **Battleship:** Heavy warship. The backbone of a combat fleet.
- **Destroyer:** Advanced heavy ship. High firepower.

**Civilian & Support Ships**

- **Cargo Ship (Small):** Fast transport with limited capacity.
- **L Cargo Ship (Large):** Slower transport with massive cargo capacity.
- **Colony Ship:** Consumed to establish a new planet colony.
- **Recycler:** Harvests resources (debris fields) from destroyed fleets.
- **Probe:** Fast, unarmed ship used for espionage missions.

### 2.4. Commanders & Officers

Players can hire officers (likely with Dark Matter) for passive bonuses:

- **The Commander:** Enables +1 Building Queue slot.
- **The Technocrat:** Upgrades Espionage Tech level and reduces research time.
- **The Fleet Admiral:** Increases max fleet slots (+2) and fleet speed.
- **The Engineer:** Protects defense units/resources after defeat (75% recovery).
- **The Geologist:** Increases resource production.

### 2.5. Research Technologies

**Basic Technologies**

- **Energy Technology:** Unlocks advanced power plants (Fusion) and is a prerequisite for many other techs.
- **Laser Technology:** Prerequisite for basic weapon systems and light ships.
- **Ion Technology:** Prerequisite for Cruisers and Ion Cannons.
- **Hyperspace Technology:** Prerequisite for advanced ships (Battleships, Destroyers) and Hyperspace Drive.
- **Plasma Technology:** Prerequisite for the strongest weapons and Bombers.

**Drive Technologies (Engines)**

- **Combustion Drive:** Increases speed of light ships (Transporters, Fighters).
- **Impulse Drive:** Increases speed of medium ships (Cruisers, Bombers).
- **Hyperspace Drive:** Increases speed of heavy ships (Battleships, Destroyers, Death Stars).

**Advanced Technologies**

- **Espionage Technology:** Improves the detail of spy reports on enemies and defends against enemy spies.
- **Computer Technology:** Increases the maximum number of fleets you can send simultaneously.
- **Astrophysics / Expedition Technology:** Allows you to colonize more planets and send expeditions to "Mysterious Nebulae".
- **Intergalactic Research Network:** Connects research labs on different planets to speed up research times.
- **Graviton Technology:** Extremely expensive late-game tech required for the "Death Star" class ship.

**Combat Technologies**

- **Weapons Technology:** Increases the attack power of all ships and defenses.
- **Shielding Technology:** Increases the shield strength of all ships and defenses.
- **Armour Technology:** Increases the hull integrity (HP) of all ships and defenses.

## 3. User Flow

1.  **Login:** Land on Home Planet View.
2.  **Collect:** Tap resources/buildings to collect output (if manual) or view stats.
3.  **Build:** Open Build menu -> Select Building -> Place/Upgrade.
4.  **Research:** Open Research menu -> Start project.
5.  **Fleet:** Switch to Fleet menu -> Select Ships -> Select Target (via Galaxy/System view) -> Launch.
6.  **Wait:** Close app or chat while timers tick down.

## 4. Monetization (Inferred)

- **Premium Currency (Dark Matter):** Purchased with real money.
- **Uses:** Instant finish buildings/research, buy resources, hire officers (stat boosts).

## 5. Game Views & States

The game is structured around several key views that facilitate the core loops:

### 5.1. Primary Views

- **Planet View:** Base building and resource collection.
- **System View:** Local exploration, colonization, and target selection.
- **Galaxy View:** Long-range navigation.
- **Fleet View:** Mission dispatch (Attack, Transport, Espionage).
- **Store/Inventory:** Monetization and item management.

### 5.2. Management Views

- **Construction/Shipyard/Research Menus:** Progression management.
- **Alliance/Chat:** Social interaction.
- **Messages:** Asynchronous communication (Reports, PMs).
- **Ranking:** Competitive feedback.

### 2.6. Special Systems

- **Galactonite:** A progression system where players collect and fuse gems (Galactonite) to upgrade stats.
  - **Fuser:** UI for combining lower-level gems into higher-level ones.
  - **Storage:** Temporary storage for gems before equipping.
- **PvE Encounters:**
  - **Alien Brood:** Hostile NPC fleets that spawn on the System Map.
  - **Debris Fields:** Wreckage from battles that can be harvested by Recyclers.

### 2.7. Mission Reports

- **Espionage Report:** Generated when a Probe reaches a target.
  - **Content:** Shows amount of resources (Metal, Crystal, Gas, Energy).
  - **Tech Level Dependency:** Higher Espionage Tech reveals more info: Ships (Level 2), Defense (Level 3), Buildings (Level 4), Research (Level 5).
  - **Counter-Espionage:** Chance for probes to be detected and destroyed by the enemy fleet.
- **Combat Report:** Generated after a battle (Attack or Expedition encounter).
  - **Summary:** Winner/Loser, Total Structure Damage.
  - **Rounds:** Breakdown of ships remaining after each combat round (usually up to 6 rounds).
  - **Loot:** Resources stolen (usually 50% of available resources on the planet).
  - **Debris Field:** Amount of Metal/Crystal floating in space (harvestable).
  - **Wreckage:** Chance for defense to be repaired (70%).
- **Colonization Report:** Generated when a Colony Ship reaches an empty slot.
  - **Success:** "The colony was established successfully." (Ship is consumed).
  - **Failure:** "The fleet arrived but found no habitable planet" (if Astrophysics level is too low or slot was taken).
