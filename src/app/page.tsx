import { getHealth } from "@/server/health";
import { hasAdmin } from "@/server/admin";
import { HealthView } from "@/components/health-view";
import { AdminSetup } from "@/components/admin-setup";

export default function Home() {
  if (!hasAdmin()) {
    return <AdminSetup />;
  }
  return <HealthView status={getHealth()} />;
}
