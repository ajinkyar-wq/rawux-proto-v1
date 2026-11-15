import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { edge, layer, modalWidth, radius, spacing, stroke, surface } from '../../tokens'

export interface ModalProps {
	isOpen: boolean
	onClose: () => void
	children: ReactNode
	width?: number
	/** 'default' is the standard panel dialog. 'feature' is the darker, rounder frame of the New Album dialog. */
	appearance?: 'default' | 'feature'
}

/** Reusable centered dialog with a backdrop scrim — for confirmations, pickers, and multi-option prompts. */
export function Modal({ isOpen, onClose, children, width = modalWidth.regular, appearance = 'default' }: ModalProps) {
	useEffect(() => {
		if (!isOpen) return
		const handleKeyDown = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
		// Bubble phase on document: a Menu or Finder opened on top handles Escape first, in the capture phase, and stops it here.
		document.addEventListener('keydown', handleKeyDown)
		return () => document.removeEventListener('keydown', handleKeyDown)
	}, [isOpen, onClose])

	if (!isOpen) return null

	return (
		<div
			style={{
				position: 'fixed',
				inset: 0,
				background: surface.overlay,
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				zIndex: layer.modal,
			}}
			onClick={onClose}
		>
			<div
				onClick={(e) => e.stopPropagation()}
				style={{
					width,
					maxWidth: `calc(100vw - ${spacing[48]})`,
					display: 'flex',
					flexDirection: 'column',
					gap: spacing[16],
					padding: spacing[20],
					background: appearance === 'feature' ? surface.dialog : surface.panel,
					border: `${stroke[1]} solid ${appearance === 'feature' ? edge.dialog : edge.default}`,
					borderRadius: appearance === 'feature' ? radius['3xl'] : radius.xl,
					// A dialog taller than the window scrolls inside itself instead of running off screen.
					maxHeight: `calc(100vh - ${spacing[48]})`,
					overflowY: 'auto',
				}}
			>
				{children}
			</div>
		</div>
	)
}
