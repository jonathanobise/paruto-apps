import "server-only";
import { eq } from "drizzle-orm";
import { memberships, organizations } from "@/server/db/schema";
import { withUser } from "@/server/db/client";

export interface OrgSummary {
  id: string;
  name: string;
  kind: "personal" | "household" | "business" | "adviser" | "demo";
  isDemo: boolean;
  role: "owner" | "admin" | "member" | "viewer";
  jurisdiction: string;
}

/** Organisations the user belongs to (read through RLS as that user). */
export async function listOrganizations(userId: string): Promise<OrgSummary[]> {
  return withUser(userId, (tx) =>
    tx
      .select({ id: organizations.id, name: organizations.name, kind: organizations.kind, isDemo: organizations.isDemo, role: memberships.role, jurisdiction: organizations.jurisdiction })
      .from(memberships)
      .innerJoin(organizations, eq(organizations.id, memberships.orgId))
      .where(eq(memberships.userId, userId))
      .orderBy(organizations.createdAt),
  );
}

/** The active organisation: the session's choice if the user is still a member, else the personal one. */
export function pickActiveOrg(orgs: OrgSummary[], requested: string | null): OrgSummary | null {
  return orgs.find((o) => o.id === requested) ?? orgs.find((o) => o.kind === "personal") ?? orgs[0] ?? null;
}
