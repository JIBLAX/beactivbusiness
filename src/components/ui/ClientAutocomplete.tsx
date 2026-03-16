import { useState, useRef, useEffect } from "react";
import { useApp } from "@/store/AppContext";

interface Props {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}

export default function ClientAutocomplete({ value, onChange, placeholder = "Nom du client" }: Props) {
  const { prospects } = useApp();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const clients = prospects.filter(p => p.closing === "OUI" && p.offre && p.offre !== "-");
  const filtered = value.length >= 1
    ? clients.filter(c => c.name.toLowerCase().includes(value.toLowerCase()))
    : clients;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <input
        value={value}
        onChange={e => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        className="w-full rounded-xl p-2.5 text-sm outline-none"
        style={{ background: "hsl(var(--surface3))", border: "1px solid hsl(var(--glass-border))", color: "hsl(var(--foreground))" }}
      />
      {open && filtered.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-1 z-50 max-h-[160px] overflow-y-auto rounded-xl"
          style={{ background: "hsl(var(--surface2))", border: "1px solid hsl(var(--glass-border))", boxShadow: "0 8px 24px rgba(0,0,0,0.4)" }}>
          {filtered.slice(0, 8).map(c => (
            <button key={c.id} onClick={() => { onChange(c.name); setOpen(false); }}
              className="w-full text-left px-3 py-2 text-sm text-foreground hover:bg-foreground/5 transition-colors">
              <span className="font-medium">{c.name}</span>
              <span className="text-[10px] text-muted-foreground ml-2">{c.offre}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
