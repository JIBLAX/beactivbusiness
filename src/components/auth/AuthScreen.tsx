import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import beactivLogo from "@/assets/beactiv-logo.png";

export default function AuthScreen() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
    } else {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) setError(error.message);
      else setSuccess("Compte créé ! Vérifie ton email pour confirmer.");
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center px-6"
      style={{
        background: `
          radial-gradient(ellipse 100% 80% at 50% 0%, hsl(348 63% 30% / 0.35) 0%, transparent 60%),
          linear-gradient(180deg, hsl(0 6% 4% / 0.7) 0%, hsl(0 6% 4% / 0.95) 100%)`,
        backdropFilter: "blur(40px)",
      }}>
      {/* Logo */}
      <div className="w-[90px] h-[90px] rounded-full overflow-hidden border-2 mb-4 animate-glow"
        style={{ borderColor: "hsl(348 63% 30% / 0.5)", boxShadow: "0 0 40px hsl(348 63% 30% / 0.5), 0 0 80px hsl(348 63% 30% / 0.2)" }}>
        <img src={beactivLogo} alt="Be Activ" className="w-full h-full object-contain" style={{ background: "#0d0909" }} />
      </div>

      <h1 className="font-display text-2xl font-extrabold text-foreground mb-6 tracking-tight">
        Be Activ <span className="font-sans font-normal text-sm text-muted-foreground tracking-[3px] uppercase ml-1.5 align-middle">BUSINESS</span>
      </h1>

      <form onSubmit={handleSubmit} className="w-full max-w-[320px] flex flex-col gap-3">
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          className="w-full px-4 py-3 rounded-xl text-sm text-foreground placeholder:text-muted-foreground outline-none"
          style={{ background: "hsl(0 0% 100% / 0.08)", border: "1px solid hsl(0 0% 100% / 0.12)" }}
        />
        <input
          type="password"
          placeholder="Mot de passe"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          minLength={6}
          className="w-full px-4 py-3 rounded-xl text-sm text-foreground placeholder:text-muted-foreground outline-none"
          style={{ background: "hsl(0 0% 100% / 0.08)", border: "1px solid hsl(0 0% 100% / 0.12)" }}
        />

        {error && <div className="text-xs text-destructive text-center">{error}</div>}
        {success && <div className="text-xs text-green-400 text-center">{success}</div>}

        <button type="submit" disabled={loading}
          className="w-full py-3 rounded-xl font-semibold text-sm transition-all active:scale-[0.97]"
          style={{
            background: "linear-gradient(135deg, hsl(348 63% 40%), hsl(348 63% 30%))",
            color: "hsl(30 50% 93%)",
            opacity: loading ? 0.6 : 1,
          }}>
          {loading ? "..." : mode === "login" ? "Se connecter" : "Créer un compte"}
        </button>

        <button type="button" onClick={() => { setMode(m => m === "login" ? "signup" : "login"); setError(""); setSuccess(""); }}
          className="text-xs text-muted-foreground text-center py-2 hover:text-foreground transition-colors">
          {mode === "login" ? "Pas encore de compte ? Créer" : "Déjà un compte ? Se connecter"}
        </button>
      </form>

      <div className="mt-8 text-[10px] text-muted-foreground tracking-[1.5px] uppercase">
        MADE BY <span className="text-bordeaux-2 font-semibold">COACH JM</span> · <span className="text-bordeaux-2 font-semibold">JBLX STUDIO</span>
      </div>
    </div>
  );
}
