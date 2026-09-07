import { useState, useRef, useEffect } from "react";
import {
  FileText,
  Calendar,
  ArrowLeft,
  Activity,
  Pill,
  Users,
  BriefcaseMedical,
  FileSpreadsheet,
  Printer,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

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
// DONNÉES DES RAPPORTS DISPONIBLES
// ==========================================
const REPORTS_CONFIG = [
  {
    id: "arrets_travail",
    title: "Bilan des Arrêts de Travail",
    description:
      "Analyse de l'absentéisme médical par service, jours prescrits et motifs.",
    icon: <BriefcaseMedical className="w-6 h-6 text-rose-500" />,
    bgIcon: "bg-rose-50 dark:bg-rose-900/20",
    borderHover: "hover:border-rose-400 dark:hover:border-rose-500/50",
    destinataire: "Ressources Humaines (RH)",
  },
  {
    id: "epidemiologie",
    title: "Rapport Épidémiologique",
    description:
      "Cartographie des pathologies fréquentes, évolution et statistiques de santé.",
    icon: <Activity className="w-6 h-6 text-blue-500" />,
    bgIcon: "bg-blue-50 dark:bg-blue-900/20",
    borderHover: "hover:border-blue-400 dark:hover:border-blue-500/50",
    destinataire: "Médecin-Chef / Direction",
  },
  {
    id: "pharmacie",
    title: "État de la Pharmacie & Stocks",
    description:
      "Consommation des médicaments, pertes, péremptions et besoins de réapprovisionnement.",
    icon: <Pill className="w-6 h-6 text-teal-500" />,
    bgIcon: "bg-teal-50 dark:bg-teal-900/20",
    borderHover: "hover:border-teal-400 dark:hover:border-teal-500/50",
    destinataire: "Logistique / Comptabilité",
  },
  {
    id: "rendement",
    title: "Rapport d'Activité (Rendement)",
    description:
      "Volume des consultations, flux de la file d'attente et répartition des actes.",
    icon: <Users className="w-6 h-6 text-[#c2a712]" />,
    bgIcon: "bg-[#fefce8] dark:bg-[#c2a712]/20",
    borderHover: "hover:border-[#c2a712] dark:hover:border-[#c2a712]/50",
    destinataire: "Direction d'Agence",
  },
];

export default function Rapports() {
  const navigate = useNavigate();

  // États pour les filtres de date
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(1); // 1er jour du mois courant par défaut
    return d.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState(
    () => new Date().toISOString().split("T")[0],
  );
  const [isGenerating, setIsGenerating] = useState<string | null>(null);

  // Fonction factice pour simuler la génération (à connecter à ton API plus tard)
  const handleGenerateReport = (reportId: string, format: "PDF" | "EXCEL") => {
    setIsGenerating(reportId);

    // Simulation d'un délai de chargement et de génération
    setTimeout(() => {
      setIsGenerating(null);
      alert(
        `Le rapport "${reportId}" du ${startDate} au ${endDate} a été généré en format ${format}.\n(Cette fonctionnalité sera connectée à l'API prochainement)`,
      );
    }, 1500);
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto font-sans text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-950 min-h-screen transition-colors duration-200 space-y-8">
      {/* ================= EN-TÊTE ================= */}
      <FadeInBlock delay={0}>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
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
                <FileText className="w-6 h-6 text-[#c2a712] dark:text-[#fde047]" />
                Générateur de Rapports
              </h1>
              <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm font-medium">
                Extraction des données statistiques et médicales de la BEAC
              </p>
            </div>
          </div>
        </div>
      </FadeInBlock>

      {/* ================= FILTRES GLOBAUX ================= */}
      <FadeInBlock delay={100}>
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 md:p-6 flex flex-col sm:flex-row gap-6 items-start sm:items-end">
          <div className="w-full sm:w-auto flex-grow space-y-2">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <Calendar className="w-4 h-4" /> Période d'analyse
            </label>
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <div className="w-full sm:w-auto flex items-center gap-2">
                <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
                  Du
                </span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm font-bold text-slate-700 dark:text-slate-200 outline-none focus:border-[#c2a712] focus:ring-1 focus:ring-[#c2a712]"
                />
              </div>
              <div className="w-full sm:w-auto flex items-center gap-2">
                <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
                  Au
                </span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm font-bold text-slate-700 dark:text-slate-200 outline-none focus:border-[#c2a712] focus:ring-1 focus:ring-[#c2a712]"
                />
              </div>
            </div>
          </div>

          <div className="w-full sm:w-auto bg-[#fefce8] dark:bg-[#c2a712]/10 border border-[#fef08a] dark:border-[#c2a712]/30 p-4 rounded-xl text-sm font-medium text-[#9d8c0a] dark:text-[#fde047]">
            Sélectionnez la période, puis choisissez un rapport ci-dessous pour
            lancer l'extraction.
          </div>
        </div>
      </FadeInBlock>

      {/* ================= GRILLE DES RAPPORTS ================= */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {REPORTS_CONFIG.map((report, index) => (
          <FadeInBlock key={report.id} delay={150 + index * 50}>
            <div
              className={`bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-all duration-300 group flex flex-col h-full ${report.borderHover}`}
            >
              <div className="p-6 flex-grow">
                <div className="flex justify-between items-start mb-4">
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center ${report.bgIcon} transition-transform group-hover:scale-110`}
                  >
                    {report.icon}
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
                    Destinataire : {report.destinataire}
                  </span>
                </div>

                <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">
                  {report.title}
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                  {report.description}
                </p>
              </div>

              <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30 flex flex-wrap gap-3 mt-auto">
                <button
                  onClick={() => handleGenerateReport(report.id, "PDF")}
                  disabled={isGenerating !== null}
                  className="flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-sm font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isGenerating === report.id ? (
                    <span className="animate-pulse">Génération...</span>
                  ) : (
                    <>
                      <Printer className="w-4 h-4 text-rose-500" /> Format PDF
                    </>
                  )}
                </button>

                <button
                  onClick={() => handleGenerateReport(report.id, "EXCEL")}
                  disabled={isGenerating !== null}
                  className="flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-sm font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isGenerating === report.id ? (
                    <span className="animate-pulse">Génération...</span>
                  ) : (
                    <>
                      <FileSpreadsheet className="w-4 h-4 text-green-600 dark:text-green-500" />{" "}
                      Excel (CSV)
                    </>
                  )}
                </button>
              </div>
            </div>
          </FadeInBlock>
        ))}
      </div>
    </div>
  );
}
