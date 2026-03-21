import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import beactivLogo from "@/assets/beactiv-logo.png";

const PIN_CODE = "131313";
const AUTO_EMAIL = "coachjm@beactiv.app";
const AUTO_PASS = "BeActiv2026!SecurePin";

const PIN_LETTERS: Record<string, string> = {
  "2": "ABC", "3": "DEF", "4": "GHI", "5": "JKL",
  "6": "MNO", "7": "PQRS", "8": "TUV", "9": "WXYZ",
};

interface PinScreenProps {
  onSuccess: () => void;
}

export default function PinScreen({ onSuccess }: PinScreenProps) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  const autoLogin = async () => {
    setLoading(true);
    const { error: loginErr } = await supabase.auth.signInWithPassword({ email: AUTO_EMAIL, password: AUTO_PASS });
    if (loginErr) {
      const { error: signupErr } = await supabase.auth.signUp({ email: AUTO_EMAIL, password: AUTO_PASS });
      if (signupErr) { console.error("Auto-login failed:", signupErr); setLoading(false); return; }
      await supabase.auth.signInWithPassword({ email: AUTO_EMAIL, password: AUTO_PASS });
    }
    setLoading(false);
    onSuccess();
  };

  const handleDigit = useCallback((d: string) => {
    if (pin.length >= 6 || loading) return;
    const newPin = pin + d;
    setPin(newPin);
    setError(false);
    if (newPin.length === 6) {
      if (newPin === PIN_CODE) {
        autoLogin();
      } else {
        setError(true);
        setTimeout(() => { setPin(""); setError(false); }, 600);
      }
    }
  }, [pin, loading]);

  const handleDelete = useCallback(() => {
    setPin(p => p.slice(0, -1));
    setError(false);
  }, []);

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background">
      <div className="w-20 h-20 rounded-3xl overflow-hidden mb-6 animate-glow"
        style={{ border: "1px solid hsl(348 63% 30% / 0.3)", boxShadow: "0 0 60px hsl(348 63% 30% / 0.2)" }}>
        <img src={beactivLogo} alt="Be Activ" className="w-full h-full object-contain" style={{ background: "#0a0808" }} />
      </div>

      <h1 className="font-display text-[20px] font-bold text-foreground mb-1 tracking-tight">Be Activ</h1>
      <p className="text-[10px] text-muted-foreground tracking-[4px] uppercase mb-10">BUSINESS</p>

      {/* Dots */}
      <div className="flex gap-3 mb-8">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className={`w-3 h-3 rounded-full transition-all duration-150
            ${error ? "bg-destructive animate-shake" :
              i < pin.length ? "bg-foreground shadow-[0_0_8px_hsl(0_0%_96%/0.3)]" :
              "bg-transparent border-[1.5px] border-[hsl(0_0%_25%)]"}`} />
        ))}
      </div>

      {loading && <div className="text-[11px] text-muted-foreground mb-4 animate-pulse">Connexion...</div>}

      {/* Keypad */}
      <div className="grid grid-cols-3 gap-3">
        {["1","2","3","4","5","6","7","8","9","","0","del"].map((key) => {
          if (key === "") return <div key="empty" className="w-[68px] h-[68px]" />;
          if (key === "del") return (
            <button key="del" onClick={handleDelete}
              className="w-[68px] h-[68px] rounded-2xl flex items-center justify-center text-xl text-muted-foreground active:text-foreground active:scale-[0.92] transition-all">
              ⌫
            </button>
          );
          return (
            <button key={key} onClick={() => handleDigit(key)}
              className="w-[68px] h-[68px] rounded-2xl flex flex-col items-center justify-center gap-0.5 text-foreground font-medium text-[20px] transition-all active:scale-[0.92] active:bg-white/[0.08]"
              style={{ background: "hsl(0 0% 100% / 0.04)", border: "1px solid hsl(0 0% 100% / 0.06)" }}>
              {key}
              {PIN_LETTERS[key] && (
                <span className="text-[7px] tracking-[2px] text-muted-foreground font-medium uppercase">{PIN_LETTERS[key]}</span>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-8 text-[9px] text-muted-foreground tracking-[2px] uppercase">
        COACH JM · JBLX STUDIO
      </div>
    </div>
  );
}
