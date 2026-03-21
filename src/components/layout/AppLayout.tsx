import { useState, useMemo } from "react";
import { useApp } from "@/store/AppContext";
import beactivLogo from "@/assets/beactiv-logo.png";
import HamburgerMenu from "./HamburgerMenu";
import FinancesPage from "@/pages/FinancesPage";
import StatsPage from "@/pages/StatsPage";
import OffresPage from "@/pages/OffresPage";
import ClientsPage from "@/pages/ClientsPage";
import ActivResetPage from "@/pages/ActivResetPage";

export default function AppLayout() {
  const { currentPage, financeEntries } = useApp();
  const [menuOpen, setMenuOpen] = useState(false);

  const currentYear = new Date().getFullYear();

  const yearlyCA = useMemo(() => {
    return financeEntries
      .filter(e => e.month.startsWith(String(currentYear)))
      .reduce((s, e) => s + e.amount, 0);
  }, [financeEntries, currentYear]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col h-[100dvh] bg-background">
      {/* Topbar */}
      <div className="flex items-center gap-3 px-4 py-3 flex-shrink-0 relative z-10"
        style={{ borderBottom: "1px solid hsl(0 0% 100% / 0.05)" }}>
        <div className="w-10 h-10 rounded-2xl overflow-hidden flex-shrink-0"
          style={{ border: "1px solid hsl(348 63% 30% / 0.3)" }}>
          <img src={beactivLogo} alt="Be Activ" className="w-full h-full object-contain" style={{ background: "#0a0808" }} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-semibold text-foreground tracking-tight">COACH JM</div>
          <div className="text-[10px] text-muted-foreground font-medium">BUSINESS</div>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="text-right">
            <div className="value-lg text-[18px] text-foreground leading-none">{yearlyCA.toLocaleString("fr-FR", { maximumFractionDigits: 0 })}€</div>
            <div className="text-[9px] text-muted-foreground font-medium mt-0.5">CA {currentYear}</div>
          </div>

          <button onClick={() => setMenuOpen(true)}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-foreground"
            style={{ background: "hsl(0 0% 100% / 0.05)", border: "1px solid hsl(0 0% 100% / 0.08)" }}>
            <svg width="16" height="12" viewBox="0 0 16 12" fill="none">
              <path d="M0 1h16M0 6h12M0 11h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
      </div>


      {/* Content */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden overscroll-contain"
        style={{ WebkitOverflowScrolling: "touch" }}>
        {currentPage === "finances" && <FinancesPage />}
        {currentPage === "offres" && <OffresPage />}
        {currentPage === "stats" && <StatsPage />}
        {currentPage === "clients" && <ClientsPage />}
        {currentPage === "activreset" && <ActivResetPage />}
      </div>

      <HamburgerMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
    </div>
  );
}
