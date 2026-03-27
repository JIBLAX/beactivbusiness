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
  const [authError, setAuthError] = useState(false);
  const [loading, setLoading] = useState(false);

  const autoLogin = useCallback(async () => {
    setLoading(true);
    setAuthError(false);
    try {
      // Try sign in first
      const { error: loginErr } = await supabase.auth.signInWithPassword({
        email: AUTO_EMAIL,
        password: AUTO_PASS,
      });

      if (loginErr) {
        // Account doesn't exist yet — try to create it
        const { error: signupErr } = await supabase.auth.signUp({
          email: AUTO_EMAIL,
          password: AUTO_PASS,
        });
        if (signupErr) throw signupErr;

        // Sign in after signup
        const { error: loginErr2 } = await supabase.auth.signInWithPassword({
          email: AUTO_EMAIL,
          password: AUTO_PASS,
        });
        if (loginErr2) throw loginErr2;
      }

      // Confirm session is actually established
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Session non établie");

      onSuccess();
    } catch (err) {
      console.error("Auto-login failed:", err);
      setAuthError(true);
      setPin("");
    } finally {
      setLoading(false);
    }
  }, [onSuccess]);

  const handleDigit = useCallback((d: string) => {
    if (pin.length >= 6 || loading) return;
    const newPin = pin + d;
    setPin(newPin);
    setError(false);
    setAuthError(false);
    if (newPin.length === 6) {
      if (newPin === PIN_CODE) {
        autoLogin();
      } else {
        setError(true);
        setTimeout(() => { setPin(""); setError(false); }, 600);
      }
    }
  }, [pin, loading, autoLogin]);

  const handleDelete = useCallback(() => {
    if (loading) return;
    setPin(p => p.slice(0, -1));
    setError(false);
    setAuthError(false);
  }, [loading]);

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center"
      style={{ background: "hsl(240 6% 3%)" }}>

      {/* Ambient glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[300px] h-[300px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, hsl(348 63% 30% / 0.08), transparent 70%)" }} />

      {/* Logo */}
      <div className="w-20 h-20 rounded-[22px] overflow-hidden mb-6 relative"
        style={{
          border: "1px solid hsl(348 63% 30% / 0.2)",
          boxShadow: "0 0 60px hsl(348 63% 30% / 0.12), 0 8px 32px hsl(0 0% 0% / 0.3)"
        }}>
        <img src={beactivLogo} alt="Be Activ" className="w-full h-full object-contain"
          style={{ background: "hsl(240 6% 4%)" }} />
      </div>

      <h1 className="font-display text-[22px] font-bold text-foreground mb-1 tracking-tight">Be Activ</h1>
      <p className="text-[9px] text-muted-foreground tracking-[4px] uppercase mb-10 font-medium">BUSINESS</p>

      {/* PIN Dots */}
      <div className="flex gap-3.5 mb-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className={`w-3 h-3 rounded-full transition-all duration-200
            ${error ? "bg-destructive" :
              loading && i < pin.length ? "" :
              i < pin.length
                ? "bg-foreground"
                : "bg-transparent border-[1.5px]"}`}
            style={
              loading && i < pin.length
                ? { background: "hsl(348 63% 45%)", boxShadow: "0 0 8px hsl(348 63% 45% / 0.5)" }
                : !error && i < pin.length
                  ? { boxShadow: "0 0 8px hsl(0 0% 96% / 0.3)" }
                  : !error && i >= pin.length
                    ? { borderColor: "hsl(0 0% 20%)" }
                    : undefined
            } />
        ))}
      </div>

      {/* Status messages */}
      <div className="h-6 flex items-center justify-center mb-5">
        {loading && (
          <span className="text-[11px] text-muted-foreground animate-pulse">Connexion...</span>
        )}
        {authError && !loading && (
          <span className="text-[11px]" style={{ color: "hsl(0 62% 55%)" }}>
            Erreur de connexion — réessaie
          </span>
        )}
      </div>

      {/* Keypad */}
      <div className="grid grid-cols-3 gap-3">
        {["1","2","3","4","5","6","7","8","9","","0","del"].map((key) => {
          if (key === "") return <div key="empty" className="w-[70px] h-[70px]" />;
          if (key === "del") return (
            <button key="del" onClick={handleDelete} disabled={loading}
              className="w-[70px] h-[70px] rounded-2xl flex items-center justify-center text-xl text-muted-foreground active:text-foreground active:scale-[0.92] transition-all disabled:opacity-30">
              ⌫
            </button>
          );
          return (
            <button key={key} onClick={() => handleDigit(key)} disabled={loading}
              className="w-[70px] h-[70px] rounded-2xl flex flex-col items-center justify-center gap-0.5 text-foreground font-medium text-[22px] transition-all active:scale-[0.92] disabled:opacity-30"
              style={{
                background: "hsl(0 0% 100% / 0.03)",
                border: "1px solid hsl(0 0% 100% / 0.05)",
                boxShadow: "inset 0 1px 0 hsl(0 0% 100% / 0.03)"
              }}>
              {key}
              {PIN_LETTERS[key] && (
                <span className="text-[7px] tracking-[2px] text-muted-foreground/50 font-medium uppercase">{PIN_LETTERS[key]}</span>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-10 text-[8px] text-muted-foreground/40 tracking-[3px] uppercase font-medium">
        COACH JM · JBLX STUDIO
      </div>
    </div>
  );
}
