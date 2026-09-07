import { useState, useEffect, useMemo, useRef } from "react";
import {
  Pill,
  Search,
  Mic,
  ArrowLeft,
  Download,
  Printer,
  Calendar,
  AlertTriangle,
  User,
  PackageMinus,
  TrendingUp,
  Trash2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAppData } from "../../context/AppDataContext";

const API_BASE_URL = "http://localhost:3001";

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
interface DeliveryRow {
  id: string;
  patientId: string;
  patientName: string;
  service: string;
  medicine: string;
  quantity: number;
  dateStr: string;
  heureStr: string;
  timestamp: number;
}

export default function HistoriquePharmacie() {
  const navigate = useNavigate();
  const { history, clearHistory } = useAppData();

  const [deliveries, setDeliveries] = useState<DeliveryRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [apiError, setApiError] = useState(false);

  // FILTRES ET RECHERCHE
  const [searchQuery, setSearchQuery] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [isListeningSearch, setIsListeningSearch] = useState(false);
  const recognitionRef = useRef<any>(null);

  // ==========================================
  // FETCH DES DONNÉES (Actes Infirmiers -> Filtre Médicaments)
  // ==========================================
  useEffect(() => {
    const fetchDeliveries = async () => {
      setIsLoading(true);
      setApiError(false);

      try {
        const [patientsRes, actesInfRes] = await Promise.all([
          fetch(`${API_BASE_URL}/patients`),
          fetch(`${API_BASE_URL}/actes_infirmiers`),
        ]);

        if (!patientsRes.ok || !actesInfRes.ok) {
          throw new Error("Erreur de récupération");
        }

        const patients: any[] = await patientsRes.json();
        const actesInfirmiers: any[] = await actesInfRes.json();

        const extractedDeliveries: DeliveryRow[] = [];

        actesInfirmiers.forEach((acte) => {
          // On ne garde QUE les actes où un médicament a été donné
          if (
            acte.medicine &&
            acte.medicine !== "-" &&
            acte.medicine.trim() !== ""
          ) {
            const patient = patients.find((p) => p.id === acte.patientId) || {};
            const dateObj = new Date(acte.createdAt);

            extractedDeliveries.push({
              id: acte.id,
              patientId: acte.patientId || patient.id || "Inconnu",
              patientName:
                patient.nomComplet || acte.patientName || "Patient Inconnu",
              service: patient.service || acte.service || "Non renseigné",
              medicine: acte.medicine,
              quantity: parseInt(acte.quantity) || 1, // Sécurisation du nombre
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
            });
          }
        });

        // Tri chronologique global (plus récent en haut)
        extractedDeliveries.sort((a, b) => b.timestamp - a.timestamp);
        setDeliveries(extractedDeliveries);
      } catch (error) {
        console.error("Erreur API :", error);
        setApiError(true);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDeliveries();
  }, []);

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
  // FILTRAGE ET KPI
  // ==========================================
  const filteredDeliveries = useMemo(() => {
    let result = deliveries;

    // Filtre par texte (nom, médoc, service)
    if (searchQuery.trim() !== "") {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (d) =>
          d.patientName.toLowerCase().includes(q) ||
          d.medicine.toLowerCase().includes(q) ||
          d.service.toLowerCase().includes(q),
      );
    }

    // Filtre par date
    if (startDate) {
      const startTimestamp = new Date(startDate).getTime();
      result = result.filter((d) => d.timestamp >= startTimestamp);
    }
    if (endDate) {
      // Ajout de 24h pour inclure toute la journée de fin
      const endTimestamp = new Date(endDate).getTime() + 86400000;
      result = result.filter((d) => d.timestamp <= endTimestamp);
    }

    return result;
  }, [deliveries, searchQuery, startDate, endDate]);

  // Calcul des KPI basés sur les données filtrées
  const kpiTotalDeliveries = filteredDeliveries.length;
  const kpiTotalPills = filteredDeliveries.reduce(
    (sum, d) => sum + d.quantity,
    0,
  );

  const mostGivenMed = useMemo(() => {
    if (filteredDeliveries.length === 0) return "-";
    const counts: Record<string, number> = {};
    filteredDeliveries.forEach((d) => {
      counts[d.medicine] = (counts[d.medicine] || 0) + d.quantity;
    });
    return Object.keys(counts).reduce((a, b) =>
      counts[a] > counts[b] ? a : b,
    );
  }, [filteredDeliveries]);

  const additions = useMemo(
    () => history.filter((entry) => entry.action === "ENTRÉE"),
    [history],
  );

  const handleClearHistory = () => {
    if (
      additions.length > 0 &&
      window.confirm("Voulez-vous vraiment vider l'historique des ajouts ?")
    ) {
      clearHistory();
    }
  };

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
        "Médicament",
        "Quantité",
      ],
      ...filteredDeliveries.map((d) => [
        d.dateStr,
        d.heureStr,
        d.patientId,
        d.patientName,
        d.service,
        d.medicine,
        d.quantity.toString(),
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
    link.download = `registre_pharmacie_beac.csv`;
    link.click();
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto font-sans text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-950 min-h-screen transition-colors duration-200 space-y-6">
      {apiError && (
        <FadeInBlock delay={0}>
          <div className="mb-6 bg-rose-100 border border-rose-400 text-rose-700 px-4 py-3 rounded-lg flex items-center gap-3 shadow-sm">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <p className="font-bold text-sm">
              Impossible de charger le registre depuis le serveur.
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
                <Pill className="w-6 h-6 text-teal-600 dark:text-teal-500" />
                Registre des Délivrances (Pharmacie)
              </h1>
              <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm font-medium">
                Traçabilité des sorties de médicaments de l'infirmerie
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
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-white bg-teal-600 rounded-lg hover:bg-teal-700 shadow-md shadow-teal-600/20 transition"
            >
              <Download className="w-4 h-4" /> Exporter CSV
            </button>
          </div>
        </div>
      </FadeInBlock>

      {/* KPI */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <FadeInBlock delay={50}>
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 flex items-center gap-4">
            <div className="p-3 bg-teal-50 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400 rounded-xl">
              <PackageMinus className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Actes de délivrance
              </p>
              <h2 className="text-3xl font-black text-slate-800 dark:text-white mt-1">
                {kpiTotalDeliveries}
              </h2>
            </div>
          </div>
        </FadeInBlock>
        <FadeInBlock delay={100}>
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 flex items-center gap-4">
            <div className="p-3 bg-[#fefce8] dark:bg-[#c2a712]/15 text-[#c2a712] dark:text-[#fde047] rounded-xl">
              <Pill className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Unités sorties
              </p>
              <h2 className="text-3xl font-black text-slate-800 dark:text-white mt-1">
                {kpiTotalPills}
              </h2>
            </div>
          </div>
        </FadeInBlock>
        <FadeInBlock delay={150}>
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 flex items-center gap-4">
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Le plus distribué
              </p>
              <h2
                className="text-xl font-bold text-slate-800 dark:text-white mt-2 truncate"
                title={mostGivenMed}
              >
                {mostGivenMed}
              </h2>
            </div>
          </div>
        </FadeInBlock>
      </div>

      {/* FILTRES & RECHERCHE */}
      <FadeInBlock delay={200}>
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
                  : "Rechercher patient, médicament..."
              }
              className={`w-full pl-10 pr-10 py-2.5 rounded-xl border text-sm font-medium outline-none transition-all ${
                isListeningSearch
                  ? "border-rose-400 bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:border-rose-500/50"
                  : "border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-200 focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
              }`}
            />
            <button
              type="button"
              onClick={toggleListeningSearch}
              className={`absolute inset-y-0 right-0 pr-3 flex items-center transition-colors ${
                isListeningSearch
                  ? "text-rose-500 animate-pulse"
                  : "text-slate-400 hover:text-teal-500"
              }`}
            >
              <Mic className="h-5 w-5" />
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-950 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800">
              <Calendar className="w-4 h-4 text-slate-400" />
              <span className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                Du
              </span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-transparent text-sm font-bold text-slate-700 dark:text-slate-200 outline-none"
              />
              <span className="text-sm text-slate-500 dark:text-slate-400 font-medium ml-2">
                Au
              </span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-transparent text-sm font-bold text-slate-700 dark:text-slate-200 outline-none"
              />
            </div>
          </div>
        </div>
      </FadeInBlock>

      {/* TABLEAU */}
      <FadeInBlock delay={250}>
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex justify-between items-center">
            <span className="text-sm font-bold text-slate-600 dark:text-slate-300">
              Registre détaillé
            </span>
             <button
               type="button"
               onClick={handleClearHistory}
               disabled={additions.length === 0}
               className="inline-flex items-center gap-2 px-3 py-2 text-xs font-bold text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-900/20 disabled:opacity-40 disabled:cursor-not-allowed"
             >
               <Trash2 className="w-4 h-4" /> Vider les ajouts
             </button>
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
                      Patient
                    </th>
                    <th className="p-4 font-semibold uppercase tracking-wider text-[11px]">
                      Service
                    </th>
                    <th className="p-4 font-semibold uppercase tracking-wider text-[11px] bg-teal-50/50 dark:bg-teal-900/10">
                      Médicament
                    </th>
                    <th className="p-4 font-semibold uppercase tracking-wider text-[11px] bg-teal-50/50 dark:bg-teal-900/10 text-center">
                      Quantité
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredDeliveries.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="p-12 text-center text-slate-500"
                      >
                        {searchQuery || startDate || endDate
                          ? "Aucune délivrance ne correspond à vos critères."
                          : "Le registre de la pharmacie est vide."}
                      </td>
                    </tr>
                  ) : (
                    filteredDeliveries.map((row, index) => (
                      <tr
                        key={row.id}
                        style={{ animationDelay: `${(index % 15) * 40}ms` }}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors animate-in fade-in slide-in-from-bottom-2 duration-300 fill-mode-both"
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
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 shrink-0 shadow-sm border border-slate-200 dark:border-slate-700">
                              <User className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="font-bold text-slate-800 dark:text-slate-100">
                                {row.patientName}
                              </p>
                              <p className="text-[11px] font-mono text-slate-400">
                                ID: {row.patientId}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td
                          className="p-4 text-slate-600 dark:text-slate-300 max-w-[250px] truncate"
                          title={row.service}
                        >
                          {row.service}
                        </td>

                        <td className="p-4 font-bold text-teal-700 dark:text-teal-400 bg-teal-50/30 dark:bg-teal-900/5">
                          {row.medicine}
                        </td>

                        <td className="p-4 text-center bg-teal-50/30 dark:bg-teal-900/5">
                          <span className="inline-flex items-center justify-center min-w-[2rem] px-2 py-1 rounded bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-400 font-black text-sm border border-teal-200 dark:border-teal-800/50">
                            {row.quantity}
                          </span>
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

      <FadeInBlock delay={300}>
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-emerald-50/50 dark:bg-emerald-900/10">
            <h2 className="text-sm font-bold text-emerald-800 dark:text-emerald-400">
              Historique des ajouts de médicaments
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Date et heure d&apos;enregistrement de chaque entrée en stock
            </p>
          </div>
          {additions.length === 0 ? (
            <p className="p-8 text-center text-sm text-slate-500">
              Aucun ajout de médicament enregistré.
            </p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {additions.map((entry) => (
                <div key={entry.id} className="p-4 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-bold text-slate-800 dark:text-slate-100">{entry.medicament}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Ajouté le {entry.date} par {entry.utilisateur}
                    </p>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 font-black text-sm">
                    +{entry.quantiteMouvement}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </FadeInBlock>
    </div>
  );
}
