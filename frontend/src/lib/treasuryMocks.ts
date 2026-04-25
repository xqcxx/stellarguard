import type { TreasuryConfig, TreasuryTransaction } from "@/lib/contractData";

export const MOCK_TREASURY_ADDRESS =
  "GABCD1234EFGH5678IJKL9012MNOP3456QRST7890UVWX1234YZAB";

export const MOCK_TREASURY_CONFIG: TreasuryConfig = {
  admin: MOCK_TREASURY_ADDRESS,
  threshold: 2,
  signerCount: 3,
  balance: BigInt("1250000000"),
  txCount: 2,
};

export const MOCK_TREASURY_TRANSACTIONS: TreasuryTransaction[] = [
  {
    id: 2,
    to: "GCDEST000000000000000000000000000000000000000000000000000000",
    amount: BigInt("50000000"),
    memo: "Validator infrastructure costs",
    approvals: [MOCK_TREASURY_ADDRESS],
    executed: false,
    createdAt: 1_714_003_200,
    proposer: MOCK_TREASURY_ADDRESS,
  },
  {
    id: 1,
    to: "GCRECIPIENT00000000000000000000000000000000000000000000000000",
    amount: BigInt("100000000"),
    memo: "Quarterly community grant",
    approvals: [MOCK_TREASURY_ADDRESS, "GCSIGNEREXTRA0000000000000000000000000000000000000000000000"],
    executed: true,
    createdAt: 1_713_916_800,
    proposer: MOCK_TREASURY_ADDRESS,
  },
];
