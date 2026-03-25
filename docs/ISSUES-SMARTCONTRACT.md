# Smart Contract Issues — StellarGuard 🧠

This document tracks all smart contract development tasks for the StellarGuard multi-sig treasury and DAO governance platform.

### 🛑 STRICT RULE FOR CONTRIBUTORS
**When you complete an issue:**
1. Mark the checkbox `[x]`
2. Append your GitHub username and the Date/Time.
3. **Example:** `- [x] Define Error enum (@yourname - 2026-02-20 15:00 UTC)`

---

## 🏛️ Module 1: Core Infrastructure (SC-1 to SC-5)

### Issue #SC-1: Workspace Initialization & Error Constants
**Priority:** Critical
**Labels:** `smart-contract`, `good-first-issue`
**Description:** Initialize the Soroban workspace and define core error codes shared across contracts.
- **Tasks:**
  - [ ] Verify `Cargo.toml` workspace structure with all 4 contract crates.
  - [ ] Define `Error` enum in treasury contract with all error variants:
    - `NotInitialized` (1), `AlreadyInitialized` (2), `Unauthorized` (3)
    - `InvalidAmount` (4), `InsufficientFunds` (5), `InvalidThreshold` (6)
  - [ ] Setup `Cargo.toml` with `soroban-sdk` v21.7.6 for each crate.
  - [ ] Ensure all crates compile with `cargo build --all`.

### Issue #SC-2: Storage Key Definitions (DataKey Enums)
**Priority:** Critical
**Labels:** `smart-contract`, `config`
**Description:** Define the `DataKey` enums for all four contracts to manage on-chain state.
- **Tasks:**
  - [ ] Define `DataKey` enum for `treasury` contract: `Admin`, `Threshold`, `Signers`, `Balance`, `Transaction(u64)`, `TxCounter`, `Initialized`.
  - [ ] Define `DataKey` enum for `governance` contract: `Admin`, `Initialized`, `Members`, `QuorumPercent`, `VotingPeriod`, `ProposalCounter`, `Proposal(u64)`, `Vote(u64, Address)`.
  - [ ] Define `DataKey` enum for `token-vault` contract: `Admin`, `Initialized`, `EmergencySigners`, `EmergencyThreshold`, `LockCounter`, `Lock(u64)`, `VestingCounter`, `Vesting(u64)`, `TotalLocked`.
  - [ ] Define `DataKey` enum for `access-control` contract: `Initialized`, `Owner`, `Role(Address)`, `AllMembers`, `RoleCount(u32)`.

### Issue #SC-3: Treasury Contract Initialization
**Priority:** High
**Labels:** `smart-contract`, `core`
**Description:** Implement the `initialize` function for the treasury contract.
- **Tasks:**
  - [ ] Implement `initialize(env, admin, threshold, signers)`.
  - [ ] Validate threshold: must be > 0 and <= signer count.
  - [ ] Prevent re-initialization with `AlreadyInitialized` check.
  - [ ] Store admin, threshold, signers, balance (0), and tx counter (0) in `Instance` storage.
  - [ ] Emit `(treasury, init)` event with admin, threshold, and signer count.

### Issue #SC-4: Access Control Role Definitions
**Priority:** Critical
**Labels:** `smart-contract`, `types`
**Description:** Define the hierarchical role system for access control.
- **Tasks:**
  - [ ] Define `Role` enum: `Viewer (1)`, `Member (2)`, `Admin (3)`, `Owner (4)`.
  - [ ] Define `RoleAssignment` struct: `address`, `role`, `assigned_at`, `assigned_by`.
  - [ ] Define `AccessSummary` struct for query responses.
  - [ ] Implement `initialize(env, owner)` — sets owner role and initializes state.

### Issue #SC-5: Governance Contract Initialization
**Priority:** High
**Labels:** `smart-contract`, `core`
**Description:** Implement the `initialize` function for the governance contract.
- **Tasks:**
  - [ ] Implement `initialize(env, admin, members, quorum_percent, voting_period)`.
  - [ ] Store all governance parameters in `Instance` storage.
  - [ ] Validate quorum_percent is between 1 and 100.
  - [ ] Emit `(gov, init)` event.

---

## 💰 Module 2: Treasury Logic (SC-6 to SC-12)

