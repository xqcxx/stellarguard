# ADR-004: Choice of NestJS for Backend API

**Status:** Accepted
**Date:** 2026-03-28
**Authors:** StellarGuard Team

## Context

StellarGuard needs a backend API layer to serve indexed on-chain data to the frontend, handle rate limiting, expose Swagger documentation, and run a Soroban event indexer as a background service. The original specification listed FastAPI (Python) or NestJS (TypeScript) as candidates.

The frontend is written in TypeScript. The event parser, database layer, and RPC interactions are all TypeScript-first concerns already present in the codebase.

## Decision

Use **NestJS** (TypeScript) as the backend framework.

Key design choices:
- Module-based structure mirrors the contract domain: `treasury`, `governance`, `vault`, `health`.
- `@nestjs/swagger` generates OpenAPI docs automatically from decorators — no separate spec file to maintain.
- `@nestjs/throttler` provides rate limiting as a guard without external middleware.
- The event indexer (`listener.service.ts`) runs as a NestJS `OnModuleInit` service so it shares the application lifecycle, DI container, and config module with the API layer.
- A single `tsconfig.json` and `jest` config covers both the API and the indexer.

## Consequences

### Positive

- Single language (TypeScript) across frontend, backend, and indexer reduces cognitive overhead for contributors.
- Decorator-driven Swagger documentation stays in sync with the code automatically.
- NestJS's DI container makes it straightforward to inject shared services (db, soroban client) into both API controllers and the indexer.
- Existing `zod` schemas can be shared between the API response validation and frontend data parsing.

### Negative

- NestJS has a larger learning curve than a minimal Express or Fastify setup for first-time contributors.
- `reflect-metadata` must be imported at the entry point — missing it causes runtime failures that are hard to diagnose.

### Neutral

- FastAPI would have been a valid alternative with slightly better cold-start performance; the trade-off was accepted in favour of TypeScript consistency.

## Alternatives Considered

- **FastAPI (Python):** Strong typing via Pydantic, excellent performance, but introduces a second language runtime. Rejected to keep the contributor toolchain uniform.
- **Plain Express:** Lower overhead but requires manual wiring of DI, validation, and Swagger. Rejected because NestJS conventions reduce boilerplate without sacrificing flexibility.
- **Hono / Fastify:** Lighter-weight TypeScript frameworks; viable but lack the built-in DI and decorator-based Swagger integration that NestJS provides out of the box.
