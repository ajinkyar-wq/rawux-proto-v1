import { Toast } from '../../ui-kit'
import { useCullStore } from '../../store/useCullStore'

/** Renders the app's current toast message, if any. */
export function ToastHost() {
	const message = useCullStore((s) => s.toast)
	return message ? <Toast message={message} /> : null
}
