import { requireApp } from "@/server/auth/context";
import { ACCOUNT_TYPES } from "@/server/accounts/service";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { NewAccountForm } from "./form";

export const metadata = { title: "Add account" };

export default async function NewAccountPage() {
  const app = await requireApp();
  const types = Object.entries(ACCOUNT_TYPES).map(([value, t]) => ({ value, label: t.label, class: t.class }));
  return (
    <>
      <PageHeader title="Add an account" description="Accounts with transactions (bank, brokerage, funds, T-bills) are valued from your ledger. Property, business interests, pensions and loans are valued from estimates you enter." />
      {!app.canWrite ? <Alert tone="warning">You have view-only access to this portfolio.</Alert> : (
        <Card className="max-w-3xl">
          <CardContent className="pt-5">
            <NewAccountForm types={types} today={new Date().toISOString().slice(0, 10)} />
          </CardContent>
        </Card>
      )}
    </>
  );
}
