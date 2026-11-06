"use client";
import type { ComponentProps } from "react";

/** A <select> inside a <form> that submits when changed (progressively enhanced: a button is shown without JS). */
export function AutoSubmitSelect(props: ComponentProps<"select">) {
  return <select {...props} onChange={(e) => e.currentTarget.form?.requestSubmit()} />;
}
