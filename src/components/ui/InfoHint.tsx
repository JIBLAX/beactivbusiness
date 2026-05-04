import { useState } from "react";

type Props = {
  text: string;
  className?: string;
};

export default function InfoHint({ text, className = "" }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="h-6 min-w-6 px-1 rounded-lg border text-[11px] font-semibold"
        style={{ borderColor: "hsl(var(--glass-border))", background: "hsl(var(--surface3))", color: "hsl(var(--muted-foreground))" }}
        aria-label="Afficher l'information"
      >
        ⓘ
      </button>
      {open && (
        <div
          className="text-[11px] leading-relaxed px-2.5 py-2 rounded-lg border"
          style={{ borderColor: "hsl(var(--glass-border))", background: "hsl(var(--surface3))", color: "hsl(var(--muted-foreground))" }}
        >
          {text}
        </div>
      )}
    </div>
  );
}
