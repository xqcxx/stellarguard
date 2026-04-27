#!/usr/bin/env bash
# Deploy StellarGuard Soroban contracts to Stellar testnet or mainnet.
#
# Usage:
#   ./scripts/deploy.sh [--network testnet|mainnet] [--source <identity-or-secret>]
#
# Environment variables (alternative to flags):
#   DEPLOY_NETWORK  — testnet (default) or mainnet
#   DEPLOY_SOURCE   — Stellar CLI identity name or secret key
#
# Prerequisites:
#   - stellar CLI  (cargo install --locked stellar-cli)
#   - cargo + wasm32-unknown-unknown target

set -euo pipefail

NETWORK="${DEPLOY_NETWORK:-testnet}"
SOURCE="${DEPLOY_SOURCE:-}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
CONTRACTS_DIR="$ROOT_DIR/smartcontract"
OUTPUT_FILE="$SCRIPT_DIR/deployed-contracts.json"

# ── Color helpers ─────────────────────────────────────────────────────────────
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log()   { echo -e "${GREEN}[deploy]${NC} $*"; }
warn()  { echo -e "${YELLOW}[warn]${NC}   $*"; }
error() { echo -e "${RED}[error]${NC}  $*" >&2; exit 1; }

# ── Argument parsing ──────────────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case $1 in
    --network) NETWORK="$2"; shift 2 ;;
    --source)  SOURCE="$2";  shift 2 ;;
    -h|--help)
      echo "Usage: $0 [--network testnet|mainnet] [--source <identity>]"
      exit 0
      ;;
    *) error "Unknown argument: $1" ;;
  esac
done

# ── Validation ────────────────────────────────────────────────────────────────
[[ "$NETWORK" == "testnet" || "$NETWORK" == "mainnet" ]] \
  || error "Network must be 'testnet' or 'mainnet', got: $NETWORK"

command -v stellar &>/dev/null \
  || error "stellar CLI not found. Install: cargo install --locked stellar-cli"

command -v cargo &>/dev/null \
  || error "cargo not found. Install Rust: https://rustup.rs"

if [[ -z "$SOURCE" ]]; then
  warn "DEPLOY_SOURCE not set — using 'default' Stellar CLI identity."
  warn "Pass --source <name-or-secret> or set DEPLOY_SOURCE to override."
  SOURCE="default"
fi

if [[ "$NETWORK" == "mainnet" ]]; then
  warn "Deploying to MAINNET. Real XLM will be spent. Press Ctrl-C within 5s to abort."
  sleep 5
fi

log "Network : $NETWORK"
log "Source  : $SOURCE"
log ""

# ── Step 1: Build optimised WASM ──────────────────────────────────────────────
log "Building contracts (release profile)..."
(cd "$CONTRACTS_DIR" && stellar contract build)
log "Build complete."
log ""

# Contract name → WASM filename (derived from Cargo package names with hyphens → underscores)
declare -A WASM_PATHS=(
  [treasury]="$CONTRACTS_DIR/target/wasm32-unknown-unknown/release/stellar_guard_treasury.wasm"
  [governance]="$CONTRACTS_DIR/target/wasm32-unknown-unknown/release/stellar_guard_governance.wasm"
  [token_vault]="$CONTRACTS_DIR/target/wasm32-unknown-unknown/release/stellar_guard_token_vault.wasm"
  [access_control]="$CONTRACTS_DIR/target/wasm32-unknown-unknown/release/stellar_guard_access_control.wasm"
)

# ── Step 2: Deploy each contract ──────────────────────────────────────────────
declare -A DEPLOYED_IDS=()

for name in treasury governance token_vault access_control; do
  wasm="${WASM_PATHS[$name]}"

  if [[ ! -f "$wasm" ]]; then
    warn "WASM not found for '$name' at $wasm — skipping."
    DEPLOYED_IDS[$name]=""
    continue
  fi

  log "Deploying $name..."
  contract_id=$(
    stellar contract deploy \
      --wasm "$wasm" \
      --source "$SOURCE" \
      --network "$NETWORK" \
      2>&1 | tail -1
  )

  log "  $name → $contract_id"
  DEPLOYED_IDS[$name]="$contract_id"
done

# ── Step 3: Write deployed-contracts.json ─────────────────────────────────────
log ""
log "Writing $OUTPUT_FILE..."

cat > "$OUTPUT_FILE" <<JSON
{
  "network": "$NETWORK",
  "deployedAt": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "contracts": {
    "treasury":       "${DEPLOYED_IDS[treasury]:-}",
    "governance":     "${DEPLOYED_IDS[governance]:-}",
    "token_vault":    "${DEPLOYED_IDS[token_vault]:-}",
    "access_control": "${DEPLOYED_IDS[access_control]:-}"
  }
}
JSON

# ── Summary ───────────────────────────────────────────────────────────────────
log ""
log "Deployment complete. Contract IDs:"
printf "  %-20s %s\n" "treasury"       "${DEPLOYED_IDS[treasury]:-"(skipped)"}"
printf "  %-20s %s\n" "governance"     "${DEPLOYED_IDS[governance]:-"(skipped)"}"
printf "  %-20s %s\n" "token_vault"    "${DEPLOYED_IDS[token_vault]:-"(skipped)"}"
printf "  %-20s %s\n" "access_control" "${DEPLOYED_IDS[access_control]:-"(skipped)"}"
log ""
log "Contract IDs saved to $OUTPUT_FILE"
log "Copy them into your frontend .env.local as NEXT_PUBLIC_*_CONTRACT_ID."
