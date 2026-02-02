# Game Formulas & Math

## 1. Resource Production

Production is calculated per hour and updated continuously or on page load.

### Metal Mine

- **Production:** `30 * Level * 1.1 ^ Level`
- **Energy Consumption:** `10 * Level * 1.1 ^ Level`

### Crystal Mine

- **Production:** `20 * Level * 1.1 ^ Level`
- **Energy Consumption:** `10 * Level * 1.1 ^ Level`

### Gas Extractor

- **Production:** `10 * Level * 1.1 ^ Level * (1.44 - 0.004 * MaxTemperature)`
  - _Note: Gas production is higher on colder planets._
- **Energy Consumption:** `20 * Level * 1.1 ^ Level`

### Solar Plant

- **Energy Output:** `20 * Level * 1.1 ^ Level`

## 2. Building Costs

Costs scale exponentially with level.

### General Formula

`Cost = BaseCost * 1.5 ^ (Level - 1)`

### Base Costs (Level 1)

| Building      | Metal | Crystal | Gas |
| :------------ | :---- | :------ | :-- |
| Metal Mine    | 60    | 15      | 0   |
| Crystal Mine  | 48    | 24      | 0   |
| Gas Extractor | 225   | 75      | 0   |
| Solar Plant   | 75    | 30      | 0   |
| Shipyard      | 400   | 200     | 100 |
| Research Lab  | 200   | 400     | 200 |

## 3. Research Costs

`Cost = BaseCost * 2 ^ (Level - 1)`

## 4. Fleet Mechanics

### Flight Time

`Duration = 10 + (3500 / %Speed) * sqrt((10 * Distance) / Speed)`

- **Distance:**
  - Within System: `1000 + 5 * |PlanetA - PlanetB|`
  - Within Galaxy: `2700 + 95 * |SystemA - SystemB|`
  - Between Galaxies: `20000 * |GalaxyA - GalaxyB|`

### Fuel Consumption

`Consumption = 1 + (FuelFactor * Distance) / 35000 * (%Speed / 100) ^ 2`

## 5. Combat Logic (Simplified)

Combat occurs in **Rounds** (Max 6).

1.  **Attack:** Each ship fires at a random target.
    - `Hit Chance = 100%` (unless Rapid Fire exists).
    - `Damage = Weapon Tech Multiplier * Base Attack`.
2.  **Shields:** Damage is absorbed by Shields first.
    - Shields regenerate every round.
    - If Damage < 1% of Shield, it bounces off (no effect).
3.  **Hull:** If Shields are penetrated, Hull takes damage.
    - If Hull < 70%, ship has a chance to explode: `Chance = 1 - (CurrentHull / MaxHull)`.
    - If Hull <= 0, ship is destroyed.
