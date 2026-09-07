import React, { useState, useRef, useEffect } from "react";
import {
  Bell,
  Menu,
  MoonStar,
  SunMedium,
  AlertTriangle,
  Check,
} from "lucide-react";
import { useTheme } from "../../context/ThemeContext";

const API_BASE_URL = "http://localhost:3001";

// ==========================================
// COMPOSANT UTILITAIRE POUR INTERSECTION OBSERVER
// ==========================================
function FadeInBlock({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const domRef = useRef<HTMLDivElement>(null);
  const [isVisible, setVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 },
    );

    const currentTarget = domRef.current;
    if (currentTarget) observer.observe(currentTarget);
    return () => {
      if (currentTarget) observer.unobserve(currentTarget);
    };
  }, []);

  return (
    <div
      ref={domRef}
      style={{ transitionDelay: `${delay}ms` }}
      className={`transition-all duration-700 ease-out transform ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4"
      } w-full shrink-0 ${className}`}
    >
      {children}
    </div>
  );
}

interface TopbarProps {
  title: string;
  subtitle?: string;
  onMenuClick?: () => void;
}

export default function Topbar({ title, subtitle, onMenuClick }: TopbarProps) {
  const { theme, toggleTheme } = useTheme();

  // ==========================================
  // SYSTÈME DE NOTIFICATIONS (STOCKS ÉPUISÉS)
  // ==========================================
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fonction pour scanner la base de données à la recherche de ruptures de stock
  const checkEmptyStocks = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/pharmacie`);
      if (res.ok) {
        const data = await res.json();
        // On filtre : quantité à 0 ET l'alerte n'a pas encore été acquittée
        const emptyMeds = data.filter(
          (med: any) => med.quantite === 0 && !med.alerteLue,
        );
        setNotifications(emptyMeds);
      }
    } catch (error) {
      console.error("Erreur de synchronisation des alertes:", error);
    }
  };

  // Scanne au chargement puis toutes les 10 secondes (polling léger)
  useEffect(() => {
    checkEmptyStocks();
    const interval = setInterval(checkEmptyStocks, 10000);
    return () => clearInterval(interval);
  }, []);

  // Fermer le menu déroulant si on clique en dehors
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Acquittement de l'alerte
  const handleMarkAsRead = async (med: any) => {
    try {
      await fetch(`${API_BASE_URL}/pharmacie/${med.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        // On marque l'alerte comme lue ET on l'archive pour qu'elle disparaisse des listes
        body: JSON.stringify({ alerteLue: true, archive: true }),
      });

      // Met à jour l'UI instantanément sans attendre le prochain scan
      setNotifications((prev) => prev.filter((n) => n.id !== med.id));
    } catch (error) {
      console.error("Erreur lors de l'acquittement de l'alerte:", error);
    }
  };

  return (
    <FadeInBlock delay={0}>
      <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-8 transition-all duration-500 dark:bg-slate-900 dark:border-slate-700 w-full">
        <div className="flex items-center gap-3">
          <button
            className="p-2 rounded-md hover:bg-slate-100 md:hidden dark:hover:bg-slate-800 transition-colors"
            aria-label="Ouvrir le menu"
            onClick={onMenuClick}
          >
            <Menu className="dark:text-slate-200" />
          </button>

          <div>
            <h2 className="text-2xl font-bold text-[#0F172A] dark:text-slate-100">
              {title}
            </h2>
            {subtitle && (
              <p className="text-sm text-slate-500 mt-1 dark:text-slate-400">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-3 md:space-x-4">
          <button
            type="button"
            onClick={toggleTheme}
            className="hidden md:flex p-2 rounded-full text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors dark:text-slate-300 dark:hover:text-slate-100 dark:hover:bg-slate-800"
          >
            {theme === "dark" ? (
              <SunMedium className="w-5 h-5" />
            ) : (
              <MoonStar className="w-5 h-5" />
            )}
          </button>

          {/* CLOCHE DE NOTIFICATION & DROPDOWN */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="relative p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer dark:text-slate-300 dark:hover:text-slate-100 dark:hover:bg-slate-800"
            >
              <Bell className="w-5 h-5" />
              {notifications.length > 0 && (
                <span className="absolute top-1.5 right-1.5 bg-rose-500 text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full border-2 border-white dark:border-slate-900 animate-pulse">
                  {notifications.length}
                </span>
              )}
            </button>

            {/* LE MENU DÉROULANT DES ALERTES */}
            {isDropdownOpen && (
              <div className="absolute right-0 mt-3 w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-4 duration-200">
                <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex justify-between items-center">
                  <h3 className="font-bold text-slate-800 dark:text-slate-100">
                    Alertes Pharmacie
                  </h3>
                  <span className="text-xs font-bold bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 px-2 py-0.5 rounded-full">
                    {notifications.length}{" "}
                    {notifications.length > 1 ? "nouveaux" : "nouveau"}
                  </span>
                </div>

                <div className="max-h-[320px] overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 text-sm">
                      Aucune nouvelle alerte.
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                      {notifications.map((med) => (
                        <div
                          key={med.id}
                          className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                        >
                          <div className="flex items-start gap-3">
                            <div className="p-2 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-lg shrink-0">
                              <AlertTriangle className="w-5 h-5" />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-slate-800 dark:text-slate-200 leading-snug">
                                {med.nomMedicament || "Médicament inconnu"}
                              </p>
                              <p className="text-xs text-rose-500 font-semibold mt-0.5">
                                Stock épuisé (0)
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => handleMarkAsRead(med)}
                            className="mt-3 w-full flex items-center justify-center gap-2 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                          >
                            <Check className="w-3.5 h-3.5" /> J'ai compris,
                            retirer de la liste
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="hidden md:flex items-center space-x-3 border-l border-slate-200 pl-6 dark:border-slate-700">
            {/* Espace avatar */}
          </div>
        </div>
      </header>
    </FadeInBlock>
  );
}
