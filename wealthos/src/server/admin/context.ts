import "server-only";
import { sql } from "drizzle-orm";
import { withUser, type Tx } from "@/server/db/client";
import { AppError } from "@/server/platform/errors";

export interface AdminContext {
  userId: string;
}

/**
 * Transaction as a platform administrator. Postgres re-checks the role and two-step verification
 * (app_is_platform_admin) so a bug in the page layer cannot grant admin access.
 */
export async function asAdmin<T>(admin: AdminContext, fn: (tx: Tx) => Promise<T>): Promise<T> {
  return withUser(admin.userId, async (tx) => {
    const r = await tx.execute<{ ok: boolean }>(sql`select app_is_platform_admin() as ok`);
    if (!r.rows[0]?.ok) throw new AppError("FORBIDDEN", "Administrator access with two-step verification is required.");
    return fn(tx);
  });
}

export type StaffRole = "admin" | "support" | "compliance";

/**
 * Transaction as a staff member with one of `roles` (admins can do everything). Postgres
 * re-checks the role and two-step verification (app_staff_role) on every call.
 */
export async function asStaff<T>(staff: AdminContext, roles: StaffRole[], fn: (tx: Tx, role: StaffRole) => Promise<T>): Promise<T> {
  return withUser(staff.userId, async (tx) => {
    const r = await tx.execute<{ role: StaffRole | null }>(sql`select app_staff_role()::text as role`);
    const role = r.rows[0]?.role ?? null;
    if (!role || (role !== "admin" && !roles.includes(role))) throw new AppError("FORBIDDEN", "Staff access with two-step verification is required for this.");
    return fn(tx, role);
  });
}
