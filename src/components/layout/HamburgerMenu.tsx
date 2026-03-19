import { useApp } from "@/store/AppContext";
import beactivLogo from "@/assets/beactiv-logo.png";
import { AppPage } from "@/data/types";
import { supabase } from "@/integrations/supabase/client";

interface HamburgerMenuProps {
  open: boolean;
  onClose: () => void;
}

const menuItems: { id: AppPage; icon: string; label: string; sub: string }[] = [
  { id: "prospects", icon: "👥", label: "Prospects", sub: "CRM & Pipeline" },
  { id: "clients", icon: "🏆", label: "Clients", sub: "Base clients" },
  { id: "activreset", icon: "🎯", label: "Activ Reset", sub: "Suivi parcours" },
  { id: "offres", icon: "🏷", label: "Offres", sub: "Tarifs & abonnements" },
  { id: "finances", icon: "💰", label: "Finances", sub: "Entrées & Dépenses" },
  { id: "stats", icon: "📊", label: "Statistiques", sub: "KPI & Rapports" },
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
        className={`fixed inset-0 z-[300] transition-all duration-250 ${open ? "bg-black/70 pointer-events-auto" : "bg-transparent pointer-events-none"}`}
        onClick={onClose}
      />

      <div className={`fixed top-0 right-0 bottom-0 w-[260px] z-[301] flex flex-col transition-transform duration-300
        ${open ? "translate-x-0" : "translate-x-full"}`}
        style={{
          background: "hsl(var(--surface1))",
          borderLeft: "1px solid hsl(var(--glass-border))",
        }}>
        <div className="p-5 pb-5 border-b border-border">
          <div className="flex items-center gap-2.5 mb-3">
            <img src={beactivLogo} alt="Be Activ" className="w-9 h-9 rounded-full object-contain border-2"
              style={{ background: "#0d0909", borderColor: "hsl(348 63% 30% / 0.4)" }} />
            <div>
              <div className="font-display text-base font-extrabold text-foreground">Be Activ</div>
              <div className="text-[10px] text-muted-foreground tracking-[1.5px] uppercase">BUSINESS</div>
            </div>
          </div>
        </div>

        <nav className="flex-1 py-3 overflow-y-auto">
          {menuItems.map(item => (
            <button key={item.id} onClick={() => navigate(item.id)}
              className={`w-full flex items-center gap-3.5 px-5 py-3.5 text-left transition-all border-l-[3px]
                ${currentPage === item.id
                  ? "text-foreground border-l-bordeaux-2 bg-bordeaux/10"
                  : "text-muted-foreground border-l-transparent hover:text-foreground hover:bg-foreground/[0.03]"
                }`}>
              <span className="text-xl w-6 text-center">{item.icon}</span>
              <div>
                <div className="text-[15px] font-semibold">{item.label}</div>
                <div className={`text-[10px] mt-0.5 ${currentPage === item.id ? "text-foreground/50" : "text-muted-foreground"}`}>
                  {item.sub}
                </div>
              </div>
            </button>
          ))}
        </nav>

        <div className="p-5 border-t border-border">
          <button onClick={handleLock}
            className="flex items-center gap-2.5 text-muted-foreground text-sm cursor-pointer py-2 hover:text-destructive transition-colors">
            🔒 Verrouiller
          </button>
        </div>
      </div>
    </>
  );
}
