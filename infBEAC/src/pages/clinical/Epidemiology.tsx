import { useEffect, useMemo, useState, useRef } from "react";
import {
  Activity,
  BarChart3,
  ArrowLeft,
  Users,
  Download,
  Printer,
  Building2,
  ChevronRight,
  X,
  Stethoscope,
  AlertTriangle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

// L'URL de base de ton JSON Server
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

// ==========================================
// INTERFACES TYPESCRIPT
// ==========================================
interface Pathologie {
  nom: string;
  cas: number;
}

interface ServiceData {
  nomService: string;
  patientsTotal: number;
  pathologies: Pathologie[];
}

interface PatientDetail {
  id: string;
  date: string;
  nom: string;
  pathologie: string;
  statut: string;
  service: string;
  typeActe: string;
}

export default function Epidemiology() {
  const navigate = useNavigate();

  // ==========================================
  // ÉTATS DE L'API
  // ==========================================
  const [rawData, setRawData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [apiError, setApiError] = useState(false);

  // État pour gérer l'ouverture de la modale des patients
  const [selectedService, setSelectedService] = useState<string | null>(null);

  // ==========================================
  // FETCH DES DONNÉES ET FUSION GLOBALE
  // ==========================================
  useEffect(() => {
    const fetchEpidemiologieData = async () => {
      setIsLoading(true);
      setApiError(false);
      try {
        // On récupère TOUTES les données en parallèle
        const [resPatients, resInfirmiers, resMedicaux] = await Promise.all([
          fetch(`${API_BASE_URL}/patients`),
          fetch(`${API_BASE_URL}/actes_infirmiers`),
          fetch(`${API_BASE_URL}/actes_medicaux`),
        ]);

        if (!resPatients.ok || !resInfirmiers.ok || !resMedicaux.ok) {
          throw new Error(
            "Erreur serveur lors de la récupération des données.",
          );
        }

        const patients = await resPatients.json();
        const actesInfirmiers = await resInfirmiers.json();
        const actesMedicaux = await resMedicaux.json();

        const unifiedData: any[] = [];

        // 1. Intégration des Actes Infirmiers
        actesInfirmiers.forEach((acte: any) => {
          const patient =
            patients.find((p: any) => p.id === acte.patientId) || {};
          const motif =
            acte.pathology && acte.pathology !== "-"
              ? acte.pathology
              : "Non spécifié";

          // On ne garde que les actes ayant un vrai motif pour les statistiques
          if (motif !== "Non spécifié") {
            unifiedData.push({
              id: acte.id,
              patientId: patient.id || acte.patientId || "Inconnu",
              date: new Date(acte.createdAt).toLocaleDateString("fr-FR"),
              patient:
                patient.nomComplet || acte.patientName || "Patient Inconnu",
              motif: motif,
              statut: acte.status || "Terminé",
              service: patient.service || acte.service || "Non renseigné",
              timestamp: new Date(acte.createdAt).getTime(),
              typeActe: "Infirmier",
            });
          }
        });

        // 2. Intégration des Actes Médicaux (Médecins)
        actesMedicaux.forEach((acte: any) => {
          const patient =
            patients.find((p: any) => p.id === acte.patientId) || {};
          // Le diagnostic du médecin prime, sinon on prend la plainte initiale
          const motif = acte.diagnostic || acte.plaintes || "Non spécifié";
          const timestamp =
            acte.timestamp ||
            (acte.date ? new Date(acte.date).getTime() : Date.now());

          if (motif !== "Non spécifié") {
            unifiedData.push({
              id: acte.id,
              patientId: patient.id || acte.patientId || "Inconnu",
              date: new Date(timestamp).toLocaleDateString("fr-FR"),
              patient: patient.nomComplet || "Patient Inconnu",
              motif: motif,
              statut: "Terminé", // Un acte médical enregistré est toujours terminé
              service: patient.service || "Non renseigné",
              timestamp: timestamp,
              typeActe: "Médecin",
            });
          }
        });

        // Tri global du plus récent au plus ancien
        unifiedData.sort((a, b) => b.timestamp - a.timestamp);

        setRawData(unifiedData);
      } catch (error) {
        console.error("Erreur API :", error);
        setApiError(true);
      } finally {
        setIsLoading(false);
      }
    };

    fetchEpidemiologieData();
  }, []);

  // ==========================================
  // AGRÉGATION AUTOMATIQUE (CALCULS EN TEMPS RÉEL)
  // ==========================================
  const rapportGlobalServices = useMemo<ServiceData[]>(() => {
    const serviceMap: Record<
      string,
      { total: number; pathologies: Record<string, number> }
    > = {};

    rawData.forEach((item) => {
      const sName = item.service || "Service Non Renseigné";
      const pathoName = item.motif || "Motif Inconnu";

      if (!serviceMap[sName]) {
        serviceMap[sName] = { total: 0, pathologies: {} };
      }

      serviceMap[sName].total += 1;
      serviceMap[sName].pathologies[pathoName] =
        (serviceMap[sName].pathologies[pathoName] || 0) + 1;
    });

    return Object.entries(serviceMap)
      .map(([nomService, data]) => {
        const pathologies = Object.entries(data.pathologies)
          .map(([nom, cas]) => ({ nom, cas }))
          .sort((a, b) => b.cas - a.cas);

        return {
          nomService,
          patientsTotal: data.total,
          pathologies,
        };
      })
      .sort((a, b) => b.patientsTotal - a.patientsTotal);
  }, [rawData]);

  // ==========================================
  // CALCUL DES MÉTRIQUES GLOBALES (Top 4)
  // ==========================================
  const kpiGlobaux = useMemo(() => {
    let totalPatients = 0;
    const topPathologiesGlobales: Record<string, number> = {};

    rapportGlobalServices.forEach((service) => {
      totalPatients += service.patientsTotal;

      service.pathologies.forEach((p) => {
        topPathologiesGlobales[p.nom] =
          (topPathologiesGlobales[p.nom] || 0) + p.cas;
      });
    });

    const palmares = Object.entries(topPathologiesGlobales)
      .map(([nom, total]) => ({ nom, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 4); // Top 4 global

    return { totalPatients, palmares };
  }, [rapportGlobalServices]);

  const maxPathologieGlobal =
    kpiGlobaux.palmares.length > 0 ? kpiGlobaux.palmares[0].total : 1;

  // ==========================================
  // FILTRE POUR LA MODALE DES PATIENTS
  // ==========================================
  const patientsDansLaModale = useMemo<PatientDetail[]>(() => {
    if (!selectedService) return [];

    return rawData
      .filter(
        (item) => (item.service || "Service Non Renseigné") === selectedService,
      )
      .map((item) => ({
        id: item.patientId, // Utilisation de l'ID réel du patient
        date: item.date || "N/A",
        nom: item.patient || "Inconnu",
        pathologie: item.motif || "N/A",
        statut: item.statut || "Terminé",
        service: item.service || "N/A",
        typeActe: item.typeActe || "Inconnu",
      }));
  }, [rawData, selectedService]);

  // ==========================================
  // FONCTIONS D'EXPORT
  // ==========================================
  const exportPDF = () => {
    window.print();
  };

  const exportExcel = () => {
    let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
    csvContent +=
      "Service;Total Actes;Pathologie 1;Cas 1;Pathologie 2;Cas 2;Pathologie 3;Cas 3\n";

    rapportGlobalServices.forEach((s) => {
      const p1 = s.pathologies[0]
        ? `${s.pathologies[0].nom};${s.pathologies[0].cas}`
        : ";";
      const p2 = s.pathologies[1]
        ? `${s.pathologies[1].nom};${s.pathologies[1].cas}`
        : ";";
      const p3 = s.pathologies[2]
        ? `${s.pathologies[2].nom};${s.pathologies[2].cas}`
        : ";";

      const row = `"${s.nomService}";${s.patientsTotal};${p1};${p2};${p3}`;
      csvContent += row + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.href = encodedUri;
    link.download = `Rapport_Epidemiologique_Services.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isLoading) {
    return (
      <div className="p-8 text-center text-slate-500 font-bold animate-pulse">
        Calcul des statistiques épidémiologiques en cours...
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 font-sans text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-950 min-h-full transition-colors duration-200 space-y-6">
      {apiError && (
        <div className="bg-rose-100 border border-rose-400 text-rose-700 px-4 py-3 rounded-lg flex items-center gap-3 shadow-sm mb-6 animate-in fade-in">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <p className="font-bold text-sm">
            Impossible de charger les données épidémiologiques. Vérifiez que
            l'API locale est active.
          </p>
        </div>
      )}

      {/* ---------------- EN-TÊTE ET ACTIONS ---------------- */}
      <FadeInBlock delay={0}>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 dark:border-slate-800 pb-6 print:hidden">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/dashboard")}
              className="p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Retour au Tableau de Bord"
            >
              <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-300" />
            </button>
            <div>
              <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Activity className="w-6 h-6 text-green-600 dark:text-green-500" />
                Rapport Épidémiologique Global
              </h1>
              <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm font-medium">
                Cartographie de la santé par départements (Infirmière & Médecin)
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {rapportGlobalServices.length > 0 ? (
              <>
                <button
                  onClick={exportPDF}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-green-800 bg-green-50 border border-green-200 rounded-xl hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800/50 shadow-sm transition"
                >
                  <Printer className="w-4 h-4" /> Exporter en PDF
                </button>
                <button
                  onClick={exportExcel}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-white bg-green-700 border border-transparent rounded-xl hover:bg-green-800 shadow-md shadow-green-700/20 transition"
                >
                  <Download className="w-4 h-4" /> Exporter en Excel
                </button>
              </>
            ) : (
              <div className="text-sm text-slate-500 font-semibold bg-white dark:bg-slate-900 px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-lg">
                Aucune donnée à exporter
              </div>
            )}
          </div>
        </div>
      </FadeInBlock>

      <div id="dossier-imprimable" className="space-y-6">
        {/* ---------------- KPI GLOBAUX & PALMARÈS ---------------- */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <FadeInBlock
            delay={100}
            className="lg:col-span-1 flex flex-col justify-center"
          >
            <div className="bg-white dark:bg-slate-900 p-8 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-6 h-full">
              <div className="p-5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-2xl">
                <Users className="w-10 h-10" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                  Total Actes Traités
                </p>
                <h2 className="text-4xl font-black text-slate-800 dark:text-slate-100 mt-2">
                  {kpiGlobaux.totalPatients}
                </h2>
              </div>
            </div>
          </FadeInBlock>

          <FadeInBlock delay={150} className="lg:col-span-2">
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 h-full">
              <div className="flex items-center gap-2 mb-6">
                <BarChart3 className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">
                  Tendances Pathologiques Globales de l'Agence
                </h3>
              </div>

              <div className="space-y-4">
                {kpiGlobaux.palmares.length === 0 ? (
                  <p className="text-slate-400 italic text-sm">
                    Pas assez de données pour générer des tendances.
                  </p>
                ) : (
                  kpiGlobaux.palmares.map((patho, index) => (
                    <div
                      key={index}
                      className="space-y-1.5 animate-in fade-in slide-in-from-right-4 duration-500 fill-mode-both"
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      <div className="flex justify-between text-sm">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          {patho.nom}
                        </span>
                        <span className="font-bold text-slate-600 dark:text-slate-400">
                          {patho.total} actes enregistrés
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
                        <div
                          className="bg-green-600 dark:bg-green-500 h-2.5 rounded-full transition-all duration-1000 ease-out"
                          style={{
                            width: `${(patho.total / maxPathologieGlobal) * 100}%`,
                          }}
                        ></div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </FadeInBlock>
        </div>

        {/* ---------------- RAPPORTS DÉTAILLÉS PAR SERVICE ---------------- */}
        <FadeInBlock delay={200}>
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex items-center gap-3">
              <Building2 className="w-5 h-5 text-slate-500 dark:text-slate-400" />
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">
                Cartographie détaillée par Service
              </h3>
              <span className="ml-auto text-xs font-medium text-slate-400 print:hidden">
                Cliquez sur une ligne pour voir les détails
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 dark:bg-slate-900/50">
                  <tr className="text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                    <th className="p-5 font-bold uppercase tracking-wider text-xs">
                      Département / Service
                    </th>
                    <th className="p-5 font-bold uppercase tracking-wider text-xs text-center border-l border-slate-100 dark:border-slate-800">
                      Total Actes
                    </th>
                    <th className="p-5 font-bold uppercase tracking-wider text-xs border-l border-slate-100 dark:border-slate-800">
                      Pathologies Prédominantes
                    </th>
                    <th className="p-5 w-10 print:hidden"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {rapportGlobalServices.length > 0 ? (
                    rapportGlobalServices.map((service, index) => (
                      <tr
                        key={index}
                        onClick={() => setSelectedService(service.nomService)}
                        style={{ animationDelay: `${index * 50}ms` }}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors group cursor-pointer animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both"
                      >
                        <td className="p-5 align-top">
                          <p className="font-bold text-slate-800 dark:text-slate-200 leading-snug max-w-md group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">
                            {service.nomService}
                          </p>
                        </td>

                        <td className="p-5 align-top text-center border-l border-slate-100 dark:border-slate-800/50">
                          <span className="text-lg font-black text-slate-700 dark:text-slate-300">
                            {service.patientsTotal}
                          </span>
                        </td>

                        <td className="p-5 align-top border-l border-slate-100 dark:border-slate-800/50">
                          <div className="space-y-2.5">
                            {service.pathologies.map((patho, pIndex) => (
                              <div
                                key={pIndex}
                                className="flex justify-between items-center gap-4 bg-white dark:bg-slate-900 px-3 py-2 rounded-md border border-slate-100 dark:border-slate-800 shadow-sm"
                              >
                                <span className="font-semibold text-slate-700 dark:text-slate-300 text-xs">
                                  {patho.nom}
                                </span>
                                <span className="font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-xs">
                                  {patho.cas} actes
                                </span>
                              </div>
                            ))}
                          </div>
                        </td>

                        <td className="p-5 align-middle text-right print:hidden">
                          <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-green-500 transition-colors" />
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={4}
                        className="p-10 text-center text-slate-500 bg-slate-50/50 dark:bg-slate-900/50"
                      >
                        Aucune donnée épidémiologique enregistrée pour le
                        moment.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </FadeInBlock>
      </div>

      {/* ========================================================================= */}
      {/* MODALE D'AFFICHAGE DES PATIENTS PAR SERVICE                               */}
      {/* ========================================================================= */}
      {selectedService && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm print:hidden">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200">
            {/* En-tête de la modale */}
            <div className="flex justify-between items-center p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-lg">
                  <Stethoscope className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                    Registre des actes
                  </h2>
                  <p className="text-xs text-slate-500 font-medium max-w-xl truncate">
                    {selectedService}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedService(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Corps de la modale (Tableau des patients) */}
            <div className="overflow-y-auto p-0 flex-grow">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-50 dark:bg-slate-950/50 sticky top-0 z-10">
                  <tr className="text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                    <th className="p-4 font-semibold">Date</th>
                    <th className="p-4 font-semibold">Source</th>
                    <th className="p-4 font-semibold">Nom du patient (ID)</th>
                    <th className="p-4 font-semibold">Pathologie / Motif</th>
                    <th className="p-4 font-semibold">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {patientsDansLaModale.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="p-8 text-center text-slate-500"
                      >
                        Aucune donnée disponible pour ce service.
                      </td>
                    </tr>
                  ) : (
                    patientsDansLaModale.map((patient, i) => (
                      <tr
                        key={i}
                        style={{ animationDelay: `${i * 30}ms` }}
                        onClick={() =>
                          navigate("/dossier-medical", {
                            state: {
                              title: `Dossier de ${patient.nom}`,
                              patient: {
                                id: patient.id,
                                nom: patient.nom,
                                service: patient.service,
                                age: "-",
                                sexe: "-",
                                telephone: "-",
                              },
                            },
                          })
                        }
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer group animate-in fade-in slide-in-from-bottom-2 duration-300 fill-mode-both"
                      >
                        <td className="p-4 text-slate-500 dark:text-slate-400">
                          {patient.date}
                        </td>
                        <td className="p-4">
                          <span
                            className={`px-2.5 py-1 rounded text-xs font-bold ${
                              patient.typeActe === "Médecin"
                                ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                                : "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400"
                            }`}
                          >
                            {patient.typeActe}
                          </span>
                        </td>
                        <td className="p-4 font-semibold text-slate-800 dark:text-slate-200 group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">
                          {patient.nom}{" "}
                          <span className="text-xs font-mono font-normal text-slate-400 ml-1">
                            ({patient.id})
                          </span>
                        </td>
                        <td className="p-4 text-slate-700 dark:text-slate-300">
                          {patient.pathologie}
                        </td>
                        <td className="p-4">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              patient.statut === "Terminé"
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                                : patient.statut === "En attente médecin"
                                  ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-500"
                                  : "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400"
                            }`}
                          >
                            {patient.statut}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
