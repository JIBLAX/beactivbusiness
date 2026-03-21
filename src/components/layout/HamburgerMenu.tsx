import { useApp } from "@/store/AppContext";
import beactivLogo from "@/assets/beactiv-logo.png";
import { AppPage } from "@/data/types";
import { supabase } from "@/integrations/supabase/client";

interface HamburgerMenuProps {
  open: boolean;
  onClose: () => void;
}

const menuItems: { id: AppPage; icon: string; label: string; sub: string }[] = [
  { id: "finances", icon: "💰", label: "Finances", sub: "Revenus & dépenses" },
  { id: "clients", icon: "👤", label: "Clients", sub: "Fiches & suivi" },
  { id: "offres", icon: "📦", label: "Offres", sub: "Tarifs & catalogues" },
  { id: "stats", icon: "📊", label: "Statistiques", sub: "Santé financière" },
];

export default function HamburgerMenu({ open, onClose }: HamburgerMenuProps) {
  const { currentPage, setCurrentPage } = useApp();

  const navigate = (page: AppPage) => {
    setCurrentPage(page);
    onClose();
  };

  const handleLock = async () => {
    await supabase.auth.signOut();
    onClose();
  };

  return (
    <>
      <div
        className={`fixed inset-0 z-[300] transition-all duration-300 ${open ? "bg-black/60 backdrop-blur-sm pointer-events-auto" : "bg-transparent pointer-events-none"}`}
        onClick={onClose}
      />

      <div className={`fixed top-0 right-0 bottom-0 w-[280px] z-[301] flex flex-col transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]
        ${open ? "translate-x-0" : "translate-x-full"}`}
        style={{ background: "hsl(0 0% 5%)", borderLeft: "1px solid hsl(0 0% 100% / 0.06)" }}>
        
        <div className="px-6 pt-6 pb-5" style={{ borderBottom: "1px solid hsl(0 0% 100% / 0.06)" }}>
          <div className="flex items-center gap-3">
            <img src={beactivLogo} alt="Be Activ" className="w-10 h-10 rounded-2xl object-contain"
              style={{ background: "#0a0808", border: "1px solid hsl(348 63% 30% / 0.3)" }} />
            <div>
              <div className="font-display text-[15px] font-bold text-foreground">Be Activ</div>
              <div className="text-[10px] text-muted-foreground font-medium tracking-widest uppercase">BUSINESS</div>
            </div>
          </div>
        </div>

        <nav className="flex-1 py-2 overflow-y-auto">
          {menuItems.map(item => (
            <button key={item.id} onClick={() => navigate(item.id)}
              className={`w-full flex items-center gap-4 px-6 py-4 text-left transition-all
                ${currentPage === item.id
                  ? "text-foreground bg-white/[0.04]"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/[0.02]"
                }`}>
              <span className="text-lg w-6 text-center">{item.icon}</span>
              <div>
                <div className={`text-[14px] font-semibold ${currentPage === item.id ? "text-foreground" : ""}`}>{item.label}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">{item.sub}</div>
              </div>
              {currentPage === item.id && (
                <div className="ml-auto w-1 h-6 rounded-full" style={{ background: "hsl(348 63% 35%)" }} />
              )}
            </button>
          ))}
        </nav>

        <div className="px-6 py-5" style={{ borderTop: "1px solid hsl(0 0% 100% / 0.06)" }}>
          <button onClick={handleLock}
            className="flex items-center gap-3 text-muted-foreground text-sm py-2 hover:text-foreground transition-colors w-full">
            <span>🔒</span>
            <span className="font-medium">Verrouiller</span>
          </button>
        </div>
      </div>
    </>
  );
}
