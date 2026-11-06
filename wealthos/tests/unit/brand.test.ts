import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { BRAND, BRAND_LAST, BRAND_LEAD } from "@/lib/brand";

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? files(p) : /\.(tsx?|html|js)$/.test(n) ? [p] : [];
  });
}

describe("brand", () => {
  it("builds the one-word name from the wordmark's two parts (the second takes the serif accent)", () => {
    expect(`${BRAND_LEAD}${BRAND_LAST}`).toBe(BRAND);
    expect(BRAND).toBe("VioWealth");
    expect(BRAND_LAST).not.toContain(" ");
  });

  it("never shows the internal codename to users", () => {
    // Comments may mention the codename; strings, JSX and static pages may not (use BRAND).
    const offenders = [...files("src"), ...files("public")].flatMap((f) =>
      readFileSync(f, "utf8")
        .split("\n")
        .map((line, i) => ({ f, i: i + 1, line: line.trim() }))
        .filter(({ line }) => /WealthOS/.test(line) && !/^(\*|\/\/|\/\*)/.test(line)),
    );
    expect(offenders.map(({ f, i }) => `${f}:${i}`)).toEqual([]);
  });
});
