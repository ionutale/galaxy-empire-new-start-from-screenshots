## Always run code checks

To ensure code quality and consistency, always run the following checks before committing your code:

- **Prettier**: Use Prettier to format your code.
- **Linting**: Use ESLint to check for code style and potential errors.
- **Type Checking**: Use TypeScript to verify type correctness.
- **Formatting**: Use Prettier to maintain consistent code formatting.

**ALways focus on the code quality and readability, not just on making it work.**

Example commands:

```bash
pnpm run prettier
pnpm run lint
pnpm run check
pnpm run format
```

## Tech to use

- **Node** 24.x (but project uses Node.js runtime via SvelteKit adapter-node)
- **PostgreSQL** 17.x (currently using 17.7-alpine in Docker)
- **SvelteKit** with TypeScript (Svelte 5)
- **Drizzle ORM** for database interactions
- **Tailwind CSS** 4 for styling
- **Vitest** for unit testing
- **Playwright** for end-to-end testing
- **ESLint** and **Prettier** for code quality and formatting
- **Docker** for containerization
- **pnpm** for package management
- **Socket.io** for real-time communication (planned)
- **Redis** for caching and session management (planned)

## Database setup

Use the provided `docker-compose.yml` to set up the PostgreSQL database. The database will be accessible at `localhost:5432` with the credentials specified in the `docker-compose.yml` file.

**Important**: The database uses stored procedures for game logic instead of application code. All game mechanics (building completion, resource production, fleet movement, etc.) are handled by PostgreSQL procedures that run automatically.

## Project Overview

**Galaxy Empire** is a sci-fi strategy MMO game featuring:

- **Base Building**: Construct and upgrade buildings (mines, solar plants, shipyards, research labs)
- **Resource Management**: Metal, Crystal, Gas (Deuterium), Energy, Dark Matter
- **Fleet Construction**: Build various ship types for exploration, combat, and colonization
- **Research System**: Technology tree for unlocking advanced buildings and ships
- **Galactic Exploration**: Multi-level map system (Galaxy → System → Planet)
- **Multiplayer**: Alliances, messaging, combat reports, espionage
- **Real-time Progression**: Automated game ticks every second via cron job

## Database Schema Overview

### Core Tables

- **`users`**: Player accounts, authentication, premium currency
- **`planets`**: Player colonies with coordinates, type, temperature, fields
- **`planet_resources`**: Resource storage (metal, crystal, gas, energy) with last_update timestamps
- **`planet_buildings`**: Building levels and upgrade status per planet
- **`building_types`**: Building definitions with costs, production rates, prerequisites
- **`user_research`**: Technology levels per user
- **`fleets`**: Active fleet missions with ships, resources, travel times
- **`planet_ships`**: Ship counts stationed on planets

### Queue Tables

- **`building_queue`**: Construction jobs with start/completion times
- **`research_queue`**: Research jobs in progress
- **`shipyard_queue`**: Ship construction orders

### Social Features

- **`alliances`**: Player groups
- **`messages`**: Private messaging system
- **`combat_reports`**: Battle results
- **`espionage_reports`**: Intelligence gathering results

## Game Mechanics

### Resource Production

- **Automated**: Runs every second via `process_resource_production()` procedure
- **Building-based**: Mines produce resources based on level (1.1x multiplier per level)
- **Temperature Effects**: Gas production varies with planet temperature
- **Energy Balance**: Buildings consume and produce energy
- **Storage Limits**: Resources capped at building-dependent maximums

### Building System

- **Queue-based**: Construction takes real time, processed by `process_completed_buildings()`
- **Prerequisites**: Buildings require specific tech levels or other buildings
- **Cost Scaling**: Exponential cost increase with level (configurable factors)
- **Production Scaling**: 1.1x production multiplier per level

### Fleet System

- **Real-time Movement**: Fleets travel between coordinates based on distance/engine speed
- **Multiple Missions**: Attack, Transport, Colonize, Espionage, Recycle
- **Combat Engine**: Deterministic battle calculations with ship stats
- **Resource Transport**: Fleets can carry resources between planets

### Research System

- **Global per User**: Research benefits all planets
- **Queue-based**: One research at a time
- **Prerequisites**: Tech tree dependencies
- **Unlocks**: New buildings, ships, improved stats

## Development Workflow

### Database Migrations

```bash
# Generate migration from schema changes
pnpm run db:generate

# Apply migrations
pnpm run migrate
# OR manually: psql "postgres://galaxy_user:galaxy_password@localhost:5432/galaxy_empire" -f drizzle/migration.sql
```

### Game Tick Automation

The game runs automated ticks every second via cron job:

