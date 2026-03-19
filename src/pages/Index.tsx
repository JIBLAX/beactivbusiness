import { AppProvider, useApp } from "@/store/AppContext";
import PinScreen from "@/components/auth/PinScreen";
import AppLayout from "@/components/layout/AppLayout";

function AppContent() {
  const { isAuthenticated, loading } = useApp();

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center"
        style={{ background: "hsl(0 6% 4%)" }}>
        <div className="text-muted-foreground text-sm animate-pulse">Chargement...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <PinScreen onSuccess={() => {}} />;
  }

  return <AppLayout />;
}

const Index = () => (
  <AppProvider>
    <AppContent />
  </AppProvider>
);

export default Index;
