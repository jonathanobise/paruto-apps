import { BRAND } from "@/lib/brand";
export const metadata = { title: "Privacy Notice (draft)" };
export default function Privacy() {
  return (
    <>
      <h1>Privacy Notice (draft)</h1>
      <p>{BRAND} processes the personal and financial information you enter to provide the service. We are preparing this notice to meet the Nigeria Data Protection Act 2023 and the NDPC General Application and Implementation Directive.</p>
      <h2>What we hold</h2>
      <p>Your account details, preferences, consents, security log, and the financial records you enter. We never ask for or store bank or broker passwords.</p>
      <h2>Your rights</h2>
      <p>You can export all of your data and delete your account at any time from Settings → Privacy.</p>
      <h2>AI features</h2>
      <p>No personal financial data is sent to any AI provider in the current version.</p>
    </>
  );
}
