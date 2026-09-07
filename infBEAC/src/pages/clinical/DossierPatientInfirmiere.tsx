import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowLeft,
  CalendarDays,
  FileText,
  User,
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const API_BASE_URL = "http://localhost:3001";

type NurseAct = {
  id: string;
  patientId: string;
  patientName?: string;
  pathology?: string;
  medicine?: string;
  quantity?: string;
  temperature?: string;
  tension?: string;
  poids?: string;
  pouls?: string;
  status?: string;
  createdAt: string;
  createdBy?: string;
};

type Patient = {
  id: string;
  nomComplet?: string;
  nom?: string;
  service?: string;
};

export default function DossierPatientInfirmiere() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [acts, setActs] = useState<NurseAct[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const authorKeys = useMemo(
    () =>
      [user?.id, user?.username, user?.fullName, user?.nom]
        .filter(Boolean)
        .map((value) => String(value).toLowerCase()),
    [user],
  );

  useEffect(() => {
    const load = async () => {
      try {
        const [actsResponse, patientsResponse] = await Promise.all([
          fetch(`${API_BASE_URL}/actes_infirmiers`),
          fetch(`${API_BASE_URL}/patients`),
        ]);
        if (!actsResponse.ok || !patientsResponse.ok)
          throw new Error("Erreur API");
        const allActs = (await actsResponse.json()) as NurseAct[];
        setActs(
          allActs
            .filter((act) => {
              if (!act.createdBy) return true;
              return authorKeys.includes(act.createdBy.toLowerCase());
            })
            .sort(
              (a, b) =>
                new Date(b.createdAt).getTime() -
                new Date(a.createdAt).getTime(),
            ),
        );
        setPatients((await patientsResponse.json()) as Patient[]);
      } catch (error) {
        console.error("Erreur chargement du dossier infirmier :", error);
        setHasError(true);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [authorKeys]);

  const patientFilter = location.state?.patient?.id as string | undefined;
  const visibleActs = patientFilter
    ? acts.filter((act) => act.patientId === patientFilter)
    : acts;

  const patientName = (act: NurseAct) =>
    act.patientName ||
    patients.find((patient) => patient.id === act.patientId)?.nomComplet ||
    patients.find((patient) => patient.id === act.patientId)?.nom ||
    "Patient inconnu";

  return (
    /* Fond global sombre (bleu nuit) et texte gris clair */
    <div className="min-h-screen bg-[#0f172a] p-4 font-sans text-slate-300 md:p-8">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="rounded-lg border border-slate-700 bg-slate-800 p-2 text-slate-300 transition-colors hover:bg-slate-700"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="flex items-center gap-2 text-2xl font-black text-white">
                <FileText className="h-6 w-6 text-rose-500" /> Dossier patient
                infirmier
              </h1>
              <p className="text-sm text-slate-400">
                Toutes vos interventions, de la plus récente à la plus ancienne
              </p>
            </div>
          </div>
        </header>

        {hasError && (
          <div className="mb-6 rounded-lg border border-rose-800 bg-rose-900/30 p-4 text-sm font-bold text-rose-400">
            Impossible de charger les interventions infirmières.
          </div>
        )}

        {/* Panneau principal assombri avec bordures subtiles */}
        <section className="rounded-2xl border border-slate-800 bg-[#1e293b] p-6 shadow-lg">
          <h2 className="mb-6 flex items-center gap-2 border-b border-slate-700 pb-4 font-bold text-white">
            <CalendarDays className="h-5 w-5 text-rose-500" /> Chronologie des
            interventions
          </h2>

          {isLoading ? (
            <p className="animate-pulse text-slate-400">
              Chargement du dossier...
            </p>
          ) : visibleActs.length === 0 ? (
            <p className="py-8 text-center text-slate-400">
              Aucune intervention enregistrée.
            </p>
          ) : (
            <div className="space-y-4">
              {visibleActs.map((act) => (
                <article
                  key={act.id}
                  className="rounded-xl border border-slate-700 bg-slate-800/50 p-4 transition-colors hover:bg-slate-800"
                >
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <h3 className="flex items-center gap-2 font-bold text-white">
                      <User className="h-4 w-4 text-rose-500" />{" "}
                      {patientName(act)}
                    </h3>
                    <time className="text-sm font-semibold text-slate-400">
                      {new Date(act.createdAt).toLocaleString("fr-FR")}
                    </time>
                  </div>

                  <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-emerald-400">
                    <Activity className="h-4 w-4" />{" "}
                    {act.pathology || "Intervention infirmière"}
                  </p>

                  <p className="text-sm text-slate-300">
                    Constantes : température {act.temperature || "-"} · tension{" "}
                    {act.tension || "-"} · poids {act.poids || "-"} · pouls{" "}
                    {act.pouls || "-"}
                  </p>

                  {act.medicine && act.medicine !== "-" && (
                    <p className="mt-2 text-sm font-bold text-slate-200">
                      Médicament :{" "}
                      <span className="text-rose-400">{act.medicine}</span> (
                      {act.quantity || "1"})
                    </p>
                  )}

                  {/* Badge de statut avec un contraste doux */}
                  <span className="mt-3 inline-block rounded-full bg-slate-700 px-3 py-1 text-xs font-bold text-slate-300">
                    {act.status || "Enregistré"}
                  </span>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
