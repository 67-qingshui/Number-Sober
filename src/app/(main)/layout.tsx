import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { hasAdmin } from "@/server/admin";
import { validateSession } from "@/server/session";
import { LogoutButton } from "@/components/logout-button";
import { MainNav } from "@/components/main-nav";

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
    <div style={{ maxWidth: 960, margin: "0 auto", padding: "16px 20px" }}>
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
          borderBottom: "1px solid #e5e5ea",
          paddingBottom: 10,
          marginBottom: 16,
        }}
      >
        <MainNav />
        <LogoutButton />
      </header>
      {children}
    </div>
  );
}
