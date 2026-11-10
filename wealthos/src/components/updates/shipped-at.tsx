"use client";
import { useEffect, useState } from "react";

/**
 * When a release went live, in the reader's own time zone. The server renders the date alone (UTC,
 * so nothing mismatches); the browser then shows it in local time.
 */
export function ShippedAt({ at, withTime = false, prefix = "" }: { at: string; withTime?: boolean; prefix?: string }) {
  const date = new Date(at);
  const [text, setText] = useState(() => new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(date));
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- local time is only known in the browser
    setText(new Intl.DateTimeFormat("en-GB", withTime ? { day: "numeric", month: "long", year: "numeric", hour: "numeric", minute: "2-digit" } : { day: "numeric", month: "long", year: "numeric" }).format(new Date(at)));
  }, [at, withTime]);
  if (Number.isNaN(date.getTime())) return null;
  return (
    <time dateTime={at}>
      {prefix}
      {text}
    </time>
  );
}
