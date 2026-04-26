# StellarGuard Backend - Database Migrations

This directory contains PostgreSQL migration scripts for the StellarGuard backend database.

## Tables

### treasuries
- Stores treasury configurations and current balances
- Fields: id, admin, threshold, balance, created_at

### transactions
- Stores multi-signature transactions requiring approvals
- Fields: id, treasury_id, to_address, amount, memo, status, approvals_json, created_at

### proposals
- Stores governance proposals and voting results
- Fields: id, title, description, action, status, proposer, votes_for, votes_against, created_at, ends_at

### token_locks
- Stores token lock positions for time-locked tokens
- Fields: id, owner, amount, locked_at, unlock_at, claimed

### vesting_schedules
- Stores token vesting schedules for beneficiaries
- Fields: id, beneficiary, total_amount, claimed_amount, start_time, duration, cliff

## Running Migrations

1. Set the `DATABASE_URL` environment variable:
   ```bash
   export DATABASE_URL='postgresql://user:password@localhost:5432/stellarguard'
   ```

2. Run migrations:
   ```bash
   ./migrate.sh up
   ```

## CORS Configuration

- Set `CORS_ORIGIN` to the allowed frontend origin, for example `http://localhost:3000` in local development.
- Multiple origins can be provided as a comma-separated list.
- If `NODE_ENV` is not `production`, the backend defaults to `http://localhost:3000`.
- If `NODE_ENV=production` and `CORS_ORIGIN` resolves to `*`, the server logs a startup warning because wildcard CORS is unsafe for production deployments.

## Notes

- All amounts are stored in stroops (1 XLM = 10,000,000 stroops)
- Addresses are stored as text (Stellar public keys)
- Timestamps use TIMESTAMP WITH TIME ZONE for UTC storage
- JSONB fields store structured data (proposal actions, transaction approvals)

## Migration Workflow

Run the database migration script to initialize or update the schema:

```bash
npm run migrate
```

This creates the following tables:
- `events`: Stores contract events with topic_1, topic_2, event_name, event_topics, and event_data columns
- `event_cursor`: Tracks the last processed event cursor for resumable polling
