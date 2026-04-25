import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:3005",
    trace: "on-first-retry",
  },
  webServer: {
    command: "NEXT_DISABLE_VERSION_CHECK=1 CI=1 npm run dev -- -p 3005",
    url: "http://127.0.0.1:3005",
    reuseExistingServer: !process.env.CI,
    cwd: __dirname,
    env: {
      NEXT_PUBLIC_USE_MOCK_TREASURY: "1",
      NEXT_DISABLE_VERSION_CHECK: "1",
      CI: "1",
      NEXT_PUBLIC_TREASURY_CONTRACT_ID: "mock-treasury-contract",
      NEXT_PUBLIC_GOVERNANCE_CONTRACT_ID: "mock-governance-contract",
      NEXT_PUBLIC_VAULT_CONTRACT_ID: "mock-vault-contract",
      NEXT_PUBLIC_ACL_CONTRACT_ID: "mock-acl-contract",
      NEXT_PUBLIC_SOROBAN_SIMULATION_ACCOUNT:
        "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF",
    },
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
