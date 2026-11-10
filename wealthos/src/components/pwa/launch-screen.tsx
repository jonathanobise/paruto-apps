import { BRAND_LAST, BRAND_LEAD } from "@/lib/brand";
import { CURRENT_RELEASE, versionLabel } from "@/lib/updates/version";

/**
 * VioWealth's launch screen (paruto-standards STANDARDS.md, Launch screen): when the installed app
 * opens, the mark assembles on the brand background (the violet tile blooms, the V's arms rise, the
 * glint kindles last and breathes), "VioWealth" rises beneath it, then "Built by Paruto." and,
 * faintly, the edition line ("— v1.0.0 —"). It holds for about five seconds from when it began
 * (LAUNCH_HOLD_MS), longer only while the app is still loading, then fades as the app appears
 * (LaunchHandoff sets `data-launched`); a tap skips it; it leaves on its own after eight seconds.
 *
 * Plain HTML and CSS inside every page (styles: `#vio-launch` in globals.css), so it paints before
 * any script loads. LAUNCH_SCRIPT, run before first paint, shows it once per launch of the installed
 * app (standalone), never on each page, never in a browser tab, never without JavaScript. Light or
 * dark is already on <html>, so nothing flashes. Decorative: screen readers skip it.
 */
export const LAUNCH_HOLD_MS = 5_000;
export const LAUNCHED_KEY = "vio-launched";

export const LAUNCH_SCRIPT = `(function(){try{var d=document.documentElement,q=location.search.indexOf("launch=preview")>-1,s=matchMedia("(display-mode: standalone)").matches||navigator.standalone===true;if(q||(s&&!sessionStorage.getItem("${LAUNCHED_KEY}"))){d.setAttribute("data-launch","show");sessionStorage.setItem("${LAUNCHED_KEY}","1")}}catch(e){}})();`;

export function LaunchScreen() {
  return (
    <div id="vio-launch" aria-hidden="true">
      <div className="vl">
        <span className="vl-glow" />
        <svg viewBox="0 0 32 32" className="vl-mark">
          <defs>
            <linearGradient id="vl-tile" x1="0" y1="0" x2="0.9" y2="1">
              <stop offset="0" stopColor="#9b6bff" />
              <stop offset="0.55" stopColor="#6a2fe0" />
              <stop offset="1" stopColor="#2e0f7a" />
            </linearGradient>
            <linearGradient id="vl-gloss" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#fff" stopOpacity="0.34" />
              <stop offset="0.55" stopColor="#fff" stopOpacity="0" />
            </linearGradient>
          </defs>
          <g className="vl-tile">
            <rect width="32" height="32" rx="9" fill="url(#vl-tile)" />
            <rect x="0.5" y="0.5" width="31" height="31" rx="8.5" fill="url(#vl-gloss)" stroke="#fff" strokeOpacity="0.18" />
          </g>
          <path className="vl-left" d="M7 10.5H12.2L16 19.2V25.5Z" fill="#fff" />
          <path className="vl-right" d="M16 19.2L20.3 6.5H25.3L16 25.5Z" fill="#fff" fillOpacity="0.72" />
          <path className="vl-glint" d="M25.6 2.9l.5 1.35 1.35.5-1.35.5-.5 1.35-.5-1.35-1.35-.5 1.35-.5z" fill="#fff" />
        </svg>
        <span className="vl-name">
          {BRAND_LEAD}
          <em>{BRAND_LAST}</em>
        </span>
        <span className="vl-credit">Built by Paruto.</span>
        {CURRENT_RELEASE ? <span className="vl-edition">{versionLabel(CURRENT_RELEASE)}</span> : null}
      </div>
    </div>
  );
}
