import { cookies } from "next/headers";
import { hasAdmin } from "./admin";
import { validateSession } from "./session";

/**
 * API 登录保护:管理员未初始化时不拦截(首次运行设置流程),
 * 已初始化则要求有效会话。
 */
export async function requireAuth(): Promise<boolean> {
  if (!hasAdmin()) return true;
  const store = await cookies();
  return validateSession(store.get("ns_session")?.value);
}
