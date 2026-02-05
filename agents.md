## Always run code checks

To ensure code quality and consistency, always run the following checks before committing your code:

- **Linting**: Use ESLint to check for code style and potential errors.
- **Type Checking**: Use TypeScript to verify type correctness.

Example commands:

```bash
pnpm run lint
pnpm run  check
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
