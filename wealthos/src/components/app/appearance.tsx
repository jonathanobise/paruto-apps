"use client";
import { useSyncExternalStore } from "react";
import { Check, Monitor, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { DEPTHS, THEMES, applyAppearance, isDepth, isTheme, type Depth, type ThemeChoice } from "@/lib/appearance";
import { saveAppearanceAction } from "@/app/(app)/shell-actions";

/** One appearance for the whole page, shared by the sidebar, the phone menu and Settings. */
type State = { theme: ThemeChoice; depth: Depth; resolved: "light" | "dark" };
let state: State | null = null;
const listeners = new Set<() => void>();

function read(): State {
  if (state) return state;
  const d = document.documentElement;
  const theme = d.getAttribute("data-theme-pref");
  const depth = d.getAttribute("data-depth");
  state = { theme: isTheme(theme) ? theme : "dark", depth: isDepth(depth) ? depth : "night", resolved: d.getAttribute("data-theme") === "light" ? "light" : "dark" };
  return state;
}
function subscribe(l: () => void) {
  listeners.add(l);
  // System: the device switching light/dark changes what's shown.
  const m = matchMedia("(prefers-color-scheme: light)");
  const onChange = () => {
    if (read().theme !== "system") return;
    state = { ...read(), resolved: m.matches ? "light" : "dark" };
    for (const x of listeners) x();
  };
  m.addEventListener("change", onChange);
  return () => {
    listeners.delete(l);
    m.removeEventListener("change", onChange);
  };
}
function choose(next: Partial<Pick<State, "theme" | "depth">>) {
  const cur = read();
  const theme = next.theme ?? cur.theme;
  const depth = next.depth ?? cur.depth;
  applyAppearance(theme, depth);
  state = { theme, depth, resolved: document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark" };
  for (const l of listeners) l();
  // Saved with the person's preferences too (best effort: the cookies already carry it).
  if (next.theme) void saveAppearanceAction(theme).catch(() => undefined);
}

function useAppearance(initial: { theme: ThemeChoice; depth: Depth }): State {
  return useSyncExternalStore(subscribe, read, () => ({ ...initial, resolved: initial.theme === "light" ? "light" : "dark" }));
}

const ICONS = { light: Sun, dark: Moon, system: Monitor } as const;
const NAMES = { light: "Light", dark: "Dark", system: "System" } as const;

/** Light / Dark / System as a sliding segmented control, then "How dark Dark gets" when it's dark. */
export function AppearanceControl({ initial, className, showDepth = true }: { initial: { theme: ThemeChoice; depth: Depth }; className?: string; showDepth?: boolean }) {
  const a = useAppearance(initial);
  const i = THEMES.indexOf(a.theme);
  return (
    <div className={className}>
      <div role="radiogroup" aria-label="Appearance" className="vio-seg" style={{ "--n": THEMES.length, "--i": i } as React.CSSProperties}>
        <span aria-hidden className="vio-seg-thumb" />
        {THEMES.map((t) => {
          const Icon = ICONS[t];
          return (
            <button key={t} type="button" role="radio" aria-checked={a.theme === t} aria-label={NAMES[t]} title={NAMES[t]} data-no-ink onClick={() => choose({ theme: t })}>
              <Icon className="size-4" aria-hidden />
            </button>
          );
        })}
      </div>
      {showDepth && a.resolved === "dark" ? (
        <div className="mt-3">
          <p id="depth-label" className="px-1 text-[12px] text-text-3">
            How dark Dark gets
          </p>
          <div role="radiogroup" aria-labelledby="depth-label" className="mt-2 grid grid-cols-4 gap-1.5">
            {DEPTHS.map((d) => {
              const on = a.depth === d.value;
              return (
                <button key={d.value} type="button" role="radio" aria-checked={on} onClick={() => choose({ depth: d.value })} className="group flex flex-col items-center gap-1 rounded-[12px] p-0.5 text-[11px] text-text-3 aria-checked:text-text">
                  <span
                    className={cn("relative block h-9 w-full rounded-[10px] border transition-shadow", on ? "border-transparent shadow-[0_0_0_2px_var(--accent)]" : "border-[rgb(255_255_255/0.12)] group-hover:border-[rgb(255_255_255/0.28)]")}
                    style={{ background: d.bg }}
                  >
                    <span className="absolute inset-x-1.5 top-2 h-1.5 rounded-full" style={{ background: d.surface }} />
                    <span className="absolute left-1.5 top-[18px] h-1.5 w-3 rounded-full bg-[#9b6bff]" />
                    {on ? (
                      <span className="absolute -right-1 -top-1 grid size-4 place-items-center rounded-full bg-accent text-brand-ink">
                        <Check className="size-2.5" strokeWidth={3.5} aria-hidden />
                      </span>
                    ) : null}
                  </span>
                  <span className={cn("font-medium", on && "font-semibold")}>{d.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

/** In the icon rail: one button that cycles Light → Dark → System. */
export function AppearanceCycle({ initial }: { initial: { theme: ThemeChoice; depth: Depth } }) {
  const a = useAppearance(initial);
  const next = THEMES[(THEMES.indexOf(a.theme) + 1) % THEMES.length]!;
  const Icon = ICONS[a.theme];
  return (
    <button type="button" onClick={() => choose({ theme: next })} aria-label={`Appearance: ${NAMES[a.theme]}. Switch to ${NAMES[next]}`} title={`${NAMES[a.theme]} (switch to ${NAMES[next]})`} className="spring grid size-10 place-items-center rounded-full text-text-2 hover:bg-text/10 hover:text-text">
      <Icon className="size-4" aria-hidden />
    </button>
  );
}
