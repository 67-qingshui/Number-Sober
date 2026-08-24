import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { hasAdmin } from "@/server/admin";
import { validateSession } from "@/server/session";
import { LogoutButton } from "@/components/logout-button";

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const store = await cookies();
  if (hasAdmin() && !validateSession(store.get("ns_session")?.value)) {
    redirect("/login");
  }
  return (
    <div>
      <header style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <LogoutButton />
      </header>
      {children}
    </div>
  );
}
