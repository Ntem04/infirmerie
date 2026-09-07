import { useState, useEffect, useMemo, useRef } from "react";
import {
  Plus,
  ChevronRight,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Search,
  Mic,
  ArrowUpRight,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAppData } from "../../context/AppDataContext";

const API_BASE_URL = "http://localhost:3001";

interface ConsultationRow {
  id: string;
  patientId: string;
  matricule: string;
  name: string;
  service: string;
  motif: string;
  status: string;
  date: string;
  time: string;
  timestamp: number;
}

// ==========================================
// COMPOSANT D'ANIMATION AU SCROLL
// ==========================================
function FadeInDiv({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => setIsVisible(true), delay);
          if (ref.current) observer.unobserve(ref.current);
        }
      },
      { threshold: 0.1 },
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [delay]);

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out transform ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
      } ${className}`}
    >
      {children}
    </div>
  );
}

export default function Consultations() {
  const navigate = useNavigate();
  const { queue: sharedQueue } = useAppData();

  const [recentConsultations, setRecentConsultations] = useState<
    ConsultationRow[]
  >([]);
  const [queueConsultations, setQueueConsultations] = useState<
    ConsultationRow[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [apiError, setApiError] = useState(false);

  // ÉTATS POUR LA RECHERCHE ET LE MICRO
  const [searchQuery, setSearchQuery] = useState("");
  const [isListening, setIsListening] = useState(false);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setIsLoading(true);
      try {
        const [patientsRes, actesMedRes, queueRes] = await Promise.all([
          fetch(`${API_BASE_URL}/patients`),
          fetch(`${API_BASE_URL}/actes_medicaux`),
          fetch(`${API_BASE_URL}/queue`),
        ]);

        if (!patientsRes.ok || !actesMedRes.ok) {
          throw new Error("Erreur de récupération des données");
        }

        const patients: any[] = await patientsRes.json();
        const actesMedicaux: any[] = await actesMedRes.json();
        const queueData: any[] = queueRes.ok
          ? await queueRes.json()
          : sharedQueue;

        const formattedActes: ConsultationRow[] = actesMedicaux.map((acte) => {
          const patient = patients.find((p) => p.id === acte.patientId) || {};
          const parsedTimestamp =
            acte.timestamp ||
            (acte.date ? new Date(acte.date).getTime() : Date.now());
          const dateObj = new Date(parsedTimestamp);

          return {
            id: acte.id,
            patientId: acte.patientId || patient.id || "P-0000",
            matricule: acte.patientId || patient.id || "P-0000",
            name: patient.nomComplet || acte.nom || "Patient Inconnu",
            service: patient.service || "Non renseigné",
            motif: acte.diagnostic || acte.plaintes || "Consultation générale",
            status: "Terminé",
            date: !isNaN(dateObj.getTime())
              ? dateObj.toLocaleDateString("fr-FR")
              : acte.date || "-",
            time: !isNaN(dateObj.getTime())
              ? dateObj.toLocaleTimeString("fr-FR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "--:--",
            timestamp: !isNaN(dateObj.getTime()) ? dateObj.getTime() : 0,
          };
        });

        // 1. On trie du plus récent au plus ancien
        formattedActes.sort((a, b) => b.timestamp - a.timestamp);

        // 2. DÉDUPLICATION : On ne garde qu'une seule ligne par patient
        const uniqueRecentConsultations: ConsultationRow[] = [];
        const seenPatients = new Set();

        for (const acte of formattedActes) {
          if (!seenPatients.has(acte.patientId)) {
            seenPatients.add(acte.patientId);
            uniqueRecentConsultations.push(acte);
          }
        }

        setRecentConsultations(uniqueRecentConsultations);

        const formattedQueue: ConsultationRow[] = (
          Array.isArray(queueData) ? queueData : []
        ).map((item) => {
          const patient =
            patients.find(
              (p) => p.id === item.patientId || p.nomComplet === item.nom,
            ) || {};
          return {
            id: item.id,
            patientId: item.patientId || patient.id || item.id,
            matricule: item.patientId || patient.id || item.id,
            name: item.nom || patient.nomComplet || "Patient Inconnu",
            service: item.service || patient.service || "Non renseigné",
            motif: item.motif || "Consultation générale",
            status: item.statut || "En attente médecin",
            date: item.date
              ? new Date(item.date).toLocaleDateString("fr-FR")
              : new Date().toLocaleDateString("fr-FR"),
            time: item.heure || "--:--",
            timestamp: item.date ? new Date(item.date).getTime() : Date.now(),
          };
        });

        setQueueConsultations(formattedQueue);
        setApiError(false);
      } catch (err) {
        console.error("Erreur API Consultations:", err);
        setApiError(true);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, [sharedQueue]);

  const handleOpenDossier = (row: ConsultationRow) => {
    navigate("/dossier-patient", {
      state: {
        title: `Dossier de ${row.name}`,
        patient: {
          id: row.patientId,
          nom: row.name,
          service: row.service,
        },
      },
    });
  };

  const startListening = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("La dictée vocale n'est pas supportée par ce navigateur.");
      return;
    }

    if (isListening) return;

    const recognition = new SpeechRecognition();
    recognition.lang = "fr-FR";
    recognition.interimResults = true;
    recognition.continuous = false;

    recognition.onstart = () => {
      setIsListening(true);
      setSearchQuery("");
    };

    recognition.onresult = (event: any) => {
      let currentTranscript = "";
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        currentTranscript += event.results[i][0].transcript;
      }
      setSearchQuery(currentTranscript.replace(/\.$/, ""));
    };

    recognition.onerror = (event: any) => {
      console.error("Erreur micro:", event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  // Affichage limité à 5 résultats uniques
  const filteredRecentConsultations = useMemo(() => {
    let result = recentConsultations;
    if (searchQuery.trim()) {
      const lowerQ = searchQuery.toLowerCase();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(lowerQ) ||
          c.matricule.toLowerCase().includes(lowerQ) ||
          c.motif.toLowerCase().includes(lowerQ) ||
          c.service.toLowerCase().includes(lowerQ),
      );
    }
    return result.slice(0, 5);
  }, [recentConsultations, searchQuery]);

  const fileDAttenteMedecin = useMemo(() => {
    let result = queueConsultations.filter((c) => {
      const s = (c.status || "").toLowerCase();
      return s.includes("attente") && !s.includes("termin");
    });

    if (searchQuery.trim()) {
      const lowerQ = searchQuery.toLowerCase();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(lowerQ) ||
          c.matricule.toLowerCase().includes(lowerQ) ||
          c.motif.toLowerCase().includes(lowerQ) ||
          c.service.toLowerCase().includes(lowerQ),
      );
    }

    return result;
  }, [queueConsultations, searchQuery]);

  const stats = useMemo(
    () => ({
      total: recentConsultations.length + fileDAttenteMedecin.length,
      terminees: recentConsultations.length,
      aVenir: fileDAttenteMedecin.length,
    }),
    [recentConsultations, fileDAttenteMedecin],
  );

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();

  const getStatusStyle = (status: string) => {
    const s = (status || "").toLowerCase();
    if (s.includes("termin")) {
      return "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800/50";
    }
    return "bg-[#fefce8] text-[#9d8c0a] border-[#fef08a] dark:bg-[#c2a712]/20 dark:text-[#fde047] dark:border-[#c2a712]/30";
  };

  if (isLoading) {
    return (
      <div className="p-8 text-center text-slate-500 font-bold animate-pulse">
        Chargement des consultations...
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto transition-colors duration-200 dark:bg-slate-950 min-h-screen">
      <style>{`
        @keyframes pan-bg {
          0% { background-position: right center; background-size: 110%; }
          50% { background-position: left center; background-size: 130%; }
          100% { background-position: right center; background-size: 110%; }
        }
        .animate-pan-bg {
          animation: pan-bg 25s ease-in-out infinite alternate;
        }
      `}</style>

      {apiError && (
        <FadeInDiv delay={0}>
          <div className="mb-6 bg-rose-100 border border-rose-400 text-rose-700 px-4 py-3 rounded-lg flex items-center gap-3">
            <AlertTriangle className="w-5 h-5" />
            <p className="font-bold text-sm">
              Impossible de se connecter à l'API (JSON Server). Vérifiez qu'elle
              tourne sur le port 3001.
            </p>
          </div>
        </FadeInDiv>
      )}

      {/* BARRE DE RECHERCHE */}
      <FadeInDiv delay={0}>
        <div className="mb-8 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3 transition-all focus-within:ring-2 focus-within:ring-[#c2a712]/50">
          <Search className="w-5 h-5 text-slate-400 shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              isListening
                ? "Écoute en cours..."
                : "Rechercher un patient, un motif, un service..."
            }
            className="w-full bg-transparent border-none outline-none text-slate-800 dark:text-slate-200 font-medium placeholder-slate-400"
          />
          <button
            type="button"
            onClick={startListening}
            className={`p-2 rounded-full transition-colors ${
              isListening
                ? "bg-rose-100 text-rose-600 dark:bg-rose-900/30 animate-pulse"
                : "bg-slate-100 text-slate-500 hover:bg-[#c2a712]/10 hover:text-[#c2a712] dark:bg-slate-800 dark:text-slate-400"
            }`}
            title="Recherche vocale"
          >
            <Mic className="w-5 h-5" />
          </button>
        </div>
      </FadeInDiv>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 md:gap-8">
        {/* ================= COLONNE GAUCHE : CONSULTATIONS RÉCENTES ================= */}
        <div className="xl:col-span-2 space-y-6 md:space-y-8">
          <FadeInDiv delay={100}>
            <div className="rounded-[28px] p-5 md:p-8 relative overflow-hidden shadow-sm border border-sky-100 dark:border-slate-800 bg-sky-50 dark:bg-slate-900">
              <div className="absolute inset-y-0 right-0 w-full md:w-[65%] hidden md:block">
                <div className="absolute inset-0 bg-gradient-to-r from-sky-50 via-sky-50/80 to-transparent dark:from-slate-900 dark:via-slate-900/80 z-10" />
                <div
                  className="absolute inset-0 opacity-60 dark:opacity-40 animate-pan-bg mix-blend-multiply dark:mix-blend-lighten"
                  style={{
                    backgroundImage: "url('/preview.png')",
                    backgroundRepeat: "no-repeat",
                  }}
                />
              </div>

              <div className="relative z-20 flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="w-full md:w-[60%]">
                  <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-sky-200 dark:border-sky-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-sky-700 dark:text-sky-400 shadow-sm">
                    <span className="flex h-2.5 w-2.5 items-center justify-center rounded-full bg-sky-600 dark:bg-sky-500">
                      <span className="h-1 w-1 rounded-full bg-white dark:bg-slate-900" />
                    </span>
                    Prise en charge
                  </span>
                  <h3 className="mb-4 text-4xl md:text-5xl font-black text-[#0f172a] dark:text-white drop-shadow-md">
                    Nouvelle
                    <br />
                    consultation
                  </h3>
                  <p className="max-w-md text-base text-slate-700 dark:text-slate-300 font-medium drop-shadow-md">
                    Démarrez l'examen clinique et saisissez le diagnostic
                    médical immédiatement.
                  </p>
                  <button
                    type="button"
                    onClick={() => navigate("/dossier-medical")}
                    className="mt-7 inline-flex items-center gap-3 rounded-2xl bg-[#c2a712] px-5 py-3.5 text-base font-semibold text-white shadow-lg shadow-[#c2a712]/30 transition hover:bg-[#a98f0b] hover:scale-105 transform"
                  >
                    <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-white/20">
                      <Plus className="h-5 w-5" />
                    </span>
                    <span>Nouvelle consultation</span>
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          </FadeInDiv>

          <FadeInDiv delay={200}>
            <div className="bg-white border border-slate-200 rounded-2xl p-4 md:p-6 shadow-sm dark:bg-slate-900 dark:border-slate-800">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                  <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                    5 Dernières Consultations Terminées
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    1 patient = 1 ligne (le motif affiché est le plus récent)
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => navigate("/reports/history")}
                  className="inline-flex items-center gap-1.5 text-sm font-bold text-[#c2a712] dark:text-[#fde047] hover:underline"
                >
                  Voir tout l'historique <ArrowUpRight className="w-4 h-4" />
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left min-w-[650px]">
                  <thead className="text-slate-500 border-b border-slate-100 dark:border-slate-800 dark:text-slate-400">
                    <tr>
                      <th className="pb-3 font-medium">Patient & Service</th>
                      <th className="pb-3 font-medium">Diagnostic / Motif</th>
                      <th className="pb-3 font-medium">Dernière Date</th>
                      <th className="pb-3 font-medium">Statut</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                    {filteredRecentConsultations.length === 0 ? (
                      <tr>
                        <td
                          colSpan={4}
                          className="py-8 text-center text-slate-500 font-medium"
                        >
                          {searchQuery
                            ? "Aucun résultat trouvé."
                            : "Aucune consultation médicale enregistrée."}
                        </td>
                      </tr>
                    ) : (
                      filteredRecentConsultations.map((c, idx) => (
                        <RecentRow
                          key={c.patientId || idx}
                          index={idx}
                          initials={getInitials(c.name)}
                          name={c.name}
                          matricule={c.matricule}
                          service={c.service}
                          motif={c.motif}
                          date={c.date}
                          time={c.time}
                          status={c.status}
                          statusColor={getStatusStyle(c.status)}
                          color={idx % 2 === 0 ? "bg-[#c2a712]" : "bg-blue-600"}
                          onClick={() => handleOpenDossier(c)}
                        />
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </FadeInDiv>
        </div>

        {/* ================= COLONNE DROITE : STATS & FILE D'ATTENTE ================= */}
        <div className="space-y-6 md:space-y-8">
          <FadeInDiv delay={150}>
            <div className="bg-white border border-slate-200 rounded-2xl p-4 md:p-6 shadow-sm dark:bg-slate-900 dark:border-slate-800">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">
                Statistiques générales
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl flex flex-col justify-center border border-transparent dark:border-blue-800/30">
                  <div className="flex items-center gap-3 mb-2">
                    <CheckCircle2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    <span className="text-2xl font-black dark:text-white">
                      {stats.terminees}
                    </span>
                  </div>
                  <p className="text-xs font-bold text-slate-500 uppercase">
                    Terminées
                  </p>
                </div>
                <div className="bg-[#fefce8] dark:bg-[#c2a712]/20 p-4 rounded-xl flex flex-col justify-center border border-transparent dark:border-[#c2a712]/30">
                  <div className="flex items-center gap-3 mb-2">
                    <Clock className="w-5 h-5 text-[#9d8c0a] dark:text-[#fde047]" />
                    <span className="text-2xl font-black dark:text-white">
                      {stats.aVenir}
                    </span>
                  </div>
                  <p className="text-xs font-bold text-slate-500 uppercase">
                    En attente
                  </p>
                </div>
              </div>
            </div>
          </FadeInDiv>

          <FadeInDiv delay={250}>
            <div className="bg-white border border-slate-200 rounded-2xl p-4 md:p-6 shadow-sm dark:bg-slate-900 dark:border-slate-800 flex flex-col h-[480px]">
              <div className="mb-4">
                <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                  File d'attente Médecin
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Patients en attente de consultation
                </p>
              </div>

              <div className="space-y-3 overflow-y-auto flex-grow pr-1">
                {fileDAttenteMedecin.length === 0 ? (
                  <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                    <Clock className="w-8 h-8 mx-auto mb-2 opacity-40 text-[#c2a712]" />
                    <p className="text-sm font-medium">
                      Aucun patient en attente.
                    </p>
                  </div>
                ) : (
                  fileDAttenteMedecin.map((c, idx) => (
                    <TodayItem
                      key={c.id || idx}
                      index={idx}
                      time={c.time}
                      initials={getInitials(c.name)}
                      name={c.name}
                      matricule={c.matricule}
                      service={c.service}
                      motif={c.motif}
                      status={c.status}
                      color={idx % 2 === 0 ? "bg-[#c2a712]" : "bg-blue-600"}
                      statusColor={getStatusStyle(c.status)}
                      onClick={() => handleOpenDossier(c)}
                    />
                  ))
                )}
              </div>
            </div>
          </FadeInDiv>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// SOUS-COMPOSANTS
// ==========================================

interface RecentRowProps {
  index: number;
  initials: string;
  name: string;
  matricule: string;
  service: string;
  motif: string;
  date: string;
  time: string;
  status: string;
  statusColor: string;
  color: string;
  onClick: () => void;
}

function RecentRow({
  index,
  initials,
  name,
  matricule,
  service,
  motif,
  date,
  time,
  status,
  statusColor,
  color,
  onClick,
}: RecentRowProps) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLTableRowElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => setIsVisible(true), (index % 10) * 75);
          if (ref.current) observer.unobserve(ref.current);
        }
      },
      { threshold: 0.1 },
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [index]);

  return (
    <tr
      ref={ref}
      onClick={onClick}
      className={`hover:bg-slate-50/70 cursor-pointer dark:hover:bg-slate-800/60 transition-all duration-500 ease-out ${
        isVisible ? "opacity-100" : "opacity-0"
      }`}
    >
      <td className="py-4 pr-4">
        <div className="flex items-center space-x-3">
          <div
            className={`w-10 h-10 rounded-full text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-sm ${color}`}
          >
            {initials}
          </div>
          <div>
            <p className="font-bold text-slate-800 dark:text-slate-100">
              {name}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              ID: {matricule} • {service}
            </p>
          </div>
        </div>
      </td>
      <td className="py-4 pr-4">
        <p className="font-semibold text-slate-800 dark:text-slate-100">
          {motif}
        </p>
      </td>
      <td className="py-4 pr-4">
        <p className="font-medium text-slate-800 dark:text-slate-100">{date}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">{time}</p>
      </td>
      <td className="py-4 pr-4">
        <span
          className={`px-3 py-1.5 rounded-md text-[11px] font-bold uppercase flex w-max border ${statusColor}`}
        >
          {status}
        </span>
      </td>
    </tr>
  );
}

interface TodayItemProps {
  index: number;
  time: string;
  initials: string;
  name: string;
  matricule: string;
  service: string;
  motif: string;
  status: string;
  statusColor: string;
  color: string;
  onClick: () => void;
}

function TodayItem({
  index,
  time,
  initials,
  name,
  matricule,
  service,
  motif,
  status,
  color,
  statusColor,
  onClick,
}: TodayItemProps) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => setIsVisible(true), (index % 10) * 75);
          if (ref.current) observer.unobserve(ref.current);
        }
      },
      { threshold: 0.1 },
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [index]);

  return (
    <div
      ref={ref}
      onClick={onClick}
      className={`flex items-center justify-between p-3 hover:bg-[#fefce8] rounded-xl cursor-pointer border border-transparent hover:border-[#fef08a] dark:hover:bg-slate-800/80 dark:hover:border-[#c2a712]/30 transition-all duration-500 ease-out ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
      }`}
    >
      <div className="flex items-center space-x-3 min-w-0">
        <span className="font-bold text-slate-700 w-10 text-xs shrink-0 dark:text-slate-300">
          {time}
        </span>
        <div
          className={`w-9 h-9 rounded-full text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-sm ${color}`}
        >
          {initials}
        </div>
        <div className="min-w-0 flex flex-col">
          <p className="font-bold text-slate-800 text-sm truncate dark:text-slate-100">
            {name}{" "}
            <span className="font-normal text-xs text-slate-400 ml-1">
              ({matricule})
            </span>
          </p>
          <div className="flex items-center text-xs text-slate-500 truncate dark:text-slate-400 mt-0.5 space-x-1.5">
            <span className="font-medium text-slate-600 dark:text-slate-300">
              {motif}
            </span>
            <span>•</span>
            <span className="truncate">{service}</span>
          </div>
        </div>
      </div>
      <div className="flex flex-col items-end shrink-0 pl-2">
        <span
          className={`px-2.5 py-1.5 rounded-md text-[10px] uppercase font-bold text-center flex w-max border ${statusColor}`}
        >
          {status}
        </span>
      </div>
    </div>
  );
}
