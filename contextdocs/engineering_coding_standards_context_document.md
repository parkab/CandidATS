# Engineering Coding Standards Context Document

## Project Overview

This document defines engineering coding standards for the **Candidate-Facing Applicant Tracking System (ATS)**. These standards ensure the codebase remains readable, consistent, secure, maintainable, and production-quality across all contributions.

This policy applies to all contributors working with:

- Next.js 15 (App Router)
- TypeScript (strict mode)
- Prisma ORM
- Supabase Auth and Storage
- Google Gemini API integrations
- Tailwind CSS
- GitHub Actions CI/CD pipeline

Following these standards ensures long-term maintainability and reduces onboarding friction for new contributors.

---

## Core Engineering Principles

All code must follow these guiding principles:

Clarity over cleverness
Consistency over preference
Security over convenience
Type safety over shortcuts
Server-first correctness before client behavior

Readable code is preferred over shorter code.

---

## Repository Structure Standards

The project follows a feature-aligned structure compatible with **Next.js App Router**.

Expected structure patterns:

app/
components/
lib/
server/
prisma/
types/
utils/

Guidelines:

Route-level logic belongs inside app/
Reusable UI belongs inside components/
Database logic belongs inside server/
Shared helpers belong inside utils/
Shared type definitions belong inside types/

Avoid placing business logic inside page components.

---

## TypeScript Standards (Strict Mode Required)

TypeScript strict mode is mandatory.

Required practices:

No usage of "any"
Explicit return types for exported functions
Shared types stored centrally
Use discriminated unions when appropriate
Prefer interfaces for structured objects

Example rule:

Never suppress errors using @ts-ignore unless justified and documented.

---

## Naming Conventions

Consistency in naming improves readability across the team.

Variables:

camelCase

Functions:

camelCase with action-oriented names

Example:

createApplicationRecord
updateApplicationStatus
fetchUserApplications

React Components:

PascalCase

Example:

ApplicationCard
StatusBadge
DashboardHeader

Database Models:

PascalCase singular

Example:

Application
Reminder
Note

Database fields:

camelCase

Example:

userId
createdAt
updatedAt

---

## File Naming Standards

Component files:

PascalCase.tsx

Utility files:

camelCase.ts

Server logic files:

camelCase.ts

Route folders:

lowercase

Example:

app/dashboard/page.tsx

---

## React Component Standards

Components must:

be small and focused
avoid duplicated logic
use explicit prop typing
avoid unnecessary client components

Server Components are default.

Use "use client" only when required for:

state
browser APIs
interactive UI behavior

---

## Server Action Standards

Server actions must:

validate authentication
validate inputs
handle errors safely
return structured responses

Server actions must never:

trust client-provided identifiers
perform unscoped database queries
expose raw database errors

---

## Prisma Usage Standards

All database access must use Prisma.

Required rules:

No raw SQL unless reviewed
Always scope queries using userId
Validate ownership before updates
Use transactions for multi-step writes

Example expectation:

Database logic must live inside server utilities.

Never inside client components.

---

## Supabase Integration Standards

Supabase Auth is the identity source of truth.

Rules:

Never trust frontend userId values
Always derive session server-side
Never expose tokens in logs

Supabase Storage must:

use user-scoped file paths
validate ownership before retrieval

---

## API Route Standards

All route handlers must:

validate authentication
validate input schema
scope queries correctly
return structured responses

Response format example:

success boolean
message string
optional data payload

Avoid returning raw database objects directly.

---

## Input Validation Standards

Validation must occur:

client-side for UX
server-side for security

Preferred approach:

schema validation using shared validators

Validation must exist before:

writes
updates
AI prompt submission
file uploads

---

## Error Handling Standards

Errors must:

be predictable
be structured
avoid exposing internal implementation details

Example safe pattern:

return { success: false, message: "Unable to save application" }

Avoid exposing:

stack traces
SQL messages
internal identifiers

---

## Logging Standards

Logs must help debugging without exposing sensitive information.

Allowed logging:

validation failures
unexpected exceptions
route-level failures

Forbidden logging:

session tokens
access tokens
passwords
user-uploaded content

---

## Tailwind Styling Standards

Tailwind must be used consistently.

Rules:

Prefer utility-first styling
Avoid inline style attributes
Reuse shared UI components
Maintain spacing consistency

Example spacing usage:

p-4
p-6
mb-6

Avoid arbitrary spacing unless justified.

---

## Environment Variable Standards

Environment variables must:

exist only inside server runtime
never be exposed to client components
never be committed to repository

Required pattern:

.env.local for development
Vercel environment settings for deployment

---

## Gemini API Integration Standards

Gemini usage must:

validate inputs before sending prompts
sanitize user-provided text
validate outputs before persistence
avoid storing sensitive prompts unnecessarily

AI output must always be treated as untrusted data.

---

## Testing Requirements

All contributions must include unit tests when introducing:

new utilities
server actions
validation logic
business logic

Tests must verify:

expected behavior
edge cases
invalid input handling

Tests must pass before merge approval.

---

## Linting Requirements

Code must pass:

npm run lint

Linting errors must not be ignored.

Formatting must remain consistent across the repository.

---

## Pull Request Standards

Pull requests must include:

clear description
summary of changes
testing notes
AI disclosure if applicable

PRs must remain:

small
focused
reviewable

Large multi-feature PRs are discouraged.

---

## Code Review Expectations

Reviewers must confirm:

correct typing
correct architecture placement
secure database access
consistent naming
proper validation
readability

Reviewers may request refactoring before approval.

---

## CI/CD Enforcement

GitHub Actions automatically enforce:

lint checks
TypeScript validation
unit test execution

PRs failing checks cannot be merged.

---

## Definition of Done (Engineering)

Code is considered production-ready only when:

strict typing satisfied
lint passes
tests pass
authorization enforced
validation implemented
naming consistent
structure correct
review approved by two contributors

All conditions must be satisfied before merge.

---

## Team Engineering Agreement Summary

All contributors agree that:

code must remain readable
code must remain secure
code must remain typed
code must remain testable
code must follow shared architecture

Following this document ensures the ATS platform maintains a professional engineering standard suitable for production-quality deployment.

