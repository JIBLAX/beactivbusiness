import { useState } from "react";
import { useApp } from "@/store/AppContext";
import beactivLogo from "@/assets/beactiv-logo.png";
import HamburgerMenu from "./HamburgerMenu";
import ProspectsPage from "@/pages/ProspectsPage";
import ClientsPage from "@/pages/ClientsPage";
import ActivResetPage from "@/pages/ActivResetPage";
import FinancesPage from "@/pages/FinancesPage";
import StatsPage from "@/pages/StatsPage";
import OffresPage from "@/pages/OffresPage";

export default function AppLayout() {
  const { currentPage, prospects } = useApp();
  const [menuOpen, setMenuOpen] = useState(false);

  const closingCount = prospects.filter(p => p.closing === "OUI").length;
  const totalBilans = prospects.filter(p => p.presence === "OUI").length;
  const closingRate = totalBilans > 0 ? Math.round((closingCount / totalBilans) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 flex flex-col h-[100dvh]">
      {/* Topbar */}
      <div className="flex items-center gap-2.5 px-4 py-2.5 flex-shrink-0 min-h-[56px] relative z-10"
        style={{ background: "linear-gradient(180deg, hsl(var(--surface1)) 0%, transparent 100%)" }}>
        <div className="w-[42px] h-[42px] rounded-full overflow-hidden flex-shrink-0 border-2"
          style={{ borderColor: "hsl(348 63% 30% / 0.5)", boxShadow: "0 0 11px hsl(348 63% 30% / 0.3)" }}>
          <img src={beactivLogo} alt="Be Activ" className="w-full h-full object-contain" style={{ background: "#0d0909" }} />
        </div>

        <div className="flex-1">
          <div className="text-sm font-semibold text-foreground">COACH JM</div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="text-right">
            <div className="font-sans text-xl font-bold text-bordeaux-2 leading-none">{closingRate}%</div>
            <div className="text-[9px] text-muted-foreground uppercase tracking-[1.5px]">CLOSING</div>
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
        <div className="animate-fade-up">
          {currentPage === "prospects" && <ProspectsPage />}
          {currentPage === "clients" && <ClientsPage />}
          {currentPage === "activreset" && <ActivResetPage />}
          {currentPage === "offres" && <OffresPage />}
          {currentPage === "finances" && <FinancesPage />}
          {currentPage === "stats" && <StatsPage />}
        </div>
      </div>

      <HamburgerMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
    </div>
  );
}
