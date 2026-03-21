import { useState } from "react";
import { AppProvider, useApp } from "@/store/AppContext";
import PinScreen from "@/components/auth/PinScreen";
import AppLayout from "@/components/layout/AppLayout";

function AppContent() {
  const { isAuthenticated, loading } = useApp();
  const [pinVerified, setPinVerified] = useState(false);

  if (loading || (!pinVerified) === false && !isAuthenticated) {
    return (
      <div className="fixed inset-0 flex items-center justify-center"
        style={{ background: "hsl(240 6% 3%)" }}>
        <div className="w-6 h-6 rounded-full" style={{ 
          background: "var(--gradient-primary)",
          animation: "pulseSub 1.5s ease-in-out infinite"
        }} />
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
        <div className="w-6 h-6 rounded-full" style={{ 
          background: "var(--gradient-primary)",
          animation: "pulseSub 1.5s ease-in-out infinite"
        }} />
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
