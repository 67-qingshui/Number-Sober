import { getHealth } from "@/server/health";
import { HealthView } from "@/components/health-view";

export default function Home() {
  return <HealthView status={getHealth()} />;
}
