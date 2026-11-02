import { WEALTHOS_TEMPLATE_HEADERS } from "@/server/imports/csv";

/** Example file in the WealthOS standard layout. Fictional figures; replace with your own. */
export async function GET() {
  const rows = [
    WEALTHOS_TEMPLATE_HEADERS.join(","),
    "2026-01-02,deposit,,,,,1000000,,,NGN,Funding from salary account,REF-001",
    "2026-01-05,buy,GTCO,1000,45.50,341.25,,,,NGN,Contract note 12345,REF-002",
    "2026-04-20,dividend,GTCO,,,,,3000,300,NGN,Final dividend,REF-003",
    "2026-06-02,sell,GTCO,200,52.00,78.00,,,,NGN,Contract note 12399,REF-004",
    "2026-06-30,fee,,,,,1500,,,NGN,Custody fee,REF-005",
  ];
  return new Response(rows.join("\r\n") + "\r\n", { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": 'attachment; filename="wealthos-import-template.csv"' } });
}
