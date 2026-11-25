import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Eye, EyeOff, Flag, LayoutGrid, Square, X } from "lucide-react";
import { BottomBar } from "../BottomBar";
import { photoUrl } from "../cull-data";
import { dupId, duplicateIds, imageOf, photoName } from "../duplicates";
import { AlbumFilmstrip } from "../loupe/AlbumFilmstrip";
import { PhotoContextMenu, PhotoMenuContext } from "../PhotoContextMenu";
import { IconTooltip } from "../IconTooltip";
import {
  FACE_ZOOM,
  FOCUS_COLOR,
  FOCUS_LABEL,
  faceCount,
  facePos,
  faceScore,
  type FaceFocus,
} from "../faces";
import { GradientSlider } from "../loupe/slider-primitives";
import { LoupeRail } from "../loupe/LoupeRail";
import { LoupeRailPanel, type LoupeAIState } from "../loupe/LoupeRailPanel";
import type { LoupeRailKey } from "../loupe/loupe-rail-config";
import { useCullStore } from "@/features/import/store/useCullStore";
import { FACE_SIZE_MIN, FACE_SIZE_MAX, type FaceControls } from "../panels/KeyFacesGrid";
import { RatingChip } from "../RatingChip";
import type { Ratings } from "../use-ratings";

// Survey Mode: compare a set of photos side by side, all visible at once.
//
// Interactions (ported from the Survey Mode prototype):
//  - Click a photo to make it active; click the active photo to zoom to 200%
//    at that point (click again to fit). Pinch / ctrl+wheel zooms at the
//    cursor, drag or two-finger scroll pans.
//  - Zoom and pan are SYNCED across every photo by default (lock in the bottom
//    bar); unlock to zoom each photo on its own.
//  - Drag a photo's name bar onto another to reorder. ⌘/ctrl-click or the "x"
//    removes it from the comparison (Undo in the toast or ⌘Z).
//  - Rate with the stars, "Select" marks the winner (5 stars) and "S" swaps the
//    selection onto the active photo. Flag with the flag button or D.
//  - Filmstrip: click adds a photo, ⇧-click toggles it in/out of the set.
//  - Keys: Tab / ⇧Tab / , / . cycle the active photo, ←/→ slide the whole set,
//    ⇧←/⇧→ add the neighbouring photo, A select, S swap, X reject + remove,
//    D flag, Space zoom, Enter open in Loupe, Esc fit.

type View = { zoom: number; x: number; y: number };
const FIT: View = { zoom: 100, x: 0, y: 0 };
const MAX_ZOOM = 400;
const CLICK_ZOOM = 200;
const AR = 1.5; // placeholder photos are 3:2
const GAP = 2;
const UNDER_H = 32; // name + rating row under each photo
const CELL_PAD = 12; // cell border + padding, each axis
const CELL_CHROME_H = UNDER_H + 2 + CELL_PAD; // under row + gap + border/padding
const ALBUM_TOTAL = 232;
const TOAST_MS = 6000;

const imgName = photoName;

// Keep the image covering its frame: at scale s the pan may reach (s-1)/2 of
// the frame on each axis (pan is stored as a fraction of the frame).
function clampView(v: View): View {
  if (v.zoom <= 100) return FIT;
  const m = (v.zoom / 100 - 1) / 2;
  return {
    zoom: v.zoom,
    x: Math.max(-m, Math.min(m, v.x)),
    y: Math.max(-m, Math.min(m, v.y)),
  };
}

// Zoom to `zoom` keeping the point under the cursor fixed.
// (cx, cy) = cursor offset from the frame centre, as a fraction of the frame.
function zoomAt(v: View, zoom: number, cx: number, cy: number): View {
  const z = Math.max(100, Math.min(MAX_ZOOM, Math.round(zoom)));
  const r = z / v.zoom;
  return clampView({ zoom: z, x: cx - (cx - v.x) * r, y: cy - (cy - v.y) * r });
}

