import type { HealthStatus } from "@/server/health";

export function HealthView({ status }: { status: HealthStatus }) {
  return (
    <main>
      <h1>Number Sober 明算</h1>
      <p data-testid="status">
        系统运行正常
        {status.dbConnected
          ? ` · 数据库已连接(schema v${status.schemaVersion})`
          : " · 数据库未连接"}
      </p>
    </main>
  );
}
