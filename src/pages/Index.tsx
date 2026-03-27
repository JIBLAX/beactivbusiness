import { useState } from "react";
import { AppProvider, useApp } from "@/store/AppContext";
import PinScreen from "@/components/auth/PinScreen";
import AuthScreen from "@/components/auth/AuthScreen";
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

  // Loading Supabase session / data
  if (loading) return <Splash />;

  // No Supabase session → login with real credentials first
  if (!isAuthenticated) return <AuthScreen />;

  // Session exists but PIN not yet entered
  if (!pinVerified) {
    return <PinScreen onSuccess={() => setPinVerified(true)} />;
  }

  return <AppLayout />;
}

const Index = () => (
  <AppProvider>
    <AppContent />
  </AppProvider>
);

export default Index;
