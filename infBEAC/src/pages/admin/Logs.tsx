import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  ShieldCheck,
  Search,
  Filter,
  Download,
  AlertTriangle,
  Clock,
  User,
  Activity,
  Server,
  Lock,
  CalendarDays,
  X,
  FileCode2,
  Globe,
  Fingerprint,
  Users,
} from "lucide-react";

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
      className={`transition-all duration-700 ease-out transform ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-7"
      } ${className}`}
    >
      {children}
    </div>
  );
}

// NOUVEAU : Ajout de userName et role pour identifier clairement l'auteur
interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName?: string;
  role?: string;
  action: string;
  details: string;
  ipAdresse: string;
}

const ROLES_OPTIONS = ["Tous les rôles", "MEDECIN", "INFIRMIERE", "ADMIN_IT"];

export default function Logs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [apiError, setApiError] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [filterAction, setFilterAction] = useState("Toutes les actions");
  const [filterRole, setFilterRole] = useState("Tous les rôles");
  const [filterDate, setFilterDate] = useState("");

  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  // FETCH DES LOGS
  useEffect(() => {
    const fetchLogs = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`${API_BASE_URL}/logs`);
        if (!response.ok) throw new Error("Erreur réseau");

        const data = await response.json();

        // Tri du plus récent au plus ancien
        data.sort(
          (a: AuditLog, b: AuditLog) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
        );

        setLogs(data);
        setApiError(false);
      } catch (error) {
        console.error("Erreur API Logs:", error);
        setApiError(true);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLogs();
  }, []);

  // Liste dynamique des types d'actions
  const ACTION_TYPES = useMemo(() => {
    const actions = new Set(logs.map((log) => log.action));
    return ["Toutes les actions", ...Array.from(actions)];
  }, [logs]);

  // FILTRAGE DYNAMIQUE ROBUSTE
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const term = searchTerm.toLowerCase().trim();

      // Recherche textuelle incluant le nom de l'utilisateur
      const matchSearch =
        term === "" ||
        (log.userId || "").toLowerCase().includes(term) ||
        (log.userName || "").toLowerCase().includes(term) ||
        (log.details || "").toLowerCase().includes(term) ||
        (log.action || "").toLowerCase().includes(term);

      const matchAction =
        filterAction === "Toutes les actions" || log.action === filterAction;

      const matchRole =
        filterRole === "Tous les rôles" ||
        (log.role && log.role.toUpperCase() === filterRole);

      let matchDate = true;
      if (filterDate) {
        const logDate = log.timestamp.split("T")[0];
        matchDate = logDate === filterDate;
      }

      return matchSearch && matchAction && matchRole && matchDate;
    });
  }, [logs, searchTerm, filterAction, filterRole, filterDate]);

  // EXTRACTION DU MODULE/FICHIER À PARTIR DES DÉTAILS
  const extractModule = (details: string) => {
    const match = details.match(/module '([^']+)'/i);
    return match ? match[1] : "Module Général / Non spécifié";
  };

  // COULEURS DES BADGES D'ACTION
  const getActionBadgeStyle = (action: string) => {
    const act = (action || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

    if (act.includes("creation") || act.includes("ajout"))
      return "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-500/50";
    if (act.includes("suppression") || act.includes("delete"))
      return "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-500/50";
    if (act.includes("modification") || act.includes("update"))
      return "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-900/20 dark:text-sky-400 dark:border-sky-500/50";

    return "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-900/20 dark:text-indigo-400 dark:border-indigo-500/50";
  };

  // COULEURS DES RÔLES
  const getRoleBadgeStyle = (role?: string) => {
    const r = (role || "").toUpperCase();
    if (r === "MEDECIN") return "text-teal-600 dark:text-teal-400";
    if (r === "INFIRMIERE") return "text-sky-600 dark:text-sky-400";
    if (r === "ADMIN_IT") return "text-purple-600 dark:text-purple-400";
    return "text-slate-500 dark:text-slate-400";
  };

  // EXPORT EXCEL
  const handleExport = () => {
    let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
    csvContent += "Date & Heure;Utilisateur;Rôle;Action;Détails;Adresse IP\n";

    filteredLogs.forEach((log) => {
      const date = new Date(log.timestamp).toLocaleString("fr-FR");
      const userDisplay = log.userName || log.userId;
      const roleDisplay = log.role || "Inconnu";
      const row = `"${date}";"${userDisplay}";"${roleDisplay}";"${log.action}";"${log.details}";"${log.ipAdresse}"`;
      csvContent += row + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.href = encodedUri;
    link.download = filterDate
      ? `Audit_Logs_${filterDate}.csv`
      : `Audit_Logs_Complets.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto transition-colors duration-500 dark:bg-slate-950 min-h-screen font-sans space-y-6 animate-in fade-in">
      {apiError && (
        <FadeInBlock delay={0}>
          <div className="bg-rose-100 border border-rose-400 text-rose-700 px-4 py-3 rounded-lg flex items-center gap-3 shadow-sm">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <p className="font-bold text-sm">
              Impossible de joindre le serveur d'audit. Vérifiez la connexion.
            </p>
          </div>
        </FadeInBlock>
      )}

      {/* EN-TÊTE */}
      <FadeInBlock delay={50}>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-2">
              <ShieldCheck className="w-7 h-7 text-green-700 dark:text-green-500" />
              Traçabilité & Audit Logs
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm font-medium">
              Surveillance et enregistrement sécurisé des opérations du système
            </p>
          </div>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 text-slate-700 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200 text-sm font-bold rounded-xl shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition"
          >
            <Download className="w-4 h-4" />
            Exporter le registre
          </button>
        </div>
      </FadeInBlock>

      {/* BARRES DE RECHERCHE ET FILTRES */}
      <FadeInBlock delay={100}>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col lg:flex-row gap-4">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-slate-400" />
            </div>
            <input
              type="text"
              placeholder="Rechercher par nom, action ou détail..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-11 pr-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm font-medium transition-all"
            />
          </div>

          <div className="relative min-w-[180px]">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <CalendarDays className="h-5 w-5 text-slate-400" />
            </div>
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="block w-full pl-11 pr-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm font-medium transition-all"
            />
            {filterDate && (
              <button
                onClick={() => setFilterDate("")}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                title="Effacer la date"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Filtre par Rôle */}
          <div className="relative min-w-[180px]">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Users className="h-5 w-5 text-slate-400" />
            </div>
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="block w-full pl-11 pr-10 py-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm font-medium transition-all appearance-none cursor-pointer truncate"
            >
              {ROLES_OPTIONS.map((role, index) => (
                <option key={index} value={role}>
                  {role.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </div>

          <div className="relative min-w-[200px]">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Filter className="h-5 w-5 text-slate-400" />
            </div>
            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="block w-full pl-11 pr-10 py-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm font-medium transition-all appearance-none cursor-pointer truncate"
            >
              {ACTION_TYPES.map((type, index) => (
                <option key={index} value={type}>
                  {type.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </div>
        </div>
      </FadeInBlock>

      {/* TABLEAU DES LOGS */}
      <FadeInBlock delay={150}>
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex justify-between items-center">
            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-bold">
              <Server className="w-4 h-4 text-blue-600 dark:text-blue-500" />{" "}
              Registre d'événements
            </div>
            <span className="text-xs font-bold px-3 py-1 bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 rounded-lg flex items-center gap-1.5">
              <Lock className="w-3 h-3" /> Données chiffrées (
              {filteredLogs.length})
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-50 dark:bg-slate-950/50 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-xs">
                <tr>
                  <th className="p-4">Date & Heure</th>
                  <th className="p-4">Utilisateur / Rôle</th>
                  <th className="p-4">Type d'Action</th>
                  <th className="p-4">Détails de l'opération</th>
                  <th className="p-4">Machine (IP)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {isLoading ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="p-12 text-center text-slate-500 font-medium animate-pulse"
                    >
                      Extraction sécurisée des journaux...
                    </td>
                  </tr>
                ) : filteredLogs.length > 0 ? (
                  filteredLogs.map((log, index) => (
                    <tr
                      key={log.id}
                      onClick={() => setSelectedLog(log)}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer transition-colors animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both"
                      style={{ animationDelay: `${index * 30}ms` }}
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 font-semibold">
                          <Clock className="w-4 h-4 text-slate-400" />
                          {new Date(log.timestamp).toLocaleDateString("fr-FR")}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 ml-6">
                          {new Date(log.timestamp).toLocaleTimeString("fr-FR", {
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                          })}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 shrink-0">
                            <User className="w-4 h-4" />
                          </div>
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-800 dark:text-slate-200">
                              {log.userName || log.userId}
                            </span>
                            <span
                              className={`text-[10px] uppercase font-bold tracking-wider mt-0.5 ${getRoleBadgeStyle(log.role)}`}
                            >
                              {(log.role || "Non spécifié").replace(/_/g, " ")}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <span
                          className={`px-2.5 py-1.5 text-[10px] uppercase tracking-wider font-black rounded border flex w-max items-center gap-1.5 ${getActionBadgeStyle(
                            log.action,
                          )}`}
                        >
                          <Activity className="w-3 h-3" />
                          {(log.action || "Action").replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="p-4 text-slate-600 dark:text-slate-300 font-medium whitespace-normal min-w-[300px]">
                        {log.details}
                      </td>
                      <td className="p-4 font-mono text-xs text-slate-500 dark:text-slate-400">
                        {log.ipAdresse}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={5}
                      className="p-12 text-center text-slate-500 dark:text-slate-400"
                    >
                      <div className="flex flex-col items-center justify-center space-y-3">
                        <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-full">
                          <Search className="w-8 h-8 text-slate-400" />
                        </div>
                        <p className="text-base font-semibold dark:text-white">
                          Aucun log trouvé
                        </p>
                        <p className="text-sm">
                          Aucun événement ne correspond à vos critères de
                          recherche.
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </FadeInBlock>

      {/* ========================================================================= */}
      {/* MODALE D'INSPECTION DÉTAILLÉE DU LOG                                     */}
      {/* ========================================================================= */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-500 rounded-lg">
                  <Fingerprint className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-800 dark:text-white">
                    Inspection de l'événement
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                    ID: {selectedLog.id}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 dark:bg-slate-800/30 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                  <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5" /> Auteur
                  </p>
                  <p className="font-bold text-slate-800 dark:text-slate-200">
                    {selectedLog.userName || selectedLog.userId}
                  </p>
                  <p
                    className={`text-xs font-bold uppercase mt-1 ${getRoleBadgeStyle(selectedLog.role)}`}
                  >
                    {(selectedLog.role || "Non spécifié").replace(/_/g, " ")}
                  </p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/30 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                  <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" /> Horodatage
                  </p>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">
                    {new Date(selectedLog.timestamp).toLocaleDateString(
                      "fr-FR",
                    )}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-mono">
                    {new Date(selectedLog.timestamp).toLocaleTimeString(
                      "fr-FR",
                    )}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 dark:bg-slate-800/30 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                  <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5" /> Type d'action
                  </p>
                  <span
                    className={`px-2 py-1 text-[10px] uppercase tracking-wider font-black rounded border inline-block ${getActionBadgeStyle(selectedLog.action)}`}
                  >
                    {(selectedLog.action || "Action").replace(/_/g, " ")}
                  </span>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/30 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                  <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <FileCode2 className="w-3.5 h-3.5" /> Fichier manipulé
                  </p>
                  <p className="font-mono text-sm font-semibold text-blue-600 dark:text-blue-400 break-all">
                    {extractModule(selectedLog.details)}
                  </p>
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/30 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
                  Description brute
                </p>
                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                  {selectedLog.details}
                </p>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/30 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5" /> Origine Réseau
                </p>
                <p className="font-mono text-sm text-slate-600 dark:text-slate-300">
                  {selectedLog.ipAdresse}
                </p>
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-5 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-sm font-bold rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition shadow-sm"
              >
                Fermer l'inspection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
