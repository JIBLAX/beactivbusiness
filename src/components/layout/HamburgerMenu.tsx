import { useApp } from "@/store/AppContext";
import beactivLogo from "@/assets/beactiv-logo.png";
import { AppPage } from "@/data/types";
import { supabase } from "@/integrations/supabase/client";

interface HamburgerMenuProps {
  open: boolean;
  onClose: () => void;
}

const menuItems: { id: AppPage; icon: string; label: string; sub: string }[] = [
  { id: "finances", icon: "💰", label: "Finances", sub: "Revenus & synthèse" },
  { id: "activites", icon: "📝", label: "Activités", sub: "Entrées & dépenses" },
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
        className={`fixed inset-0 z-[300] transition-all duration-300 ${open ? "pointer-events-auto" : "pointer-events-none"}`}
        style={{ 
          background: open ? "hsla(240, 6%, 3%, 0.75)" : "transparent",
          backdropFilter: open ? "blur(12px) saturate(1.2)" : "none",
        }}
        onClick={onClose}
      />

      <div className={`fixed top-0 right-0 bottom-0 w-[280px] z-[301] flex flex-col transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]
        ${open ? "translate-x-0" : "translate-x-full"}`}
        style={{ 
          background: "hsl(240 5% 5%)", 
          borderLeft: "1px solid hsl(0 0% 100% / 0.05)",
          boxShadow: open ? "-20px 0 60px hsl(0 0% 0% / 0.4)" : "none"
        }}>
        
        {/* Header */}
        <div className="px-6 pt-6 pb-5" style={{ borderBottom: "1px solid hsl(0 0% 100% / 0.04)" }}>
          <div className="flex items-center gap-3">
            <img src={beactivLogo} alt="Be Activ" className="w-10 h-10 rounded-[14px] object-contain"
              style={{ background: "hsl(240 6% 4%)", border: "1px solid hsl(348 63% 30% / 0.2)" }} />
            <div>
              <div className="font-display text-[15px] font-bold text-foreground tracking-tight">Be Activ</div>
              <div className="text-[9px] text-muted-foreground font-medium tracking-[3px] uppercase">BUSINESS</div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-3 overflow-y-auto">
          {menuItems.map(item => {
            const isActive = currentPage === item.id;
            return (
              <button key={item.id} onClick={() => navigate(item.id)}
                className="w-full flex items-center gap-4 px-6 py-3.5 text-left transition-all relative"
                style={{
                  background: isActive ? "hsl(348 63% 30% / 0.08)" : "transparent",
                }}>
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-7 rounded-r-full"
                    style={{ background: "hsl(348 63% 40%)" }} />
                )}
                <div className="w-8 h-8 rounded-xl flex items-center justify-center text-sm"
                  style={{ 
                    background: isActive ? "hsl(348 63% 30% / 0.12)" : "hsl(0 0% 100% / 0.03)",
                    border: `1px solid ${isActive ? "hsl(348 63% 30% / 0.15)" : "hsl(0 0% 100% / 0.04)"}`,
                  }}>
                  {item.icon}
                </div>
                <div>
                  <div className={`text-[13px] font-semibold ${isActive ? "text-foreground" : "text-muted-foreground"}`}>
                    {item.label}
                  </div>
                  <div className="text-[9px] text-muted-foreground/60 mt-0.5">{item.sub}</div>
                </div>
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-6 py-5" style={{ borderTop: "1px solid hsl(0 0% 100% / 0.04)" }}>
          <button onClick={handleLock}
            className="flex items-center gap-3 text-muted-foreground text-[13px] py-2 hover:text-foreground transition-colors w-full">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: "hsl(0 0% 100% / 0.03)", border: "1px solid hsl(0 0% 100% / 0.04)" }}>
              🔒
            </div>
            <span className="font-medium">Verrouiller</span>
          </button>
        </div>
      </div>
    </>
  );
}