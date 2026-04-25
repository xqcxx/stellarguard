import { Controller, Get } from "@nestjs/common";
import { pool } from "../db";
import { config } from "../config";

interface HealthStatus {
  status: "ok" | "degraded" | "error";
  timestamp: string;
  service: string;
  checks: {
    database: {
      status: "ok" | "error";
      message?: string;
      responseTime?: number;
    };
    sorobanRpc: {
      status: "ok" | "error";
      message?: string;
      responseTime?: number;
    };
  };
}

@Controller("api/health")
export class HealthController {
  @Get()
  async getHealth(): Promise<HealthStatus> {
    const timestamp = new Date().toISOString();
    const checks: HealthStatus["checks"] = {
      database: { status: "error" },
      sorobanRpc: { status: "error" },
    };

    // Check PostgreSQL connectivity
    const dbStart = Date.now();
    try {
      const client = await pool.connect();
      await client.query("SELECT 1");
      client.release();
      checks.database = {
        status: "ok",
        responseTime: Date.now() - dbStart,
      };
    } catch (error) {
      checks.database = {
        status: "error",
        message:
          error instanceof Error ? error.message : "Database connection failed",
        responseTime: Date.now() - dbStart,
      };
    }

    // Check Soroban RPC connectivity
    const rpcStart = Date.now();
    try {
      const response = await fetch(config.sorobanRpcUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "getHealth",
          params: [],
        }),
        signal: AbortSignal.timeout(5000), // 5 second timeout
      });

      if (response.ok) {
        checks.sorobanRpc = {
          status: "ok",
          responseTime: Date.now() - rpcStart,
        };
      } else {
        checks.sorobanRpc = {
          status: "error",
          message: `RPC returned status ${response.status}`,
          responseTime: Date.now() - rpcStart,
        };
      }
    } catch (error) {
      checks.sorobanRpc = {
        status: "error",
        message:
          error instanceof Error ? error.message : "RPC connection failed",
        responseTime: Date.now() - rpcStart,
      };
    }

    // Determine overall status
    const allOk =
      checks.database.status === "ok" && checks.sorobanRpc.status === "ok";
    const anyOk =
      checks.database.status === "ok" || checks.sorobanRpc.status === "ok";

    return {
      status: allOk ? "ok" : anyOk ? "degraded" : "error",
      timestamp,
      service: "stellarguard-api",
      checks,
    };
  }
}
