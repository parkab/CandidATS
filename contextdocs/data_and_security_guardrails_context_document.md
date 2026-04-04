# Data and Security Guardrails Context Document

## Project Overview

This document defines the data ownership model, authorization expectations, protected route behavior, and prohibited cross-user access patterns for the **Candidate-Facing Applicant Tracking System (ATS)**.

The goal of this policy is to ensure that user data remains private, secure, and isolated between accounts while maintaining production-quality engineering standards aligned with modern full‑stack security practices.

This document applies to all contributors working on:

- Next.js App Router routes
- Server actions
- Prisma database access
- Supabase authentication
- API endpoints
- Gemini-powered AI features

---

## Security Model Summary

The ATS platform follows a **per-user data ownership model**.

This means:

- every user owns only their own job search data
- users must never access another user’s data
- all database reads must be scoped to authenticated users
- authorization must be enforced server-side

Client-side filtering is not considered valid authorization.

---

## Data Ownership Model

Each authenticated user owns the following entities:

- job applications
- saved companies
- notes
- attachments
- reminders
- tracking metadata
- AI-generated summaries tied to their records

Ownership is enforced using a required field:

userId

Every table storing user-generated content must include:

userId: string

Example schema rule:

Each record must belong to exactly one authenticated user.

Shared ownership models are not supported in this system.

---

## Authentication Source of Truth

Supabase Authentication is the authoritative identity provider.

Developers must:

- retrieve the authenticated session server-side
- never trust client-passed user IDs
- never accept userId as request input

Correct pattern:

userId is derived from session

Incorrect pattern:

userId passed from frontend request body

---

## Authorization Requirements

Authorization must occur on:

- every database read
- every database write
- every update
- every delete operation

Required rule:

Every Prisma query involving user data must filter by userId.

Example expectation:

WHERE userId = session.user.id

Authorization must always occur inside:

- server actions
- route handlers
- backend utilities

Never inside client components.

---

## Protected Route Behavior

The following routes require authentication:

- dashboard routes
- application tracking views
- saved jobs views
- notes pages
- reminders pages
- AI insight views

Expected behavior when unauthenticated:

redirect to login page

Expected behavior when session expires:

redirect to login page

Expected behavior when user attempts unauthorized access:

return safe error response

Never expose whether another user’s data exists.

---

## Server Action Guardrails

All server actions must:

1. validate session exists
2. extract userId from session
3. scope database query using userId
4. validate inputs
5. return safe structured responses

Server actions must never:

- trust frontend identifiers
- expose database IDs belonging to other users
- return unfiltered datasets

---

## Prisma Query Guardrails

Required rule:

All user-scoped Prisma queries must include userId filtering.

Correct example behavior:

fetch applications where userId matches session

Incorrect example behavior:

fetch applications by applicationId only

Even if IDs are unique, authorization must still verify ownership.

---

## API Route Authorization Rules

Every API route must follow this sequence:

1. validate authentication
2. extract session userId
3. validate request input
4. execute scoped Prisma query
5. return safe response

API routes must never:

- expose raw database errors
- expose stack traces
- expose internal IDs across users

---

## Cross-User Access Prevention Rules

The following behaviors are strictly prohibited:

Accessing another user’s record using guessed IDs

Querying records without ownership filters

Returning entire datasets to the client

Allowing frontend filters to enforce authorization

Accepting userId from request payload

These violations are considered critical security failures.

---

## File Storage Guardrails (Supabase Storage)

Files uploaded by users must:

- be stored under user-scoped paths
- include ownership metadata
- require authenticated access for retrieval

Example safe storage structure:

/userId/resume.pdf

Example unsafe structure:

/uploads/resume.pdf

File access must always validate ownership before retrieval.

---

## AI Feature Data Protection Rules (Gemini API)

Gemini integrations must:

- process only user-owned records
- avoid sending unrelated dataset context
- avoid sending another user’s data
- avoid storing raw prompts containing sensitive personal information

AI-generated responses must be treated as untrusted output.

Validation is required before persistence.

---

## Client vs Server Responsibility Model

Client components may:

- request data
- display data
- trigger actions

Client components must never:

- enforce authorization
- determine ownership
- construct userId values

Authorization belongs exclusively on the server.

---

## Error Handling Rules

Security-safe responses must:

- avoid revealing whether a resource exists
- avoid exposing database schema
- avoid exposing stack traces

Example safe response:

"Resource not found"

Example unsafe response:

"Application belongs to another user"

---

## Logging and Debugging Rules

Logs must never contain:

- access tokens
- session tokens
- passwords
- uploaded file contents

Allowed logging:

- request success/failure status
- route usage
- validation errors

---

## Route Protection Implementation Expectations

Protected routes must:

- validate authentication early
- prevent rendering before session verification
- redirect unauthorized users immediately

Authorization checks must execute before:

- database access
- storage access
- AI requests

---

## Definition of Secure Completion (Definition of Done)

A feature involving user data is considered secure only when:

- session validation exists
- Prisma queries include ownership filtering
- protected routes enforce authentication
- storage paths include user scoping
- API routes validate authorization
- cross-user access patterns are impossible

All conditions must be satisfied before merge approval.

---

## Reviewer Security Checklist

Reviewers must confirm:

session validation exists

userId derived from session only

Prisma queries scoped correctly

protected routes enforced

no cross-user exposure possible

storage paths isolated per user

safe error handling implemented

Gemini requests scoped correctly

If any condition fails, the pull request must not be approved.

---

## Team Security Agreement Summary

All contributors agree that:

user data belongs only to its owner

authorization is enforced server-side

cross-user access is never permitted

security checks are mandatory for all data features

Following this document ensures that the ATS platform maintains strong user data privacy guarantees and production-quality security behavior.
