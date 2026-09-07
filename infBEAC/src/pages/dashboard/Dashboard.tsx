import { useState, useEffect, useMemo, useRef } from "react";
import {
  Users,
  AlertTriangle,
  ArrowRight,
  UserPlus,
  Stethoscope,
  Pill,
  UserCheck,
  X,
  TrendingDown,
  Clock,
  HeartPulse,
  Trash2,
  Search,
  Mic,
  Plus,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAppData } from "../../context/AppDataContext";

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

export default function Dashboard() {
  const navigate = useNavigate();
  const { queue: sharedQueue } = useAppData();

  // NOUVEAU : On supprime le useState "kpi" statique, on va tout calculer !
  const [queue, setQueue] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [pharmacie, setPharmacie] = useState<any[]>([]);

  // États supplémentaires pour les actes afin de calculer les patients du jour
  const [actesInfirmiers, setActesInfirmiers] = useState<any[]>([]);
  const [actesMedicaux, setActesMedicaux] = useState<any[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [apiError, setApiError] = useState(false);

  const [currentDate, setCurrentDate] = useState(new Date());
  const [isAlertModalOpen, setIsAlertModalOpen] = useState(false);

  const [filterService, setFilterService] = useState("Tous");
  const [searchQuery, setSearchQuery] = useState("");
  const [isListeningSearch, setIsListeningSearch] = useState(false);
  const recognitionRef = useRef<any>(null);

  // ==========================================
  // APPEL API GLOBAL ET DYNAMIQUE
  // ==========================================
  useEffect(() => {
    setQueue(sharedQueue);
  }, [sharedQueue]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);
        // On remplace l'appel /kpi par les requêtes vers les vrais actes
        const [queueRes, patientsRes, pharmaRes, infirmiersRes, medicauxRes] =
          await Promise.all([
            fetch(`${API_BASE_URL}/queue`),
            fetch(`${API_BASE_URL}/patients`),
            fetch(`${API_BASE_URL}/pharmacie`),
            fetch(`${API_BASE_URL}/actes_infirmiers`),
            fetch(`${API_BASE_URL}/actes_medicaux`),
          ]);

        if (!queueRes.ok || !patientsRes.ok) throw new Error("Erreur réseau");

        setQueue(await queueRes.json());
        setPatients(await patientsRes.json());
        setPharmacie(await pharmaRes.json());
        setActesInfirmiers(await infirmiersRes.json());
        setActesMedicaux(await medicauxRes.json());

        setApiError(false);
      } catch (error) {
        console.error("Erreur API :", error);
        setApiError(true);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setCurrentDate(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formattedDate = new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(currentDate);

  // ==========================================
  // CALCUL DYNAMIQUE DES KPIs
  // ==========================================
  const AUJOURDHUI = new Date().getTime();
  const dateDuJourString = new Date().toLocaleDateString("fr-FR");

  // 1. Calcul des Alertes Pharmacie
  const stocksFaibles = useMemo(
    () => pharmacie.filter((entry) => entry.quantite <= 50),
    [pharmacie],
  );
  const peremptionsProches = useMemo(
    () =>
      pharmacie.filter((entry) => {
        const daysToExpiry =
          (new Date(entry.datePeremption).getTime() - AUJOURDHUI) /
          (1000 * 3600 * 24);
        return daysToExpiry > 0 && daysToExpiry < 90;
      }),
    [pharmacie, AUJOURDHUI],
  );

  // 2. Calcul des patients uniques vus aujourd'hui (File d'attente + Infirmière + Médecin)
  const patientsDuJourCount = useMemo(() => {
    const patientsUniquesAujourdhui = new Set<string>();

    // On cherche dans la file d'attente
    queue.forEach((q) => {
      const qDate = q.date
        ? new Date(q.date).toLocaleDateString("fr-FR")
        : dateDuJourString;
      if (qDate === dateDuJourString)
        patientsUniquesAujourdhui.add(q.patientId);
    });

    // On cherche dans les actes infirmiers
    actesInfirmiers.forEach((acte) => {
      if (
        new Date(acte.createdAt).toLocaleDateString("fr-FR") ===
        dateDuJourString
      ) {
        patientsUniquesAujourdhui.add(acte.patientId);
      }
    });

    // On cherche dans les actes médicaux
    actesMedicaux.forEach((acte) => {
      const timestamp =
        acte.timestamp || (acte.date ? new Date(acte.date).getTime() : 0);
      if (
        new Date(timestamp).toLocaleDateString("fr-FR") === dateDuJourString
      ) {
        patientsUniquesAujourdhui.add(acte.patientId);
      }
    });

    return patientsUniquesAujourdhui.size;
  }, [queue, actesInfirmiers, actesMedicaux, dateDuJourString]);

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

      recognitionRef.current.onerror = (event: any) => {
        console.error("Erreur de reconnaissance vocale:", event.error);
        setIsListeningSearch(false);
      };

      recognitionRef.current.onend = () => {
        setIsListeningSearch(false);
      };
    }

    return () => {
      if (recognitionRef.current) recognitionRef.current.stop();
    };
  }, []);

  const toggleListeningSearch = () => {
    if (isListeningSearch) {
      recognitionRef.current?.stop();
      setIsListeningSearch(false);
    } else {
      if (recognitionRef.current) {
        setSearchQuery("");
        setIsListeningSearch(true);
        recognitionRef.current.start();
      } else {
        alert("La dictée vocale n'est pas supportée par votre navigateur.");
      }
    }
  };

  const availableServices = useMemo(() => {
    const services = new Set(queue.map((p) => p.service));
    return Array.from(services).filter(Boolean);
  }, [queue]);

  const filteredQueue = useMemo(() => {
    let result = queue;

    if (filterService !== "Tous") {
      result = result.filter((p) => p.service === filterService);
    }

    if (searchQuery.trim() !== "") {
      const lowerQuery = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.nom?.toLowerCase().includes(lowerQuery) ||
          p.motif?.toLowerCase().includes(lowerQuery) ||
          p.service?.toLowerCase().includes(lowerQuery),
      );
    }

    return result;
  }, [queue, filterService, searchQuery]);

  // ==========================================
  // ACTIONS DE LA FILE D'ATTENTE
  // ==========================================
  const handleDeleteQueueItem = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (
      !window.confirm(
        "Êtes-vous sûr de vouloir supprimer ce dossier de la file d'attente ?",
      )
    )
      return;

    try {
      const response = await fetch(`${API_BASE_URL}/queue/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setQueue((prev) => prev.filter((item) => item.id !== id));
      } else {
        alert("Erreur lors de la suppression sur le serveur.");
      }
    } catch (error) {
      console.error("Erreur réseau lors de la suppression:", error);
    }
  };

  const renderStatus = (statut: string) => {
    if (statut === "Terminé") {
      return (
        <span className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-medium">
          <span className="w-2 h-2 rounded-full bg-blue-500"></span>
          {statut}
        </span>
      );
    }
    return (
      <span className="flex items-center gap-2 text-[#9d8c0a] dark:text-[#fde047] font-medium">
        <span className="w-2 h-2 rounded-full bg-[#c2a712]"></span>
        {statut}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="p-8 text-center text-slate-500 font-bold animate-pulse">
        Connexion au serveur BEAC en cours...
      </div>
    );
  }

  return (
    <div className="dashboard-shell p-4 md:p-8 font-sans text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-950 min-h-full transition-colors duration-200 space-y-8 relative">
      {apiError && (
        <div className="bg-rose-100 border border-rose-400 text-rose-700 px-4 py-3 rounded-lg flex items-center gap-3">
          <AlertTriangle className="w-5 h-5" />
          <p className="font-bold text-sm">
            Impossible de se connecter au backend (JSON Server).
          </p>
        </div>
      )}

      {/* EN-TÊTE DYNAMIQUE */}
      <FadeInBlock delay={0}>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-800 dark:text-slate-100 capitalize">
              {formattedDate}
            </h1>
          </div>
          <div
            className={`flex items-center gap-2 px-4 py-2 rounded-full border shadow-sm ${apiError ? "bg-rose-50 text-rose-700 border-rose-200" : "bg-[#fefce8] dark:bg-[#c2a712]/10 text-[#9d8c0a] dark:text-[#fde047] border-[#fef08a] dark:border-[#c2a712]/30"}`}
          >
            <span className="relative flex h-3 w-3">
              {!apiError && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#fde047] opacity-75"></span>
              )}
              <span
                className={`relative inline-flex rounded-full h-3 w-3 ${apiError ? "bg-rose-500" : "bg-[#c2a712]"}`}
              ></span>
            </span>
            <span className="font-semibold text-sm">
              {apiError ? "Système Déconnecté" : "Système Connecté (API)"}
            </span>
          </div>
        </div>
      </FadeInBlock>

      {/* KPI DYNAMIQUES */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <FadeInBlock delay={50}>
          <button
            type="button"
            onClick={() => navigate("/consultations")}
            className="w-full bg-white dark:bg-slate-900 p-5 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between transition-all hover:ring-2 hover:ring-blue-500 hover:shadow-md text-left group"
          >
            <div>
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider group-hover:text-blue-500 transition-colors">
                Patients du Jour
              </p>
              <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100 mt-1">
                {patientsDuJourCount}
              </h2>
            </div>
            <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
              <UserCheck className="w-5 h-5" />
            </div>
          </button>
        </FadeInBlock>

        <FadeInBlock delay={100}>
          <button
            type="button"
            onClick={() => navigate("/historique")}
            className="w-full bg-white dark:bg-slate-900 p-5 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between transition-all hover:ring-2 hover:ring-indigo-500 hover:shadow-md text-left group"
          >
            <div>
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider group-hover:text-indigo-500 transition-colors">
                Total Dossiers Patients
              </p>
              <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100 mt-1">
                {patients.length.toLocaleString("fr-FR")}
              </h2>
            </div>
            <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
              <Users className="w-5 h-5" />
            </div>
          </button>
        </FadeInBlock>

        <FadeInBlock delay={150}>
          <button
            type="button"
            onClick={() => navigate("/epidemiologie")}
            className="w-full bg-white dark:bg-slate-900 p-5 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between transition-all hover:ring-2 hover:ring-[#c2a712] hover:shadow-md text-left group"
          >
            <div>
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider group-hover:text-[#c2a712] transition-colors">
                Total Actes Médicaux
              </p>
              <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100 mt-1">
                {(actesMedicaux.length + actesInfirmiers.length).toLocaleString(
                  "fr-FR",
                )}
              </h2>
            </div>
            <div className="w-10 h-10 bg-[#c2a712]/15 text-[#c2a712] rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
              <HeartPulse className="w-5 h-5" />
            </div>
          </button>
        </FadeInBlock>

        <FadeInBlock delay={200}>
          <button
            type="button"
            onClick={() => setIsAlertModalOpen(true)}
            className="w-full bg-white dark:bg-slate-900 p-5 rounded-lg border border-red-200 dark:border-rose-900/50 shadow-sm flex items-center justify-between transition-all hover:ring-2 hover:ring-red-500 hover:shadow-md text-left group"
          >
            <div>
              <p className="text-xs font-bold text-red-500 dark:text-rose-400 uppercase tracking-wider group-hover:text-red-600 transition-colors">
                Alertes Stock Pharmacie
              </p>
              <h2 className="text-3xl font-bold text-red-600 dark:text-rose-500 mt-1">
                {stocksFaibles.length + peremptionsProches.length}
              </h2>
            </div>
            <div className="w-10 h-10 bg-red-50 dark:bg-rose-900/20 text-red-600 dark:text-rose-400 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform animate-pulse">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </button>
        </FadeInBlock>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* ACTIONS RAPIDES */}
        <FadeInBlock delay={250} className="lg:col-span-1">
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">
              Actions Rapides
            </h3>

            <div className="grid grid-cols-1 gap-3">
              <button
                type="button"
                onClick={() => navigate("/dossier-medical")}
                className="w-full flex items-center justify-between p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm hover:border-[#c2a712] hover:shadow-md transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-[#c2a712]/15 text-[#c2a712] rounded-md">
                    <Plus className="w-5 h-5" />
                  </div>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    Nouvelle consultation
                  </span>
                </div>
                <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-[#c2a712] transition-colors" />
              </button>

              <button
                type="button"
                onClick={() => navigate("/consultations")}
                className="w-full flex items-center justify-between p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm hover:border-blue-500 hover:shadow-md transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-md">
                    <Stethoscope className="w-5 h-5" />
                  </div>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    Consultations
                  </span>
                </div>
                <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-blue-500 transition-colors" />
              </button>
            </div>
          </div>
        </FadeInBlock>

        {/* FILE D'ATTENTE */}
        <FadeInBlock delay={300} className="lg:col-span-3">
          <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden h-full flex flex-col">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white shrink-0">
                File d'attente
              </h3>

              {/* ZONES DE FILTRE ET RECHERCHE */}
              <div className="w-full md:w-auto flex flex-col sm:flex-row items-center gap-3">
                <div className="relative w-full sm:w-64">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={
                      isListeningSearch
                        ? "Écoute en cours..."
                        : "Chercher (nom, motif...)"
                    }
                    className={`w-full pl-9 pr-10 p-2 rounded-lg border text-sm font-medium outline-none transition-all ${
                      isListeningSearch
                        ? "border-rose-400 bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:border-rose-500/50"
                        : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-[#c2a712]/50"
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
                    title="Recherche vocale"
                  >
                    <Mic className="h-4 w-4" />
                  </button>
                </div>

                <select
                  value={filterService}
                  onChange={(e) => setFilterService(e.target.value)}
                  className="w-full sm:w-48 p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-medium text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-[#c2a712]/50 transition-all truncate"
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

            <div className="overflow-x-auto flex-grow">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead>
                  <tr className="text-slate-500 dark:text-white border-b border-slate-200 dark:border-slate-800">
                    <th className="p-4 font-medium">Heure</th>
                    <th className="p-4 font-medium">Patient</th>
                    <th className="p-4 font-medium">Service</th>
                    <th className="p-4 font-medium">Motif</th>
                    <th className="p-4 font-medium">Statut</th>
                    <th className="p-4 font-medium text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                  {filteredQueue.map((patient, index) => (
                    <tr
                      key={patient.id}
                      style={{ animationDelay: `${index * 40}ms` }}
                      onClick={() =>
                        navigate("/dossier-patient", {
                          state: {
                            title: `Dossier de ${patient.nom}`,
                            patient: {
                              id: patient.patientId || patient.id,
                              nom: patient.nom,
                              service: patient.service || "Non renseigné",
                              age:
                                patient.age ||
                                patient.constantesSnapshot?.age ||
                                "-",
                              sexe:
                                patient.sexe ||
                                patient.constantesSnapshot?.sexe ||
                                "-",
                              telephone: patient.telephone || "-",
                            },
                          },
                        })
                      }
                      className="hover:bg-[#fefce8] dark:hover:bg-[#c2a712]/10 transition-colors cursor-pointer group animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both"
                      title={`Cliquez pour ouvrir le dossier de ${patient.nom}`}
                    >
                      <td className="p-4 text-slate-500 dark:text-white font-medium">
                        {patient.heure}
                      </td>
                      <td className="p-4 font-semibold text-slate-800 dark:text-white group-hover:text-[#9d8c0a] dark:group-hover:text-[#fde047]">
                        {patient.nom}
                      </td>
                      <td
                        className="p-4 text-slate-600 dark:text-white max-w-[200px] truncate"
                        title={patient.service}
                      >
                        {patient.service}
                      </td>
                      <td className="p-4 text-slate-600 dark:text-white">
                        {patient.motif}
                      </td>
                      <td className="p-4">{renderStatus(patient.statut)}</td>
                      <td className="p-4 text-center">
                        <button
                          type="button"
                          onClick={(e) => handleDeleteQueueItem(patient.id, e)}
                          className="p-1.5 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/40 rounded-lg transition-colors inline-flex items-center justify-center"
                          title="Supprimer ce dossier"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredQueue.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        className="p-12 text-center text-slate-500 dark:text-white"
                      >
                        {searchQuery.trim() !== ""
                          ? "Aucun résultat pour votre recherche."
                          : queue.length > 0
                            ? "Aucun patient dans ce service."
                            : "Aucun patient dans la file d'attente."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </FadeInBlock>
      </div>

      {/* MODALE D'ALERTES PHARMACIE */}
      {isAlertModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-50 dark:bg-rose-900/20 text-red-600 dark:text-rose-400 rounded-lg">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                  Détails des Alertes Pharmacie
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsAlertModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 overflow-y-auto p-6 gap-6">
              <div className="border border-slate-200 dark:border-slate-800 rounded-lg p-4 bg-slate-50/50 dark:bg-slate-950/40 flex flex-col">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-200 dark:border-slate-800 mb-3">
                  <TrendingDown className="w-4 h-4 text-amber-600 dark:text-amber-500" />
                  <h3 className="font-semibold text-sm text-slate-800 dark:text-slate-200">
                    Stocks faibles (≤ 50)
                  </h3>
                </div>
                <div className="space-y-2.5 flex-grow">
                  {stocksFaibles.length === 0 ? (
                    <p className="text-xs text-slate-500">
                      Aucun stock sous le seuil d'alerte.
                    </p>
                  ) : (
                    stocksFaibles.map((item) => (
                      <div
                        key={item.id}
                        className="flex justify-between items-center bg-white dark:bg-slate-800 p-2.5 rounded border border-slate-200 dark:border-slate-700 text-sm"
                      >
                        <span className="font-medium text-slate-800 dark:text-slate-200">
                          {item.nomMedicament}
                        </span>
                        <span
                          className={`font-semibold text-xs px-2 py-0.5 rounded ${item.quantite === 0 ? "text-rose-600 bg-rose-50 dark:bg-rose-900/20" : "text-amber-600 bg-amber-50 dark:bg-amber-900/20"}`}
                        >
                          {item.quantite} restants
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="border border-slate-200 dark:border-slate-800 rounded-lg p-4 bg-slate-50/50 dark:bg-slate-950/40 flex flex-col">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-200 dark:border-slate-800 mb-3">
                  <Clock className="w-4 h-4 text-orange-600 dark:text-orange-500" />
                  <h3 className="font-semibold text-sm text-slate-800 dark:text-slate-200">
                    Péremptions proches (&lt; 90j)
                  </h3>
                </div>
                <div className="space-y-2.5 flex-grow">
                  {peremptionsProches.length === 0 ? (
                    <p className="text-xs text-slate-500">
                      Aucune péremption dans les 90 prochains jours.
                    </p>
                  ) : (
                    peremptionsProches.map((item) => (
                      <div
                        key={item.id}
                        className="flex justify-between items-center bg-white dark:bg-slate-800 p-2.5 rounded border border-slate-200 dark:border-slate-700 text-sm"
                      >
                        <span className="font-medium text-slate-800 dark:text-slate-200">
                          {item.nomMedicament}
                        </span>
                        <span className="text-xs text-orange-600 dark:text-orange-400 font-medium">
                          {new Date(item.datePeremption).toLocaleDateString(
                            "fr-FR",
                          )}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
