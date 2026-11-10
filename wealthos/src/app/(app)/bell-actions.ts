"use server";

import { revalidatePath } from "next/cache";
import { requireAppForAction } from "@/server/auth/context";
import { listNotifications, markRead, unreadCount } from "@/server/alerts/service";

export type BellItem = { id: string; title: string; body: string; link: string | null; createdAt: string; read: boolean };

/** The bell's notifications half: the latest few, and how many are unread. */
export async function bellFeedAction(): Promise<{ items: BellItem[]; unread: number }> {
  const app = await requireAppForAction();
  const [rows, unread] = [await listNotifications(app.ctx, 12), await unreadCount(app.ctx)];
  return {
    unread,
    items: rows.map((n) => ({ id: n.id, title: n.title, body: n.body, link: n.link && n.link.startsWith("/") && !n.link.startsWith("//") ? n.link : null, createdAt: n.createdAt.toISOString(), read: Boolean(n.readAt) })),
  };
}

export async function markAllReadAction(): Promise<boolean> {
  const app = await requireAppForAction();
  await markRead(app.ctx);
  revalidatePath("/notifications");
  return true;
}