export function SurveyView({
  viewBar,
  selectedIndex,
  dupIndex,
  onSelectPhoto,
  onOpenInLoupe,
  zoom,
  onZoomChange,
  cullComplete,
  ratings,
  ai,
  onOpenShortcuts,
}: {
  // Filter row (ViewBar) — sits above the image area only.
  viewBar?: React.ReactNode;
  // Album image + which photo of its duplicate set is active. The comparison
  // set starts as that image's whole duplicate set (same count as Loupe).
  selectedIndex: number;
  dupIndex: number;
  onSelectPhoto: (id: number) => void;
  onOpenInLoupe: (i: number) => void;
  zoom: number;
  onZoomChange: (v: number) => void;
  cullComplete: boolean;
  // Cull filters exist only for an Automated cull (see LoupeView).
  cullFiltersVisible?: boolean;
  ratings: Ratings;
  // Loupe's rail + Key Faces panel sit on the right, same as in Loupe.
  ai: LoupeAIState;
  onOpenShortcuts?: (from: LoupeRailKey) => void;
}) {
  const [rail, setRail] = useState<LoupeRailKey>("ai");
  const [panelOpen, setPanelOpen] = useState(true);
  const [sprayOn, setSprayOn] = useState(false);
  const openOneClick = useCullStore((st) => st.openOneClick);
  const selectRail = (key: LoupeRailKey) => {
    if (key === "oneClick") return openOneClick();
    if (key === "keyboard") return onOpenShortcuts?.(rail);
    if (key === rail) setPanelOpen((v) => !v);
    else {
      setRail(key);
      setPanelOpen(true);
    }
  };
  // The comparison set, seeded with the selected image's duplicate set.
  const active = dupId(selectedIndex, dupIndex);
  const [members, setMembers] = useState<number[]>(() => duplicateIds(selectedIndex));
  const [sync, setSync] = useState(true);
  // Space: preview the active photo large over the grid.
  const [peek, setPeek] = useState(false);
  // On: , / . cycle through the duplicate stack. Off: they jump to the previous /
  // next scene instead.
  const [cycleOn, setCycleOn] = useState(true);
  const [shared, setShared] = useState<View>(FIT);
  const [views, setViews] = useState<Record<number, View>>({});
  // Flags are shared with the right-click menu (one set for the whole album).
  const menuApi = useContext(PhotoMenuContext);
  const flags = useMemo(
    () => Object.fromEntries([...(menuApi?.flagged ?? [])].map((i) => [i, true])),
    [menuApi?.flagged],
  );
  // Photos in view (1-8): the rest of a long set is further rows, reached by
  // scrolling the grid.
  const [nv, setNv] = useState(4);
  // Key faces: the face every photo is zoomed to (null = whole photo).
  const [activeFace, setActiveFace] = useState<number | null>(null);
  const [faceSize, setFaceSize] = useState(76);
  const [faceScores, setFaceScores] = useState(true);
  const [removed, setRemoved] = useState<{
    idx: number;
    at: number;
    prevRating: number | null;
    key: number;
  } | null>(null);
  const toastTimer = useRef<number | undefined>(undefined);

  const viewOf = useCallback(
    (id: number): View => (sync ? shared : (views[id] ?? FIT)),
    [sync, shared, views],
  );
  const setViewOf = useCallback(
    (id: number, v: View) => {
      const c = clampView(v);
      if (c.zoom <= 100) setActiveFace(null);
      if (sync) setShared(c);
      else setViews((p) => ({ ...p, [id]: c }));
    },
    [sync],
  );

  // The image changed from outside (e.g. Undo walking back through
  // navigation): show that image's duplicate set.
  useEffect(() => {
    setMembers((prev) => (prev.includes(active) ? prev : duplicateIds(selectedIndex)));
  }, [active, selectedIndex]);

  // Show an image's whole duplicate set (what Loupe's strip traverses).
  const loadSet = useCallback(
    (image: number) => {
      if (image < 0 || image >= ALBUM_TOTAL) return;
      setMembers(duplicateIds(image));
      onSelectPhoto(dupId(image, 0));
    },
    [onSelectPhoto],
  );
  const openPhoto = (id: number) => {
    onSelectPhoto(id);
    onOpenInLoupe(imageOf(id));
  };

  const activeView = viewOf(active);

  // ---- key faces: zoom every photo to a face ----
  const faceView = (id: number, k: number): View => {
    const { x, y } = facePos(imageOf(id), k);
    const s = FACE_ZOOM / 100;
    return clampView({ zoom: FACE_ZOOM, x: -s * (x - 0.5), y: -s * (y - 0.5) });
  };
  const applyFace = (k: number) => {
    setActiveFace(k);
    if (sync) setShared(faceView(active, k));
    else setViews(Object.fromEntries(members.map((m) => [m, faceView(m, k)])));
  };
  const exitFace = () => {
    setActiveFace(null);
    if (sync) setShared(FIT);
    else setViews({});
  };
  const selectFace = (k: number) => (activeFace === k ? exitFace() : applyFace(k));
  const stepFace = (d: number) => {
    const n = faceCount(selectedIndex);
    if (n === 0) return;
    applyFace(activeFace === null ? (d > 0 ? 0 : n - 1) : (activeFace + d + n) % n);
  };
  // A different image has different faces: back to the whole photo.
  useEffect(() => {
    setActiveFace(null);
    setShared(FIT);
    setViews({});
  }, [selectedIndex]);
  const faceControls: FaceControls = {
    active: activeFace,
    onSelect: selectFace,
    size: Math.max(FACE_SIZE_MIN, Math.min(FACE_SIZE_MAX, faceSize)),
    onSize: setFaceSize,
    scores: faceScores,
    onScores: setFaceScores,
  };

  // ---- membership ----
  const removeMember = useCallback(
    (idx: number, opts?: { toast?: boolean; unrate?: boolean }) => {
      if (members.length <= 1 || !members.includes(idx)) return;
      const at = members.indexOf(idx);
      const next = members.filter((m) => m !== idx);
      setMembers(next);
      if (idx === active) onSelectPhoto(next[Math.min(at, next.length - 1)]);
      if (opts?.toast === false) return;
      const prevRating = opts?.unrate ? ratings.ratingOf(idx) : null;
      if (opts?.unrate) ratings.setRating(idx, 0);
      window.clearTimeout(toastTimer.current);
      toastTimer.current = window.setTimeout(() => setRemoved(null), TOAST_MS);
      setRemoved({ idx, at, prevRating, key: Date.now() });
    },
    [members, active, onSelectPhoto, ratings],
  );

  const undoRemove = useCallback(() => {
    if (!removed) return;
    window.clearTimeout(toastTimer.current);
    setMembers((p) => {
      if (p.includes(removed.idx)) return p;
      const n = p.slice();
      n.splice(Math.min(removed.at, n.length), 0, removed.idx);
      return n;
    });
    if (removed.prevRating !== null) ratings.setRating(removed.idx, removed.prevRating);
    onSelectPhoto(removed.idx);
    setRemoved(null);
  }, [removed, ratings, onSelectPhoto]);

  useEffect(() => () => window.clearTimeout(toastTimer.current), []);

  const toggleMember = (idx: number) => {
    if (members.includes(idx)) removeMember(idx, { toast: false });
    else {
      setMembers((p) => [...p, idx]);
      onSelectPhoto(idx);
    }
  };

  // Drag a photo's name bar onto another to reorder.
  const reorder = (from: number, before: number) => {
    if (from === before) return;
    setMembers((p) => {
      const n = p.filter((m) => m !== from);
      const at = n.indexOf(before);
      n.splice(at < 0 ? n.length : at, 0, from);
      return n;
    });
  };

  // ---- selection / rating helpers ----
  const selectPhoto = (id: number) => ratings.setRating(id, 5);
  const swapSelected = () => {
    const sel = members.find((m) => m !== active && ratings.ratingOf(m) === 5);
    if (sel === undefined) {
      selectPhoto(active);
      return;
    }
    const ar = ratings.ratingOf(active);
    ratings.setRating(sel, ar === 5 ? 0 : ar);
    ratings.setRating(active, 5);
  };
  const toggleFlag = (id: number) => menuApi?.toggleFlag([id]);

  // ---- sync lock ----
  const toggleSync = () => {
    if (sync) {
      const copy: Record<number, View> = {};
      members.forEach((m) => (copy[m] = shared));
      setViews(copy);
      setSync(false);
    } else {
      setShared(viewOf(active));
      setSync(true);
    }
  };

  // ---- keyboard ----
  const keyRef = useRef<(e: KeyboardEvent) => void>(() => {});
  keyRef.current = (e: KeyboardEvent) => {
    const t = e.target as HTMLElement | null;
    if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
    if (
      document.body.classList.contains("as-import-body") ||
      document.querySelector('[role="dialog"]')
    )
      return;
    const cmd = e.metaKey || e.ctrlKey;
    const key = e.key;

    // ⌘Z undoes the last removal first (captured so album Undo doesn't also run).
    if (cmd && !e.shiftKey && key.toLowerCase() === "z" && removed) {
      e.preventDefault();
      e.stopImmediatePropagation();
      undoRemove();
      return;
    }
    // ⌥←/⌥→ step through the faces.
    if (e.altKey && !cmd && (key === "ArrowLeft" || key === "ArrowRight")) {
      e.preventDefault();
      stepFace(key === "ArrowRight" ? 1 : -1);
      return;
    }
    if (cmd || e.altKey) return;

    // Moving to another photo or set closes the preview (as in the prototype).
    if (peek && ["Tab", ",", ".", "ArrowLeft", "ArrowRight"].includes(key)) setPeek(false);

    // + / - zoom the active photo (in the preview as well as the grid).
    if (key === "+" || key === "=" || key === "-" || key === "_") {
      e.preventDefault();
      const z = key === "+" || key === "=" ? activeView.zoom * 1.25 : activeView.zoom / 1.25;
      setViewOf(active, zoomAt(activeView, z, 0, 0));
      return;
    }

    const at = members.indexOf(active);
    const cycle = (d: number) => {
      if (members.length < 2) return;
      onSelectPhoto(members[(Math.max(0, at) + d + members.length) % members.length]);
    };

    if ((key === "," || key === ".") && !cycleOn) {
      e.preventDefault();
      loadSet(selectedIndex + (key === "." ? 1 : -1));
    } else if (key === "Tab" || key === "," || key === ".") {
      e.preventDefault();
      cycle(key === "," || (key === "Tab" && e.shiftKey) ? -1 : 1);
    } else if (key === "ArrowLeft" || key === "ArrowRight") {
      e.preventDefault();
      const d = key === "ArrowRight" ? 1 : -1;
      if (e.shiftKey) {
        // Add the neighbouring image to the comparison.
        const imgs = members.map(imageOf);
        const n = (d > 0 ? Math.max(...imgs) : Math.min(...imgs)) + d;
        if (n >= 0 && n < ALBUM_TOTAL) {
          const id = dupId(n, 0);
          setMembers((p) => (p.includes(id) ? p : [...p, id]));
          onSelectPhoto(id);
        }
      } else {
        // Move on to the next / previous image's duplicate set.
        loadSet(selectedIndex + d);
      }
    } else if (key === "a" || key === "A") {
      e.preventDefault();
      selectPhoto(active);
    } else if (key === "s" || key === "S") {
      e.preventDefault();
      swapSelected();
    } else if (key === "d" || key === "D") {
      e.preventDefault();
      toggleFlag(active);
    } else if (key === "x" || key === "X" || key === "0") {
      e.preventDefault();
      // The global handler already sets rating 0 for the digit key.
      if (members.length > 1) removeMember(active, { unrate: key !== "0" });
      else if (key !== "0") ratings.setRating(active, 0);
    } else if (key === " ") {
      e.preventDefault();
      (document.activeElement as HTMLElement | null)?.blur?.();
      setPeek((v) => !v);
    } else if (key === "Enter") {
      e.preventDefault();
      openPhoto(active);
    } else if (key === "Escape") {
      if (peek) setPeek(false);
      else if (activeFace !== null) exitFace();
      else if (activeView.zoom > 100) setViewOf(active, FIT);
    }
  };
  useEffect(() => {
    const h = (e: KeyboardEvent) => keyRef.current(e);
    window.addEventListener("keydown", h, true);
    return () => window.removeEventListener("keydown", h, true);
  }, []);

  return (
    <div className="flex min-h-0 min-w-0 flex-1">
      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
        {viewBar}
        <div className="relative flex min-h-0 flex-1 flex-col">
          <SurveyGrid
            members={members}
            faceScore={
              activeFace === null
                ? null
                : (id) => {
                    const n = faceCount(imageOf(id));
                    return activeFace < n ? faceScore(imageOf(id), activeFace) : null;
                  }
            }
            active={active}
            perView={nv}
            ratings={ratings}
            flags={flags}
            cullComplete={cullComplete}
            viewOf={viewOf}
            setViewOf={setViewOf}
            onActivate={onSelectPhoto}
            onOpenInLoupe={openPhoto}
            onRemove={(i) => removeMember(i)}
            onToggleFlag={toggleFlag}
            onReorder={reorder}
          />
          {peek && (
            <SurveyPeek
              id={active}
              view={activeView}
              onView={(v) => setViewOf(active, v)}
              onClose={() => setPeek(false)}
            />
          )}
          <SurveyToast removed={removed} onUndo={undoRemove} />
        </div>
        <AlbumFilmstrip
          selectedIndex={selectedIndex}
          onSelect={(i, e) => (e?.shiftKey ? toggleMember(dupId(i, 0)) : loadSet(i))}
          cullComplete={cullComplete}
          highlight={members.map(imageOf)}
        />
        <BottomBar
          zoom={zoom}
          onZoomChange={onZoomChange}
          showZoom={false}
          showSprayCan={false}
          showCompare
          index={Math.max(0, members.indexOf(active))}
          total={members.length}
          countSuffix="Photos"
          imageZoom={{
            fit: activeView.zoom <= 100,
            percent: activeView.zoom,
            onFit: () => setViewOf(active, FIT),
            onPercent: (p) => setViewOf(active, p <= 100 ? FIT : zoomAt(activeView, p, 0, 0)),
          }}
          syncZoom={{ on: sync, onToggle: toggleSync }}
          cycle={{ on: cycleOn, onToggle: () => setCycleOn((v) => !v) }}
          center={<PhotosInView value={nv} onChange={setNv} />}
        />
      </div>
      {panelOpen && (
        <div className="relative flex min-h-0 shrink-0">
          <LoupeRailPanel
            activeRail={rail}
            selectedIndex={selectedIndex}
            ai={ai}
            faces={faceControls}
          />
        </div>
      )}
      <LoupeRail
        tab="cull"
        activeRail={panelOpen ? rail : null}
        onSelect={selectRail}
        spray={{ on: sprayOn, onToggle: () => setSprayOn((v) => !v) }}
      />
    </div>
  );
}

