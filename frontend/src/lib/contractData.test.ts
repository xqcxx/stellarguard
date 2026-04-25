import { describe, expect, it } from "vitest";
import {
  decodeBigInt,
  decodeGovernanceConfig,
  decodeGovernanceProposal,
  decodeTreasuryConfig,
  decodeTreasuryTransaction,
} from "@/lib/contractData";

describe("contract decoders", () => {
  it("decodes treasury config responses into typed domain objects", () => {
    expect(
      decodeTreasuryConfig({
        admin: "GADMIN",
        threshold: 2,
        signer_count: "3",
        balance: "5000000",
        tx_count: BigInt(12),
      }),
    ).toEqual({
      admin: "GADMIN",
      threshold: 2,
      signerCount: 3,
      balance: BigInt(5000000),
      txCount: 12,
    });
  });

  it("decodes treasury transactions", () => {
    expect(
      decodeTreasuryTransaction({
        id: "7",
        to: "GDEST",
        amount: BigInt(1000000),
        memo: "rent",
        approvals: ["GS1", "GS2"],
        executed: false,
        created_at: 1700,
        proposer: "GPROP",
      }),
    ).toEqual({
      id: 7,
      to: "GDEST",
      amount: BigInt(1000000),
      memo: "rent",
      approvals: ["GS1", "GS2"],
      executed: false,
      createdAt: 1700,
      executedAt: null,
      proposer: "GPROP",
    });
  });

  it("decodes treasury transactions with executedAt timestamp", () => {
    expect(
      decodeTreasuryTransaction({
        id: "8",
        to: "GDEST",
        amount: BigInt(2000000),
        memo: "payout",
        approvals: ["GS1"],
        executed: true,
        created_at: 1700,
        executed_at: 1800,
        proposer: "GPROP",
      }),
    ).toEqual({
      id: 8,
      to: "GDEST",
      amount: BigInt(2000000),
      memo: "payout",
      approvals: ["GS1"],
      executed: true,
      createdAt: 1700,
      executedAt: 1800,
      proposer: "GPROP",
    });
  });

  it("decodes governance config responses", () => {
    expect(
      decodeGovernanceConfig({
        admin: "GADMIN",
        member_count: 4,
        quorum_percent: "66",
        voting_period: BigInt(1000),
        proposal_count: 3,
      }),
    ).toEqual({
      admin: "GADMIN",
      memberCount: 4,
      quorumPercent: 66,
      votingPeriod: 1000,
      proposalCount: 3,
    });
  });

  it("decodes governance proposals with enum vectors", () => {
    expect(
      decodeGovernanceProposal({
        id: 1,
        title: "add_mem",
        description: "expand",
        action: ["AddMember"],
        proposer: "GPROP",
        votes_for: 2,
        votes_against: 1,
        total_votes: "3",
        status: ["Executed"],
        created_at: 0,
        ends_at: 10,
        amount: "0",
        target: "GTARGET",
      }),
    ).toEqual({
      id: 1,
      title: "add_mem",
      description: "expand",
      action: "AddMember",
      proposer: "GPROP",
      votesFor: 2,
      votesAgainst: 1,
      totalVotes: 3,
      status: "Executed",
      createdAt: 0,
      endsAt: 10,
      amount: BigInt(0),
      target: "GTARGET",
    });
  });

  it("rejects malformed payloads centrally", () => {
    expect(() =>
      decodeGovernanceProposal({
        id: 1,
      }),
    ).toThrow(/missing/i);
  });

  it("decodes bigint primitives", () => {
    expect(decodeBigInt("42")).toBe(BigInt(42));
  });
});

describe("treasury integration tests with mocked Soroban responses", () => {
  it("decodes a full treasury config from a realistic RPC-shaped response", () => {
    const mockRpcResponse = {
      admin: "GADMIN7XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
      threshold: "2",
      signer_count: BigInt(3),
      balance: "50000000000",
      tx_count: 7,
    };

    expect(decodeTreasuryConfig(mockRpcResponse)).toEqual({
      admin: "GADMIN7XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
      threshold: 2,
      signerCount: 3,
      balance: BigInt(50000000000),
      txCount: 7,
    });
  });

  it("decodes a pending treasury transaction with no approvals", () => {
    const mockRpcResponse = {
      id: "1",
      to: "GDEST1XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
      amount: BigInt(10000000),
      memo: "Q1 operating budget",
      approvals: [],
      executed: false,
      created_at: 1700000000,
      proposer: "GPROP1XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
    };

    expect(decodeTreasuryTransaction(mockRpcResponse)).toEqual({
      id: 1,
      to: "GDEST1XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
      amount: BigInt(10000000),
      memo: "Q1 operating budget",
      approvals: [],
      executed: false,
      createdAt: 1700000000,
      executedAt: null,
      proposer: "GPROP1XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
    });
  });

  it("decodes an executed transaction with multiple approvers", () => {
    const mockRpcResponse = {
      id: BigInt(5),
      to: "GDEST2XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
      amount: "25000000",
      memo: "emergency fund",
      approvals: [
        "GSIGNER1XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
        "GSIGNER2XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
        "GSIGNER3XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
      ],
      executed: true,
      created_at: "1699000000",
      proposer: "GPROP2XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
    };

    const decoded = decodeTreasuryTransaction(mockRpcResponse);

    expect(decoded.executed).toBe(true);
    expect(decoded.approvals).toHaveLength(3);
    expect(decoded.amount).toBe(BigInt(25000000));
    expect(decoded.id).toBe(5);
  });

  it("rejects treasury config missing the threshold field", () => {
    expect(() =>
      decodeTreasuryConfig({
        admin: "GADMIN",
        signer_count: 2,
        balance: "1000",
        tx_count: 0,
      }),
    ).toThrow(/missing "threshold"/i);
  });

  it("rejects treasury transaction with non-boolean executed field", () => {
    expect(() =>
      decodeTreasuryTransaction({
        id: 1,
        to: "GDEST",
        amount: 0,
        memo: "",
        approvals: [],
        executed: "yes",
        created_at: 0,
        proposer: "GPROP",
      }),
    ).toThrow(/boolean/i);
  });

  it("decodes treasury config with zero balance and tx count", () => {
    const empty = decodeTreasuryConfig({
      admin: "GADMIN",
      threshold: 1,
      signer_count: 1,
      balance: "0",
      tx_count: 0,
    });

    expect(empty.balance).toBe(BigInt(0));
    expect(empty.txCount).toBe(0);
  });
});
