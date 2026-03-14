import { AppProvider, useApp } from "@/store/AppContext";
import PinScreen from "@/components/auth/PinScreen";
import AppLayout from "@/components/layout/AppLayout";

function AppContent() {
  const { isAuthenticated, setAuthenticated } = useApp();

  if (!isAuthenticated) {
    return <PinScreen onSuccess={() => setAuthenticated(true)} />;
  }

  return <AppLayout />;
}

const Index = () => {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
};

export default Index;
