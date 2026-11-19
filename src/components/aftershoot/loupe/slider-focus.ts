import { useEffect, useId, useSyncExternalStore } from "react";

// Slider focus, ported from the Export push editor (useShiftNavigation):
//   • hovering a slider row focuses it (label / value light up)
//   • ↑ / ↓ nudge the focused slider (⇧ = 5×); ← / → stay with image nav
//   • Tab / ⇧Tab cycle focus through the sliders (wrapping), scrolling the
//     focused row into the middle of its panel
//   • Escape, or a click outside any slider row, drops focus
// Each SliderRow registers how to nudge itself; this module owns the keys.

type Entry = { el: HTMLElement | null; nudge: (dir: 1 | -1, big: boolean) => void };

let focusedId: string | null = null;
let mode: "hover" | "tab" | null = null;
const rows = new Map<string, Entry>();
const listeners = new Set<() => void>();

function setFocus(id: string | null, m: typeof mode) {
  focusedId = id;
  mode = id ? m : null;
  listeners.forEach((l) => l());
}

function orderedIds(): string[] {
  // Visible rows in on-screen (DOM) order.
  return [...rows.entries()]
    .filter(([, r]) => r.el && r.el.isConnected && r.el.offsetParent !== null)
    .sort(([, a], [, b]) =>
      a.el!.compareDocumentPosition(b.el!) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1,
    )
    .map(([id]) => id);
}

function scrollIntoMiddle(id: string) {
  const el = rows.get(id)?.el;
  if (!el) return;
  let scroller: HTMLElement | null = el.parentElement;
  while (scroller && scroller !== document.body) {
    const s = getComputedStyle(scroller);
    if (/(auto|scroll)/.test(s.overflowY) && scroller.scrollHeight > scroller.clientHeight) break;
    scroller = scroller.parentElement;
  }
  if (!scroller || scroller === document.body) return;
  const sRect = scroller.getBoundingClientRect();
  const eRect = el.getBoundingClientRect();
  const target =
    eRect.top - sRect.top + scroller.scrollTop - scroller.clientHeight / 2 + el.offsetHeight / 2;
  scroller.scrollTo({ top: Math.max(0, target), behavior: "smooth" });
}

let installed = false;
function install() {
  if (installed) return;
  installed = true;
  window.addEventListener(
    "keydown",
    (e) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (e.key === "Tab" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const order = orderedIds();
        if (order.length === 0) return;
        e.preventDefault();
        e.stopPropagation();
        const idx = focusedId ? order.indexOf(focusedId) : -1;
        const next =
          idx < 0
            ? order[e.shiftKey ? order.length - 1 : 0]
            : order[(idx + (e.shiftKey ? -1 : 1) + order.length) % order.length];
        setFocus(next, "tab");
        scrollIntoMiddle(next);
        return;
      }
      if (!focusedId) return;
      if (e.key === "ArrowUp" || e.key === "ArrowDown") {
        const row = rows.get(focusedId);
        if (!row) return;
        e.preventDefault();
        e.stopPropagation();
        row.nudge(e.key === "ArrowUp" ? 1 : -1, e.shiftKey);
      } else if (e.key === "Escape") {
        setFocus(null, null);
      }
    },
    true,
  );
  window.addEventListener(
    "mousedown",
    (e) => {
      if (!focusedId) return;
      if ((e.target as HTMLElement | null)?.closest("[data-slider-row]")) return;
      setFocus(null, null);
    },
    true,
  );
}

/** Register a slider row; returns its focus state and hover handlers. */
export function useSliderFocus(
  ref: React.RefObject<HTMLElement | null>,
  nudge: (dir: 1 | -1, big: boolean) => void,
) {
  const id = useId();
  install();
  // Keep the latest nudge (it closes over the current value).
  rows.set(id, { el: ref.current, nudge });
  useEffect(() => {
    const entry = rows.get(id);
    if (entry) entry.el = ref.current;
    return () => {
      rows.delete(id);
      if (focusedId === id) setFocus(null, null);
    };
  }, [id, ref]);

  const focused = useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => focusedId === id,
    () => false,
  );

  return {
    focused,
    onMouseEnter: () => setFocus(id, "hover"),
    // Leaving drops hover focus (not Tab focus).
    onMouseLeave: () => {
      if (focusedId === id && mode === "hover") setFocus(null, null);
    },
  };
}
