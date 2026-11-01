import { z } from "zod";

// Small list of passwords that pass length rules but are trivially guessable.
const COMMON = new Set(["password1234", "123456789012", "qwertyuiop12", "iloveyou1234", "passwordpassword", "wealthos1234", "nigeria12345", "lagos1234567"]);

export const emailSchema = z.string().trim().toLowerCase().max(254).email("Enter a valid email address");

export const passwordSchema = z
  .string()
  .min(12, "Use at least 12 characters")
  .max(128, "Use at most 128 characters")
  .refine((p) => !COMMON.has(p.toLowerCase()), "This password is too common")
  .refine((p) => new Set(p).size >= 5, "Use a less repetitive password");

export const signUpSchema = z
  .object({
    displayName: z.string().trim().min(1, "Enter your name").max(80),
    email: emailSchema,
    password: passwordSchema,
    acceptTerms: z.literal(true, { message: "You must accept the Terms and Privacy Notice" }),
    marketingOptIn: z.boolean().default(false),
  })
  .refine((v) => !v.password.toLowerCase().includes(v.email.split("@")[0]!), { path: ["password"], message: "Don't include your email in your password" });

export const signInSchema = z.object({ email: emailSchema, password: z.string().min(1, "Enter your password").max(128) });

export const totpCodeSchema = z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit code");
export const recoveryCodeSchema = z.string().trim().toUpperCase().regex(/^[0-9A-F]{5}-[0-9A-F]{5}$/, "Enter a recovery code like ABCDE-12345");

export const CONSENT_VERSIONS = { terms: "2026-11-01", privacy: "2026-11-01", marketing_email: "2026-11-01" } as const;
