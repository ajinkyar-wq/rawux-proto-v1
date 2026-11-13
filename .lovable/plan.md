## Goal

Build a pixel-faithful static replica of the Aftershoot "first screen" (pre-AI-actions state) as the home route. Just the UI shell — no real functionality, no AI behavior, no second screen yet.

## Scope (this turn)

Only screen 1 from the first screenshot:
- Top bar: Apple logo + "Aftershoot" title (dark window chrome)
- Toolbar row: home icon, grid/list view toggles, "Images" button, centered "Album Name", right side sort/filter icons, "Gallery" pill, "Export" pill
- Main canvas: dark empty grid area with one highlighted top-left tile (the only "loaded" thumbnail slot), faint dividing grid lines
- Right rail: three action cards (AI Cull, AI Edit, AI Retouch) with icons, and below them a "One-Click Cull, Edit & Retouch" banner with lightning bolt
- Far-right vertical icon strip: image, crop, sliders, info, history (top group) and cloud, keyboard, settings (bottom group)
- Bottom-left status: eye icon "1 / 232"
- Bottom-center: two pane-layout toggle icons

Not in scope: Key Faces / Duplicates panel from screenshot 2, any interactivity, real images, routing to a second screen.

## Implementation

- Replace `src/routes/index.tsx` placeholder with the prototype layout
- Add dark theme tokens to `src/styles.css` (near-black bg, subtle borders, orange accent `#f5a524`-ish for the lightning + "One-Click" text, green check dot)
- Use `lucide-react` icons (already standard): Home, LayoutGrid, PanelLeft, ImagePlus, ArrowUpDown, Filter, Cloud, Share, Scissors, Palette, Wand2, Zap, Crop, SlidersHorizontal, Info, History, Keyboard, Settings, Eye, Columns2
- Single-file component, semantic tokens only, no business logic
- Update route `head()` title/description to "Aftershoot"

## Technical notes

- Pure presentational JSX, no state
- Tailwind utilities + a couple of inline CSS vars for the grid line color
- Confirm visually via browser screenshot after build
