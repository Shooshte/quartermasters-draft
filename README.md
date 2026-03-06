# Quartermasters Draft

## Prerequisites

- [Node.js](https://nodejs.org/) v22+
- [pnpm](https://pnpm.io/) v10+
- [Docker](https://www.docker.com/) (for local PostgreSQL)

## Local Development

### 1. Install dependencies

```bash
pnpm install
```

### 2. Set up environment variables

```bash
cp packages/db/.env.example packages/db/.env
cp apps/web/.env.example apps/web/.env
```

### 3. Start PostgreSQL

```bash
docker run -d \
  --name quartermasters-pg \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=quartermasters-draft \
  -p 5432:5432 \
  postgres:16
```

### 4. Push schema and seed database

```bash
pnpm db:push
pnpm db:seed
```

### 5. Start the dev server

```bash
pnpm dev
```

The app runs at **http://localhost:3000**.

### Stopping the database

```bash
docker stop quartermasters-pg && docker rm quartermasters-pg
```

## Test Accounts

| Role   | Email                | Password    |
|--------|----------------------|-------------|
| GM     | gm@example.com       | password123 |
| Player | player@example.com   | password123 |

## Commands

```bash
pnpm dev          # Start all apps in dev mode
pnpm build        # Build all packages
pnpm lint         # Lint all packages
pnpm test         # Run unit tests
pnpm test:e2e     # Run e2e tests (requires Docker)
pnpm db:push      # Push schema to database
pnpm db:seed      # Seed database with test data
```
