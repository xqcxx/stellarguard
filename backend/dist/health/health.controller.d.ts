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
export declare class HealthController {
    getHealth(): Promise<HealthStatus>;
}
export {};
//# sourceMappingURL=health.controller.d.ts.map