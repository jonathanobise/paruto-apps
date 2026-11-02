import { describe, expect, it } from "vitest";
import { safeNext } from "@/lib/safe-next";

describe("safeNext (open-redirect protection)", () => {
  it.each([
    ["/invite?token=abc", "/invite?token=abc"],
    ["/settings/billing", "/settings/billing"],
    ["//evil.example/x", "/dashboard"],
    ["/\\evil.example", "/dashboard"],
    ["https://evil.example", "/dashboard"],
    ["javascript:alert(1)", "/dashboard"],
    ["/a\r\nSet-Cookie: x", "/dashboard"],
    [undefined, "/dashboard"],
    ["/" + "a".repeat(400), "/dashboard"],
  ])("%s → %s", (input, out) => expect(safeNext(input)).toBe(out));
});