### Issue #SC-6: Deposit Function (Native XLM)
**Priority:** High
**Labels:** `smart-contract`, `logic`
**Description:** Implement the deposit function for the treasury.
- **Tasks:**
  - [ ] Implement `deposit(env, from, amount)`.
  - [ ] Require `from.require_auth()`.
  - [ ] Validate amount > 0.
  - [ ] Update balance in `Instance` storage.
  - [ ] Emit `(treasury, deposit)` event with from, amount, new_balance.

### Issue #SC-7: Deposit Function (Soroban Tokens)
**Priority:** Medium
**Labels:** `smart-contract`, `logic`, `enhancement`
**Description:** Extend deposits to support Soroban token contracts (SAC/custom tokens).
- **Tasks:**
  - [ ] Add `token_address` parameter to deposit function or create separate function.
  - [ ] Use `soroban-sdk` token client to invoke `transfer` from depositor to contract.
  - [ ] Track balances per token address.
  - [ ] Emit event with token address included.

### Issue #SC-8: Withdrawal Proposal Creation
**Priority:** High
**Labels:** `smart-contract`, `logic`
**Description:** Implement the `propose_withdrawal` function.
- **Tasks:**
  - [x] Implement `propose_withdrawal(env, proposer, to, amount, memo)`. (@sshdopey - 2026-03-25 16:16 UTC)
  - [x] Verify proposer is an authorized signer via `require_signer` helper. (@sshdopey - 2026-03-25 16:16 UTC)
  - [x] Check sufficient balance exists. (@sshdopey - 2026-03-25 16:16 UTC)
  - [x] Auto-include proposer as first approval. (@sshdopey - 2026-03-25 16:16 UTC)
  - [x] Store `Transaction` struct in `Persistent` storage. (@sshdopey - 2026-03-25 16:16 UTC)
  - [x] Emit `(treasury, propose)` event. (@sshdopey - 2026-03-25 16:16 UTC)

### Issue #SC-9: Multi-Sig Approval Logic
**Priority:** Critical
**Labels:** `smart-contract`, `logic`
**Description:** Implement the `approve` function for multi-sig transaction approval.
- **Tasks:**
  - [ ] Implement `approve(env, signer, tx_id)`.
  - [ ] Verify signer is authorized.
  - [ ] Check transaction exists and is not already executed.
  - [ ] Prevent duplicate approvals from same signer.
  - [ ] Add signer to approvals list.
  - [ ] Return current approval count.
  - [ ] Emit `(treasury, approve)` event.

### Issue #SC-10: Withdrawal Execution
**Priority:** Critical
**Labels:** `smart-contract`, `logic`
**Description:** Implement the `execute` function to process approved withdrawals.
- **Tasks:**
  - [ ] Implement `execute(env, executor, tx_id)`.
  - [ ] Check approval count meets threshold.
  - [ ] Deduct balance from treasury.
  - [ ] Mark transaction as executed.
  - [ ] Emit `(treasury, execute)` event with recipient and amount.

### Issue #SC-11: Treasury Balance & Config Queries
**Priority:** Medium
**Labels:** `smart-contract`, `query`
**Description:** Implement read-only query functions for the treasury.
- **Tasks:**
  - [ ] Implement `get_balance(env) -> i128`.
  - [ ] Implement `get_config(env) -> TreasuryConfig`.
  - [ ] Implement `get_transaction(env, tx_id) -> Transaction`.
  - [ ] Implement `get_signers(env) -> Vec<Address>`.

### Issue #SC-12: Treasury Event Emissions
**Priority:** Medium
**Labels:** `smart-contract`, `events`, `integration`
**Description:** Ensure all treasury actions emit properly structured events for indexing.
- **Tasks:**
  - [ ] Verify `(treasury, init)` event structure.
  - [ ] Verify `(treasury, deposit)` event includes from, amount, new_balance.
  - [ ] Verify `(treasury, propose)` event includes tx_id, proposer, to, amount.
  - [ ] Verify `(treasury, approve)` event includes tx_id, signer, approval_count.
  - [ ] Verify `(treasury, execute)` event includes tx_id, to, amount, new_balance.
  - [ ] Document event schemas in `docs/SMARTCONTRACT_GUIDE.md`.

---

## 🗳️ Module 3: Governance Logic (SC-13 to SC-18)

