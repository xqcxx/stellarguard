# Frontend Quality Guardrails

This package now includes baseline security, performance, and end-to-end smoke checks.

## Security Headers and CSP

`next.config.js` defines:

- `Content-Security-Policy`
- `X-Content-Type-Options`
- `X-Frame-Options`
- `Referrer-Policy`
- `Permissions-Policy`
- `Cross-Origin-Opener-Policy`
- `Cross-Origin-Resource-Policy`

For local development, CSP keeps `unsafe-eval` enabled to support Next.js dev tooling. Production builds remove it.

## Bundle Analysis

Generate bundle reports:

```bash
npm run analyze
```

This uses `@next/bundle-analyzer` and helps identify large client bundles for further splitting.

## E2E Smoke Test

Run the mocked treasury happy-path smoke test:

```bash
npm run test:e2e
```

The Playwright config starts the app with `NEXT_PUBLIC_USE_MOCK_TREASURY=1` so the test is deterministic and does not require live Soroban/Freighter integration.
