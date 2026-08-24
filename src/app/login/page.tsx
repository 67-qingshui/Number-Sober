import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { hasAdmin } from "@/server/admin";
import { validateSession } from "@/server/session";
import { LoginForm } from "@/components/login-form";

export default async function LoginPage() {
  const store = await cookies();
  if (!hasAdmin()) redirect("/");
  if (validateSession(store.get("ns_session")?.value)) redirect("/");
  return <LoginForm />;
}