### Issue #SC-13: Proposal Struct & Action Types
**Priority:** Critical
**Labels:** `smart-contract`, `types`
**Description:** Define proposal data structures and action types.
- **Tasks:**
  - [ ] Define `ProposalAction` enum: `Funding`, `PolicyChange`, `AddMember`, `RemoveMember`, `General`.
  - [ ] Define `ProposalStatus` enum: `Active`, `Passed`, `Rejected`, `Executed`, `Expired`.
  - [ ] Define `Proposal` struct with all fields.
  - [ ] Define `GovConfig` struct for query responses.

### Issue #SC-14: Create Proposal Function
**Priority:** High
**Labels:** `smart-contract`, `logic`
**Description:** Implement proposal creation for DAO governance.
- **Tasks:**
  - [ ] Implement `create_proposal(env, proposer, title, description, action, amount, target)`.
  - [ ] Require proposer is a DAO member.
  - [ ] Calculate `ends_at = current_ledger + voting_period`.
  - [ ] Store proposal in `Persistent` storage.
  - [ ] Emit `(gov, propose)` event.

### Issue #SC-15: Cast Vote Function
**Priority:** High
**Labels:** `smart-contract`, `logic`
**Description:** Implement the voting mechanism for proposals.
- **Tasks:**
  - [ ] Implement `vote(env, voter, proposal_id, vote_for)`.
  - [ ] Require voter is a DAO member.
  - [ ] Prevent double voting using `Vote(proposal_id, voter)` storage key.
  - [ ] Check proposal is `Active` and voting period hasn't ended.
  - [ ] Increment `votes_for` or `votes_against`.
  - [ ] Emit `(gov, vote)` event.

### Issue #SC-16: Quorum Calculation & Finalization
**Priority:** High
**Labels:** `smart-contract`, `logic`
**Description:** Implement proposal finalization with quorum logic.
- **Tasks:**
  - [ ] Implement `finalize(env, caller, proposal_id)`.
  - [ ] Ensure voting period has ended (`current_ledger > ends_at`).
  - [ ] Calculate quorum: `(member_count * quorum_percent) / 100`.
  - [ ] Set status to `Expired` if quorum not met.
  - [ ] Set status to `Passed` if `votes_for > votes_against`.
  - [ ] Set status to `Rejected` otherwise.

### Issue #SC-17: Execute Proposal Function
**Priority:** Medium
**Labels:** `smart-contract`, `logic`
**Description:** Implement proposal execution for passed proposals.
- **Tasks:**
  - [ ] Implement `execute_proposal(env, executor, proposal_id)`.
  - [ ] Only admin or proposer can execute.
  - [ ] Handle `AddMember` action: add target to members list.
  - [ ] Handle `RemoveMember` action: remove target from members list.
  - [ ] Mark proposal as `Executed`.
  - [ ] Emit `(gov, exec)` event.

### Issue #SC-18: Governance Query Functions
**Priority:** Medium
**Labels:** `smart-contract`, `query`
**Description:** Implement read-only query functions for governance.
- **Tasks:**
  - [ ] Implement `get_proposal(env, proposal_id)`.
  - [ ] Implement `get_config(env) -> GovConfig`.
  - [ ] Implement `get_members(env) -> Vec<Address>`.
  - [ ] Implement `has_voted(env, proposal_id, voter) -> bool`.

---

## 🔒 Module 4: Token Vault (SC-19 to SC-21)

### Issue #SC-19: Token Lock Function
**Priority:** High
**Labels:** `smart-contract`, `logic`
**Description:** Implement time-based token locking.
- **Tasks:**
  - [ ] Implement `lock_tokens(env, owner, amount, duration, memo)`.
  - [ ] Create `TokenLock` struct with id, owner, amount, locked_at, unlock_at, claimed, memo.
  - [ ] Generate sequential lock IDs.
  - [ ] Update `TotalLocked` counter.
  - [ ] Emit `(vault, lock)` event.

