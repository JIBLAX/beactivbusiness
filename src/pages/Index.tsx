import { useState } from "react";
import { AppProvider, useApp } from "@/store/AppContext";
import PinScreen from "@/components/auth/PinScreen";
import AppLayout from "@/components/layout/AppLayout";

const Splash = () => (
  <div className="fixed inset-0 flex items-center justify-center"
    style={{ background: "hsl(240 6% 3%)" }}>
    <div className="w-6 h-6 rounded-full" style={{
      background: "var(--gradient-primary)",
      animation: "pulseSub 1.5s ease-in-out infinite"
    }} />
  </div>
);

function AppContent() {
  const { isAuthenticated, loading } = useApp();
  const [pinVerified, setPinVerified] = useState(false);

  // Initial data load
  if (loading && !pinVerified) return <Splash />;

  // PIN gate
  if (!pinVerified) {
    return <PinScreen onSuccess={() => setPinVerified(true)} />;
  }

  // PIN validated — wait for Supabase session + data load
  if (!isAuthenticated || loading) return <Splash />;

  return <AppLayout />;
}

const Index = () => (
  <AppProvider>
    <AppContent />
  </AppProvider>
);

export default Index;
