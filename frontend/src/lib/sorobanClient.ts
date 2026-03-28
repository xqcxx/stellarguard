/**
 * Centralised Soroban RPC client.
 *
 * Encapsulates simulate / send / pollForResult so that every hook shares a
 * consistent retry strategy.  The polling policy (interval and max-attempts)
 * is configurable at construction time and can be overridden per-call.
 */

import {
  SorobanRpc,
  Transaction,
  TransactionBuilder,
  Contract,
  xdr,
  scValToNative,
} from "@stellar/stellar-sdk";
import { SOROBAN_RPC_URL, NETWORK_PASSPHRASE } from "./network";

// ── Poll policy ───────────────────────────────────────────────────────────────

export interface PollPolicy {
  /** Milliseconds to wait between each getTransaction probe. */
  intervalMs: number;
  /** Maximum number of probes before timing out. */
  maxAttempts: number;
}

/** Default policy: 2 s interval × 30 attempts = ~60 s timeout. */
export const DEFAULT_POLL_POLICY: PollPolicy = {
  intervalMs: 2_000,
  maxAttempts: 30,
};

// ── Decoder utility type ──────────────────────────────────────────────────────

export type Decoder<T> = (raw: unknown) => T;

// ── Client class ──────────────────────────────────────────────────────────────

/**
 * Thin wrapper around `SorobanRpc.Server`.
 *
 * Usage:
 * ```ts
 * // Shared singleton (uses DEFAULT_POLL_POLICY)
 * import { sorobanClient } from "@/lib/sorobanClient";
 *
 * // Custom policy for a specific feature
 * const fastClient = new SorobanClient(undefined, { intervalMs: 1_000, maxAttempts: 60 });
 * ```
 */
export class SorobanClient {
  private readonly server: SorobanRpc.Server;
  private readonly defaultPolicy: PollPolicy;

  constructor(
    rpcUrl: string = SOROBAN_RPC_URL,
    policy: Partial<PollPolicy> = {},
  ) {
    this.server = new SorobanRpc.Server(rpcUrl);
    this.defaultPolicy = { ...DEFAULT_POLL_POLICY, ...policy };
  }

  // ── Account ────────────────────────────────────────────────────────────────

  /** Fetch an on-chain account object (required by TransactionBuilder). */
  getAccount(address: string) {
    return this.server.getAccount(address);
  }

  // ── Simulate ───────────────────────────────────────────────────────────────

  /**
   * Simulate `tx` against the RPC node.
   * Throws if simulation returns an error response.
   *
   * @param signal  AbortSignal — throws if aborted before or after the RPC call.
   */
  async simulate(
    tx: Transaction,
    signal?: AbortSignal,
  ): Promise<SorobanRpc.Api.SimulateTransactionSuccessResponse> {
    signal?.throwIfAborted();
    const sim = await this.server.simulateTransaction(tx);
    signal?.throwIfAborted();

    if (SorobanRpc.Api.isSimulationError(sim)) {
      throw new Error(`Simulation failed: ${sim.error}`);
    }

    return sim as SorobanRpc.Api.SimulateTransactionSuccessResponse;
  }

  /**
   * Read a single contract value via simulation (no transaction submitted).
   *
   * @param contractId     Stellar contract strkey ("C…")
   * @param method         Contract function name
   * @param args           XDR-encoded arguments
   * @param sourceAddress  Account used as simulation source
   * @param signal         AbortSignal for cancellation
   * @param decoder        Optional transform applied to the native return value
   */
  async readValue<T = unknown>(
    contractId: string,
    method: string,
    args: xdr.ScVal[] = [],
    sourceAddress: string,
    signal?: AbortSignal,
    decoder?: Decoder<T>,
  ): Promise<T> {
    signal?.throwIfAborted();
    const account = await this.server.getAccount(sourceAddress);
    signal?.throwIfAborted();

    const tx = new TransactionBuilder(account, {
      fee: "100",
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(new Contract(contractId).call(method, ...args))
      .setTimeout(30)
      .build();

    const sim = await this.simulate(tx, signal);

    const rawValue = sim.result?.retval;
    const nativeValue = rawValue ? scValToNative(rawValue) : undefined;
    return decoder ? decoder(nativeValue) : (nativeValue as T);
  }

  // ── Send & poll ────────────────────────────────────────────────────────────

  /**
   * Submit a signed transaction and wait for it to reach a terminal state.
   *
   * @param tx      A fully-signed `Transaction`.
   * @param policy  Override the instance-level poll policy for this call.
   * @returns       The `GetTransactionResponse` on `SUCCESS`.
   * @throws        If submission returns `ERROR`, polling returns `FAILED`,
   *                or `maxAttempts` is exhausted.
   */
  async send(
    tx: Transaction,
    policy?: Partial<PollPolicy>,
  ): Promise<SorobanRpc.Api.GetTransactionResponse> {
    const effectivePolicy: PollPolicy = policy
      ? { ...this.defaultPolicy, ...policy }
      : this.defaultPolicy;

    const sendResponse = await this.server.sendTransaction(tx);

    if (sendResponse.status === "ERROR") {
      throw new Error(
        `Transaction submission failed: ${
          sendResponse.errorResult?.toXDR("base64") ?? sendResponse.status
        }`,
      );
    }

    return this.pollForResult(sendResponse.hash, effectivePolicy);
  }

  /**
   * Poll `server.getTransaction` until the transaction leaves `NOT_FOUND`.
   *
   * Useful when you already have a hash from a prior `send()` call and want
   * to watch it independently (e.g. after a page reload).
   *
   * @param hash    Transaction hash.
   * @param policy  Polling policy — defaults to the instance-level policy.
   */
  async pollForResult(
    hash: string,
    policy: PollPolicy = this.defaultPolicy,
  ): Promise<SorobanRpc.Api.GetTransactionResponse> {
    for (let attempt = 0; attempt < policy.maxAttempts; attempt++) {
      await sleep(policy.intervalMs);

      const response = await this.server.getTransaction(hash);

      switch (response.status) {
        case SorobanRpc.Api.GetTransactionStatus.NOT_FOUND:
          continue;
        case SorobanRpc.Api.GetTransactionStatus.SUCCESS:
          return response;
        default:
          throw new Error(
            `Transaction failed with status: ${response.status}`,
          );
      }
    }

    const timeoutSeconds = (policy.maxAttempts * policy.intervalMs) / 1_000;
    throw new Error(
      `Transaction ${hash} not confirmed after ${policy.maxAttempts} attempts (${timeoutSeconds}s timeout)`,
    );
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── Singleton ─────────────────────────────────────────────────────────────────

/**
 * Application-wide default client instance.
 *
 * All hooks should import this singleton so they share the same poll policy.
 * To use a custom policy, construct a new `SorobanClient` locally.
 */
export const sorobanClient = new SorobanClient();
