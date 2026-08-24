import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getHealth } from "@/server/health";
import { hasAdmin } from "@/server/admin";
import { validateSession } from "@/server/session";
import { HealthView } from "@/components/health-view";
import { AdminSetup } from "@/components/admin-setup";

export default async function Home() {
  const store = await cookies();
  if (!hasAdmin()) return <AdminSetup />;
  if (!validateSession(store.get("ns_session")?.value)) redirect("/login");
  return <HealthView status={getHealth()} />;
}
