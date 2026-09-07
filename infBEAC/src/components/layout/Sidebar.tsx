import React, { useState, useEffect, useRef } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Calendar,
  ClipboardList,
  History,
  Activity,
  FileText,
  UserCog,
  ShieldCheck,
  HelpCircle,
  Plus,
  MoonStar,
  SunMedium,
  LogOut,
} from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import { normalizeRole, useAuth } from "../../context/AuthContext";

// ==========================================
// COMPOSANT UTILITAIRE POUR INTERSECTION OBSERVER
// Adapté pour un glissement HORIZONTAL (Sidebar)
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
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, []);

  return (
    <div
      ref={domRef}
      style={{ transitionDelay: `${delay}ms` }}
      // Glissement de la gauche (-translate-x-4) vers sa position d'origine
      className={`transition-all duration-700 ease-out transform ${
        isVisible ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4"
      } ${className}`}
    >
      {children}
    </div>
  );
}

export default function Sidebar() {
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();
  const navigate = useNavigate();
  const allowedRoutesByRole: Record<string, string[]> = {
    INFIRMIERE: ["/soins", "/pharmacie", "/histpharm", "/patients", "/dossier-patient-infirmiere", "/aide"],
    MEDECIN: [
      "/dashboard",
      "/patients",
      "/consultations",
      "/reports/history",
      "/reports",
      "/aide",
    ],
    ADMIN: ["/logs", "/profils", "/aide"],
  };

  const currentRole = user ? normalizeRole(user.role) : null;

  // Liste des menus
  const navItems = [
    { path: "/dashboard", icon: LayoutDashboard, label: "Tableau de bord" },
    { path: "/patients", icon: Users, label: "Patients" },
    { path: "/dossier-patient-infirmiere", icon: FileText, label: "Mon dossier patient" },
    { path: "/consultations", icon: Calendar, label: "Consultations" },
    { path: "/soins", icon: Activity, label: "Soins courants" },
    { path: "/pharmacie", icon: ClipboardList, label: "Pharmacie" },
    { path: "/histpharm", icon: History, label: "Historique " },
    { path: "/reports/history", icon: History, label: "Historique" },
    { path: "/reports", icon: FileText, label: "Rapports" },

    // Éléments Administrateur
    { path: "/profils", icon: UserCog, label: "Gestion des profils" },
    { path: "/logs", icon: ShieldCheck, label: "Log et traçabilité" },

    { path: "/aide", icon: HelpCircle, label: "Aide" },
  ];

  const visibleNavItems = navItems.filter((item) => {
    if (!currentRole) return false;
    return allowedRoutesByRole[currentRole]?.includes(item.path);
  });

  const handleLogout = () => {
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = "/auth";
  };

  return (
    <aside className="w-64 bg-[#005ca5] text-slate-100 flex flex-col h-screen shrink-0 shadow-xl z-20 overflow-hidden relative">
      {/* ---------------- EN-TÊTE DU MENU ---------------- */}
      <FadeInBlock delay={0}>
        <div
          onClick={() => navigate("/")}
          className="p-6 flex items-center space-x-3 border-b border-white/15 shrink-0 cursor-pointer hover:bg-white/5 transition-colors"
        >
          <div className="bg-white p-2 rounded-lg text-[#005ca5] shadow-sm">
            <Plus className="w-6 h-6 font-bold" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-wide text-white">
              INFIRMERIE+
            </h1>
            <p className="text-[10px] text-blue-100">
              La santé entre de bonnes mains
            </p>
          </div>
        </div>
      </FadeInBlock>

      {/* ---------------- LISTE DES LIENS AVEC EFFET COURBURE ---------------- */}
      <div className="flex-1 overflow-y-auto py-6 scrollbar-hide">
        <nav className="pl-4 space-y-2">
          {visibleNavItems.map((item, index) => (
            <FadeInBlock key={item.path} delay={(index + 1) * 40}>
              <NavLink
                to={item.path}
                end
                state={{ title: item.label }}
                className={({ isActive }) =>
                  `flex items-center space-x-3 px-4 py-3.5 transition-all duration-300 relative ${
                    isActive
                      ? // ACTIF : Prend le fond du Main Content (slate-50 clair, slate-950 sombre) avec bordure gauche dorée
                        "bg-slate-50 dark:bg-slate-950 text-[#005ca5] dark:text-white font-bold border-l-4 border-[#c2a712] rounded-l-2xl"
                      : // INACTIF : Reste bleu avec un marge à droite (mr-4)
                        "text-blue-50 hover:bg-white/10 border-l-4 border-transparent rounded-2xl mr-4"
                  }`
                }
              >
                {({ isActive }) => {
                  const Icon = item.icon;
                  return (
                    <>
                      {/* === EFFET DE DÉCOUPE / COURBURE (UNIQUEMENT SI ACTIF) === */}
                      {isActive && (
                        <>
                          {/* Courbure inversée HAUT */}
                          <div className="absolute right-0 -top-6 w-6 h-6 bg-transparent rounded-br-2xl shadow-[10px_10px_0_10px_#f8fafc] dark:shadow-[10px_10px_0_10px_#020617] pointer-events-none" />

                          {/* Courbure inversée BAS */}
                          <div className="absolute right-0 -bottom-6 w-6 h-6 bg-transparent rounded-tr-2xl shadow-[10px_-10px_0_10px_#f8fafc] dark:shadow-[10px_-10px_0_10px_#020617] pointer-events-none" />
                        </>
                      )}

                      <Icon
                        size={20}
                        className={`transition-colors duration-300 z-10 ${
                          isActive
                            ? "text-[#c2a712]"
                            : "text-blue-100 group-hover:text-white"
                        }`}
                      />
                      <span className="text-sm font-semibold z-10">
                        {item.label}
                      </span>
                    </>
                  );
                }}
              </NavLink>
            </FadeInBlock>
          ))}
        </nav>
      </div>

      {/* ---------------- PIED DU MENU (Thème & Déconnexion) ---------------- */}
      <FadeInBlock delay={(visibleNavItems.length + 2) * 40}>
        <div className="p-4 m-3 space-y-3 shrink-0 border-t border-white/15 pt-4">
          <div className="flex items-center justify-between rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-slate-200 md:hidden">
            <span className="text-xs font-bold uppercase tracking-[0.18em] text-blue-100">
              Thème
            </span>
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={
                theme === "dark"
                  ? "Activer le mode clair"
                  : "Activer le mode sombre"
              }
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#c2a712] text-white transition hover:bg-[#a98f0b]"
            >
              {theme === "dark" ? (
                <SunMedium className="h-4 w-4" />
              ) : (
                <MoonStar className="h-4 w-4" />
              )}
            </button>
          </div>

          <button
            onClick={handleLogout}
            className="w-full bg-[#c2a712] rounded-xl flex items-center space-x-3 p-3 cursor-pointer hover:bg-[#9d8c0a] border border-transparent transition-all duration-200 group shadow-sm"
          >
            <div className="flex items-center justify-center shrink-0">
              <LogOut className="w-5 h-5 text-white transition-transform group-hover:-translate-x-1" />
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-sm font-bold text-white transition-colors">
                Se déconnecter
              </p>
            </div>
          </button>
        </div>
      </FadeInBlock>
    </aside>
  );
}
