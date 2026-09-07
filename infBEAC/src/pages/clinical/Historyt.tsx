import { useState, useEffect, useMemo, useRef } from "react";
import {
  History,
  Search,
  Mic,
  ArrowLeft,
  Download,
  Printer,
  Stethoscope,
  Activity,
  AlertTriangle,
  Filter,
  ChevronRight,
  Trash2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const API_BASE_URL = "http://localhost:3001";

// Liste complète issue de l'organigramme de l'Agence de Douala + Prestataires/Stagiaires
const SERVICES_BEAC = [
  "Direction d'Agence",
  "Cellule Interne de Contrôle",
  "Service Émission Monétaire et Circulation Fiduciaire",
  "Service Comptabilité, Budget, Contrôle de Gestion et Gestion Administrative des Marchés",
  "Service Ressources Humaines, Formation, Affaires Juridiques et Organisation",
  "Service Systèmes d'Information",
  "Service Patrimoine, Moyens Généraux et Relations Publiques",
  "Service Études et Statistiques, Activités Bancaires et Financement des Économies",
  "Stagiaires",
  "Prestataires",
];

// ==========================================
// COMPOSANT D'ANIMATION AU SCROLL
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
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => setVisible(true), delay);
          if (ref.current) observer.unobserve(entry.target);
        }
      },
      { threshold: 0.1 },
    );

    const ref = domRef;
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [delay]);

  return (
    <div
      ref={domRef}
      className={`transition-all duration-700 ease-out transform ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-7"
      } ${className}`}
    >
      {children}
    </div>
  );
}

// ==========================================
// TYPES
// ==========================================
interface HistoryRow {
  id: string;
  patientId: string;
  nom: string;
  service: string;
  typeActe: "INFIRMIERE" | "MEDECIN";
  motif: string;
  dateStr: string;
  heureStr: string;
  timestamp: number;
  statut: string;
}

