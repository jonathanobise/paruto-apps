export const STATUS: Record<string, { label: string; tone: "neutral" | "accent" | "warning" | "danger" }> = {
  previewed: { label: "Preview", tone: "warning" },
  committed: { label: "Imported", tone: "accent" },
  rolled_back: { label: "Rolled back", tone: "neutral" },
  discarded: { label: "Discarded", tone: "neutral" },
};
