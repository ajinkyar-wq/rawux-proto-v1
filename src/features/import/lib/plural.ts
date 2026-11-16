/** "1 photo", "5 photos": the count with its noun in the right number. */
export function formatCount(count: number, noun: string): string {
	return `${count.toLocaleString()} ${noun}${count === 1 ? '' : 's'}`
}