export default function HistoriqueGlobal() {
  const navigate = useNavigate();

  const [historique, setHistorique] = useState<HistoryRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [apiError, setApiError] = useState(false);

  // FILTRES ET RECHERCHE
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("TOUS"); // TOUS, INFIRMIERE, MEDECIN
  const [filterService, setFilterService] = useState("Tous");

  const [isListeningSearch, setIsListeningSearch] = useState(false);
  const recognitionRef = useRef<any>(null);

  // ==========================================
  // FETCH ET FUSION DES DONNÉES
  // ==========================================
  useEffect(() => {
    const fetchHistory = async () => {
      setIsLoading(true);
      setApiError(false);

      try {
        const [patientsRes, actesInfRes, actesMedRes] = await Promise.all([
          fetch(`${API_BASE_URL}/patients`),
          fetch(`${API_BASE_URL}/actes_infirmiers`),
          fetch(`${API_BASE_URL}/actes_medicaux`),
        ]);

        if (!patientsRes.ok || !actesInfRes.ok || !actesMedRes.ok) {
          throw new Error("Erreur de récupération de l'historique");
        }

        const patients: any[] = await patientsRes.json();
        const actesInfirmiers: any[] = await actesInfRes.json();
        const actesMedicaux: any[] = await actesMedRes.json();

        const combinedHistory: HistoryRow[] = [];

        // 1. Actes Infirmiers
        actesInfirmiers.forEach((acte) => {
          const patient = patients.find((p) => p.id === acte.patientId) || {};
          const dateObj = new Date(acte.createdAt);

          combinedHistory.push({
            id: `inf_${acte.id}`, // Préfixe pour savoir de quelle table ça vient
            patientId: acte.patientId || patient.id || "Inconnu",
            nom: patient.nomComplet || acte.patientName || "Patient Inconnu",
            service: patient.service || acte.service || "Non renseigné",
            typeActe: "INFIRMIERE",
            motif:
              acte.pathology !== "-" ? acte.pathology : "Constantes de routine",
            dateStr: !isNaN(dateObj.getTime())
              ? dateObj.toLocaleDateString("fr-FR")
              : "-",
            heureStr: !isNaN(dateObj.getTime())
              ? dateObj.toLocaleTimeString("fr-FR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "-",
            timestamp: !isNaN(dateObj.getTime()) ? dateObj.getTime() : 0,
            statut: acte.status || "Terminé",
          });
        });

        // 2. Actes Médicaux
        actesMedicaux.forEach((acte) => {
          const patient = patients.find((p) => p.id === acte.patientId) || {};
          const ts =
            acte.timestamp ||
            (acte.date ? new Date(acte.date).getTime() : Date.now());
          const dateObj = new Date(ts);

          combinedHistory.push({
            id: `med_${acte.id}`, // Préfixe pour savoir de quelle table ça vient
            patientId: acte.patientId || patient.id || "Inconnu",
            nom: patient.nomComplet || "Patient Inconnu",
            service: patient.service || "Non renseigné",
            typeActe: "MEDECIN",
            motif: acte.diagnostic || acte.plaintes || "Consultation générale",
            dateStr: !isNaN(dateObj.getTime())
              ? dateObj.toLocaleDateString("fr-FR")
              : acte.date || "-",
            heureStr: !isNaN(dateObj.getTime())
              ? dateObj.toLocaleTimeString("fr-FR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "-",
            timestamp: ts,
            statut: "Terminé",
          });
        });

        // Tri chronologique global (plus récent en haut)
        combinedHistory.sort((a, b) => b.timestamp - a.timestamp);
        setHistorique(combinedHistory);
      } catch (error) {
        console.error("Erreur API :", error);
        setApiError(true);
      } finally {
        setIsLoading(false);
      }
    };

    fetchHistory();
  }, []);

  // ==========================================
  // ACTION : SUPPRESSION D'UN ACTE
  // ==========================================
  const handleDeleteRecord = async (
    compositeId: string,
    e: React.MouseEvent,
  ) => {
    e.preventDefault();
    e.stopPropagation(); // Évite le clic sur la ligne entière (navigation)

    if (
      !window.confirm(
        "Êtes-vous sûr de vouloir supprimer cet acte de l'historique ? Cette action est irréversible.",
      )
    ) {
      return;
    }

    // Déduit la table à attaquer en fonction du préfixe ajouté lors de la fusion
    const isInfirmier = compositeId.startsWith("inf_");
    const actualId = compositeId.replace(/^(inf_|med_)/, "");
    const endpoint = isInfirmier ? "actes_infirmiers" : "actes_medicaux";

    try {
      const response = await fetch(`${API_BASE_URL}/${endpoint}/${actualId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        // Supprime l'élément du tableau local sans avoir besoin de recharger l'API
        setHistorique((prev) => prev.filter((item) => item.id !== compositeId));
      } else {
        alert("Erreur lors de la suppression sur le serveur.");
      }
    } catch (error) {
      console.error("Erreur réseau lors de la suppression:", error);
      alert("Erreur réseau lors de la suppression.");
    }
  };

  // ==========================================
  // DICTÉE VOCALE
  // ==========================================
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = "fr-FR";

      recognitionRef.current.onresult = (event: any) => {
        let currentTranscript = "";
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          currentTranscript += event.results[i][0].transcript;
        }
        setSearchQuery(currentTranscript.trim().replace(/\.$/, ""));
      };

      recognitionRef.current.onerror = () => setIsListeningSearch(false);
      recognitionRef.current.onend = () => setIsListeningSearch(false);
    }
    return () => recognitionRef.current?.stop();
  }, []);

  const toggleListeningSearch = () => {
    if (isListeningSearch) {
      recognitionRef.current?.stop();
      setIsListeningSearch(false);
    } else if (recognitionRef.current) {
      setSearchQuery("");
      setIsListeningSearch(true);
      recognitionRef.current.start();
    }
  };

  // ==========================================
  // FILTRAGE
  // ==========================================
  const availableServices = useMemo(() => {
    const services = new Set([
      ...SERVICES_BEAC,
      ...historique.map((h) => h.service),
    ]);
    return Array.from(services)
      .filter((s) => s !== "Non renseigné" && s !== "")
      .sort();
  }, [historique]);

  const filteredHistory = useMemo(() => {
    let result = historique;

    if (filterType !== "TOUS") {
      result = result.filter((h) => h.typeActe === filterType);
    }

    if (filterService !== "Tous") {
      result = result.filter((h) => h.service === filterService);
    }

    if (searchQuery.trim() !== "") {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (h) =>
          h.nom.toLowerCase().includes(q) ||
          h.patientId.toLowerCase().includes(q) ||
          h.motif.toLowerCase().includes(q) ||
          h.service.toLowerCase().includes(q),
      );
    }

    return result;
  }, [historique, filterType, filterService, searchQuery]);

  // ==========================================
  // EXPORT CSV
  // ==========================================
  const exportCsv = () => {
    const rows = [
      [
        "Date",
        "Heure",
        "ID Patient",
        "Nom du Patient",
        "Service",
        "Type d'Acte",
        "Motif / Diagnostic",
        "Statut",
      ],
      ...filteredHistory.map((h) => [
        h.dateStr,
        h.heureStr,
        h.patientId,
        h.nom,
        h.service,
        h.typeActe === "MEDECIN" ? "Consultation Médicale" : "Soins Infirmiers",
        h.motif,
        h.statut,
      ]),
    ];

    const csvContent =
      "\uFEFF" +
      rows
        .map((r) =>
          r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";"),
        )
        .join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `historique_global_beac.csv`;
    link.click();
  };

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto font-sans text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-950 min-h-screen transition-colors duration-200 space-y-6">
      {apiError && (
        <FadeInBlock delay={0}>
          <div className="mb-6 bg-rose-100 border border-rose-400 text-rose-700 px-4 py-3 rounded-lg flex items-center gap-3 shadow-sm">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <p className="font-bold text-sm">
              Impossible de charger l'historique depuis le serveur.
            </p>
          </div>
        </FadeInBlock>
      )}

      {/* EN-TÊTE */}
      <FadeInBlock delay={0}>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 dark:border-slate-800 pb-6 print:hidden">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shadow-sm"
              title="Retour"
            >
              <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-300" />
            </button>
            <div>
              <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <History className="w-6 h-6 text-[#c2a712] dark:text-[#fde047]" />
                Historique Global des Consultations
              </h1>
              <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm font-medium">
                Registre complet de tous les actes médicaux et infirmiers
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition shadow-sm"
            >
              <Printer className="w-4 h-4" /> Imprimer
            </button>
            <button
              onClick={exportCsv}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-white bg-[#c2a712] rounded-lg hover:bg-[#a98f0b] shadow-md shadow-[#c2a712]/20 transition"
            >
              <Download className="w-4 h-4" /> Exporter CSV
            </button>
          </div>
        </div>
      </FadeInBlock>

      {/* FILTRES & RECHERCHE */}
      <FadeInBlock delay={100}>
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 md:p-6 flex flex-col lg:flex-row gap-4 justify-between items-center print:hidden">
          <div className="relative w-full lg:w-96">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-slate-400" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                isListeningSearch
                  ? "Écoute en cours..."
                  : "Rechercher un patient, motif..."
              }
              className={`w-full pl-10 pr-10 py-2.5 rounded-xl border text-sm font-medium outline-none transition-all ${
                isListeningSearch
                  ? "border-rose-400 bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:border-rose-500/50"
                  : "border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-200 focus:border-[#c2a712] focus:ring-1 focus:ring-[#c2a712]"
              }`}
            />
            <button
              type="button"
              onClick={toggleListeningSearch}
              className={`absolute inset-y-0 right-0 pr-3 flex items-center transition-colors ${
                isListeningSearch
                  ? "text-rose-500 animate-pulse"
                  : "text-slate-400 hover:text-[#c2a712]"
              }`}
            >
              <Mic className="h-5 w-5" />
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setFilterType("TOUS")}
                className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${filterType === "TOUS" ? "bg-white dark:bg-slate-600 shadow-sm text-slate-800 dark:text-white" : "text-slate-500 hover:text-slate-700 dark:text-slate-400"}`}
              >
                Tous
              </button>
              <button
                onClick={() => setFilterType("MEDECIN")}
                className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all flex items-center gap-1.5 ${filterType === "MEDECIN" ? "bg-white dark:bg-slate-600 shadow-sm text-blue-600 dark:text-blue-400" : "text-slate-500 hover:text-blue-600 dark:text-slate-400"}`}
              >
                <Stethoscope className="w-4 h-4" /> Médecin
              </button>
              <button
                onClick={() => setFilterType("INFIRMIERE")}
                className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all flex items-center gap-1.5 ${filterType === "INFIRMIERE" ? "bg-white dark:bg-slate-600 shadow-sm text-[#c2a712] dark:text-[#fde047]" : "text-slate-500 hover:text-[#c2a712] dark:hover:text-[#fde047]"}`}
              >
                <Activity className="w-4 h-4" /> Infirmier
              </button>
            </div>

            <div className="relative w-full sm:w-auto">
              <Filter className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 pointer-events-none" />
              <select
                value={filterService}
                onChange={(e) => setFilterService(e.target.value)}
                className="w-full sm:w-48 pl-9 pr-8 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm font-medium text-slate-700 dark:text-slate-200 outline-none focus:border-[#c2a712] focus:ring-1 focus:ring-[#c2a712] cursor-pointer appearance-none truncate"
              >
                <option value="Tous">Tous les services</option>
                {availableServices.map((srv) => (
                  <option key={srv} value={srv}>
                    {srv}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </FadeInBlock>

      {/* TABLEAU DE L'HISTORIQUE */}
      <FadeInBlock delay={200}>
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex justify-between items-center">
            <span className="text-sm font-bold text-slate-600 dark:text-slate-300">
              Résultats : {filteredHistory.length} acte(s)
            </span>
            <span className="text-xs font-medium text-slate-400 print:hidden">
              Cliquez sur une ligne pour ouvrir le dossier du patient
            </span>
          </div>

          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="p-12 text-center text-slate-500 font-bold animate-pulse">
                Chargement du registre...
              </div>
            ) : (
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-50 dark:bg-slate-950/50">
                  <tr className="text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                    <th className="p-4 font-semibold uppercase tracking-wider text-[11px]">
                      Date & Heure
                    </th>
                    <th className="p-4 font-semibold uppercase tracking-wider text-[11px]">
                      Type d'acte
                    </th>
                    <th className="p-4 font-semibold uppercase tracking-wider text-[11px]">
                      Patient
                    </th>
                    <th className="p-4 font-semibold uppercase tracking-wider text-[11px]">
                      Service
                    </th>
                    <th className="p-4 font-semibold uppercase tracking-wider text-[11px]">
                      Motif / Diagnostic
                    </th>
                    <th className="p-4 font-semibold uppercase tracking-wider text-[11px]">
                      Statut
                    </th>
                    <th className="p-4 w-10 print:hidden text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredHistory.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="p-12 text-center text-slate-500"
                      >
                        {searchQuery || filterService !== "Tous"
                          ? "Aucun résultat ne correspond à vos critères de recherche."
                          : "Le registre de l'infirmerie est vide."}
                      </td>
                    </tr>
                  ) : (
                    filteredHistory.map((row, index) => (
                      <tr
                        key={row.id}
                        onClick={() =>
                          navigate("/dossier-patient", {
                            state: {
                              title: `Dossier de ${row.nom}`,
                              patient: {
                                id: row.patientId,
                                nom: row.nom,
                                service: row.service,
                              },
                            },
                          })
                        }
                        style={{ animationDelay: `${(index % 15) * 40}ms` }}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer group animate-in fade-in slide-in-from-bottom-2 duration-300 fill-mode-both"
                      >
                        <td className="p-4">
                          <p className="font-bold text-slate-700 dark:text-slate-200">
                            {row.dateStr}
                          </p>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {row.heureStr}
                          </p>
                        </td>

                        <td className="p-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-bold border ${
                              row.typeActe === "MEDECIN"
                                ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800/50"
                                : "bg-[#fefce8] text-[#9d8c0a] border-[#fef08a] dark:bg-[#c2a712]/15 dark:text-[#fde047] dark:border-[#c2a712]/30"
                            }`}
                          >
                            {row.typeActe === "MEDECIN" ? (
                              <Stethoscope className="w-3.5 h-3.5" />
                            ) : (
                              <Activity className="w-3.5 h-3.5" />
                            )}
                            {row.typeActe === "MEDECIN"
                              ? "Médecin"
                              : "Infirmier"}
                          </span>
                        </td>

                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs text-white shrink-0 shadow-sm ${row.typeActe === "MEDECIN" ? "bg-blue-600" : "bg-[#c2a712]"}`}
                            >
                              {getInitials(row.nom)}
                            </div>
                            <div>
                              <p
                                className={`font-bold text-slate-800 dark:text-slate-100 transition-colors ${row.typeActe === "MEDECIN" ? "group-hover:text-blue-500" : "group-hover:text-[#c2a712] dark:group-hover:text-[#fde047]"}`}
                              >
                                {row.nom}
                              </p>
                              <p className="text-[11px] font-mono text-slate-400">
                                ID: {row.patientId}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td
                          className="p-4 text-slate-600 dark:text-slate-300 max-w-[200px] truncate"
                          title={row.service}
                        >
                          {row.service}
                        </td>

                        <td
                          className="p-4 font-medium text-slate-700 dark:text-slate-300 max-w-[250px] truncate"
                          title={row.motif}
                        >
                          {row.motif}
                        </td>

                        <td className="p-4">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                              row.statut === "Terminé" ||
                              row.statut.includes("Terminé")
                                ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800/50"
                                : "bg-[#fefce8] text-[#9d8c0a] border-[#fef08a] dark:bg-[#c2a712]/15 dark:text-[#fde047] dark:border-[#c2a712]/30"
                            }`}
                          >
                            {row.statut}
                          </span>
                        </td>

                        <td className="p-4 text-right print:hidden">
                          <div className="flex items-center justify-end gap-3">
                            <button
                              type="button"
                              onClick={(e) => handleDeleteRecord(row.id, e)}
                              className="p-1.5 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/40 rounded-lg transition-colors"
                              title="Supprimer cet acte"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                            <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-[#c2a712] transition-colors" />
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </FadeInBlock>
    </div>
  );
}
