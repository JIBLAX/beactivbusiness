import { useState, useMemo } from "react";
import { useApp } from "@/store/AppContext";
import beactivLogo from "@/assets/beactiv-logo.png";
import HamburgerMenu from "./HamburgerMenu";
import FinancesPage from "@/pages/FinancesPage";
import ActivitesPage from "@/pages/ActivitesPage";
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

  const pageTitle = {
    finances: "Finances",
    activites: "Activités",
    offres: "Offres",
    stats: "Statistiques",
    clients: "Clients",
    activreset: "Activ Reset",
  }[currentPage] || "Finances";

  return (
    <div className="fixed inset-0 z-50 flex flex-col h-[100dvh] bg-background">
      {/* Premium Topbar */}
      <div className="topbar-blur flex items-center gap-3 px-4 py-3 flex-shrink-0 relative z-10"
        style={{ borderBottom: "1px solid hsl(0 0% 100% / 0.04)" }}>
        
        {/* Logo */}
        <div className="w-9 h-9 rounded-[14px] overflow-hidden flex-shrink-0 relative"
          style={{ 
            border: "1px solid hsl(348 63% 30% / 0.25)",
            boxShadow: "0 0 20px hsl(348 63% 30% / 0.08)"
          }}>
          <img src={beactivLogo} alt="Be Activ" className="w-full h-full object-contain" 
            style={{ background: "hsl(240 6% 4%)" }} />
        </div>

        {/* Title area */}
        <div className="flex-1 min-w-0">
          <div className="text-[14px] font-semibold text-foreground tracking-tight leading-none">
            {pageTitle}
          </div>
          <div className="text-[10px] text-muted-foreground font-medium mt-0.5 tracking-wide">
            COACH JM
          </div>
        </div>

        {/* CA badge */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="rounded-2xl px-3.5 py-1.5" 
            style={{ 
              background: "hsl(0 0% 100% / 0.03)", 
              border: "1px solid hsl(0 0% 100% / 0.05)",
              boxShadow: "inset 0 1px 0 hsl(0 0% 100% / 0.03)"
            }}>
            <div className="value-lg text-[16px] text-foreground leading-none">
              {yearlyCA.toLocaleString("fr-FR", { maximumFractionDigits: 0 })}€
            </div>
            <div className="text-[8px] text-muted-foreground font-medium mt-0.5 text-center tracking-widest">
              CA {currentYear}
            </div>
          </div>

          {/* Menu button */}
          <button onClick={() => setMenuOpen(true)}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-foreground/70 hover:text-foreground transition-colors"
            style={{ 
              background: "hsl(0 0% 100% / 0.03)", 
              border: "1px solid hsl(0 0% 100% / 0.05)" 
            }}>
            <svg width="15" height="11" viewBox="0 0 15 11" fill="none">
              <path d="M0 0.5h15M0 5.5h10M0 10.5h6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden overscroll-contain"
        style={{ WebkitOverflowScrolling: "touch" }}>
        {currentPage === "finances" && <FinancesPage />}
        {currentPage === "activites" && <ActivitesPage />}
        {currentPage === "offres" && <OffresPage />}
        {currentPage === "stats" && <StatsPage />}
        {currentPage === "clients" && <ClientsPage />}
        {currentPage === "activreset" && <ActivResetPage />}
      </div>

      <HamburgerMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
    </div>
  );
}