import { Outlet, useLocation } from "react-router-dom";
import { useState } from "react";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

export default function MainLayout() {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const getPageTitle = () => {
    // Prefer explicit title passed in navigation state (sidebar clicks)
    const stateTitle = (location.state as any)?.title;
    if (stateTitle) return stateTitle;

    if (location.pathname.includes("/consultations")) return "Consultations";
    if (location.pathname.includes("/patients")) return "Patients";
    if (location.pathname.includes("/pharmacy")) return "Pharmacie";
    if (location.pathname.includes("/dashboard")) return "Tableau de bord";
  };

  const getPageSubtitle = () => {
    if (location.pathname.includes("/consultations"))
      return "Gérez les consultations de vos patients";
    return "";
  };

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-800 overflow-hidden transition-colors duration-200 dark:bg-slate-950 dark:text-slate-100">
      {/* Sidebar drawer for small screens; static on md+ */}
      <div
        className={`fixed inset-y-0 left-0 z-30 w-64 transform transition-transform duration-200 md:static md:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <Sidebar />
      </div>

      {/* Backdrop when sidebar is open on small screens */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-20 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <Topbar
          title={getPageTitle()}
          subtitle={getPageSubtitle()}
          onMenuClick={() => setSidebarOpen((s) => !s)}
        />

        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
