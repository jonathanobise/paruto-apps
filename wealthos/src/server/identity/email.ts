import "server-only";
import { emailOutbox } from "@/server/db/schema";
import { db } from "@/server/db/client";
import { env } from "@/server/platform/env";

export interface OutgoingEmail {
  to: string;
  subject: string;
  text: string;
  purpose: "email_verification" | "password_reset" | "security_notice" | "account_deletion" | "invitation" | "billing";
}

/**
 * Email adapter. Only development transports exist today ("outbox" stores the message in the
 * email_outbox table, shown at /dev/outbox; "console" logs it). No production provider is
 * connected — see docs/DEPLOYMENT.md before launch.
 */
export async function sendEmail(message: OutgoingEmail): Promise<void> {
  const transport = env().EMAIL_TRANSPORT;
  await db().insert(emailOutbox).values({ toAddress: message.to, subject: message.subject, textBody: message.text, purpose: message.purpose, transport, sentAt: null });
  if (transport === "console") console.info(`[wealthos:email] to=${message.to} subject=${message.subject}\n${message.text}`);
}

export function appUrl(path: string): string {
  return new URL(path, env().APP_ORIGIN).toString();
}
