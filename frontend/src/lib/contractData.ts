export type Decoder<T> = (value: unknown) => T;

export type GovernanceProposalAction =
  | "Funding"
  | "PolicyChange"
  | "AddMember"
  | "RemoveMember"
  | "General";

export type GovernanceProposalStatus =
  | "Active"
  | "Passed"
  | "Rejected"
  | "Executed"
  | "Expired";

export interface TreasuryConfig {
  admin: string;
  threshold: number;
  signerCount: number;
  balance: bigint;
  txCount: number;
}

export interface TreasuryTransaction {
  id: number;
  to: string;
  amount: bigint;
  memo: string;
  approvals: string[];
  executed: boolean;
  createdAt: number;
  proposer: string;
}

export interface GovernanceConfig {
  admin: string;
  memberCount: number;
  quorumPercent: number;
  votingPeriod: number;
  proposalCount: number;
}

export interface GovernanceProposal {
  id: number;
  title: string;
  description: string;
  action: GovernanceProposalAction;
  proposer: string;
  votesFor: number;
  votesAgainst: number;
  totalVotes: number;
  status: GovernanceProposalStatus;
  createdAt: number;
  endsAt: number;
  amount: bigint;
  target: string;
}

const GOVERNANCE_ACTIONS = new Set<GovernanceProposalAction>([
  "Funding",
  "PolicyChange",
  "AddMember",
  "RemoveMember",
  "General",
]);

const GOVERNANCE_STATUSES = new Set<GovernanceProposalStatus>([
  "Active",
  "Passed",
  "Rejected",
  "Executed",
  "Expired",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asRecord(value: unknown, label: string): Record<string, unknown> {
  if (!isRecord(value)) {
    throw new Error(`Invalid ${label}: expected object response.`);
  }

  return value;
}

function readField(record: Record<string, unknown>, key: string): unknown {
  if (!(key in record)) {
    throw new Error(`Invalid contract response: missing "${key}".`);
  }

  return record[key];
}

function toSafeNumber(value: unknown, label: string): number {
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value)) {
      throw new Error(`Invalid ${label}: expected safe integer.`);
    }

    return value;
  }

  if (typeof value === "bigint") {
    const numberValue = Number(value);
    if (!Number.isSafeInteger(numberValue)) {
      throw new Error(`Invalid ${label}: bigint exceeds safe integer range.`);
    }

    return numberValue;
  }

  if (typeof value === "string" && /^-?\d+$/.test(value.trim())) {
    const numberValue = Number(value);
    if (!Number.isSafeInteger(numberValue)) {
      throw new Error(`Invalid ${label}: string exceeds safe integer range.`);
    }

    return numberValue;
  }

  throw new Error(`Invalid ${label}: expected integer value.`);
}

function toBigIntValue(value: unknown, label: string): bigint {
  if (typeof value === "bigint") {
    return value;
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value) || !Number.isInteger(value)) {
      throw new Error(`Invalid ${label}: expected integer value.`);
    }

    return BigInt(value);
  }

  if (typeof value === "string" && /^-?\d+$/.test(value.trim())) {
    return BigInt(value.trim());
  }

  throw new Error(`Invalid ${label}: expected bigint-compatible value.`);
}

function toStringValue(value: unknown, label: string): string {
  if (typeof value === "string") {
    return value;
  }

  if (
    typeof value === "object" &&
    value !== null &&
    "toString" in value &&
    typeof value.toString === "function"
  ) {
    const normalized = value.toString();
    if (normalized && normalized !== "[object Object]") {
      return normalized;
    }
  }

  throw new Error(`Invalid ${label}: expected string.`);
}

function toBooleanValue(value: unknown, label: string): boolean {
  if (typeof value !== "boolean") {
    throw new Error(`Invalid ${label}: expected boolean.`);
  }

  return value;
}

function toStringArray(value: unknown, label: string): string[] {
  if (!Array.isArray(value)) {
    throw new Error(`Invalid ${label}: expected array.`);
  }

  return value.map((entry, index) =>
    toStringValue(entry, `${label}[${index}]`),
  );
}

function toEnumSymbol<T extends string>(
  value: unknown,
  allowedValues: Set<T>,
  label: string,
): T {
  const candidate = Array.isArray(value) ? value[0] : value;
  const normalized = toStringValue(candidate, label) as T;

  if (!allowedValues.has(normalized)) {
    throw new Error(`Invalid ${label}: unsupported value "${normalized}".`);
  }

  return normalized;
}

