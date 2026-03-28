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