- **Script**: `run-game-tick.sh` (calls `game_tick()` procedure 60 times/minute)
- **Cron**: `* * * * * cd /path/to/project && ./run-game-tick.sh >> /tmp/game-tick.log 2>&1`
- **Procedures**: `process_completed_buildings()`, `process_completed_ship_construction()`, `process_all_completed_research()`, `process_resource_production()`

### Testing

```bash
# Unit tests
pnpm run test:unit

# E2E tests
pnpm run test:e2e

# All tests
pnpm run test
```

## Key Files and Architecture

### Frontend (`src/`)

- **`routes/`**: SvelteKit pages and API endpoints
- **`lib/components/`**: Reusable UI components
- **`lib/game-config.ts`**: Building costs, production rates, formulas
- **`lib/server/`**: Backend services and business logic

### Backend Services (`src/lib/server/`)

- **`db.ts`**: Database connection and query helpers
- **`building-service.ts`**: Building construction logic
- **`fleet-service.ts`**: Fleet management and movement
- **`research-service.ts`**: Technology research system
- **`shipyard-service.ts`**: Ship construction
- **`combat-engine.ts`**: Battle calculations
- **`game.ts`**: Core game mechanics

### Database (`drizzle/`)

- **`schema.ts`**: Complete database schema with relations
- **`relations.ts`**: Drizzle ORM relationships
- **Migration files**: SQL files for schema changes and procedures

### Configuration

- **`docker-compose.yml`**: Database container setup
- **`Dockerfile.db`**: PostgreSQL container with extensions
- **`tsconfig.json`**: TypeScript configuration
- **`eslint.config.js`**: Linting rules
- **`playwright.config.ts`**: E2E test configuration

## Current Project Status

### ✅ Completed Features

- Core gameplay (building, research, fleets, combat)
- Database procedures for automated game ticks
- Resource production system
- Multiplayer social features
- Complete UI/UX
- Security hardening
- Docker containerization

### 🔄 Known Issues

- Some TypeScript compilation errors (166 total)
- Failing unit tests (66 tests)
- Missing rate limiting for auth
- Performance monitoring needed

### 📋 Development Priorities

1. Fix TypeScript errors
2. Repair failing tests
3. Implement auth rate limiting
4. Add performance monitoring
5. Scale for larger user base

## Game Balance and Formulas

### Resource Production

- **Metal Mine**: 30 \* (1.1^level) base production
- **Crystal Mine**: 20 \* (1.1^level) base production
- **Gas Extractor**: 10 _ (1.1^level) _ temperature_modifier
- **Temperature Modifier**: 1.44 - 0.004 \* planet_temperature

### Building Costs

- **Cost Factor**: 1.5x per level for most buildings
- **Time Formula**: Base time \* cost_factor^level

### Fleet Movement

- **Speed**: Based on slowest ship in fleet
- **Distance**: Calculated from coordinate differences
- **Travel Time**: distance / speed (in seconds)

## API Endpoints

### Game Routes (`/game/`)

- **`/planet/[id]`**: Planet management and building
- **`/fleet`**: Fleet creation and management
- **`/research`**: Technology research
- **`/shipyard`**: Ship construction
- **`/galaxy/[id]`**: Galaxy view
- **`/system/[galaxy]/[system]`**: System view
- **`/combat-report/[id]`**: Battle reports
- **`/messages`**: Private messaging

### API Routes (`/api/`)

- Authentication endpoints
- Game state queries
- Action processing (build, research, fleet orders)

## Deployment and Production

- **Adapter**: `@sveltejs/adapter-node` for Node.js deployment
- **Database**: PostgreSQL with persistent Docker volumes
- **Cron Jobs**: External cron for game tick automation
- **Environment**: Production environment variables needed

## Useful Commands for Development

```bash
# Start development server
pnpm run dev

# Start database only
docker-compose up db

# Run all checks
pnpm run prettier && pnpm run lint && pnpm run check

# Database operations
pnpm run db:studio  # Open Drizzle Studio
pnpm run migrate   # Apply migrations

# Testing
pnpm run test:unit
pnpm run test:e2e

# Manual game tick
psql "postgres://galaxy_user:galaxy_password@localhost:5432/galaxy_empire" -c "CALL game_tick();"
```

## Important Notes for Future Development

1. **Database-First Approach**: Game logic lives in stored procedures, not application code
2. **Real-Time Systems**: Game ticks run every second - ensure procedures are efficient
3. **Resource Calculations**: Always use `last_update` timestamps for accurate production
4. **Queue Processing**: Building/research/ship queues processed automatically by procedures
5. **Testing**: Both unit tests (Vitest) and E2E tests (Playwright) are configured
6. **Type Safety**: Strict TypeScript usage throughout the codebase
7. **Performance**: Database procedures handle heavy calculations to reduce app server load

This comprehensive overview should help future AI models understand the Galaxy Empire codebase and contribute effectively to its development.
