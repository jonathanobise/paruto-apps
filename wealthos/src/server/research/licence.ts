import "server-only";
import { isDemoMode } from "@/server/demo/mode";

/**
 * Source kinds whose data may not be displayed in this deployment. Licensed market data (EODHD)
 * is for the owner's own use: the public demo never shows it (docs/DATA_SOURCES.md).
 */
export function hiddenSourceKinds(): Array<"licensed"> {
  return isDemoMode() ? ["licensed"] : [];
}

export function licensedDataVisible(): boolean {
  return hiddenSourceKinds().length === 0;
}
