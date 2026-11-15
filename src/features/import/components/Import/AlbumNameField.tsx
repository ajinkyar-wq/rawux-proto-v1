import { useState } from 'react'
import { PencilSimple, TextField, colors, spacing, textStyle } from '../../ui-kit'

interface AlbumNameFieldProps {
	value: string
	onChange: (value: string) => void
	/** Opens with the underline field focused, ready to type. */
	autoFocus?: boolean
	/** The name of an album that already exists can't be changed. */
	isReadOnly?: boolean
}

const FIELD_WIDTH = 300
const DEFAULT_NAME = 'Untitled Album'

/** The album name in the New Album dialog: an underline field while it is being edited, and a plain name with a pencil once it is not. */
export function AlbumNameField({ value, onChange, autoFocus, isReadOnly }: AlbumNameFieldProps) {
	const [isEditing, setIsEditing] = useState(!!autoFocus && !isReadOnly)

	if (isEditing && !isReadOnly) {
		return (
			<TextField
				variant="underline"
				width={FIELD_WIDTH}
				value={value}
				onChange={onChange}
				onBlur={() => setIsEditing(false)}
				onKeyDown={(e) => e.key === 'Enter' && setIsEditing(false)}
				placeholder="Enter Album Name"
				maxLength={80}
				autoFocus
				aria-label="Album name"
				trailingIcon={PencilSimple}
			/>
		)
	}

	return (
		<button
			type="button"
			disabled={isReadOnly}
			onClick={() => setIsEditing(true)}
			style={{
				alignSelf: 'flex-start',
				height: 32,
				display: 'inline-flex',
				alignItems: 'center',
				gap: spacing[8],
				padding: `0 ${spacing[4]}`,
				background: 'none',
				border: 'none',
				color: value ? colors.type.secondary : colors.type.muted,
				cursor: isReadOnly ? 'default' : 'pointer',
				...textStyle('body-14'),
			}}
		>
			<span>{value || DEFAULT_NAME}</span>
			{!isReadOnly && <PencilSimple size={16} color={colors.type.muted} />}
		</button>
	)
}
