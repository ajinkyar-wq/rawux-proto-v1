/** Not design-token values: the dialog widths this app uses, so every Modal lines up with one of them. */
export const modalWidth = {
	/** A short form: a few fields and a confirm button. */
	compact: 540,
	/** Anything with columns, a drop zone or a list. */
	regular: 700,
	/** The New Album dialog, sized so its 948px main card matches the design. */
	wide: 988,
} as const

/** How long hover and focus changes take to fade, so highlights ease in rather than snap. */
export const motion = {
	// Long enough to read as a fade on a large area, with the standard ease so the start and end are soft.
	hover: '0.25s cubic-bezier(0.4, 0, 0.2, 1)',
} as const

/** The properties that change on hover across controls: surfaces, text and icon colour, edges and opacity. */
export const hoverTransition = ['background-color', 'color', 'border-color', 'outline-color', 'opacity', 'box-shadow'].map((property) => `${property} ${motion.hover}`).join(', ')

/** How see-through things get when the app is busy or covered: `dimmed` for UI that is blocked but should stay readable, `scrim` for a panel laid over artwork. */
export const dimOpacity = { dimmed: 0.5, scrim: 0.85 } as const

/** Stacking order of the layers that open over the page, lowest first, so a toast always clears a menu and a menu a dialog. */
export const layer = { modal: 100, menu: 110, finder: 115, toast: 120 } as const

/** Shared dimensions of the import screens' panels, so Option 1 and Option 2 stay in step. */
export const layout = {
	/** The row under a panel or dialog that holds its main button or the ingest progress. */
	footerContentHeight: 32,
	/** The Title row of a Source or Destination panel: as tall as the action button beside it. */
	panelHeaderHeight: 28,
	/** The Source panel beside the photo grid. */
	sourcePanelWidth: 300,
	/** The Destination panel, wide enough for its longest option names without cutting them short. */
	destinationPanelWidth: 344,
} as const
