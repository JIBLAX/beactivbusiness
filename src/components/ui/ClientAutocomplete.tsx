import { useState, useRef, useEffect } from "react";
import { useApp } from "@/store/AppContext";
import { supabase } from "@/integrations/supabase/client";

interface ClientEntry {
  name: string;
  offre: string;
}

interface Props {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}

export default function ClientAutocomplete({ value, onChange, placeholder = "Nom du client" }: Props) {
  const { prospects } = useApp();
  const [crmClients, setCrmClients] = useState<ClientEntry[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Load shared clients once on mount
  useEffect(() => {
    supabase
      .from("be_activ_clients")
      .select("id, name, prenom, nom, offre")
      .eq("is_client", true)
      .then(({ data }) => {
        if (!data) return;
        setCrmClients(
          data
            .map(r => ({
              name: r.name || `${r.prenom ?? ""} ${r.nom ?? ""}`.trim(),
              offre: r.offre ?? "",
            }))
            .filter(r => r.name && r.offre.trim() !== "")
        );
      }, () => {});
  }, []);

  // Business clients (closing = OUI with an offer)
  const businessClients: ClientEntry[] = prospects
    .filter(p => p.closing === "OUI" && p.offre && p.offre !== "-")
    .map(p => ({ name: p.name, offre: p.offre }));

  // Merge — Business takes priority, deduplicate by name
  const businessNames = new Set(businessClients.map(c => c.name.toLowerCase()));
  const allClients: ClientEntry[] = [
    ...businessClients,
    ...crmClients.filter(c => !businessNames.has(c.name.toLowerCase())),
  ];

  const filtered = value.length >= 1
    ? allClients.filter(c => c.name.toLowerCase().includes(value.toLowerCase()))
    : allClients;

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
        <div className="absolute left-0 right-0 top-full mt-1 z-50 max-h-[200px] overflow-y-auto rounded-xl"
          style={{ background: "hsl(var(--surface2))", border: "1px solid hsl(var(--glass-border))", boxShadow: "0 8px 24px rgba(0,0,0,0.4)" }}>
          {filtered.slice(0, 10).map((c, i) => (
            <button key={`${c.name}-${i}`} onClick={() => { onChange(c.name); setOpen(false); }}
              className="w-full text-left px-3 py-2.5 text-sm text-foreground hover:bg-foreground/5 transition-colors">
              <div>
                <span className="font-medium">{c.name}</span>
                {c.offre && <span className="text-[10px] text-muted-foreground ml-2">{c.offre}</span>}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
