import { useState, useCallback } from "react";
import beactivLogo from "@/assets/beactiv-logo.png";

const PIN_CODE = "131313";
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
  const [errorMsg, setErrorMsg] = useState("");

  const handleDigit = useCallback((d: string) => {
    if (pin.length >= 6) return;
    const newPin = pin + d;
    setPin(newPin);
    setError(false);
    setErrorMsg("");

    if (newPin.length === 6) {
      if (newPin === PIN_CODE) {
        setTimeout(onSuccess, 200);
      } else {
        setError(true);
        setErrorMsg("Code incorrect");
        setTimeout(() => { setPin(""); setError(false); }, 600);
      }
    }
  }, [pin, onSuccess]);

  const handleDelete = useCallback(() => {
    setPin(p => p.slice(0, -1));
    setError(false);
    setErrorMsg("");
  }, []);

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center"
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

      {/* Title */}
      <h1 className="font-display text-2xl font-extrabold text-foreground mb-8 tracking-tight">
        Be Activ <span className="font-sans font-normal text-sm text-muted-foreground tracking-[3px] uppercase ml-1.5 align-middle">BUSINESS</span>
      </h1>

      {/* Dots */}
      <div className="flex gap-4 mb-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className={`w-3.5 h-3.5 rounded-full border-2 transition-all duration-150
            ${error ? "bg-destructive border-destructive animate-shake" :
              i < pin.length ? "bg-foreground border-foreground shadow-[0_0_8px_hsl(30_50%_93%/0.4)]" :
              "bg-transparent border-foreground/25"}`} />
        ))}
      </div>

      {/* Error */}
      <div className="h-5 text-xs text-destructive text-center mb-2.5 tracking-wide">
        {errorMsg}
      </div>

      {/* Keypad */}
      <div className="grid grid-cols-3 gap-3 mt-3">
        {["1","2","3","4","5","6","7","8","9","","0","del"].map((key) => {
          if (key === "") return <div key="empty" className="w-[72px] h-[72px]" />;
          if (key === "del") return (
            <button key="del" onClick={handleDelete}
              className="w-[72px] h-[72px] rounded-full flex items-center justify-center text-xl text-muted-foreground active:text-foreground active:scale-[0.92] transition-all">
              ⌫
            </button>
          );
          return (
            <button key={key} onClick={() => handleDigit(key)}
              className="w-[72px] h-[72px] rounded-full flex flex-col items-center justify-center gap-0.5 text-foreground font-medium text-[22px] transition-all active:scale-[0.92]"
              style={{
                background: "hsl(0 0% 100% / 0.08)",
                border: "1px solid hsl(0 0% 100% / 0.12)",
                backdropFilter: "blur(10px)",
              }}>
              {key}
              {PIN_LETTERS[key] && (
                <span className="text-[8px] tracking-[2px] text-muted-foreground font-semibold uppercase">
                  {PIN_LETTERS[key]}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Footer */}
      <div className="mt-6 text-[10px] text-muted-foreground tracking-[1.5px] uppercase">
        MADE BY <span className="text-bordeaux-2 font-semibold">COACH JM</span> · <span className="text-bordeaux-2 font-semibold">JBLX STUDIO</span>
      </div>
    </div>
  );
}
