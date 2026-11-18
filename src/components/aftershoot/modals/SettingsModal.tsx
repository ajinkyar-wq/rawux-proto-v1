import { X } from "lucide-react";

export function SettingsModal({
  title,
  onClose,
  footer,
  children,
  widthClass = "w-[440px]",
}: {
  title: string;
  onClose: () => void;
  footer?: React.ReactNode;
  children: React.ReactNode;
  widthClass?: string;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className={`flex max-h-[85vh] flex-col rounded-lg border border-white/10 bg-[#1c1c1c] shadow-2xl ${widthClass}`}
        onClick={(e) => e.stopPropagation()}
      >
        <ModalHeader title={title} onClose={onClose} />
        <div className="flex-1 overflow-y-auto px-4 pb-4 pt-1">{children}</div>
        {footer && (
          <div className="flex items-center justify-between border-t border-white/5 px-4 py-2.5">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

function ModalHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div className="flex items-center justify-between px-4 pb-2 pt-3">
      <h2 className="text-[13px] font-semibold text-white">{title}</h2>
      <button
        onClick={onClose}
        className="rounded p-0.5 text-neutral-400 hover:bg-white/5 hover:text-white"
      >
        <X className="h-3.5 w-3.5" strokeWidth={1.75} />
      </button>
    </div>
  );
}

export function PrimaryButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="ml-auto flex h-7 items-center justify-center rounded-md bg-[#3b5bff] px-3 text-[12px] font-medium text-white hover:bg-[#4866ff]"
    >
      {label}
    </button>
  );
}
