import { useState, useEffect, useMemo } from "react";
import {
  Search,
  Filter,
  Eye,
  UserPlus,
  Phone,
  X,
  Users,
  Building2,
  CalendarDays,
  AlertTriangle,
  Save,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAppData } from "../../context/AppDataContext";
import { useAuth, normalizeRole } from "../../context/AuthContext";

// L'URL de base de ton API locale
const API_BASE_URL = "http://localhost:3001";

const SERVICES_BEAC = [
  "Tous les services",
  "Service Émission Monétaire et Circulation Fiduciaire",
  "Service Comptabilité, Budget, Contrôle de Gestion et Gestion Administrative des Marchés",
  "Service Ressources Humaines, Formation, Affaires Juridiques et Organisation",
  "Service Systèmes d'Information",
  "Service Patrimoine, Moyens Généraux et Relations Publiques",
  "Service Études et Statistiques, Activités Bancaires et Financement des Économies",
];

interface Patient {
  id: string;
  nom: string;
  age: number | string;
  sexe: string;
  service: string;
  telephone: string;
  derniereConsultation: string;
  statut: string;
}

export default function Patients() {
  const navigate = useNavigate();
  const { addPatient, upsertPatient, patients: sharedPatients } = useAppData();
  const { user } = useAuth();

  // ==========================================
  // ÉTATS
  // ==========================================
  const [patients, setPatients] = useState<Patient[]>(sharedPatients);
  const [isLoading, setIsLoading] = useState(true);
  const [apiError, setApiError] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [filterService, setFilterService] = useState("Tous les services");

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // État du formulaire d'ajout
  const [newPatient, setNewPatient] = useState({
    nom: "",
    age: "",
    sexe: "M",
    service: SERVICES_BEAC[1],
    telephone: "",
  });

  // ==========================================
  // FETCH DES PATIENTS (API)
  // ==========================================
  const fetchPatients = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${API_BASE_URL}/patients`);
      if (!response.ok) throw new Error("Erreur réseau");
      const data = await response.json();

      // Tri alphabétique par nom
      data.sort((a: Patient, b: Patient) => a.nom.localeCompare(b.nom));
      setPatients(data);
      setApiError(false);
    } catch (error) {
      console.error("Erreur API :", error);
      setApiError(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setPatients(sharedPatients);
  }, [sharedPatients]);

  useEffect(() => {
    fetchPatients();
  }, []);

  // ==========================================
  // FILTRAGE DYNAMIQUE
  // ==========================================
  const filteredPatients = useMemo(() => {
    return patients.filter((patient) => {
      const matchSearch =
        patient.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
        patient.id.toLowerCase().includes(searchTerm.toLowerCase());
      const matchService =
        filterService === "Tous les services" ||
        patient.service === filterService;

      return matchSearch && matchService;
    });
  }, [patients, searchTerm, filterService]);

  // ==========================================
  // ACTIONS
  // ==========================================
  const handleOpenDossier = (patient: Patient) => {
    const dossierPath =
      normalizeRole(user?.role) === "INFIRMIERE"
        ? "/dossier-patient-infirmiere"
        : "/dossier-medical";
    navigate(dossierPath, {
      state: {
        title: `Dossier de ${patient.nom}`,
        patient: {
          id: patient.id,
          nom: patient.nom,
          age: patient.age,
          sexe: patient.sexe,
          service: patient.service,
          telephone: patient.telephone,
        },
      },
    });
  };

  const handleCreatePatient = async () => {
    if (!newPatient.nom.trim()) {
      alert("Le nom complet est obligatoire.");
      return;
    }

    setIsSaving(true);
    const newId = `P-${Math.floor(1000 + Math.random() * 9000)}`; // Génère un ID P-XXXX

    const patientToSave = {
      id: newId,
      nom: newPatient.nom,
      age: newPatient.age || "-",
      sexe: newPatient.sexe,
      service: newPatient.service,
      telephone: newPatient.telephone || "-",
      derniereConsultation: "Nouveau dossier",
      statut: "Actif",
    };

    const localPatient = {
      ...patientToSave,
      statut: "Actif",
    };

    try {
      const response = await fetch(`${API_BASE_URL}/patients`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patientToSave),
      });

      if (!response.ok) {
        throw new Error("Échec de la sauvegarde");
      }

      addPatient(localPatient);
      setPatients((previous) => [localPatient, ...previous.filter((item) => item.id !== localPatient.id)]);
    } catch (error) {
      console.warn("Sauvegarde locale appliquée malgré l'indisponibilité de l'API", error);
      upsertPatient(localPatient);
      setPatients((previous) => [localPatient, ...previous.filter((item) => item.id !== localPatient.id)]);
    } finally {
      setNewPatient({
        nom: "",
        age: "",
        sexe: "M",
        service: SERVICES_BEAC[1],
        telephone: "",
      });
      setIsAddModalOpen(false);
      setIsSaving(false);
      fetchPatients();
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto transition-colors duration-200 dark:bg-slate-950 min-h-screen font-sans space-y-6">
      {apiError && (
        <div className="bg-rose-100 border border-rose-400 text-rose-700 px-4 py-3 rounded-lg flex items-center gap-3 shadow-sm">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <p className="font-bold text-sm">
            Impossible de récupérer la liste des patients. Vérifiez l'API (JSON
            Server).
          </p>
        </div>
      )}

      {/* ---------------- EN-TÊTE ---------------- */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-2">
            <Users className="w-7 h-7 text-green-700 dark:text-green-500" />
            Annuaire des Patients
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm font-medium">
            Gérez les dossiers médicaux du personnel et des ayants droit
          </p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-green-800 text-white text-sm font-bold rounded-xl shadow-md shadow-green-800/20 hover:bg-green-900 transition"
        >
          <UserPlus className="w-4 h-4" />
          Nouveau Patient
        </button>
      </div>

      {/* ---------------- BARRE DE RECHERCHE ET FILTRES ---------------- */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-slate-400" />
          </div>
          <input
            type="text"
            placeholder="Rechercher par nom ou matricule (ex: P-1102)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-11 pr-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 sm:text-sm font-medium transition-all"
          />
        </div>

        <div className="relative min-w-[320px]">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Filter className="h-5 w-5 text-slate-400" />
          </div>
          <select
            value={filterService}
            onChange={(e) => setFilterService(e.target.value)}
            className="block w-full pl-11 pr-10 py-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 sm:text-sm font-medium transition-all appearance-none cursor-pointer truncate"
          >
            {SERVICES_BEAC.map((service, index) => (
              <option key={index} value={service}>
                {service}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ---------------- TABLEAU DES PATIENTS ---------------- */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex justify-between items-center">
          <h2 className="font-bold text-slate-700 dark:text-slate-300">
            Résultats de la recherche
          </h2>
          <span className="text-xs font-bold px-3 py-1 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 rounded-lg">
            {filteredPatients.length} patient(s)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 dark:bg-slate-950/50 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-xs">
              <tr>
                <th className="p-4">ID</th>
                <th className="p-4">Patient</th>
                <th className="p-4">Service</th>
                <th className="p-4">Contact</th>
                <th className="p-4">Dernière visite</th>
                <th className="p-4 text-center">Dossier</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading ? (
                <tr>
                  <td
                    colSpan={6}
                    className="p-12 text-center text-slate-500 font-medium animate-pulse"
                  >
                    Chargement de l'annuaire...
                  </td>
                </tr>
              ) : filteredPatients.length > 0 ? (
                filteredPatients.map((patient) => (
                  <tr
                    key={patient.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors group"
                  >
                    <td className="p-4 font-mono text-xs font-semibold text-slate-500 dark:text-slate-400">
                      {patient.id}
                    </td>
                    <td className="p-4">
                      <div className="font-bold text-slate-800 dark:text-white text-base">
                        {patient.nom}
                      </div>
                      <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
                        {patient.age} ans • {patient.sexe}
                      </div>
                    </td>
                    <td className="p-4 text-slate-600 dark:text-slate-300">
                      <div className="flex items-center gap-1.5 truncate max-w-[280px]">
                        <Building2 className="w-4 h-4 shrink-0 text-slate-400" />
                        <span className="truncate">{patient.service}</span>
                      </div>
                    </td>
                    <td className="p-4 text-slate-600 dark:text-slate-300 font-medium">
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-4 h-4 text-slate-400" />{" "}
                        {patient.telephone}
                      </div>
                    </td>
                    <td className="p-4 text-slate-600 dark:text-slate-300 font-medium">
                      <div className="flex items-center gap-1.5">
                        <CalendarDays className="w-4 h-4 text-slate-400" />{" "}
                        {patient.derniereConsultation}
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      <button
                        onClick={() => handleOpenDossier(patient)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 hover:bg-green-600 hover:text-white dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-600 dark:hover:text-white rounded-lg font-bold transition-colors shadow-sm"
                      >
                        <Eye className="w-4 h-4" /> Ouvrir
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={6}
                    className="p-12 text-center text-slate-500 dark:text-slate-400"
                  >
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-full">
                        <Search className="w-8 h-8 text-slate-400" />
                      </div>
                      <p className="text-base font-semibold dark:text-white">
                        Aucun patient trouvé
                      </p>
                      <p className="text-sm">
                        Vérifiez l'orthographe ou ajoutez un nouveau patient.
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODALE : AJOUTER UN PATIENT                                               */}
      {/* ========================================================================= */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh]">
            {/* Header de la modale */}
            <div className="flex justify-between items-center p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-500 rounded-lg">
                  <UserPlus className="w-5 h-5" />
                </div>
                <h2 className="text-lg font-bold text-slate-800 dark:text-white">
                  Enregistrer un nouveau patient
                </h2>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Corps du formulaire */}
            <div className="p-6 overflow-y-auto space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">
                    Nom et Prénom <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newPatient.nom}
                    onChange={(e) =>
                      setNewPatient({ ...newPatient, nom: e.target.value })
                    }
                    placeholder="Ex: Jean Dupont"
                    className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-800 dark:text-white outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 font-medium transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">
                    Âge
                  </label>
                  <input
                    type="number"
                    value={newPatient.age}
                    onChange={(e) =>
                      setNewPatient({ ...newPatient, age: e.target.value })
                    }
                    placeholder="Ex: 35"
                    min="18"
                    max="100"
                    className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-800 dark:text-white outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 font-medium transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">
                    Sexe
                  </label>
                  <select
                    value={newPatient.sexe}
                    onChange={(e) =>
                      setNewPatient({ ...newPatient, sexe: e.target.value })
                    }
                    className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-800 dark:text-white outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 font-medium transition-all appearance-none"
                  >
                    <option value="M">Masculin</option>
                    <option value="F">Féminin</option>
                  </select>
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">
                    Service d'affectation
                  </label>
                  <select
                    value={newPatient.service}
                    onChange={(e) =>
                      setNewPatient({ ...newPatient, service: e.target.value })
                    }
                    className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-800 dark:text-white outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 font-medium transition-all appearance-none truncate"
                  >
                    {SERVICES_BEAC.filter((s) => s !== "Tous les services").map(
                      (s, i) => (
                        <option key={i} value={s}>
                          {s}
                        </option>
                      ),
                    )}
                  </select>
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">
                    Numéro de téléphone
                  </label>
                  <input
                    type="tel"
                    value={newPatient.telephone}
                    onChange={(e) =>
                      setNewPatient({
                        ...newPatient,
                        telephone: e.target.value,
                      })
                    }
                    placeholder="Ex: 6 00 00 00 00"
                    className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-800 dark:text-white outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 font-medium transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Footer de la modale */}
            <div className="p-5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex justify-end gap-3">
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="px-5 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-sm font-bold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition shadow-sm"
              >
                Annuler
              </button>
              <button
                onClick={handleCreatePatient}
                disabled={isSaving}
                className="px-6 py-2.5 flex items-center gap-2 bg-green-800 text-white text-sm font-black rounded-xl hover:bg-green-900 shadow-md shadow-green-800/20 transition disabled:opacity-50"
              >
                {isSaving ? (
                  "Enregistrement..."
                ) : (
                  <>
                    <Save className="w-4 h-4" /> Créer le dossier
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
