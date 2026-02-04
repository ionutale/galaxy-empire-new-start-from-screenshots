# Development Guide

## 1. Technical Overview

### Technology Stack
- **Containerization:** Docker
- **Orchestration:** Docker Compose
- **Database:** PostgreSQL
- **Runtime:** Node.js (via SvelteKit adapter-node)
- **Frontend Framework:** SvelteKit (Svelte 5)
- **Language:** TypeScript
- **Styling:** Tailwind CSS 4
- **Testing:** Playwright & Vitest

---

## 2. Implementation Plan
> Derived from `implementation-plan.md`

### Current Status (as of Feb 2026)
**Status:** MVP Complete + Security Hardened.
- Core gameplay (building, research, fleets) is implemented.
- Database migration to stored procedures is complete.
- Security vulnerabilities have been remediated.

### Priorities & Timeline
1.  **Core Gameplay:** 100% Complete.
2.  **Fleet & Combat:** 100% Complete.
3.  **Universe & Map:** 100% Complete.
4.  **Social:** 100% Complete.
5.  **Progression:** 100% Complete.
6.  **Technical:** 100% Complete (Validation, Cleanup procedures).
7.  **UI/UX:** 100% Complete.
8.  **Analytics:** 100% Complete.
9.  **Production:** 100% Complete.

### Remaining Tasks
- **TypeScript Fixes:** 166 compilation errors to resolve.
- **Unit Tests:** 66 failing tests to repair.
- **Security:** Implement auth enhancements (rate limiting).
- **Optimization:** Performance monitoring.

### Risk Management
- Complexity of real-time mechanics.
- Scaling for large user base.

---

## 3. Database Schema
> Derived from `database-schema.md`

### 3.1. Users & Auth
Tables: `users`, `sessions`.
- users: Stores credentials, premium currency, avatar.
- sessions: Auth management.

### 3.2. Universe & Map
Tables: `galaxies`, `solar_systems`, `planets`.
- galaxies: Macro containers.
- solar_systems: 499 per galaxy.
- planets: 15 per system. Stores type, owner, temp.

### 3.3. Resources & Buildings
Tables: `planet_resources`, `planet_buildings`.
- planet_resources: Stores Metal, Crystal, Gas, Energy. `last_update` timestamp is crucial for production calc.
- planet_buildings: Stores levels of all buildings.

### 3.4. Research & Tech
Tables: `user_research`.
- Stores levels of all tech (Energy, Laser, Engines, etc.).

### 3.5. Fleets & Units
Tables: `planet_units`, `fleets`.
- planet_units: Ships/Defense at base.
- fleets: Active missions. JSONB `ships` column.
- Logic: Arrival times determine event processing.

### 3.6. Construction Queues
Tables: `construction_queue`, `research_queue`.
- Track start/end times for builds. Processed by game loop/cron/procedures.

---

## 4. Agents & AI Context
> Derived from `AGENTS.md` (Note: Original referred to PocketBase, but project uses Postgres. This section is retained for historical AI instructions if needed).

- *Note*: The original `AGENTS.md` was tailored for a PocketBase expert. Since this project is PostgreSQL + SvelteKit, rely on the Schema section above and standard SQL practices.

