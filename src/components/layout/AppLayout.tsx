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
    <div className="fixed inset-0 z-50 flex flex-col h-[100dvh]" style={{ background: "hsl(var(--background))" }}>
      {/* Topbar */}
      <div className="flex items-center gap-2.5 px-4 py-2.5 flex-shrink-0 min-h-[56px] relative z-10"
        style={{ background: "hsl(var(--surface1))" }}>
        <div className="w-[42px] h-[42px] rounded-full overflow-hidden flex-shrink-0 border-2"
          style={{ borderColor: "hsl(348 63% 30% / 0.5)", boxShadow: "0 0 11px hsl(348 63% 30% / 0.3)" }}>
          <img src={beactivLogo} alt="Be Activ" className="w-full h-full object-contain" style={{ background: "#0d0909" }} />
        </div>

        <div className="flex-1">
          <div className="text-sm font-semibold text-foreground">COACH JM</div>
          <div className="text-[9px] text-muted-foreground uppercase tracking-wider">BUSINESS</div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="text-right">
            <div className="font-sans text-lg font-bold text-bordeaux-2 leading-none">{yearlyCA.toFixed(0)}€</div>
            <div className="text-[8px] text-muted-foreground uppercase tracking-[1.5px]">CA {currentYear}</div>
          </div>

          <button onClick={() => setMenuOpen(true)}
            className="w-[34px] h-[34px] rounded-full flex items-center justify-center cursor-pointer text-foreground text-base"
            style={{ background: "hsl(var(--glass))", border: "1px solid hsl(var(--glass-border))" }}>
            ☰
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden overscroll-contain pb-5"
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