// Bottom-bar slider: how many photos are on screen at once. Left = more (small
// photos), right = fewer (big photos).
function PhotosInView({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const MAX_N = 8;
  const pct = ((MAX_N - value) / (MAX_N - 1)) * 100;
  return (
    <div className="flex items-center gap-1.5">
      <IconTooltip label="More photos in view" side="top">
        <button
          type="button"
          aria-label="More photos in view"
          onClick={() => onChange(Math.min(MAX_N, value + 1))}
          className="rounded p-0.5 text-[#888] hover:text-white"
        >
          <LayoutGrid className="h-3.5 w-3.5" strokeWidth={1.5} />
        </button>
      </IconTooltip>
      <div className="w-[88px]" aria-label="Photos in view" title={`${value} in view`}>
        <GradientSlider
          value={pct}
          onChange={(p) => onChange(MAX_N - Math.round((p / 100) * (MAX_N - 1)))}
          centered={false}
        />
      </div>
      <IconTooltip label="Fewer photos in view" side="top">
        <button
          type="button"
          aria-label="Fewer photos in view"
          onClick={() => onChange(Math.max(1, value - 1))}
          className="rounded p-0.5 text-[#888] hover:text-white"
        >
          <Square className="h-3.5 w-3.5" strokeWidth={1.5} />
        </button>
      </IconTooltip>
    </div>
  );
}

// Space: the active photo large over the whole grid area. Click zooms to 200%
// at that point (click again to fit); drag pans; Space / Esc closes.
function SurveyPeek({
  id,
  view,
  onView,
  onClose,
}: {
  id: number;
  view: View;
  onView: (v: View) => void;
  onClose: () => void;
}) {
  const areaRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const [area, setArea] = useState({ w: 0, h: 0 });
  const pan = useRef<{ x: number; y: number; vx: number; vy: number } | null>(null);
  const moved = useRef(false);
  const [panning, setPanning] = useState(false);
  const zoomed = view.zoom > 100;

  useEffect(() => {
    const el = areaRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const r = entries[0]?.contentRect;
      if (r) setArea({ w: r.width, h: r.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const frameW = Math.floor(Math.min(area.w, area.h * AR));
  const frameH = Math.floor(frameW / AR);

  // Pinch / ctrl+wheel zooms at the cursor; the wheel pans a zoomed photo.
  const live = useRef({ view, onView });
  live.current = { view, onView };
  useEffect(() => {
    const el = areaRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      const { view: v, onView: set } = live.current;
      const r = frameRef.current?.getBoundingClientRect();
      if (!r || !r.width) return;
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const cx = (e.clientX - r.left) / r.width - 0.5;
        const cy = (e.clientY - r.top) / r.height - 0.5;
        set(zoomAt(v, v.zoom * Math.exp(-e.deltaY * 0.01), cx, cy));
      } else if (v.zoom > 100) {
        e.preventDefault();
        set(clampView({ ...v, x: v.x - e.deltaX / r.width, y: v.y - e.deltaY / r.height }));
      }
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  return (
    <div className="absolute inset-0 z-20 flex flex-col bg-[#161616] px-2 pb-2 pt-1.5">
      <div className="mb-1 flex h-[30px] shrink-0 items-center gap-2.5 pl-0.5">
        <span className="text-[12px] font-medium text-[#d0d0d0]">Preview</span>
        <span className="text-[12px] text-[#7d7d7d]">{imgName(id)}</span>
        <button
          type="button"
          aria-label="Close preview"
          onClick={onClose}
          className="ml-auto flex h-6 w-6 items-center justify-center rounded text-neutral-400 hover:bg-white/10 hover:text-white"
        >
          <X className="h-3.5 w-3.5" strokeWidth={2} />
        </button>
      </div>
      <div
        ref={areaRef}
        onClick={(e) => {
          if (moved.current) {
            moved.current = false;
            return;
          }
          if (zoomed) return onView(FIT);
          const r = frameRef.current?.getBoundingClientRect();
          if (!r) return;
          onView(
            zoomAt(
              view,
              CLICK_ZOOM,
              (e.clientX - r.left) / r.width - 0.5,
              (e.clientY - r.top) / r.height - 0.5,
            ),
          );
        }}
        onPointerDown={(e) => {
          moved.current = false;
          if (!zoomed || e.button !== 0) return;
          pan.current = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y };
          e.currentTarget.setPointerCapture(e.pointerId);
          setPanning(true);
        }}
        onPointerMove={(e) => {
          const p = pan.current;
          if (!p || !frameW || !frameH) return;
          const dx = e.clientX - p.x;
          const dy = e.clientY - p.y;
          if (Math.abs(dx) + Math.abs(dy) > 3) moved.current = true;
          onView({ ...view, x: p.vx + dx / frameW, y: p.vy + dy / frameH });
        }}
        onPointerUp={() => {
          pan.current = null;
          setPanning(false);
        }}
        onPointerCancel={() => {
          pan.current = null;
          setPanning(false);
        }}
        className={`flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-[#1b1b1b] ${
          zoomed ? (panning ? "cursor-grabbing" : "cursor-grab") : "cursor-zoom-in"
        }`}
      >
        <div
          ref={frameRef}
          data-frame
          style={{ width: frameW, height: frameH }}
          className="relative shrink-0"
        >
          <img
            src={photoUrl(id, 1600)}
            alt={imgName(id)}
            draggable={false}
            style={{
              transform: `translate(${view.x * frameW}px, ${view.y * frameH}px) scale(${view.zoom / 100})`,
              transition: panning ? "none" : "transform 120ms ease-out",
            }}
            className="pointer-events-none h-full w-full select-none object-contain"
          />
        </div>
      </div>
    </div>
  );
}

function SurveyToast({
  removed,
  onUndo,
}: {
  removed: { idx: number; key: number } | null;
  onUndo: () => void;
}) {
  if (!removed) return null;
  return (
    <div
      key={removed.key}
      role="status"
      className="pointer-events-auto absolute bottom-3 left-1/2 z-30 flex -translate-x-1/2 items-center gap-3 rounded-lg border border-white/10 bg-[#2a2a2a] py-1.5 pl-3 pr-1.5 text-[12px] text-neutral-200 shadow-xl"
    >
      <span>Removed {imgName(removed.idx)}</span>
      <button
        type="button"
        onClick={onUndo}
        className="rounded px-2 py-0.5 font-medium text-white hover:bg-white/10"
      >
        Undo
        <span className="ml-1.5 text-neutral-400">⌘Z</span>
      </button>
    </div>
  );
}

function SurveyGrid({
  perView,
  members,
  active,
  ratings,
  flags,
  cullComplete,
  faceScore,
  viewOf,
  setViewOf,
  onActivate,
  onOpenInLoupe,
  onRemove,
  onToggleFlag,
  onReorder,
}: {
  // How many photos fit on screen at once; a longer set scrolls in rows.
  perView: number;
  members: number[];
  active: number;
  ratings: Ratings;
  flags: Record<number, boolean>;
  cullComplete: boolean;
  // Score of the face every photo is zoomed to (null when showing whole photos).
  faceScore: ((id: number) => { eyesOpen: boolean; focus: FaceFocus } | null) | null;
  viewOf: (id: number) => View;
  setViewOf: (id: number, v: View) => void;
  onActivate: (i: number) => void;
  onOpenInLoupe: (i: number) => void;
  onRemove: (i: number) => void;
  onToggleFlag: (i: number) => void;
  onReorder: (from: number, before: number) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [dragId, setDragId] = useState<number | null>(null);
  const [overId, setOverId] = useState<number | null>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const r = entries[0]?.contentRect;
      if (r) setBox({ w: r.width, h: r.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Layout follows the photos-in-view count; every row is the same height, so a
  // longer set simply scrolls past whole rows.
  const shown = Math.max(1, Math.min(perView, members.length));
  const L = useMemo(() => layout(shown, box.w, box.h), [shown, box.w, box.h]);
  const shownRows = Math.ceil(shown / L.cols);
  // Cells and their dark canvas fill the area; the photo is the biggest 3:2
  // frame that fits inside the canvas.
  const availW = (box.w - (L.cols - 1) * GAP) / L.cols - CELL_PAD;
  const availH = (box.h - (shownRows - 1) * GAP) / shownRows - CELL_CHROME_H;
  const frameW = Math.max(0, Math.floor(Math.min(availW, availH * AR)));
  const frameH = Math.floor(frameW / AR);
  const rowH = Math.max(0, Math.floor((box.h - (shownRows - 1) * GAP) / shownRows));

  // Bring the active photo into view when it changes (keys, filmstrip, undo).
  useEffect(() => {
    scrollRef.current
      ?.querySelector<HTMLElement>(`[data-pane="${active}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [active, L.cols, rowH]);

  // Pinch (ctrl+wheel) zooms at the cursor; the wheel pans a zoomed photo.
  // Otherwise it scrolls the grid natively. Needs a non-passive listener to
  // stop page scroll while zooming.
  const live = useRef({ viewOf, setViewOf, onActivate, active });
  live.current = { viewOf, setViewOf, onActivate, active };
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      const { viewOf: vo, setViewOf: sv, onActivate: act, active: a } = live.current;
      const paneEl = (e.target as HTMLElement).closest<HTMLElement>("[data-pane]");
      const frame = paneEl?.querySelector<HTMLElement>("[data-frame]");
      const id = paneEl ? Number(paneEl.dataset.pane) : null;
      const v = id !== null ? vo(id) : null;
      if (id !== null && v && frame && e.ctrlKey) {
        e.preventDefault();
        const r = frame.getBoundingClientRect();
        const cx = (e.clientX - r.left) / r.width - 0.5;
        const cy = (e.clientY - r.top) / r.height - 0.5;
        sv(id, zoomAt(v, v.zoom * Math.exp(-e.deltaY * 0.01), cx, cy));
        if (id !== a) act(id);
      } else if (id !== null && v && frame && v.zoom > 100) {
        e.preventDefault();
        const r = frame.getBoundingClientRect();
        sv(id, { ...v, x: v.x - e.deltaX / r.width, y: v.y - e.deltaY / r.height });
      }
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  return (
    <div
      ref={scrollRef}
      className={`min-h-0 flex-1 overflow-y-auto overflow-x-hidden [scrollbar-color:#4a4a4a_transparent] [scrollbar-gutter:stable] [scrollbar-width:thin] `}
    >
      {/* Cells share the area equally and sit edge to edge (2px gap). */}
      <div className="flex min-h-full items-center">
        <div
          className="grid w-full content-start"
          style={{
            gridTemplateColumns: `repeat(${L.cols}, minmax(0, 1fr))`,
            gridAutoRows: `${rowH}px`,
            gap: `${GAP}px`,
          }}
        >
          {frameW > 0 &&
            members.map((idx) => (
              <SurveyPane
                key={idx}
                id={idx}
                frameW={frameW}
                frameH={frameH}
                isActive={idx === active}
                rating={ratings.ratingOf(idx)}
                rated={cullComplete || ratings.ratingOf(idx) > 0}
                flagged={!!flags[idx]}
                face={faceScore ? faceScore(idx) : null}
                view={viewOf(idx)}
                canRemove={members.length > 1}
                dragging={dragId === idx}
                dropTarget={overId === idx && dragId !== null && dragId !== idx}
                onActivate={() => onActivate(idx)}
                onOpenInLoupe={() => onOpenInLoupe(idx)}
                onRemove={() => onRemove(idx)}
                onRate={(v) => ratings.setRating(idx, v)}
                onToggleFlag={() => onToggleFlag(idx)}
                onView={(v) => setViewOf(idx, v)}
                onDragStart={() => setDragId(idx)}
                onDragOver={() => setOverId(idx)}
                onDrop={() => {
                  if (dragId !== null) onReorder(dragId, idx);
                  setDragId(null);
                  setOverId(null);
                }}
                onDragEnd={() => {
                  setDragId(null);
                  setOverId(null);
                }}
              />
            ))}
        </div>
      </div>
    </div>
  );
}

function SurveyPane({
  id,
  frameW,
  frameH,
  isActive,
  rating,
  rated,
  flagged,
  face,
  view,
  canRemove,
  dragging,
  dropTarget,
  onActivate,
  onOpenInLoupe,
  onRemove,
  onRate,
  onToggleFlag,
  onView,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: {
  id: number;
  frameW: number;
  frameH: number;
  isActive: boolean;
  rating: number;
  rated: boolean;
  flagged: boolean;
  face: { eyesOpen: boolean; focus: FaceFocus } | null;
  view: View;
  canRemove: boolean;
  dragging: boolean;
  dropTarget: boolean;
  onActivate: () => void;
  onOpenInLoupe: () => void;
  onRemove: () => void;
  onRate: (v: number) => void;
  onToggleFlag: () => void;
  onView: (v: View) => void;
  onDragStart: () => void;
  onDragOver: () => void;
  onDrop: () => void;
  onDragEnd: () => void;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const pan = useRef<{ x: number; y: number; vx: number; vy: number } | null>(null);
  const moved = useRef(false);
  const [panning, setPanning] = useState(false);
  const zoomed = view.zoom > 100;

  const onPointerDown = (e: React.PointerEvent) => {
    moved.current = false;
    if (!isActive || !zoomed || e.button !== 0) return;
    pan.current = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y };
    e.currentTarget.setPointerCapture(e.pointerId);
    setPanning(true);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const p = pan.current;
    if (!p || !frameW || !frameH) return;
    const dx = e.clientX - p.x;
    const dy = e.clientY - p.y;
    if (Math.abs(dx) + Math.abs(dy) > 3) moved.current = true;
    onView({ ...view, x: p.vx + dx / frameW, y: p.vy + dy / frameH });
  };
  const onPointerUp = () => {
    pan.current = null;
    setPanning(false);
  };

  const onClick = (e: React.MouseEvent) => {
    if (e.metaKey || e.ctrlKey) {
      if (canRemove) onRemove();
      return;
    }
    if (moved.current) {
      moved.current = false;
      return;
    }
    if (!isActive) {
      onActivate();
      return;
    }
    if (zoomed) {
      onView(FIT);
      return;
    }
    const r = frameRef.current?.getBoundingClientRect();
    if (!r) return;
    onView(
      zoomAt(
        view,
        CLICK_ZOOM,
        (e.clientX - r.left) / r.width - 0.5,
        (e.clientY - r.top) / r.height - 0.5,
      ),
    );
  };

  return (
    <div
      data-pane={id}
      onDragOver={(e) => {
        e.preventDefault();
        onDragOver();
      }}
      onDrop={(e) => {
        e.preventDefault();
        onDrop();
      }}
      className={`group relative flex min-h-0 min-w-0 flex-col border-2 p-0.5 transition-opacity ${
        isActive ? "border-[#f2f2f2]" : "border-transparent hover:border-[#3a3a3a]"
      } ${dragging ? "opacity-40" : ""} ${dropTarget ? "bg-white/[0.06]" : ""}`}
    >
      {/* The canvas fills the cell; the photo is fitted inside and clipped when zoomed. */}
      <div className="flex min-h-0 flex-1">
        <PhotoContextMenu id={id} surface="survey">
          <div
            onClick={onClick}
            onDoubleClick={(e) => {
              if (e.metaKey || e.ctrlKey) return;
              onOpenInLoupe();
            }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            className={`relative flex min-w-0 flex-1 items-center justify-center overflow-hidden bg-[#1b1b1b] ${
              !isActive
                ? "cursor-pointer"
                : zoomed
                  ? panning
                    ? "cursor-grabbing"
                    : "cursor-grab"
                  : "cursor-zoom-in"
            }`}
          >
            <div
              ref={frameRef}
              data-frame
              style={{ width: frameW, height: frameH }}
              className="relative shrink-0"
            >
              <img
                src={photoUrl(id, 1200)}
                alt={imgName(id)}
                draggable={false}
                style={{
                  transform: `translate(${view.x * frameW}px, ${view.y * frameH}px) scale(${view.zoom / 100})`,
                  transition: panning ? "none" : "transform 120ms ease-out",
                }}
                className="pointer-events-none h-full w-full select-none object-contain"
              />
            </div>

            {flagged && (
              <span className="pointer-events-none absolute left-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded bg-black/60 text-white">
                <Flag className="h-3 w-3 fill-current" strokeWidth={1.75} />
              </span>
            )}
            {/* While zoomed to a key face: that face's eyes / focus score. */}
            {face && (
              <span
                role="status"
                aria-label={`Eyes ${face.eyesOpen ? "open" : "closed"}, ${FOCUS_LABEL[face.focus].toLowerCase()}`}
                className={`pointer-events-none absolute top-1.5 flex items-center gap-1.5 rounded-md bg-[#161616]/90 px-1.5 py-1 ${
                  flagged ? "left-9" : "left-1.5"
                }`}
              >
                {face.eyesOpen ? (
                  <Eye className="h-4 w-4 text-[#4cc38a]" strokeWidth={1.75} />
                ) : (
                  <EyeOff className="h-4 w-4 text-[#e2c044]" strokeWidth={1.75} />
                )}
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: FOCUS_COLOR[face.focus] }}
                />
              </span>
            )}
            {canRemove && (
              <IconTooltip label="Hide from view" shortcut={["⌘", "Click"]} side="bottom">
                <button
                  type="button"
                  aria-label={`Remove ${imgName(id)} from view`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove();
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                  className="absolute right-1.5 top-1.5 hidden h-6 w-6 items-center justify-center rounded bg-black/60 text-neutral-200 hover:bg-black/80 group-hover:flex"
                >
                  <X className="h-3.5 w-3.5" strokeWidth={2} />
                </button>
              </IconTooltip>
            )}
          </div>
        </PhotoContextMenu>
      </div>

      {/* Under the photo: name on the left (drag handle), rating + flag right. */}
      <div
        style={{ height: UNDER_H }}
        className="mt-0.5 flex shrink-0 items-center justify-between gap-2 px-2"
        onClick={(e) => e.stopPropagation()}
      >
        <span
          draggable
          onDragStart={(e) => {
            e.dataTransfer.effectAllowed = "move";
            e.dataTransfer.setData("text/plain", String(id));
            onDragStart();
          }}
          onDragEnd={onDragEnd}
          title={imgName(id)}
          className={`min-w-0 cursor-grab truncate text-[12px] tracking-[.02em] active:cursor-grabbing ${
            isActive ? "text-[#d0d0d0]" : "text-[#9a9a9a]"
          }`}
        >
          {imgName(id)}
        </span>
        <div className="flex shrink-0 items-center gap-1">
          <RatingChip rating={rated ? rating : 0} onRate={onRate} />
          <IconTooltip label={flagged ? "Unflag" : "Flag"} shortcut="D" side="top">
            <button
              type="button"
              aria-pressed={flagged}
              aria-label={flagged ? `Unflag ${imgName(id)}` : `Flag ${imgName(id)}`}
              onClick={onToggleFlag}
              className={`flex h-6 w-6 items-center justify-center rounded ${
                flagged ? "text-white" : "text-neutral-500 hover:text-neutral-200"
              }`}
            >
              <Flag className={`h-3.5 w-3.5 ${flagged ? "fill-current" : ""}`} strokeWidth={1.75} />
            </button>
          </IconTooltip>
        </div>
      </div>
    </div>
  );
}

// Same rule as the prototype: pick the column count (never more than two rows)
// that gives the biggest photo once each cell's name row and rating row are
// taken out; rows are weighted down when the last one would be mostly empty.
const CHROME_H = CELL_CHROME_H;
const CHROME_W = CELL_PAD;
function layout(count: number, width: number, height: number): { cols: number; rows: number } {
  if (count <= 0) return { cols: 1, rows: 1 };
  let best = { cols: Math.ceil(count / 2), score: -1 };
  for (let cols = Math.ceil(count / 2); cols <= count; cols++) {
    const rows = Math.ceil(count / cols);
    const cw = (width - (cols - 1) * GAP) / cols - CHROME_W;
    const ch = (height - (rows - 1) * GAP) / rows - CHROME_H;
    if (cw <= 0 || ch <= 0) continue;
    const iw = Math.min(cw, ch * AR);
    const score = iw * (iw / AR) * Math.pow(count / (cols * rows), 0.7);
    if (score > best.score + 1) best = { cols, score };
  }
  return { cols: best.cols, rows: Math.ceil(count / best.cols) };
}
