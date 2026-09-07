import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import {
  Stethoscope,
  Activity,
  Pill,
  ArrowLeft,
  Building2,
  Printer,
  CalendarDays,
  Plus,
  FileText,
  ClipboardList,
  AlertTriangle,
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";

const API_BASE_URL = "http://localhost:3001";

interface DoctorRecord {
  patientId: string;
  id?: string;
  date: string;
  timestamp: number;
  plaintes: string;
  examen: string;
  diagnostic: string;
  ordonnance: string;
  arret: string;
  constantesSnapshot?: any;
}

interface UnifiedEvent {
  type: "NURSE" | "DOCTOR";
  id: string;
  timestamp: number;
  dateStr: string;
  data: any;
}

export default function DossierPatient() {
  const navigate = useNavigate();
  const location = useLocation();
  const { logEvent } = useAuth();

  const navState = location.state?.patient;
  const navTitleName = location.state?.title?.replace("Dossier de ", "").trim();

  const initialPatientData = {
    id: navState?.id || (navState?.matricule ? navState.matricule : "P-0000"),
    nom: navState?.nom || navState?.name || navTitleName || "Patient Inconnu",
    service:
      navState?.service && navState.service !== "Non renseigné"
        ? navState.service
        : "Non renseigné",
    age: navState?.age && navState.age !== "-" ? navState.age : "-",
    sexe: navState?.sexe && navState.sexe !== "-" ? navState.sexe : "-",
    telephone: navState?.telephone || "-",
  };

  const [patientData, setPatientData] = useState(initialPatientData);
  const [unifiedHistory, setUnifiedHistory] = useState<UnifiedEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [apiError, setApiError] = useState(false);

  // LOG D'AUDIT
  useEffect(() => {
    if (
      patientData &&
      patientData.id !== "P-0000" &&
      patientData.nom !== "Patient Inconnu"
    ) {
      logEvent(
        "LECTURE_DOSSIER",
        `Consultation du dossier médical complet : ${patientData.nom} (ID: ${patientData.id})`,
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientData.id]);

  // CHARGEMENT DE L'HISTORIQUE COMPLET (INFIRMIER & MÉDECIN)
  useEffect(() => {
    let isMounted = true;

    const loadFullPatientHistory = async () => {
      setIsLoading(true);
      setApiError(false);
      const events: UnifiedEvent[] = [];

      try {
        let currentNom = patientData.nom;
        let currentId = patientData.id;
        let currentAge = patientData.age;
        let currentSexe = patientData.sexe;
        let currentService = patientData.service;
        let knownPatientIds = new Set<string>();

        if (currentId && currentId !== "P-0000") knownPatientIds.add(currentId);

        // 1. Récupération du profil depuis /patients
        let patientProfile: any = null;
        if (currentId && currentId !== "P-0000") {
          const res = await fetch(`${API_BASE_URL}/patients/${currentId}`);
          if (res.ok) patientProfile = await res.json();
        }

        if (!patientProfile && currentNom && currentNom !== "Patient Inconnu") {
          const res = await fetch(
            `${API_BASE_URL}/patients?nomComplet=${encodeURIComponent(currentNom)}`,
          );
          if (res.ok) {
            const matches = await res.json();
            if (matches.length > 0) patientProfile = matches[0];
          }
        }

        if (patientProfile) {
          currentId = patientProfile.id || currentId;
          knownPatientIds.add(patientProfile.id);
          currentNom = patientProfile.nomComplet || currentNom;
          if (patientProfile.age && patientProfile.age !== "-")
            currentAge = patientProfile.age;
          if (patientProfile.sexe && patientProfile.sexe !== "-")
            currentSexe = patientProfile.sexe;
          if (
            patientProfile.service &&
            patientProfile.service !== "Non renseigné"
          )
            currentService = patientProfile.service;
        }

        // 2. Récupération des actes infirmiers
        const nurseRes = await fetch(`${API_BASE_URL}/actes_infirmiers`);
        if (nurseRes.ok) {
          const allNurseActs: any[] = await nurseRes.json();
          const patientNurseActs = allNurseActs.filter((acte) => {
            const matchesId = knownPatientIds.has(acte.patientId);
            const matchesName =
              currentNom &&
              currentNom !== "Patient Inconnu" &&
              acte.patientName?.toLowerCase() === currentNom.toLowerCase();
            if (matchesName && acte.patientId)
              knownPatientIds.add(acte.patientId);
            return matchesId || matchesName;
          });

          patientNurseActs.forEach((entry) => {
            if (currentAge === "-" && entry.age && entry.age !== "-")
              currentAge = entry.age;
            if (currentSexe === "-" && entry.sexe && entry.sexe !== "-")
              currentSexe = entry.sexe;
            if (
              currentService === "Non renseigné" &&
              entry.service &&
              entry.service !== "Non renseigné"
            )
              currentService = entry.service;

            const dateObj = new Date(entry.createdAt);
            events.push({
              type: "NURSE",
              id: `nurse_${entry.id}`,
              timestamp: !isNaN(dateObj.getTime()) ? dateObj.getTime() : 0,
              dateStr: !isNaN(dateObj.getTime())
                ? dateObj.toLocaleDateString("fr-FR", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "Date inconnue",
              data: entry,
            });
          });
        }

        // 3. Récupération de tous les actes médicaux (passés et futurs)
        const doctorRes = await fetch(`${API_BASE_URL}/actes_medicaux`);
        if (doctorRes.ok) {
          const allDocActs: any[] = await doctorRes.json();
          const patientDocActs = allDocActs.filter((acte) => {
            const matchesId = knownPatientIds.has(acte.patientId);
            const matchesSnapshotId =
              acte.constantesSnapshot &&
              knownPatientIds.has(acte.constantesSnapshot.id);
            return matchesId || matchesSnapshotId;
          });

          patientDocActs.forEach((entry: DoctorRecord) => {
            const timestamp =
              entry.timestamp ||
              (entry.date ? new Date(entry.date).getTime() : 0);
            events.push({
              type: "DOCTOR",
              id: `doc_${entry.id}`,
              timestamp: timestamp,
              dateStr:
                entry.date || new Date(timestamp).toLocaleDateString("fr-FR"),
              data: entry,
            });
          });
        }

        // Tri chronologique : plus récent en premier
        events.sort((a, b) => b.timestamp - a.timestamp);

        if (isMounted) {
          setPatientData({
            id: currentId,
            nom: currentNom,
            age: currentAge,
            sexe: currentSexe,
            service: currentService,
            telephone:
              patientProfile?.telephone || initialPatientData.telephone,
          });
          setUnifiedHistory(events);
        }
      } catch (error) {
        console.error("Erreur chargement dossier:", error);
        if (isMounted) setApiError(true);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadFullPatientHistory();

    return () => {
      isMounted = false;
    };
  }, [location.state]);

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto transition-colors duration-200 dark:bg-slate-950 min-h-screen font-sans">
      {apiError && (
        <div className="mb-6 bg-rose-100 border border-rose-400 text-rose-700 px-4 py-3 rounded-lg flex items-center gap-3 shadow-sm">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <p className="font-bold text-sm">
            Impossible de joindre la base de données.
          </p>
        </div>
      )}

      {/* EN-TÊTE */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 print:hidden">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-300" />
          </button>
          <div>
            <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <FileText className="w-6 h-6 text-[#c2a712]" />
              Dossier Médical & Historique
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
              Suivi clinique et consultations passées
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition"
          >
            <Printer className="w-4 h-4" /> Exporter PDF
          </button>
          <button
            type="button"
            onClick={() =>
              navigate("/dossier-medical", {
                state: {
                  title: `Consultation de ${patientData.nom}`,
                  patient: patientData,
                },
              })
            }
            className="flex items-center gap-2 px-6 py-2.5 text-sm font-black text-white bg-[#c2a712] rounded-lg hover:bg-[#a98f0b] shadow-lg shadow-[#c2a712]/20 transition transform hover:-translate-y-0.5"
          >
            <Plus className="w-5 h-5" /> Nouvelle Consultation
          </button>
        </div>
      </div>

      <div id="dossier-imprimable" className="space-y-6">
        {/* IDENTITÉ DU PATIENT */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row gap-6 items-start md:items-center">
          <div className="flex items-center gap-4 border-r-0 md:border-r border-slate-200 dark:border-slate-800 pr-6 w-full md:w-auto">
            <div className="w-16 h-16 rounded-full bg-[#c2a712]/15 flex items-center justify-center text-[#9d8c0a] dark:text-[#fde047] font-black text-xl shrink-0">
              {patientData.nom ? patientData.nom.charAt(0).toUpperCase() : "P"}
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight">
                {patientData.nom}
              </h2>
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 mt-1">
                <span className="font-mono text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded mr-2">
                  {patientData.id}
                </span>
                {patientData.age !== "-"
                  ? `${patientData.age} ans`
                  : "Âge non renseigné"}{" "}
                • Sexe: {patientData.sexe}
              </p>
              <div className="flex flex-wrap gap-2 mt-2">
                <span className="px-2.5 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded text-xs font-bold flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5" /> {patientData.service}
                </span>
                {patientData.telephone && patientData.telephone !== "-" && (
                  <span className="px-2.5 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded text-xs font-bold flex items-center gap-1.5">
                    Tel: {patientData.telephone}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* HISTORIQUE ET CHRONOLOGIE */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-6 border-b border-slate-100 dark:border-slate-800 pb-4">
            <CalendarDays className="w-6 h-6 text-[#c2a712]" /> Chronologie des
            Soins et Consultations
          </h3>

          <div className="space-y-8 border-l-4 border-slate-100 dark:border-slate-800 ml-4 pl-6 relative">
            {isLoading ? (
              <p className="text-slate-400 italic py-4 font-medium animate-pulse">
                Chargement de l'historique médical...
              </p>
            ) : unifiedHistory.length === 0 ? (
              <div className="text-center py-10 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
                <p className="text-slate-500 font-medium">
                  Ce dossier patient est vierge.
                </p>
                <p className="text-sm text-slate-400 mt-1">
                  Les actes infirmiers et les consultations du médecin
                  s'afficheront ici.
                </p>
              </div>
            ) : (
              unifiedHistory.map((event) => (
                <div key={event.id} className="relative">
                  <div className="absolute -left-[43px] top-1 w-5 h-5 rounded-full border-4 bg-white dark:bg-slate-900 border-[#c2a712]"></div>

                  <div className="mb-2 text-sm font-bold text-slate-500 flex items-center gap-2 capitalize">
                    {event.dateStr}
                  </div>

                  <div
                    className={`rounded-2xl p-5 border shadow-sm ${
                      event.type === "NURSE"
                        ? "bg-slate-50/50 dark:bg-slate-800/30 border-slate-200 dark:border-slate-700"
                        : "bg-white dark:bg-slate-900 border-[#c2a712]/30 dark:border-[#c2a712]/40 ring-1 ring-[#c2a712]/10"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-4">
                      {event.type === "NURSE" ? (
                        <span className="flex items-center gap-1.5 text-[#9d8c0a] dark:text-[#fde047] font-bold text-sm bg-[#fefce8] dark:bg-[#c2a712]/20 px-3 py-1 rounded-lg border border-[#fef08a] dark:border-[#c2a712]/30">
                          <Activity className="w-4 h-4" /> Accueil Infirmier &
                          Constantes
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-[#9d8c0a] dark:text-[#fde047] font-bold text-sm bg-[#fefce8] dark:bg-[#c2a712]/20 px-3 py-1 rounded-lg border border-[#fef08a] dark:border-[#c2a712]/30">
                          <Stethoscope className="w-4 h-4" /> Consultation
                          Médicale (Médecin)
                        </span>
                      )}
                    </div>

                    {/* DÉTAILS INFIRMIER */}
                    {event.type === "NURSE" && (
                      <div className="space-y-3">
                        <div className="flex flex-wrap gap-2">
                          {event.data.temperature !== "-" && (
                            <span className="text-xs font-bold bg-white dark:bg-slate-800 px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-300">
                              Temp: {event.data.temperature}°C
                            </span>
                          )}
                          {event.data.tension !== "-" && (
                            <span className="text-xs font-bold bg-white dark:bg-slate-800 px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-300">
                              TA: {event.data.tension}
                            </span>
                          )}
                          {event.data.poids !== "-" && (
                            <span className="text-xs font-bold bg-white dark:bg-slate-800 px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-300">
                              Poids: {event.data.poids}kg
                            </span>
                          )}
                          {event.data.pouls !== "-" && (
                            <span className="text-xs font-bold bg-white dark:bg-slate-800 px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-300">
                              Pouls: {event.data.pouls}bpm
                            </span>
                          )}
                        </div>
                        {event.data.pathology &&
                          event.data.pathology !== "-" && (
                            <div className="text-sm mt-3">
                              <strong className="text-slate-700 dark:text-slate-300">
                                Motif / Observation infirmière :
                              </strong>{" "}
                              <span className="text-slate-600 dark:text-slate-400">
                                {event.data.pathology}
                              </span>
                            </div>
                          )}
                        {event.data.medicine && event.data.medicine !== "-" && (
                          <div className="text-sm flex items-center gap-1.5 text-[#9d8c0a] dark:text-[#fde047] bg-[#fefce8] dark:bg-[#c2a712]/10 p-2.5 rounded-lg w-max mt-2 border border-[#fef08a] dark:border-[#c2a712]/30 font-medium">
                            <Pill className="w-4 h-4" /> Soin dispensé :{" "}
                            {event.data.quantity}x {event.data.medicine}
                          </div>
                        )}
                      </div>
                    )}

                    {/* DÉTAILS MÉDECIN */}
                    {event.type === "DOCTOR" && (
                      <div className="space-y-4">
                        {event.data.constantesSnapshot && (
                          <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-3 border border-slate-200 dark:border-slate-800 mb-4">
                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                              <ClipboardList className="w-3.5 h-3.5" />{" "}
                              Constantes au moment de la consultation
                            </h4>
                            <div className="flex flex-wrap gap-2">
                              {event.data.constantesSnapshot.temperature &&
                                event.data.constantesSnapshot.temperature !==
                                  "-" && (
                                  <span className="text-xs font-bold bg-white dark:bg-slate-800 px-2 py-1 border border-slate-200 dark:border-slate-700 rounded text-slate-600 dark:text-slate-300">
                                    Temp:{" "}
                                    {event.data.constantesSnapshot.temperature}
                                    °C
                                  </span>
                                )}
                              {event.data.constantesSnapshot.tension &&
                                event.data.constantesSnapshot.tension !==
                                  "-" && (
                                  <span className="text-xs font-bold bg-white dark:bg-slate-800 px-2 py-1 border border-slate-200 dark:border-slate-700 rounded text-slate-600 dark:text-slate-300">
                                    TA: {event.data.constantesSnapshot.tension}
                                  </span>
                                )}
                              {event.data.constantesSnapshot.poids &&
                                event.data.constantesSnapshot.poids !== "-" && (
                                  <span className="text-xs font-bold bg-white dark:bg-slate-800 px-2 py-1 border border-slate-200 dark:border-slate-700 rounded text-slate-600 dark:text-slate-300">
                                    Poids: {event.data.constantesSnapshot.poids}
                                    kg
                                  </span>
                                )}
                            </div>
                          </div>
                        )}

                        <div className="space-y-3 text-sm">
                          {event.data.plaintes && (
                            <div>
                              <strong className="text-slate-500 block mb-0.5">
                                Motif / Plaintes :
                              </strong>{" "}
                              <span className="text-slate-800 dark:text-slate-200">
                                {event.data.plaintes}
                              </span>
                            </div>
                          )}
                          {event.data.examen && (
                            <div>
                              <strong className="text-slate-500 block mb-0.5">
                                Examen Clinique :
                              </strong>{" "}
                              <span className="text-slate-800 dark:text-slate-200">
                                {event.data.examen}
                              </span>
                            </div>
                          )}
                          {event.data.diagnostic && (
                            <div className="bg-[#fefce8]/50 dark:bg-[#c2a712]/10 p-3 rounded-lg border border-[#fef08a] dark:border-[#c2a712]/30">
                              <strong className="text-[#9d8c0a] dark:text-[#fde047] flex items-center gap-1 mb-1">
                                <Activity className="w-4 h-4" /> Diagnostic :
                              </strong>
                              <span className="text-slate-900 dark:text-white font-black text-base">
                                {event.data.diagnostic}
                              </span>
                            </div>
                          )}
                          {event.data.ordonnance && (
                            <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-700 mt-3">
                              <strong className="text-slate-700 dark:text-slate-300 flex items-center gap-1 mb-1">
                                <Pill className="w-4 h-4" /> Ordonnance
                                prescrite :
                              </strong>
                              <span className="text-slate-800 dark:text-slate-200 whitespace-pre-wrap font-medium block mt-1 leading-relaxed">
                                {event.data.ordonnance}
                              </span>
                            </div>
                          )}
                          {event.data.arret !== "0" &&
                            event.data.arret !== "" && (
                              <div className="mt-3">
                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-500 rounded-lg font-bold text-xs border border-amber-200 dark:border-amber-800/50 shadow-sm">
                                  📅 Arrêt maladie prescrit : {event.data.arret}{" "}
                                  jour(s)
                                </span>
                              </div>
                            )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