export const decodeBigInt: Decoder<bigint> = (value) =>
  toBigIntValue(value, "bigint response");

export const decodeBoolean: Decoder<boolean> = (value) =>
  toBooleanValue(value, "boolean response");

export const decodeTreasuryConfig: Decoder<TreasuryConfig> = (value) => {
  const record = asRecord(value, "treasury config");

  return {
    admin: toStringValue(readField(record, "admin"), "treasury config admin"),
    threshold: toSafeNumber(
      readField(record, "threshold"),
      "treasury config threshold",
    ),
    signerCount: toSafeNumber(
      readField(record, "signer_count"),
      "treasury config signer_count",
    ),
    balance: toBigIntValue(
      readField(record, "balance"),
      "treasury config balance",
    ),
    txCount: toSafeNumber(
      readField(record, "tx_count"),
      "treasury config tx_count",
    ),
  };
};

export const decodeTreasuryTransaction: Decoder<TreasuryTransaction> = (
  value,
) => {
  const record = asRecord(value, "treasury transaction");

  return {
    id: toSafeNumber(readField(record, "id"), "treasury transaction id"),
    to: toStringValue(readField(record, "to"), "treasury transaction to"),
    amount: toBigIntValue(
      readField(record, "amount"),
      "treasury transaction amount",
    ),
    memo: toStringValue(readField(record, "memo"), "treasury transaction memo"),
    approvals: toStringArray(
      readField(record, "approvals"),
      "treasury transaction approvals",
    ),
    executed: toBooleanValue(
      readField(record, "executed"),
      "treasury transaction executed",
    ),
    createdAt: toSafeNumber(
      readField(record, "created_at"),
      "treasury transaction created_at",
    ),
    proposer: toStringValue(
      readField(record, "proposer"),
      "treasury transaction proposer",
    ),
  };
};

export const decodeGovernanceConfig: Decoder<GovernanceConfig> = (value) => {
  const record = asRecord(value, "governance config");

  return {
    admin: toStringValue(
      readField(record, "admin"),
      "governance config admin",
    ),
    memberCount: toSafeNumber(
      readField(record, "member_count"),
      "governance config member_count",
    ),
    quorumPercent: toSafeNumber(
      readField(record, "quorum_percent"),
      "governance config quorum_percent",
    ),
    votingPeriod: toSafeNumber(
      readField(record, "voting_period"),
      "governance config voting_period",
    ),
    proposalCount: toSafeNumber(
      readField(record, "proposal_count"),
      "governance config proposal_count",
    ),
  };
};

export const decodeGovernanceProposal: Decoder<GovernanceProposal> = (
  value,
) => {
  const record = asRecord(value, "governance proposal");

  return {
    id: toSafeNumber(readField(record, "id"), "governance proposal id"),
    title: toStringValue(readField(record, "title"), "governance proposal title"),
    description: toStringValue(
      readField(record, "description"),
      "governance proposal description",
    ),
    action: toEnumSymbol(
      readField(record, "action"),
      GOVERNANCE_ACTIONS,
      "governance proposal action",
    ),
    proposer: toStringValue(
      readField(record, "proposer"),
      "governance proposal proposer",
    ),
    votesFor: toSafeNumber(
      readField(record, "votes_for"),
      "governance proposal votes_for",
    ),
    votesAgainst: toSafeNumber(
      readField(record, "votes_against"),
      "governance proposal votes_against",
    ),
    totalVotes: toSafeNumber(
      readField(record, "total_votes"),
      "governance proposal total_votes",
    ),
    status: toEnumSymbol(
      readField(record, "status"),
      GOVERNANCE_STATUSES,
      "governance proposal status",
    ),
    createdAt: toSafeNumber(
      readField(record, "created_at"),
      "governance proposal created_at",
    ),
    endsAt: toSafeNumber(
      readField(record, "ends_at"),
      "governance proposal ends_at",
    ),
    amount: toBigIntValue(
      readField(record, "amount"),
      "governance proposal amount",
    ),
    target: toStringValue(
      readField(record, "target"),
      "governance proposal target",
    ),
  };
};
