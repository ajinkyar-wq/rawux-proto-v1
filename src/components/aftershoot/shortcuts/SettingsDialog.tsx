import { useState } from 'react';
import { ExternalLink, X } from 'lucide-react';

/**
 * App Settings (title-bar gear). Keyboard shortcuts replaces the old five
 * shortcut tabs with a link: Settings closes, the Keyboard Shortcuts modal
 * opens, and closing it reopens Settings. Three prototype variations of that
 * link, switched from the pill above the window:
 *  - footer : underlined text link at the bottom of the menu, icon first;
 *  - top    : first menu item, underlined, icon on the right;
 *  - button : outlined button at the bottom of the menu.
 * The other panes aren't part of this prototype.
 */
const PANES = ['Color Labels', 'Import & Export', 'Language', 'Miscellaneous'] as const;
type Pane = (typeof PANES)[number] | 'Advanced';
type Variant = 'footer' | 'top' | 'button';

const VARIANT_LABELS: Record<Variant, string> = { footer: 'Footer link', top: 'Menu item', button: 'Footer button' };

export function SettingsDialog({
  open,
  onClose,
  onOpenShortcuts,
}: {
  open: boolean;
  onClose: () => void;
  /** Close Settings and open the Keyboard Shortcuts modal (Settings reopens after). */
  onOpenShortcuts: () => void;
}) {
  const [variant, setVariant] = useState<Variant>('footer');
  const [pane, setPane] = useState<Pane>('Color Labels');
  if (!open) return null;

  const navItem = (p: Pane) => (
    <button
      key={p}
      onClick={() => setPane(p)}
      className={`block w-full border-l-2 rounded-r-[6px] px-3 py-[9px] text-left text-[14px] transition-colors ${
        pane === p ? 'border-[#e2e2e2] bg-[#2a2a2a] text-[#e2e2e2]' : 'border-transparent text-[#8a8a8a] hover:text-[#cfcfcf]'
      }`}
    >
      {p}
    </button>
  );

  const shortcutsLabel = <span className="underline underline-offset-[3px]">Shortcuts</span>;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 pt-12" onClick={onClose}>
      <div
        className="relative flex h-[720px] max-h-[calc(100vh-5rem)] w-[1100px] max-w-[96vw] flex-col rounded-[8px] border border-[#303030] bg-[#1c1c1c] text-[#e2e2e2] shadow-2xl"
        style={{ fontFamily: 'Geist, sans-serif' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Prototype control, not part of Settings: sits just above its
            top-right corner, outside the box. */}
        <div className="absolute bottom-full right-0 mb-2 flex items-center gap-2 rounded-full border border-[#303030] bg-[#1c1c1c] py-1 pl-3 pr-1 text-[12px] text-[#8a8a8a] shadow-lg">
          Shortcuts in Settings:
          <span className="flex items-center gap-0.5">
            {(['footer', 'top', 'button'] as const).map((v) => (
              <button
                key={v}
                onClick={() => setVariant(v)}
                className={`rounded-full px-2.5 py-0.5 ${
                  variant === v ? 'bg-[#e2e2e2] text-[#1c1c1c]' : 'text-[#e2e2e2] hover:bg-[#2a2a2a]'
                }`}
              >
                {VARIANT_LABELS[v]}
              </button>
            ))}
          </span>
        </div>

        <div className="flex shrink-0 items-center justify-between px-6 pt-5 pb-4">
          <div className="text-[18px] font-semibold">Settings</div>
          <button onClick={onClose} aria-label="Close" className="text-[#8a8a8a] hover:text-[#e2e2e2]">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex min-h-0 flex-1">
          <nav className="flex w-[200px] shrink-0 flex-col pl-5 pr-3 pb-5">
            {variant === 'top' && (
              <button
                onClick={onOpenShortcuts}
                className="mb-1 flex w-full items-center justify-between gap-2 border-l-2 border-transparent px-3 py-[9px] text-left text-[14px] text-[#e2e2e2] hover:text-white"
              >
                {shortcutsLabel}
                <ExternalLink className="h-3.5 w-3.5 shrink-0 text-[#ababab]" />
              </button>
            )}
            {PANES.map(navItem)}
            <div className="my-3 h-px bg-[#2a2a2a]" />
            {navItem('Advanced')}

            {variant === 'footer' && (
              <button
                onClick={onOpenShortcuts}
                className="mt-auto flex items-center gap-2 px-3 text-[14px] text-[#e2e2e2] hover:text-white"
              >
                <ExternalLink className="h-3.5 w-3.5 shrink-0 text-[#ababab]" />
                {shortcutsLabel}
              </button>
            )}
            {variant === 'button' && (
              <button
                onClick={onOpenShortcuts}
                className="mt-auto flex h-[36px] w-fit items-center gap-2 rounded-[6px] border border-[#474747] px-4 text-[14px] text-[#e2e2e2] hover:bg-[#2a2a2a]"
              >
                {shortcutsLabel}
                <ExternalLink className="h-3.5 w-3.5 shrink-0 text-[#ababab]" />
              </button>
            )}
          </nav>

          <div className="flex min-h-0 min-w-0 flex-1 flex-col border-l border-[#2a2a2a] px-7 pb-5">
            <div className="text-[13px] text-[#6f6f6f]">Not part of this prototype.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
