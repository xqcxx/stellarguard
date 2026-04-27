# StellarGuard — Frontend Developer Guide

> A guide to understanding, developing, and extending the StellarGuard Next.js dashboard.

## Table of Contents
1. [Architecture](#architecture)
2. [Project Structure](#project-structure)
3. [Setup](#setup)
4. [Key Concepts](#key-concepts)
5. [Wallet Integration](#wallet-integration)
6. [Contract Interaction Pattern](#contract-interaction-pattern)
7. [SorobanClient Polling Strategy](#sorobanlient-polling-strategy)
8. [Data Loading with Request Guards](#data-loading-with-request-guards)
9. [Error Classification](#error-classification)
10. [Components](#components)
11. [Hook Usage](#hook-usage)
12. [Adding Features](#adding-features)
13. [Architecture Decision Records](#architecture-decision-records)

## Architecture Decision Records

Major frontend design decisions are documented as ADRs in [`docs/adr/`](./adr/):

| ADR | Title | Status |
|-----|-------|--------|
| [000](./adr/000-template.md) | ADR Template | - |
| [001](./adr/001-wallet-integration.md) | Wallet Integration via Freighter Provider | Accepted |
| [002](./adr/002-data-loading.md) | Data Loading via Custom Hooks with Request Guards | Accepted |
| [003](./adr/003-transaction-pipeline.md) | Transaction Pipeline with Lifecycle Tracking | Accepted |

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│              Next.js App (Frontend)              │
├──────────────┬──────────────┬───────────────────┤
│    Pages     │  Components  │     Hooks         │
│              │              │                   │
│ /            │ WalletConnect│ useFreighter      │
│ /treasury    │ TreasuryCard │ useTreasury       │
│ /governance  │ ProposalCard │ useGovernance     │
│ /proposals/* │ VoteButton   │                   │
├──────────────┴──────────────┴───────────────────┤
│                    Lib Layer                     │
│  soroban.ts (XDR building) │ network.ts (RPC)  │
├─────────────────────────────┴───────────────────┤
│              Context (FreighterProvider)          │
├──────────────────────────────────────────────────┤
│         Stellar / Soroban / Freighter APIs        │
└──────────────────────────────────────────────────┘
```

---

## Project Structure

```
frontend/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── globals.css         # Global styles + Tailwind
│   │   ├── layout.tsx          # Root layout with navbar
│   │   ├── page.tsx            # Dashboard home
│   │   ├── treasury/
│   │   │   └── page.tsx        # Treasury management
│   │   ├── governance/
│   │   │   └── page.tsx        # Proposal listing
│   │   └── proposals/
│   │       └── [id]/
│   │           └── page.tsx    # Proposal detail + voting
│   ├── components/             # Reusable UI components
│   │   ├── WalletConnect.tsx   # Smart wallet button
│   │   ├── TreasuryCard.tsx    # Transaction display card
│   │   ├── ProposalCard.tsx    # Proposal display card
│   │   └── VoteButton.tsx      # Vote casting button
│   ├── context/
│   │   └── FreighterProvider.tsx  # Wallet state context
│   ├── hooks/
│   │   ├── useFreighter.ts     # Re-export of wallet hook
│   │   ├── useTreasury.ts      # Treasury data hook
│   │   └── useGovernance.ts    # Governance data hook
│   └── lib/
│       ├── soroban.ts          # Contract interaction helpers
│       └── network.ts          # Network configuration
├── package.json
├── tailwind.config.ts
├── tsconfig.json
├── next.config.js
└── postcss.config.js
```

---

## Setup

### Prerequisites
- Node.js 20+
- npm or yarn
- [Freighter Wallet](https://www.freighter.app/) browser extension

### Install & Run
```bash
cd frontend
npm install
npm run dev
# Open http://localhost:3000
```

### Frontend Reliability Notes
- Use `src/lib/stellarAddress.ts` for all client-side Stellar address checks instead of duplicating prefix/length logic in components.
- Layout fonts are loaded through `next/font/google` with `display: "swap"` to avoid the blocking Google Fonts stylesheet path.
- Brand imagery in the app shell should go through `next/image` so width, height, and modern image formats are declared at the layout boundary.

### Environment Variables & Deployment Matrix

All frontend environment variables are `NEXT_PUBLIC_*` (exposed to browser) and configured per deployment stage. Create a `.env.local` file for local development:

```env
NEXT_PUBLIC_SOROBAN_RPC_URL=https://soroban-testnet.stellar.org
NEXT_PUBLIC_NETWORK_PASSPHRASE="Test SDF Network ; September 2015"
NEXT_PUBLIC_TREASURY_CONTRACT_ID=<deployed-contract-id>
NEXT_PUBLIC_GOVERNANCE_CONTRACT_ID=<deployed-contract-id>
NEXT_PUBLIC_VAULT_CONTRACT_ID=<deployed-contract-id>
NEXT_PUBLIC_ACL_CONTRACT_ID=<deployed-contract-id>
```

#### Environment Matrix by Deployment Stage

| Variable | **Dev** | **Staging** | **Production** |
|----------|---------|------------|----------------|
| `NEXT_PUBLIC_SOROBAN_RPC_URL` | `https://soroban-testnet.stellar.org` | `https://soroban-testnet.stellar.org` | `https://mainnet.sorobanrpc.com` |
| `NEXT_PUBLIC_NETWORK_PASSPHRASE` | `"Test SDF Network ; September 2015"` | `"Test SDF Network ; September 2015"` | `"Public Global Stellar Network ; September 2015"` |
| `NEXT_PUBLIC_TREASURY_CONTRACT_ID` | Local testnet contract | Staging testnet contract | Mainnet contract (live funds) |
| `NEXT_PUBLIC_GOVERNANCE_CONTRACT_ID` | Local testnet contract | Staging testnet contract | Mainnet contract |
| `NEXT_PUBLIC_VAULT_CONTRACT_ID` | Local testnet contract | Staging testnet contract | Mainnet contract |
| `NEXT_PUBLIC_ACL_CONTRACT_ID` | Local testnet contract | Staging testnet contract | Mainnet contract |
| **Freighter Network** | Switch to **Testnet** | Switch to **Testnet** | Switch to **Public** |
| **Purpose** | Local feature development & testing | Integration testing before release | Live production (real XLM) |

#### Configuration Notes
- **Dev (`localhost:3000`):** Testnet RPC and any deployed testnet contracts. Freighter must be set to Testnet in settings.
- **Staging:** Separate testnet contracts from Dev; used for pre-release testing with realistic data.
- **Production:** Mainnet RPC and mainnet contracts. **Real XLM is at risk.** All contract IDs must reference audited, mainnet-deployed contracts.

#### Validating Your Configuration
The app throws a clear error on startup if any `NEXT_PUBLIC_*_CONTRACT_ID` is missing:
```
Error: Missing required contract ID: NEXT_PUBLIC_TREASURY_CONTRACT_ID
```

This prevents accidental deployments with placeholder values. Contract ID validation occurs in `src/lib/soroban.ts`.

---

## Key Concepts

### Design System
The frontend uses a dark-mode-first design with these custom classes:
- `.btn-primary` — Blue gradient button with shadow
- `.btn-secondary` — Dark card-style button with border
- `.card` — Dark card with border and shadow
- `.gradient-text` — Blue-to-purple gradient text

Brand colors are defined in `tailwind.config.ts` under `stellar.*` and `primary.*`.

### State Management
- **Wallet state**: React Context via `FreighterProvider`
- **Contract data**: Custom hooks (`useTreasury`, `useGovernance`)
- **UI state**: Local component state

---

## Wallet Integration

### How It Works
1. **FreighterProvider** wraps the entire app
2. On mount, it checks if Freighter extension is installed
3. User clicks "Connect Wallet" → calls `requestAccess()` from Freighter API
4. Connected address and network are stored in Context
5. All child components access wallet state via `useFreighter()` hook

### Usage
```tsx
import { useFreighter } from "@/hooks/useFreighter";

function MyComponent() {
  const { address, isConnected, connect } = useFreighter();

  if (!isConnected) {
    return <button onClick={connect}>Connect Wallet</button>;
  }

  return <p>Connected: {address}</p>;
}
```

---

## Contract Interaction Pattern

Every contract interaction follows this pattern:

```
1. Build → 2. Simulate → 3. Sign → 4. Submit → 5. Confirm
```

### Example: Approve a Treasury Transaction
```tsx
import { buildContractCall, signAndSubmit } from "@/lib/soroban";
import { CONTRACT_IDS } from "@/lib/soroban";

async function approveTx(signerAddress: string, txId: number) {
  // 1. Build the transaction
  const tx = await buildContractCall(
    CONTRACT_IDS.treasury,
    "approve",
    [signerAddress, txId],  // Contract arguments
    signerAddress            // Source account
  );

  // 2-4. Sign with Freighter and submit to network
  const result = await signAndSubmit(tx);

  // 5. Handle result
  console.log("Approved!", result);
}
```

### Read-Only Queries
```tsx
import { readContractValue, CONTRACT_IDS } from "@/lib/soroban";

async function getBalance() {
  const balance = await readContractValue(
    CONTRACT_IDS.treasury,
    "get_balance"
  );
  return Number(balance) / 10_000_000; // Convert stroops to XLM
}
```

### Real Wallet Connection Flow
```tsx
import { useFreighter } from "@/hooks/useFreighter";
import { useCallback } from "react";

export function TreasuryApprovalFlow({ txId }: { txId: number }) {
  const { address, isConnected, connect, isConnecting } = useFreighter();

  const handleApprove = useCallback(async () => {
    if (!address) {
      alert("Connect your wallet first");
      return;
    }

    try {
      const tx = await buildContractCall(
        CONTRACT_IDS.treasury,
        "approve",
        [address, txId],
        address
      );

      const result = await signAndSubmit(tx);
      console.log("Transaction approved:", result);
      // Update local state or refetch data
    } catch (error) {
      if (error.message.includes("User rejected")) {
        console.log("User cancelled signature");
      } else if (error.message.includes("Freighter")) {
        console.log("Freighter error:", error.message);
      } else {
        console.error("Unexpected error:", error);
      }
    }
  }, [address, txId]);

  return (
    <>
      {!isConnected ? (
        <button onClick={connect} disabled={isConnecting}>
          {isConnecting ? "Connecting..." : "Connect Wallet to Approve"}
        </button>
      ) : (
        <>
          <p>Connected: {address}</p>
          <button onClick={handleApprove}>Approve Transaction</button>
        </>
      )}
    </>
  );
}
```

### Testing Wallet Interactions Locally
1. Install [Freighter](https://www.freighter.app/) extension in your browser
2. Create a testnet account at [StellarExpert](https://stellar.expert/testnet)
3. Set `NEXT_PUBLIC_NETWORK_PASSPHRASE="Test SDF Network ; September 2015"` in `.env.local`
4. In the Freighter settings, switch to **Testnet** network
5. Create a new testnet account or import an existing one
6. Open the app at `http://localhost:3000` and test the "Connect Wallet" flow
7. Use Freighter's DevTools option to inspect transaction details before signing

---

## SorobanClient Polling Strategy

`SorobanClient` (`src/lib/sorobanClient.ts`) is the shared RPC client. All hooks import the singleton `sorobanClient` so they share one consistent poll policy.

### Poll Policy

```ts
// Default: 2 s interval × 30 attempts = ~60 s total timeout
export const DEFAULT_POLL_POLICY: PollPolicy = {
  intervalMs: 2_000,
  maxAttempts: 30,
};

// Override per feature when faster or slower confirmation is needed:
const fastClient = new SorobanClient(undefined, { intervalMs: 1_000, maxAttempts: 60 });
```

### Reading a Contract Value (Simulation Only — No Ledger Write)

```ts
import { sorobanClient } from "@/lib/sorobanClient";

const balance = await sorobanClient.readValue(
  contractId,            // "C…" strkey
  "get_balance",         // contract function name
  [],                    // XDR-encoded arguments
  userAddress,           // simulation source account
  signal,                // AbortSignal (optional, for cancellation)
  (raw) => BigInt(raw),  // decoder (optional, transforms native JS value)
);
```

### Sending a Signed Transaction and Polling for Confirmation

```ts
import { sorobanClient } from "@/lib/sorobanClient";

// signedTx must be a fully-signed Transaction object
const result = await sorobanClient.send(signedTx, {
  intervalMs: 3_000,  // optional per-call policy override
  maxAttempts: 20,
});
// result.status === "SUCCESS" on confirmation
```

### Resuming Polling from a Known Transaction Hash

```ts
// Useful after a page reload when the hash was stored externally
const result = await sorobanClient.pollForResult(txHash);
```

---

## Data Loading with Request Guards

The `createLatestRequestGuard` function (`src/lib/requestGuard.ts`) prevents stale responses from overwriting newer state when async calls overlap (e.g., rapid navigation or rapid refreshes).

### How It Works

1. Each hook holds one `LatestRequestGuard` in a `useRef`.
2. `guard.begin()` increments a monotonic ID and cancels the previous `AbortController`.
3. After the async call, `guard.isCurrent(id)` confirms the response is still wanted.
4. On unmount, `guard.dispose()` aborts any in-flight request and prevents future state updates.

```ts
import { createLatestRequestGuard, isAbortError } from "@/lib/requestGuard";
import { useRef, useCallback, useEffect } from "react";

function useContractData() {
  const guardRef = useRef(createLatestRequestGuard());

  const fetchData = useCallback(async () => {
    // Cancels the previous request and returns a new { id, signal } pair
    const { id, signal } = guardRef.current.begin();

    try {
      const data = await fetchFromChain(signal); // pass signal for mid-flight abort

      // Guard: only write to state if this is still the latest call
      if (guardRef.current.isCurrent(id)) {
        setData(data);
      }
    } catch (err) {
      if (isAbortError(err)) return; // superseded — ignore silently

      if (guardRef.current.isCurrent(id)) {
        setError(classifyError(err));
      }
    }
  }, []);

  // Abort on unmount to prevent setState on an unmounted component
  useEffect(() => {
    return () => guardRef.current.dispose();
  }, []);
}
```

### Visibility-Gated Background Polling

All data hooks poll on a 30-second interval but pause when the browser tab is hidden to avoid unnecessary RPC calls:

```ts
import { usePageVisibility } from "@/hooks/usePageVisibility";

const REFRESH_INTERVAL = 30_000;

useEffect(() => {
  refresh(); // immediate initial fetch

  const interval = setInterval(() => {
    if (isPageVisible) refresh(); // skip updates when tab is hidden
  }, REFRESH_INTERVAL);

  return () => {
    clearInterval(interval);
    guardRef.current.cancel("Component refresh cancelled.");
  };
}, [refresh, isPageVisible]);
```

---

## Error Classification

`classifyError` (`src/lib/errors.ts`) converts any thrown value into a structured `AppError`. Every hook uses it so the UI always receives a uniform, actionable error shape — no raw Error objects leak to components.

### AppError Shape

```ts
interface AppError {
  code: ErrorCode;      // machine-readable code for programmatic handling
  message: string;      // human-readable text safe for display in the UI
  recoverable: boolean; // true → user can retry; false → action cannot succeed
  detail?: string;      // raw error string for debugging only, never display
}
```

### Error Code Reference

| Category | Code | Recoverable | Triggered by |
|----------|------|-------------|--------------|
| Wallet | `WALLET_NOT_INSTALLED` | No | Freighter extension not present |
| Wallet | `WALLET_NOT_CONNECTED` | Yes | Wallet not yet connected |
| Wallet | `WALLET_SIGN_REJECTED` | Yes | User declined the signature prompt |
| Wallet | `WALLET_NETWORK_MISMATCH` | Yes | Freighter on wrong network |
| RPC | `RPC_TIMEOUT` | Yes | `getTransaction` polling exceeded limit |
| RPC | `RPC_SIMULATION_FAILED` | Yes | Preflight/simulate returned an error |
| RPC | `RPC_SUBMISSION_FAILED` | Yes | `sendTransaction` returned ERROR |
| Contract | `CONTRACT_UNAUTHORIZED` | No | Caller lacks the required on-chain role |
| Contract | `CONTRACT_EXECUTION_FAILED` | Yes | General contract panic or revert |
| Validation | `VALIDATION_INVALID_ADDRESS` | Yes | Invalid Stellar strkey format |
| Validation | `VALIDATION_INVALID_AMOUNT` | Yes | Amount out of range or non-numeric |

### Usage in Hooks

```ts
import { classifyError, isAbortError } from "@/lib/errors";

try {
  await vote(proposalId, voteFor);
} catch (err: unknown) {
  if (isAbortError(err)) return; // cancelled — no-op

  if (guardRef.current.isCurrent(request.id)) {
    setError(classifyError(err));
    // e.g. { code: "WALLET_SIGN_REJECTED", message: "Transaction was rejected…", recoverable: true }
  }
}
```

### Displaying Structured Errors in Components

```tsx
import { ERROR_CODE_LABELS, type AppError } from "@/lib/errors";

function ErrorBanner({ error, onRetry }: { error: AppError; onRetry?: () => void }) {
  return (
    <div role="alert" className="card p-4 border-red-500/30">
      <strong>{ERROR_CODE_LABELS[error.code]}</strong>
      <p className="text-sm text-gray-300 mt-1">{error.message}</p>
      {error.recoverable && onRetry && (
        <button className="btn-secondary mt-2 text-xs" onClick={onRetry}>
          Try Again
        </button>
      )}
    </div>
  );
}
```

---

## Components

### WalletConnect
Smart button handling 4 states: Not Installed, Disconnected, Connecting, Connected.

```tsx
// Used in layout.tsx — reads wallet state from FreighterProvider context
<WalletConnect />
```

### TreasuryCard
Displays a treasury transaction with approval progress and an Approve or Execute action button.

```tsx
import { TreasuryCard } from "@/components/TreasuryCard";

<TreasuryCard
  txId={1}
  to="GABCDE..."
  amount={BigInt(10_000_000)}       // stroops (1 XLM = 10_000_000 stroops)
  memo="Q1 vendor payment"
  approvals={["GABCDE...", "GXYZ..."]}
  threshold={3}
  executed={false}
  isPendingApproval={false}
  isPendingExecution={false}
  currentAddress={address}
  canSign={true}
  onApprove={(txId) => approve(txId)}
  onExecute={(txId) => execute(txId)}
/>
```

| Prop | Type | Description |
|------|------|-------------|
| `txId` | `number` | On-chain transaction ID |
| `to` | `string` | Recipient Stellar address (full strkey) |
| `amount` | `bigint` | Amount in stroops |
| `memo` | `string` | Optional transaction memo |
| `approvals` | `string[]` | Array of approver addresses already recorded on-chain |
| `threshold` | `number` | Minimum approvals required to execute |
| `executed` | `boolean` | Whether the transaction has been executed |
| `isPendingApproval` | `boolean?` | Loading state while approve transaction is in-flight |
| `isPendingExecution` | `boolean?` | Loading state while execute transaction is in-flight |
| `currentAddress` | `string \| null` | Connected wallet address |
| `canSign` | `boolean` | Whether the current user is an authorised signer |
| `onApprove` | `(txId: number) => void` | Callback invoked when Approve is clicked |
| `onExecute` | `(txId: number) => void` | Callback invoked when Execute is clicked |

### ProposalCard
Links to proposal detail page. Shows status badge, vote progress bar, and proposer.

```tsx
import { ProposalCard } from "@/components/ProposalCard";

<ProposalCard
  id={5}
  title="Fund Q2 Development"
  description="Allocate 500 XLM for Q2 engineering work"
  status="open"
  votesFor={8}
  votesAgainst={2}
  totalMembers={15}
  proposer="GABCDE..."
/>
```

### VoteButton
Handles vote casting with disabled states for: already voted, voting closed, wallet disconnected, and pending on-chain confirmation.

```tsx
import { VoteButton } from "@/components/VoteButton";

<VoteButton
  proposalId={5}
  voteFor={true}          // true → "Vote For", false → "Vote Against"
  hasVoted={false}
  votingClosed={false}
  isPending={false}
  onVoteSuccess={() => refetch()}
/>
```

| Prop | Type | Description |
|------|------|-------------|
| `proposalId` | `number` | Governance proposal ID |
| `voteFor` | `boolean` | `true` renders "Vote For", `false` renders "Vote Against" |
| `hasVoted` | `boolean` | Whether the connected wallet has already voted |
| `votingClosed` | `boolean` | Whether the voting period has ended |
| `isPending` | `boolean?` | Optional external pending override |
| `onVoteSuccess` | `() => void \| Promise<void>` | Callback after a successful vote submission |

---

## Hook Usage

### useTreasury

Loads balance, config, and transactions. Provides deposit, propose, approve, and execute actions with optimistic updates.

```tsx
import { useTreasury } from "@/hooks/useTreasury";

function TreasuryPage() {
  const {
    balance,           // bigint — treasury balance in stroops
    config,            // TreasuryConfig | null — { signers, threshold, txCount, balance }
    transactions,      // TreasuryTransaction[] — most recent 20 transactions
    isLoading,         // boolean
    error,             // AppError | null
    isNetworkMismatch, // boolean — Freighter vs app network mismatch
    pendingActions,    // ReadonlyMap<number, "approve" | "execute"> — in-flight tx IDs
    approve,           // (txId: number) => Promise<void>
    execute,           // (txId: number) => Promise<void>
    deposit,           // (amount: bigint | number) => Promise<void>
    proposeWithdrawal, // (to: string, amount: bigint | number, memo: string) => Promise<void>
    refresh,           // () => Promise<void>
    clearError,        // () => void
  } = useTreasury();

  return (
    <>
      <p>Balance: {Number(balance) / 10_000_000} XLM</p>
      {transactions.map((tx) => (
        <TreasuryCard
          key={tx.id}
          {...tx}
          currentAddress={address ?? null}
          canSign={config?.signers.includes(address ?? "") ?? false}
          isPendingApproval={pendingActions.get(tx.id) === "approve"}
          isPendingExecution={pendingActions.get(tx.id) === "execute"}
          onApprove={approve}
          onExecute={execute}
        />
      ))}
    </>
  );
}
```

### useGovernance

Loads governance config and provides proposal CRUD, voting, finalisation, and execution. Tracks optimistic pending votes before chain confirmation.

```tsx
import { useGovernance } from "@/hooks/useGovernance";

function ProposalDetailPage({ proposalId }: { proposalId: number }) {
  const {
    config,           // GovernanceConfig | null — { members, quorum, votingPeriod, proposals }
    isLoading,        // boolean
    error,            // AppError | null
    pendingVotes,     // ReadonlyMap<number, boolean> — optimistic vote tracking
    getProposal,      // (id: number) => Promise<GovernanceProposal>
    createProposal,   // (title, description, action, amount, target) => Promise<void>
    vote,             // (proposalId: number, voteFor: boolean) => Promise<void>
    finalize,         // (proposalId: number) => Promise<void>
    executeProposal,  // (proposalId: number) => Promise<void>
    hasVoted,         // (proposalId: number) => Promise<boolean>
    refresh,          // () => Promise<void>
  } = useGovernance();

  return (
    <div className="flex gap-2">
      <VoteButton
        proposalId={proposalId}
        voteFor={true}
        hasVoted={pendingVotes.has(proposalId)}
        votingClosed={false}
        onVoteSuccess={refresh}
      />
      <VoteButton
        proposalId={proposalId}
        voteFor={false}
        hasVoted={pendingVotes.has(proposalId)}
        votingClosed={false}
        onVoteSuccess={refresh}
      />
    </div>
  );
}
```

---

## Troubleshooting Freighter Issues

### Freighter Extension Not Appearing
**Symptom:** "Install Freighter" button stays visible even after installing the extension.

**Solutions:**
1. Refresh the page after installing Freighter
2. Check that the extension is enabled in your browser (Chrome: Settings → Extensions → Freighter toggle)
3. If using an incognito/private window, Freighter may be disabled; add the extension to incognito mode
4. Try a hard refresh (`Ctrl+Shift+R` on Windows/Linux, `Cmd+Shift+R` on Mac)

### Permission Denied When Signing Transactions
**Symptom:** User clicks "Approve" but gets "User rejected" or "Permission denied" error.

**Solutions:**
1. Ensure Freighter is unlocked (click the extension icon and enter your password)
2. Verify the network in Freighter matches the app (should both be on Testnet for dev)
3. Check that the connected account is the one you intended to sign with
4. Some contract calls require specific signer permissions; verify in the smart contract code

### "Freighter is not defined" or "window.stellar undefined"
**Symptom:** App crashes with reference error to Freighter.

**Solutions:**
1. Check browser console for errors — Freighter may not have initialized
2. Ensure Freighter is installed and the tab has access to it
3. Wait for the app to load completely before testing interactions
4. Try disabling other Stellar/crypto extensions that may conflict

### Network Mismatch Between App and Freighter
**Symptom:** Transactions fail with "Network mismatch" or "Invalid account sequence".

**Solutions:**
1. Verify `NEXT_PUBLIC_NETWORK_PASSPHRASE` in `.env.local` matches the Freighter network:
   - **Testnet:** `"Test SDF Network ; September 2015"`
   - **Public:** `"Public Global Stellar Network ; September 2015"`
2. In Freighter settings, switch to the same network as your `.env` configuration
3. Restart the dev server after changing `.env` files

### Freighter UI Not Responsive or Hanging
**Symptom:** Freighter popup freezes or takes >10 seconds to respond to signature requests.

**Solutions:**
1. Clear Freighter's local cache: Open Freighter → Settings → Clear Cache
2. Restart your browser
3. Reinstall the Freighter extension
4. Check system resources; low memory can cause UI lag

---

## Adding Features

### Adding a New Page
1. Create a new directory under `src/app/`
2. Add `page.tsx` with a default export
3. Add navigation link in `layout.tsx`

### Adding a New Component
1. Create file in `src/components/`
2. Define props interface
3. Export named component
4. Add TODO comments referencing issue numbers

### Adding a New Hook
1. Create file in `src/hooks/`
2. Import helpers from `src/lib/soroban.ts`
3. Return typed functions and state
4. Handle loading and error states
