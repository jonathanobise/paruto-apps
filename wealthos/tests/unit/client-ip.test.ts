import { describe, expect, it } from "vitest";
import { clientIp } from "@/lib/client-ip";

const h = (headers: Record<string, string>) => (n: string) => headers[n.toLowerCase()] ?? null;

describe("client IP from proxy headers", () => {
  it("ignores client-supplied X-Forwarded-For entries left of the trusted proxies", () => {
    // Client sends a fake "1.2.3.4"; our one proxy appends the real address 41.58.0.9.
    expect(clientIp(h({ "x-forwarded-for": "1.2.3.4, 41.58.0.9" }), { trustedHops: 1 })).toBe("41.58.0.9");
    // Two proxies (CDN then load balancer): the CDN's entry is the client.
    expect(clientIp(h({ "x-forwarded-for": "1.2.3.4, 41.58.0.9, 10.0.0.2" }), { trustedHops: 2 })).toBe("41.58.0.9");
    // Fewer entries than proxies: unknown rather than a guess.
    expect(clientIp(h({ "x-forwarded-for": "41.58.0.9" }), { trustedHops: 2 })).toBeNull();
  });
  it("uses a trusted edge header when configured, and rejects junk", () => {
    expect(clientIp(h({ "cf-connecting-ip": "102.89.1.1", "x-forwarded-for": "6.6.6.6" }), { trustedHeader: "cf-connecting-ip", trustedHops: 0 })).toBe("102.89.1.1");
    expect(clientIp(h({ "cf-connecting-ip": "<script>" }), { trustedHeader: "cf-connecting-ip", trustedHops: 0 })).toBeNull();
    expect(clientIp(h({ "x-forwarded-for": "not-an-ip" }), { trustedHops: 1 })).toBeNull();
  });
  it("without a proxy uses the socket address Next.js records (development)", () => {
    expect(clientIp(h({ "x-forwarded-for": "127.0.0.1" }), { trustedHops: 0 })).toBe("127.0.0.1");
    expect(clientIp(h({}), { trustedHops: 0 })).toBeNull();
  });
});
