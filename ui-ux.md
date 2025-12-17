# UI/UX Design

## 1. Layout & Navigation

### 1.1. Top Bar (HUD)
*   **Left:** Rank/Score indicator with an "Up" arrow (ranking improvement).
*   **Center:** Player Name (e.g., "Uno").
*   **Right:**
    *   **Officers/Buffs:** Row of small icons representing active officers or bonuses.
    *   **Mail:** Prominent envelope icon for notifications.

### 1.2. Resource Bar (Below Top Bar)
*   **Layout:** A dedicated panel showing current resource stockpiles.
*   **Elements:**
    *   Metal (Icon: Ingot/Ore)
    *   Crystal (Icon: Blue Crystal)
    *   Gas (Icon: Purple Liquid/Gas)
    *   Energy (Icon: Lightning Bolt)
    *   Premium Currency (Icon: Gold Bars/Credits)
*   **Settings:** Gear icon usually located near this panel.

### 1.3. Main Viewport
*   **Perspective:**
    *   **Planet:** Isometric 2.5D. Buildings sit on a terrain texture.
    *   **System/Galaxy:** 2D flat interface with background art.
*   **Interactivity:**
    *   **Pinch-to-zoom:** Likely supported for the planet view.
    *   **Tap:** Select buildings, planets, or systems.
    *   **Arrows:** Navigation arrows (Left/Right) in Galaxy view to switch systems.

### 1.4. Bottom Navigation Bar (Dock)
*   **Style:** Fixed footer, metallic texture.
*   **Tabs:**
    *   **Planets:** Overview of all colonized planets.
    *   **System:** Switch to Solar System view.
    *   **Fleet:** Fleet management and dispatch.
    *   **Store/Laden:** Premium shop.
    *   **Capsule/Item:** Inventory or Gacha mechanic.
    *   **More (>):** Expandable menu for Settings, Alliance, Tech Tree, etc.

### 1.5. Chat Overlay
*   **Position:** Just above the bottom navigation bar.
*   **Content:** Single line preview of the latest message.
*   **Interaction:** Tapping expands to full chat window.

## 2. Visual Language
*   **Color Palette:** Deep Blues (Space), Neon Cyan (Holograms/UI Borders), Metallic Greys (Frames), Green/Red (Status indicators).
*   **Typography:** Sans-serif, clean fonts. Numbers are often colored (Green for safe/positive, Red for negative/danger).
*   **Feedback:**
    *   **Selection:** Highlighting buildings or planets when tapped.
    *   **Alerts:** "!" icons floating over buildings or buttons to indicate finished tasks or urgent actions.

## 3. View Hierarchy

### 3.1. Primary Navigation Views (Bottom Dock)
*   **Planet View (Home/Base):** The main isometric screen where you manage buildings, collect resources, and see your planetary surface.
*   **System View (Solar System):** The 2D map showing the sun, your planet, other players' planets, and empty slots in the current solar system.
*   **Galaxy View (Universe):** The macro map showing different galaxies or nebulae to jump between distant sectors.
*   **Fleet View:** The screen for selecting ships, assigning missions (Attack, Transport, Colonize), and choosing target coordinates.
*   **Store View (Laden):** The premium shop for buying Dark Matter, resources, or speed-ups.
*   **Capsule/Item View:** A screen for opening "Gacha" capsules or managing inventory items (buffs, relocation passes).
*   **Galactonite Fuser:** A grid-based UI for managing and fusing upgrade gems.
*   **Star Gate View:** A 3D view of special endgame structures (Star Fortress).

### 3.2. Secondary Management Views
*   **Building Construction Menu:** A list of available buildings to construct (Mines, Plants, Storage).
*   **Shipyard Menu:** A list of ships and defenses available to build.
*   **Research Lab Menu:** The tech tree screen for starting research projects.
*   **Alliance View:** For managing guild members, diplomacy, and wars.
*   **Messages/Mailbox:** For reading combat reports, espionage reports, and private messages.
*   **Chat Window:** The full-screen or expanded view of the global/alliance chat.
*   **Ranking/Highscore:** A leaderboard showing player and alliance rankings.
*   **Commander/Officer View:** The screen to hire and manage the 5 officers.
*   **Settings:** Options for account management, sound, and notifications.

### 3.3. Mission Specific Views
*   **Espionage Report:**
    *   **Layout:** Vertical list.
    *   **Header:** Planet Name and Coordinates.
    *   **Sections:** Resources (Always visible), Fleets, Defense, Buildings, Research (Collapsible or hidden based on tech).
    *   **Actions:** "Simulate" (Link to combat simulator), "Attack" (Quick link to fleet dispatch).
*   **Combat Report:**
    *   **Header:** "Attacker vs Defender" with outcome (Green for Win, Red for Loss).
    *   **Visuals:** Side-by-side comparison of fleets before and after battle.
    *   **Loot Section:** Icons of resources stolen.
    *   **Debris Section:** Icons showing harvestable debris.
*   **Colonization Report:**
    *   **Simple Popup:** Text description of the result.
    *   **Visual:** Image of a planet surface being settled or a "Return" flight path if failed.
*   **Expedition Result:** A popup showing what was found in the "Mysterious Nebula".
