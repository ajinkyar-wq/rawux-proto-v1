import { useRef, useState } from 'react'
import { Button, PencilSimple, colors, radius, spacing, textStyle } from '../../ui-kit'

interface EditableAlbumNameProps {
	value: string
	onChange: (value: string) => void
	/** Shown, dimmed, while the name is empty. */
	placeholder?: string
	/** The name of an album that already exists can't be changed. */
	isReadOnly?: boolean
}

const MAX_NAME_WIDTH = 144
/** The button's own height at its 'xs' size, the same as the icon buttons beside it. */
const EDIT_HEIGHT = 24

/** Album name in the app bar: a quiet text button with a pencil that turns into an inline input when pressed. */
export function EditableAlbumName({ value, onChange, placeholder = 'Untitled Album', isReadOnly }: EditableAlbumNameProps) {
	const [isEditing, setIsEditing] = useState(false)
	const buttonRef = useRef<HTMLButtonElement>(null)
	// The input takes over exactly the box the button had, so nothing around it moves when editing starts or stops.
	const [width, setWidth] = useState<number | undefined>(undefined)

	if (isEditing && !isReadOnly) {
		return (
			<span
				style={{
					width,
					height: EDIT_HEIGHT,
					display: 'inline-flex',
					alignItems: 'center',
					gap: spacing[4],
					padding: `0 ${spacing[10]}`,
					boxSizing: 'border-box',
					flexShrink: 0,
					borderRadius: radius.sm,
					background: colors.surface.clearHover,
				}}
			>
				<input
					autoFocus
					value={value}
					onChange={(e) => onChange(e.target.value)}
					onBlur={() => setIsEditing(false)}
					onKeyDown={(e) => e.key === 'Enter' && setIsEditing(false)}
					placeholder={placeholder}
					aria-label="Album name"
					style={{ flex: 1, minWidth: 0, padding: 0, background: 'transparent', border: 'none', outline: 'none', color: colors.type.secondary, ...textStyle('body-14') }}
				/>
				<PencilSimple size={16} color={colors.type.secondary} style={{ flexShrink: 0 }} />
			</span>
		)
	}

	return (
		<Button
			ref={buttonRef}
			variant="ghost"
			size="xs"
			onClick={() => {
				setWidth(buttonRef.current?.offsetWidth)
				setIsEditing(true)
			}}
			disabled={isReadOnly}
			style={{ gap: spacing[4], maxWidth: MAX_NAME_WIDTH, color: colors.type.secondary, ...textStyle('body-14') }}
		>
			<span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value || placeholder}</span>
			{/* Button's own icon slot is 12px at this size; the pencil needs 16 to match the 14px album-name text. */}
			{!isReadOnly && <PencilSimple size={16} style={{ flexShrink: 0 }} />}
		</Button>
	)
}
