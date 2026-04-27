# Contributing to StellarGuard

Thank you for your interest in building trustless treasury management on Stellar! This guide will help you contribute effectively.

## 🛠 Tech Stack

- **Smart Contracts:** Soroban (Rust, `soroban-sdk`)
- **Frontend:** Next.js, TypeScript, Tailwind CSS, Freighter Wallet
- **Backend:** FastAPI or NestJS
- **Indexing:** Custom Soroban-RPC event listener

## 📝 Commit Guidelines (Strict)

We follow a strict **Modular Commit** philosophy to ensure history is readable and revertible.

**The Golden Rule:**
> "Commit after every meaningful change, not every line."

- **Meaningful Change:** Completing a function, finishing a fix, adding a feature block, creating a file, or making a significant modification.
- **Avoid:** Micro-commits for single-line edits unless they are standalone fixes.
- **Frequency:** Commit often, but only when you finish a logical piece of work.

### Commit Message Format

```
<type>(<scope>): <description>
```

### Example Commit Messages

- `feat(treasury): implement multi-sig deposit logic`
- `feat(governance): add proposal voting function`
- `fix(ui): resolve wallet connect state bug`
- `test(treasury): add withdrawal approval tests`
- `docs: update testnet deployment guide`

### Allowed Types

| Type | Description |
|------|-------------|
| `feat` | A new feature |
| `fix` | A bug fix |
| `test` | Adding or updating tests |
| `docs` | Documentation changes |
| `refactor` | Code refactoring (no feature/fix) |
| `style` | Formatting, semicolons, etc. |
| `chore` | Build process, dependencies |

## 📋 Issue Tracking

1. Pick an issue from the relevant `docs/ISSUES-*.md` file.
2. When you start, comment on the GitHub issue or mark it as "In Progress".
3. **When Completed:** You MUST update the corresponding `ISSUES-*.md` with:
   - Check the box `[x]`
   - Append your GitHub username and Date/Time.
   - *Example:* `- [x] Implement deposit function (@yourname - 2026-02-20 14:00 UTC)`

## 🔀 Branch Naming Convention

Branches must follow the pattern `<type>/<issue-id>-<short-description>`:

| Type | When to use | Example |
|------|-------------|---------|
| `feat` | New feature | `feat/BE-1-api-scaffold` |
| `fix` | Bug fix | `fix/FE-12-wallet-disconnect` |
| `docs` | Documentation | `docs/DOC-4-readme-setup` |
| `chore` | Build / config | `chore/DO-5-pr-template` |
| `refactor` | Refactoring | `refactor/BE-6-db-schema` |

The `<issue-id>` must match the issue number in the relevant `docs/ISSUES-*.md` file (e.g. `BE-1`, `FE-5`, `DO-2`).

## 🧪 Development Workflow

Follow these steps from picking an issue to merging:

1. **Pick an issue**: Choose an open issue from `docs/ISSUES-*.md`. Confirm nobody else is actively working on it.

2. **Fork & Clone**: Fork this repo, then clone your fork locally.
   ```bash
   git clone https://github.com/<your-username>/StellarGuard.git
   cd StellarGuard
   ```

3. **Branch**: Create a branch from `main` using the naming convention above.
   ```bash
   git checkout -b feat/BE-1-api-scaffold
   ```

4. **Develop**: Write code following the [Style Guide](STYLE.md).

5. **Test**:
   - Contracts: `cd smartcontract && cargo test`
   - Frontend: `cd frontend && npm run test`

6. **Build Check**:
   - Contracts: `cargo build --all`
   - Frontend: `npm run build`

7. **Commit**: Follow the commit guidelines above.

8. **Update ISSUES-*.md**: Mark your issue complete (see [Issue Tracking](#-issue-tracking) below).

9. **Pull Request**: Open a PR against `main` using the [PR template](.github/PULL_REQUEST_TEMPLATE.md). Link it to the issue with `Closes #<issue-number>` in the PR description so it closes automatically on merge.

## 🏷️ Labels

| Label | Meaning |
|-------|---------|
| `critical` | Must be done first, blocks other work |
| `high` | Important, should be prioritized |
| `medium` | Standard priority |
| `low` | Nice to have, can wait |
| `good first issue` | Great for newcomers |
| `smart-contract` | Soroban/Rust work |
| `frontend` | Next.js/UI work |
| `backend` | API/indexer work |
| `devops` | CI/CD and infrastructure |

## Getting Help

- Read the **Integration Guides** in `docs/`
- Open a Discussion for questions
- Tag maintainers for urgent issues
