import { useState } from "react";
import { AppProvider, useApp } from "@/store/AppContext";
import PinScreen from "@/components/auth/PinScreen";
import AppLayout from "@/components/layout/AppLayout";

function AppContent() {
  const { isAuthenticated, loading } = useApp();
  const [pinVerified, setPinVerified] = useState(false);

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center"
        style={{ background: "hsl(240 6% 3%)" }}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-xl" style={{ 
            background: "var(--gradient-primary)",
            animation: "pulseSub 1.5s ease-in-out infinite"
          }} />
          <div className="text-muted-foreground/60 text-[11px] font-medium tracking-wider uppercase">Chargement</div>
        </div>
      </div>
    );
  }

  if (!pinVerified) {
    return <PinScreen onSuccess={() => setPinVerified(true)} />;
  }

  if (!isAuthenticated) {
    return (
      <div className="fixed inset-0 flex items-center justify-center"
        style={{ background: "hsl(240 6% 3%)" }}>
        <div className="text-muted-foreground text-sm">Connexion en cours...</div>
      </div>
    );
  }

  return <AppLayout />;
}

const Index = () => (
  <AppProvider>
    <AppContent />
  </AppProvider>
);

export default Index;
