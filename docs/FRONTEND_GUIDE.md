# StellarGuard — Frontend Developer Guide

> A guide to understanding, developing, and extending the StellarGuard Next.js dashboard.

## Table of Contents
1. [Architecture](#architecture)
2. [Project Structure](#project-structure)
3. [Setup](#setup)
4. [Key Concepts](#key-concepts)
5. [Wallet Integration](#wallet-integration)
6. [Contract Interaction Pattern](#contract-interaction-pattern)
7. [Components](#components)
8. [Adding Features](#adding-features)

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

### Environment Variables
Create a `.env.local` file:
```env
NEXT_PUBLIC_SOROBAN_RPC_URL=https://soroban-testnet.stellar.org
NEXT_PUBLIC_NETWORK_PASSPHRASE="Test SDF Network ; September 2015"
NEXT_PUBLIC_TREASURY_CONTRACT_ID=<deployed-contract-id>
NEXT_PUBLIC_GOVERNANCE_CONTRACT_ID=<deployed-contract-id>
NEXT_PUBLIC_VAULT_CONTRACT_ID=<deployed-contract-id>
NEXT_PUBLIC_ACL_CONTRACT_ID=<deployed-contract-id>
```

These contract ID variables are required at runtime. The app now throws a clear startup/runtime error when any `NEXT_PUBLIC_*_CONTRACT_ID` value is missing so misconfigured deployments fail fast instead of silently using placeholders.

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

---

## Components

### WalletConnect
Smart button handling 4 states: Not Installed, Disconnected, Connecting, Connected.

### TreasuryCard
Displays a treasury transaction with approval progress and action button. Props: `txId`, `to`, `amount`, `memo`, `approvals`, `threshold`, `executed`.

### ProposalCard
Links to proposal detail page. Shows status badge, vote progress bar, and proposer. Props: `id`, `title`, `description`, `status`, `votesFor`, `votesAgainst`, `totalMembers`, `proposer`.

### VoteButton
Handles vote casting with disabled states. Props: `proposalId`, `voteFor`, `hasVoted`, `votingClosed`, `onVote`.

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