### Issue #SC-20: Vesting Schedule Logic
**Priority:** High
**Labels:** `smart-contract`, `logic`
**Description:** Implement vesting schedules with cliff periods.
- **Tasks:**
  - [x] Implement `create_vesting(env, admin, beneficiary, total_amount, duration, cliff, memo)`. (@Chucks1093 - 2026-03-25 23:06 UTC)
  - [x] Implement `claim_vested(env, beneficiary, vesting_id)`. (@Chucks1093 - 2026-03-25 23:06 UTC)
  - [x] Calculate vested amount: `(total_amount * elapsed) / duration`. (@Chucks1093 - 2026-03-25 23:06 UTC)
  - [x] Enforce cliff period: no claims before `start_time + cliff`. (@Chucks1093 - 2026-03-25 23:06 UTC)
  - [x] Track `claimed_amount` to prevent over-claiming. (@Chucks1093 - 2026-03-25 23:06 UTC)
  - [x] Emit `(vault, vest)` and `(vault, v_claim)` events. (@Chucks1093 - 2026-03-25 23:06 UTC)

### Issue #SC-21: Emergency Unlock (Multi-Sig)
**Priority:** Medium
**Labels:** `smart-contract`, `logic`
**Description:** Implement multi-sig emergency unlock for locked tokens.
- **Tasks:**
  - [x] Implement `approve_emergency(env, signer, lock_id)`. (@sshdopey - 2026-03-25 16:45 UTC)
  - [x] Verify signer is an emergency signer. (@sshdopey - 2026-03-25 16:45 UTC)
  - [x] Track per-lock emergency approvals. (@sshdopey - 2026-03-25 16:45 UTC)
  - [x] Implement `emergency_unlock(env, caller, lock_id)`. (@sshdopey - 2026-03-25 16:45 UTC)
  - [x] Check approval count meets `EmergencyThreshold`. (@sshdopey - 2026-03-25 16:45 UTC)
  - [x] Release locked tokens. (@sshdopey - 2026-03-25 16:45 UTC)
  - [x] Emit `(vault, emrg_ap)` and `(vault, emrg_ex)` events. (@sshdopey - 2026-03-25 16:45 UTC)

---

## 🧪 Module 5: Testing (SC-22 to SC-25)

### Issue #SC-22: Treasury Unit Tests
**Priority:** High
**Labels:** `smart-contract`, `testing`
**Description:** Comprehensive unit tests for the treasury contract.
- **Tasks:**
  - [ ] Test `initialize` with valid and invalid thresholds.
  - [ ] Test `deposit` with valid and invalid amounts.
  - [ ] Test `propose_withdrawal` by authorized signer and non-signer.
  - [ ] Test `approve` — single and multi-approval flows.
  - [ ] Test `execute` — threshold met and not met scenarios.
  - [ ] Test `add_signer` and `remove_signer`.
  - [ ] Test `set_threshold` validation.
  - [ ] Test `transfer_admin`.

### Issue #SC-23: Governance Unit Tests
**Priority:** High
**Labels:** `smart-contract`, `testing`
**Description:** Comprehensive unit tests for the governance contract.
- **Tasks:**
  - [ ] Test `initialize` with member list and quorum.
  - [ ] Test `create_proposal` for all action types.
  - [ ] Test `vote` — for, against, and double-vote prevention.
  - [ ] Test `finalize` — quorum met, quorum not met, voting still active.
  - [ ] Test `execute_proposal` — AddMember and RemoveMember actions.
  - [ ] Test `transfer_admin` and `set_quorum`.

### Issue #SC-24: Access Control Unit Tests
**Priority:** Medium
**Labels:** `smart-contract`, `testing`
**Description:** Comprehensive unit tests for the access control contract.
- **Tasks:**
  - [ ] Test `initialize` — owner gets Owner role.
  - [ ] Test `assign_role` — privilege escalation prevention.
  - [ ] Test `revoke_role` — cannot remove owner.
  - [ ] Test `has_permission`, `is_owner`, `is_admin_or_above`, `is_member_or_above`.
  - [ ] Test `transfer_ownership` — old owner demoted to admin.

### Issue #SC-25: Integration Test Suite
**Priority:** High
**Labels:** `smart-contract`, `testing`, `integration`
**Description:** End-to-end tests simulating real multi-contract workflows.
- **Tasks:**
  - [ ] Test full treasury workflow: init → deposit → propose → approve → execute.
  - [ ] Test full governance workflow: init → propose → vote → finalize → execute.
  - [ ] Test token vault workflow: lock → wait → claim.
  - [ ] Test vesting workflow: create → cliff → partial claim → full claim.
  - [ ] Test emergency unlock workflow: approve × threshold → unlock.
  - [ ] Verify all events are emitted correctly throughout workflows.

---

## ✅ Completed Issues
*(Move completed items here)*
