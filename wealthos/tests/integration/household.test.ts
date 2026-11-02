import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { closeDb, withTenant } from "@/server/db/client";
import { accountOwners } from "@/server/db/schema";
import { createAccount, addValuation } from "@/server/accounts/service";
import { postEvent } from "@/server/ledger/service";
import { householdView, setAccountOwners } from "@/server/household/service";
import { acceptInvitation, createSharedSpace, inviteMember, removeMember } from "@/server/identity/members";
import { buildDashboard } from "@/server/analytics/portfolio";
import { d } from "@/engine";
import { expectDbRejection, grantPlan, makeUser } from "./helpers";

let ada: Awaited<ReturnType<typeof makeUser>>;
let bayo: Awaited<ReturnType<typeof makeUser>>;
let stranger: Awaited<ReturnType<typeof makeUser>>;
let space: string;
let joint: string;
let adaSavings: string;
let house: string;
let loan: string;
const A = () => ({ userId: ada.userId, orgId: space });
const B = () => ({ userId: bayo.userId, orgId: space });

beforeAll(async () => {
  ada = await makeUser("Household Ada");
  bayo = await makeUser("Household Bayo");
  stranger = await makeUser("Household Stranger");
  space = await createSharedSpace(ada.userId, { name: "Ada & Bayo", kind: "household" });
  await grantPlan(space, "plus");
  const { link } = await inviteMember(A(), { email: bayo.email, role: "member" });
  await acceptInvitation(bayo.userId, new URL(link).searchParams.get("token")!);
  joint = (await createAccount(A(), { name: "Joint current", type: "bank", currency: "NGN" })).id;
  adaSavings = (await createAccount(A(), { name: "Ada savings", type: "bank", currency: "NGN" })).id;
  house = (await createAccount(A(), { name: "Flat", type: "real_estate", currency: "NGN", openingValue: "40000000", ownershipPercent: "50" })).id;
  loan = (await createAccount(A(), { name: "Mortgage", type: "loan", currency: "NGN", openingValue: "10000000" })).id;
  await postEvent(A(), { type: "deposit", accountId: joint, currency: "NGN", amount: "1000000", occurredOn: "2026-10-01" });
  await postEvent(A(), { type: "deposit", accountId: adaSavings, currency: "NGN", amount: "300000", occurredOn: "2026-10-01" });
});
afterAll(async () => closeDb());

describe("household view", () => {
  it("splits each account by members' shares; people plus unassigned equal net worth", async () => {
    await setAccountOwners(A(), adaSavings, [{ userId: ada.userId, percent: "100" }]);
    await setAccountOwners(B(), joint, [{ userId: ada.userId, percent: "50" }, { userId: bayo.userId, percent: "50" }]);
    await setAccountOwners(A(), house, [{ userId: ada.userId, percent: "60" }, { userId: bayo.userId, percent: "40" }]);
    await setAccountOwners(A(), loan, [{ userId: bayo.userId, percent: "100" }]);
    const h = await householdView(A(), "NGN");
    const person = (id: string) => h.people.find((p) => p.userId === id)!.netWorth;
    // Flat: 40m × 50% in this space = 20m. Ada: 300k + 500k + 12m = 12.8m. Bayo: 500k + 8m − 10m = −1.5m.
    expect(person(ada.userId)).toBe("12800000.00");
    expect(person(bayo.userId)).toBe("-1500000.00");
    expect(h.unassigned).toBe("0.00");
    const dash = await buildDashboard(A(), { baseCurrency: "NGN", period: "1M" });
    expect(h.netWorth).toBe(d(dash.totals.netWorth).toFixed(2));
    expect(d(person(ada.userId)).plus(person(bayo.userId)).plus(h.unassigned).toFixed(2)).toBe(h.netWorth);
  });

  it("rejects shares over 100% and owners who aren't members (also at the database)", async () => {
    await expect(setAccountOwners(A(), joint, [{ userId: ada.userId, percent: "70" }, { userId: bayo.userId, percent: "40" }])).rejects.toMatchObject({ code: "VALIDATION" });
    await expect(setAccountOwners(A(), joint, [{ userId: stranger.userId, percent: "10" }])).rejects.toMatchObject({ message: /must be members/ });
    await expectDbRejection(withTenant(A(), (tx) => tx.insert(accountOwners).values({ orgId: space, accountId: adaSavings, userId: bayo.userId, percent: "5" })), /can't exceed 100%/);
    // Another tenant can't see or write ownership.
    expect(await withTenant(stranger.ctx, (tx) => tx.select().from(accountOwners))).toHaveLength(0);
    await expectDbRejection(withTenant(stranger.ctx, (tx) => tx.insert(accountOwners).values({ orgId: space, accountId: joint, userId: stranger.userId, percent: "5" })), /row-level security|violates foreign key|WOS_HOUSEHOLD/);
  });

  it("a member who leaves stops owning anything; their share becomes unassigned", async () => {
    await removeMember(B(), bayo.userId);
    const h = await householdView(A(), "NGN");
    expect(h.people.map((p) => p.userId)).toEqual([ada.userId]);
    expect(h.unassigned).toBe("-1500000.00");
  });

  it("viewers can't change ownership", async () => {
    const viewer = await makeUser("Household Viewer");
    const { link } = await inviteMember(A(), { email: viewer.email, role: "viewer" });
    await acceptInvitation(viewer.userId, new URL(link).searchParams.get("token")!);
    await expect(setAccountOwners({ userId: viewer.userId, orgId: space }, joint, [{ userId: ada.userId, percent: "100" }])).rejects.toBeTruthy();
  });
});
