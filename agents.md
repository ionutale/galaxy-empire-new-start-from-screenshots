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

- **Node** 24.x
- **PostgreSQL** 18.x
- **SvelteKit** with TypeScript
- **Drizzle ORM** for database interactions
- **Tailwind CSS** for styling
- **Vitest** for testing
- **ESLint** and **Prettier** for code quality and formatting
- **Docker** for containerization
- **pnpm** for package management
- **Playwright** for end-to-end testing
- **Redis** for caching and session management
- **Socket.io** for real-time communication

## Database setup

Use the provided `docker-compose.yml` to set up the PostgreSQL database with the pg_cron extension. This will allow you to run scheduled tasks within the database.

Make sure to run `docker-compose up` to start the database service before running the application. The database will be accessible at `localhost:5432` with the credentials specified in the `docker-compose.yml` file.
