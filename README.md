# CandidATS: ATS for Candidates

A candidate-facing applicant tracking system that helps job seekers
organize and manage their job search.

## Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript (strict mode)
- **Database:** PostgreSQL via Supabase
- **ORM:** Prisma
- **Auth & Storage:** Supabase
- **AI:** Google Gemini API
- **Styling:** Tailwind CSS
- **Deployment:** Vercel
- **CI/CD:** GitHub Actions

## Prerequisites

- Node.js 20.19+
- npm

Use the pinned Node version in `.nvmrc` when possible:

```bash
nvm use
```

or

```bash
fnm use --install-if-missing
```

## Setup

1. Clone the repository
2. Install dependencies:

```bash
   npm install
```

3. Copy the environment template and fill in your values:

```bash
   cp .env.example .env.local
```

4. Start the development server:

```bash
   npm run dev
```

## Scripts

| Script                  | Description                      |
| ----------------------- | -------------------------------- |
| `npm run dev`           | Start development server         |
| `npm run build`         | Build for production             |
| `npm run lint`          | Run ESLint                       |
| `npm run lint:fix`      | Run ESLint and auto-fix          |
| `npm run format`        | Format all files with Prettier   |
| `npm run format:check`  | Check formatting without writing |
| `npm run type-check`    | Run TypeScript compiler check    |
| `npm run test`          | Run all tests                    |
| `npm run test:watch`    | Run tests in watch mode          |
| `npm run test:coverage` | Run tests with coverage report   |

## Folder Structure

```
src/
  app/
    api/          # Backend API routes (auth, jobs, profile, documents)
    (auth)/       # Login and register pages
    (dashboard)/  # Dashboard, profile, documents, settings pages
  components/     # Reusable UI components
  lib/            # Domain logic (auth, jobs, profile, documents)
  types/          # Shared TypeScript types
prisma/           # Database schema and migrations
```

## CI/CD

Pull requests to `main` automatically run lint, type-check, build,
and test checks via GitHub Actions. All checks must pass before merging.

## Jira Board

YOUR_JIRA_BOARD_URL

## Branch Protection Setup

After the first successful CI run, configure branch protection for `main` in GitHub:

1. Go to GitHub repository settings.
2. Open Settings > Branches.
3. Add or edit a rule for `main`.
4. Enable Require a pull request before merging.
5. Enable Require status checks to pass before merging and select Lint, Type-check, Build, Test.
6. Enable Require branches to be up to date before merging.
7. Enable Do not allow bypassing the above settings.

Before opening the first test pull request, add placeholder GitHub Actions secrets in
Settings > Secrets and variables > Actions:

- NEXT_PUBLIC_SUPABASE_URL (dummy value)
- NEXT_PUBLIC_SUPABASE_ANON_KEY (dummy value)
