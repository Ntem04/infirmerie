import { useEffect, useRef, useState, useMemo } from "react";
import {
  Download,
  Search,
  Activity,
  Pill,
  CheckCircle2,
  X,
  History,
  UserCheck,
} from "lucide-react";
import { useAppData } from "../../context/AppDataContext";
import { useAuth } from "../../context/AuthContext";

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
// TYPES ET DONNÉES DE RÉFÉRENCE
// ==========================================
type NurseEntry = {
  id: string;
  patientId: string;
  patientName?: string;
  sexe?: string;
  age?: string;
  service?: string;
  temperature: string;
  tension: string;
  poids: string;
  pouls: string;
  pathology: string;
  medicine: string;
  quantity: string;
  status: string;
  createdAt: string;
};

type Medicine = {
  id: string;
  nom?: string;
  name?: string;
  nomMedicament?: string;
  quantite?: number;
  quantity?: number;
  stock?: number;
  datePeremption?: string;
  archive?: boolean;
};

type Patient = {
  id: string;
  nomComplet: string;
  sexe: string;
  age: string;
  service: string;
};

// MISE À JOUR : Liste unifiée de tous les statuts BEAC
const serviceOptions = [
  "",
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

const pathologyOptions = [
  "",
  "Syndrome Grippal",
  "Troubles Musculo-Squelettiques (TMS)",
  "Fatigue Visuelle",
  "Maux de tête",
  "Paludisme",
  "Blessure légère",
  "Autre",
];

const API_BASE_URL = "http://localhost:3001";

const sanitizeInputOWASP = (input: string) => {
  return input.replace(/</g, "&lt;").replace(/>/g, "&gt;");
};

export default function ExcelWorkbook() {
  const { upsertQueueItem, queue: sharedQueue } = useAppData();
  const { user } = useAuth();

  const auditHeaders = {
    "Content-Type": "application/json",
    "x-user-name": user?.fullName || user?.nom || user?.username || "Inconnu",
    "x-user-role": user?.role || "NON SPÉCIFIÉ",
  };

  const persistQueueItem = async (payload: any) => {
    try {
      const response = await fetch(`${API_BASE_URL}/queue`, {
        method: "POST",
        headers: auditHeaders,
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error("Erreur queue");
    } catch (error) {
      console.warn("Queue backend indisponible.", error);
    }
  };

  const [entries, setEntries] = useState<NurseEntry[]>([]);
  const [stock, setStock] = useState<Medicine[]>([]);
  const [allPatients, setAllPatients] = useState<Patient[]>([]);

  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestionBoxRef = useRef<HTMLDivElement>(null);

  const [form, setForm] = useState({
    patientId: "",
    patientName: "",
    sexe: "",
    age: "",
    service: "",
    temperature: "",
    tension: "",
    poids: "",
    pouls: "",
    pathology: "",
    customPathology: "",
    medicine: "",
    quantity: "",
    needsDoctor: false,
  });

  const nameRef = useRef<HTMLInputElement>(null);
  const sexeRef = useRef<HTMLSelectElement>(null);
  const ageRef = useRef<HTMLInputElement>(null);
  const serviceRef = useRef<HTMLSelectElement>(null);
  const tempRef = useRef<HTMLInputElement>(null);
  const tensionRef = useRef<HTMLInputElement>(null);
  const poidsRef = useRef<HTMLInputElement>(null);
  const poulsRef = useRef<HTMLInputElement>(null);
  const pathoRef = useRef<HTMLSelectElement>(null);
  const customPathoRef = useRef<HTMLInputElement>(null);
  const medRef = useRef<HTMLSelectElement>(null);
  const qtyRef = useRef<HTMLInputElement>(null);
  const submitRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        suggestionBoxRef.current &&
        !suggestionBoxRef.current.contains(event.target as Node) &&
        nameRef.current &&
        !nameRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getMedName = (med: Medicine) =>
    med.nomMedicament || med.nom || med.name || "Médicament sans nom";

  const getMedQty = (med: Medicine) =>
    med.quantite ?? med.quantity ?? med.stock ?? 0;

  const uniqueMedNames = Array.from(new Set(stock.map(getMedName)))
    .filter(Boolean)
    .sort();

  const selectedMedStock = form.medicine
    ? stock
        .filter((m) => getMedName(m) === form.medicine)
        .reduce((sum, current) => sum + getMedQty(current), 0)
    : null;

  const patientHistory = useMemo(() => {
    const term = form.patientName.trim().toLowerCase();
    if (term.length < 2) return [];

    return entries
      .filter(
        (entry) =>
          entry.patientName &&
          entry.patientName.toLowerCase() === term &&
          entry.medicine !== "-" &&
          entry.medicine !== "",
      )
      .slice(0, 3);
  }, [form.patientName, entries]);

  const filteredPatients = useMemo(() => {
    const term = form.patientName.trim().toLowerCase();
    if (term.length < 2) return [];

    return allPatients
      .filter((p) => p.nomComplet && p.nomComplet.toLowerCase().includes(term))
      .slice(0, 5);
  }, [form.patientName, allPatients]);

  const fetchData = async () => {
    try {
      const [resActes, resPatients, resStock] = await Promise.all([
        fetch(`${API_BASE_URL}/actes_infirmiers`),
        fetch(`${API_BASE_URL}/patients`),
        fetch(`${API_BASE_URL}/pharmacie`),
      ]);

      if (resActes.ok && resPatients.ok) {
        const dataActes = await resActes.json();
        const dataPatients = await resPatients.json();

        setAllPatients(dataPatients);

        const enrichedActes = dataActes.map((acte: any) => {
          const patientData =
            dataPatients.find(
              (p: any) =>
                p.id === acte.patientId ||
                (p.nomComplet &&
                  acte.patientName &&
                  p.nomComplet.toLowerCase() ===
                    acte.patientName.toLowerCase()),
            ) || {};
          return {
            ...acte,
            patientName:
              patientData.nomComplet || acte.patientName || "Patient Inconnu",
            sexe: patientData.sexe || acte.sexe || "-",
            age: patientData.age || acte.age || "-",
            service: patientData.service || acte.service || "Non renseigné",
          };
        });

        setEntries(enrichedActes.reverse());
      }

      if (resStock.ok) {
        const dataStock = await resStock.json();
        // MISE À JOUR MAGIQUE : On retire les médicaments ayant la mention "archive: true"
        setStock(dataStock.filter((m: Medicine) => !m.archive));
      }
    } catch (error) {
      console.error("Erreur chargement données infirmerie:", error);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (sharedQueue && sharedQueue.length > 0) {
      setEntries((prevEntries) =>
        prevEntries.map((entry) => {
          const matchingQueue = sharedQueue.find(
            (q: any) => q.nom === entry.patientName && q.statut === "Terminé",
          );
          if (matchingQueue && entry.status === "En attente médecin") {
            return { ...entry, status: "Terminé" };
          }
          return entry;
        }),
      );
    }
  }, [sharedQueue]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value, type } = e.target;
    const val =
      type === "checkbox" ? (e.target as HTMLInputElement).checked : value;

    setForm((prev) => ({ ...prev, [name]: val }));

    if (name === "patientName") {
      setShowSuggestions(true);
      setForm((prev) => ({ ...prev, patientId: "" }));
    }
  };

  const handleSelectPatient = (patient: Patient) => {
    setForm((prev) => ({
      ...prev,
      patientId: patient.id,
      patientName: patient.nomComplet,
      sexe: patient.sexe !== "-" ? patient.sexe : prev.sexe,
      age: patient.age !== "-" ? patient.age : prev.age,
      service:
        patient.service !== "Non renseigné" ? patient.service : prev.service,
    }));
    setShowSuggestions(false);
    tempRef.current?.focus();
  };

  const handleKeyDown = (
    e: React.KeyboardEvent,
    nextRef: { current: { focus: () => void } | null },
  ) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (showSuggestions && filteredPatients.length > 0) {
        handleSelectPatient(filteredPatients[0]);
      } else {
        setShowSuggestions(false);
        nextRef.current?.focus();
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedPatientName = form.patientName.trim();
    if (!trimmedPatientName) {
      alert("Le nom du patient est obligatoire.");
      nameRef.current?.focus();
      return;
    }

    if (form.age) {
      const ageNum = Number(form.age);
      if (ageNum < 0 || ageNum > 130) {
        alert("Âge invalide. Veuillez entrer un âge entre 0 et 130 ans.");
        ageRef.current?.focus();
        return;
      }
    }

    if (form.temperature) {
      const tempNum = parseFloat(form.temperature.replace(",", "."));
      if (tempNum < 30 || tempNum > 45) {
        alert(
          "Température aberrante. Elle doit être comprise entre 30°C et 45°C.",
        );
        tempRef.current?.focus();
        return;
      }
    }

    if (form.poids) {
      const poidsNum = parseFloat(form.poids.replace(",", "."));
      if (poidsNum <= 0 || poidsNum > 300) {
        alert(
          "Poids invalide. La valeur ne peut pas être négative, nulle ou aberrante.",
        );
        poidsRef.current?.focus();
        return;
      }
    }

    if (form.pouls) {
      const poulsNum = Number(form.pouls);
      if (poulsNum <= 0 || poulsNum > 300) {
        alert("Pouls invalide. La valeur ne peut pas être négative ou nulle.");
        poulsRef.current?.focus();
        return;
      }
    }

    let finalPathology = form.pathology;
    if (form.pathology === "Autre") {
      const customPatho = form.customPathology.trim();
      if (!customPatho) {
        alert("Veuillez préciser la pathologie.");
        customPathoRef.current?.focus();
        return;
      }
      if (customPatho.length > 100) {
        alert("La pathologie saisie est trop longue.");
        return;
      }
      const safeRegex = /^[\w\sÀ-ÿ\-\.,'()]+$/;
      if (!safeRegex.test(customPatho)) {
        alert("Caractères non autorisés détectés dans la pathologie.");
        return;
      }
      finalPathology = sanitizeInputOWASP(customPatho);
    }

    setIsSaving(true);

    try {
      let currentPatientId = form.patientId;

      if (!currentPatientId) {
        const resSearch = await fetch(
          `${API_BASE_URL}/patients?nomComplet=${encodeURIComponent(trimmedPatientName)}`,
        );
        const existingPatients = await resSearch.json();

        if (existingPatients && existingPatients.length > 0) {
          currentPatientId = existingPatients[0].id;
          await fetch(`${API_BASE_URL}/patients/${currentPatientId}`, {
            method: "PATCH",
            headers: auditHeaders,
            body: JSON.stringify({
              age: form.age.trim() || existingPatients[0].age,
              sexe: form.sexe || existingPatients[0].sexe,
              service: form.service || existingPatients[0].service,
            }),
          });
        } else {
          const createPatientRes = await fetch(`${API_BASE_URL}/patients`, {
            method: "POST",
            headers: auditHeaders,
            body: JSON.stringify({
              nomComplet: trimmedPatientName,
              sexe: form.sexe || "-",
              age: form.age.trim() || "-",
              service: form.service || "Non renseigné",
              createdAt: new Date().toISOString(),
            }),
          });
          const createdPatient = await createPatientRes.json();
          currentPatientId = createdPatient.id;
          setAllPatients((prev) => [...prev, createdPatient]);
        }
      } else {
        await fetch(`${API_BASE_URL}/patients/${currentPatientId}`, {
          method: "PATCH",
          headers: auditHeaders,
          body: JSON.stringify({
            age: form.age.trim() || "-",
            sexe: form.sexe || "-",
            service: form.service || "Non renseigné",
          }),
        });
      }

      const qtyToDeliver = parseInt(form.quantity) || 0;
      if (form.medicine && qtyToDeliver > 0) {
        const batches = stock
          .filter((m) => getMedName(m) === form.medicine && getMedQty(m) > 0)
          .sort(
            (a, b) =>
              new Date(a.datePeremption || 0).getTime() -
              new Date(b.datePeremption || 0).getTime(),
          );

        let remainingToDeduct = qtyToDeliver;

        for (const batch of batches) {
          if (remainingToDeduct <= 0) break;
          const batchQty = getMedQty(batch);
          const deductAmt = Math.min(batchQty, remainingToDeduct);
          remainingToDeduct -= deductAmt;
          const newQty = batchQty - deductAmt;

          setStock((prev) =>
            prev.map((m) =>
              m.id === batch.id
                ? { ...m, quantite: newQty, quantity: newQty }
                : m,
            ),
          );

          await fetch(`${API_BASE_URL}/pharmacie/${batch.id}`, {
            method: "PATCH",
            headers: auditHeaders,
            body: JSON.stringify({ quantite: newQty }),
          });
        }
      }

      const uniqueId = Date.now().toString();
      const createdAt = new Date().toISOString();
      const finalStatus = form.needsDoctor ? "En attente médecin" : "Terminé";

      const acteInfirmier = {
        id: uniqueId,
        patientId: currentPatientId,
        temperature: form.temperature.trim() || "-",
        tension: form.tension.trim() || "-",
        poids: form.poids.trim() || "-",
        pouls: form.pouls.trim() || "-",
        pathology: finalPathology || "-",
        medicine: form.medicine || "-",
        quantity: qtyToDeliver > 0 ? qtyToDeliver.toString() : "-",
        createdAt: createdAt,
        status: finalStatus,
        createdBy:
          user?.fullName ||
          [user?.prenom, user?.nom].filter(Boolean).join(" ") ||
          user?.username ||
          String(user?.id || ""),
      };

      await fetch(`${API_BASE_URL}/actes_infirmiers`, {
        method: "POST",
        headers: auditHeaders,
        body: JSON.stringify(acteInfirmier),
      });

      if (form.needsDoctor) {
        const queuePayload = {
          id: `Q-${uniqueId}`,
          patientId: currentPatientId,
          nom: trimmedPatientName,
          sexe: form.sexe || "-",
          age: form.age.trim() || "-",
          service: form.service || "Non renseigné",
          motif: finalPathology || "Consultation générale",
          statut: "En attente médecin",
          heure: new Date().toLocaleTimeString("fr-FR", {
            hour: "2-digit",
            minute: "2-digit",
          }),
          date: createdAt,
        };

        upsertQueueItem(queuePayload);
        await persistQueueItem(queuePayload);
      }

      await fetchData();

      setForm({
        patientId: "",
        patientName: "",
        sexe: "",
        age: "",
        service: "",
        temperature: "",
        tension: "",
        poids: "",
        pouls: "",
        pathology: "",
        customPathology: "",
        medicine: "",
        quantity: "",
        needsDoctor: false,
      });
      nameRef.current?.focus();
      alert("Dossier validé et transmis avec succès !");
    } catch (error) {
      console.error("Erreur enregistrement:", error);
      alert("Erreur lors de l'enregistrement du dossier.");
    } finally {
      setIsSaving(false);
    }
  };

  const exportCsv = () => {
    const rows = [
      [
        "Date & Heure",
        "Nom",
        "Sexe",
        "Âge",
        "Service",
        "Température",
        "Tension",
        "Poids",
        "Pouls",
        "Pathologie",
        "Médicament",
        "Quantité",
        "Statut",
      ],
      ...entries.map((entry) => [
        new Date(entry.createdAt).toLocaleString("fr-FR"),
        entry.patientName || "Inconnu",
        entry.sexe || "-",
        entry.age || "-",
        entry.service || "-",
        entry.temperature,
        entry.tension,
        entry.poids,
        entry.pouls,
        entry.pathology,
        entry.medicine,
        entry.quantity,
        entry.status,
      ]),
    ];

    const csvContent =
      "\uFEFF" +
      rows
        .map((row) =>
          row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(";"),
        )
        .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "registre-infirmerie-beac.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className="mx-auto max-w-7xl space-y-6 p-4 md:p-8 bg-slate-50 dark:bg-slate-950 min-h-screen transition-colors duration-200"
      style={{
        fontFamily:
          '"Roboto", system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      }}
    >
      <FadeInBlock delay={0}>
        <header className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Activity className="w-6 h-6 text-teal-600 dark:text-teal-500" />
              Espace Infirmière (Accueil & Constantes)
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Saisie rapide des dossiers et constantes du personnel BEAC.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsStockModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-500 border border-amber-200 dark:border-amber-800/50 px-4 py-2 text-sm font-semibold hover:bg-amber-100 dark:hover:bg-amber-900/40 transition"
            >
              <Pill className="h-4 w-4" />
              État des stocks
            </button>
            <button
              type="button"
              onClick={exportCsv}
              className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-teal-700 transition"
            >
              <Download className="h-4 w-4" />
              Exporter Excel
            </button>
          </div>
        </header>
      </FadeInBlock>

      <FadeInBlock delay={75}>
        <form
          onSubmit={handleSubmit}
          className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm"
        >
          <div className="mb-6 pb-6 border-b border-slate-100 dark:border-slate-800">
            <h2 className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-4">
              1. Identité du patient
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
              <label className="space-y-1 md:col-span-2 relative">
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Nom complet *
                </span>
                <input
                  ref={nameRef}
                  type="text"
                  name="patientName"
                  required
                  value={form.patientName}
                  onChange={handleChange}
                  onFocus={() => {
                    if (form.patientName.length >= 2) setShowSuggestions(true);
                  }}
                  onKeyDown={(e) => handleKeyDown(e, sexeRef)}
                  placeholder="Ex: Jean Dupont"
                  autoComplete="off"
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-slate-800 dark:text-slate-200 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                />

                {showSuggestions && filteredPatients.length > 0 && (
                  <div
                    ref={suggestionBoxRef}
                    className="absolute z-50 left-0 right-0 top-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2"
                  >
                    {filteredPatients.map((p) => (
                      <div
                        key={p.id}
                        onClick={() => handleSelectPatient(p)}
                        className="px-4 py-3 hover:bg-teal-50 dark:hover:bg-slate-700/80 cursor-pointer border-b border-slate-100 dark:border-slate-700/50 last:border-0 flex items-center gap-3 transition-colors"
                      >
                        <UserCheck className="w-5 h-5 text-teal-600 dark:text-teal-500 shrink-0" />
                        <div className="flex-1 truncate">
                          <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">
                            {p.nomComplet}
                          </p>
                          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 truncate">
                            {p.service !== "Non renseigné"
                              ? p.service
                              : "Service inconnu"}{" "}
                            • {p.age !== "-" ? `${p.age} ans` : "Âge inconnu"}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </label>

              <label className="space-y-1 md:col-span-1">
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Sexe
                </span>
                <select
                  ref={sexeRef}
                  name="sexe"
                  value={form.sexe}
                  onChange={handleChange}
                  onKeyDown={(e) => handleKeyDown(e, ageRef)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-slate-800 dark:text-slate-200 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                >
                  <option value="">-</option>
                  <option value="M">M</option>
                  <option value="F">F</option>
                </select>
              </label>

              <label className="space-y-1 md:col-span-1">
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Âge
                </span>
                <input
                  ref={ageRef}
                  type="number"
                  name="age"
                  min="0"
                  max="130"
                  value={form.age}
                  onChange={handleChange}
                  onKeyDown={(e) => handleKeyDown(e, serviceRef)}
                  placeholder="Ex: 42"
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-slate-800 dark:text-slate-200 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                />
              </label>

              <label className="space-y-1 md:col-span-2">
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Service
                </span>
                <select
                  ref={serviceRef}
                  name="service"
                  value={form.service}
                  onChange={handleChange}
                  onKeyDown={(e) => handleKeyDown(e, tempRef)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-slate-800 dark:text-slate-200 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 truncate"
                >
                  {serviceOptions.map((opt, index) => (
                    <option key={index} value={opt}>
                      {opt || "-- Sélectionner --"}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {patientHistory.length > 0 && (
              <div className="mt-4 p-3 bg-[#fefce8] dark:bg-[#c2a712]/10 border border-[#fef08a] dark:border-[#c2a712]/30 rounded-lg animate-in fade-in zoom-in-95">
                <div className="flex items-center gap-2 mb-2">
                  <History className="w-4 h-4 text-[#9d8c0a] dark:text-[#fde047]" />
                  <span className="text-sm font-bold text-[#9d8c0a] dark:text-[#fde047]">
                    Historique de délivrance récent
                  </span>
                </div>
                <div className="space-y-1">
                  {patientHistory.map((hist, i) => (
                    <div
                      key={i}
                      className="text-xs text-slate-700 dark:text-slate-300 flex justify-between"
                    >
                      <span>
                        • Le{" "}
                        {new Date(hist.createdAt).toLocaleDateString("fr-FR")} :
                      </span>
                      <span className="font-semibold text-teal-600 dark:text-teal-400">
                        {hist.quantity}x {hist.medicine} (Motif:{" "}
                        {hist.pathology})
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="mb-6 pb-6 border-b border-slate-100 dark:border-slate-800">
            <h2 className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-4">
              2. Constantes & Motif
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <label className="space-y-1">
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Température (°C)
                </span>
                <input
                  ref={tempRef}
                  type="text"
                  name="temperature"
                  value={form.temperature}
                  onChange={handleChange}
                  onKeyDown={(e) => handleKeyDown(e, tensionRef)}
                  placeholder="Ex: 37.5"
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 px-3 py-2 text-slate-800 dark:text-slate-200 outline-none focus:border-teal-500"
                />
              </label>
              <label className="space-y-1">
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Tension
                </span>
                <input
                  ref={tensionRef}
                  type="text"
                  name="tension"
                  value={form.tension}
                  onChange={handleChange}
                  onKeyDown={(e) => handleKeyDown(e, poidsRef)}
                  placeholder="Ex: 120/80"
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 px-3 py-2 text-slate-800 dark:text-slate-200 outline-none focus:border-teal-500"
                />
              </label>
              <label className="space-y-1">
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Poids (Kg)
                </span>
                <input
                  ref={poidsRef}
                  type="text"
                  name="poids"
                  value={form.poids}
                  onChange={handleChange}
                  onKeyDown={(e) => handleKeyDown(e, poulsRef)}
                  placeholder="Ex: 75"
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 px-3 py-2 text-slate-800 dark:text-slate-200 outline-none focus:border-teal-500"
                />
              </label>
              <label className="space-y-1">
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Pouls (BPM)
                </span>
                <input
                  ref={poulsRef}
                  type="text"
                  name="pouls"
                  value={form.pouls}
                  onChange={handleChange}
                  onKeyDown={(e) => handleKeyDown(e, pathoRef)}
                  placeholder="Ex: 80"
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 px-3 py-2 text-slate-800 dark:text-slate-200 outline-none focus:border-teal-500"
                />
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="space-y-1">
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Pathologie présumée
                </span>
                <select
                  ref={pathoRef}
                  name="pathology"
                  value={form.pathology}
                  onChange={handleChange}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      form.pathology === "Autre"
                        ? customPathoRef.current?.focus()
                        : medRef.current?.focus();
                    }
                  }}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-slate-800 dark:text-slate-200 outline-none focus:border-teal-500"
                >
                  {pathologyOptions.map((opt, index) => (
                    <option key={index} value={opt}>
                      {opt || "-- Sélectionner --"}
                    </option>
                  ))}
                </select>
              </label>

              {form.pathology === "Autre" && (
                <label className="space-y-1 animate-in fade-in slide-in-from-top-2 duration-300">
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Précisez la pathologie{" "}
                    <span className="text-red-500">*</span>
                  </span>
                  <input
                    ref={customPathoRef}
                    type="text"
                    name="customPathology"
                    value={form.customPathology}
                    onChange={handleChange}
                    onKeyDown={(e) => handleKeyDown(e, medRef)}
                    placeholder="Saisissez la pathologie..."
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-slate-800 dark:text-slate-200 outline-none focus:border-teal-500"
                  />
                </label>
              )}
            </div>
          </div>

          <div className="mb-6">
            <h2 className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Pill className="w-4 h-4" /> 3. Délivrance de Médicament
              (Optionnel)
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <label className="space-y-1 md:col-span-2 relative">
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Médicament à délivrer
                </span>
                <select
                  ref={medRef}
                  name="medicine"
                  value={form.medicine}
                  onChange={handleChange}
                  onKeyDown={(e) => handleKeyDown(e, qtyRef)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-slate-800 dark:text-slate-200 outline-none focus:border-teal-500"
                >
                  <option value="">-- Aucun --</option>
                  {uniqueMedNames.map((name, index) => (
                    <option key={index} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
                {selectedMedStock !== null && form.medicine && (
                  <span
                    className={`absolute right-8 top-8 text-xs font-bold px-2 py-0.5 rounded-full ${
                      selectedMedStock > 0
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                        : "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400"
                    }`}
                  >
                    Stock: {selectedMedStock}
                  </span>
                )}
              </label>
              <label className="space-y-1">
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Quantité
                </span>
                <input
                  ref={qtyRef}
                  type="number"
                  min="1"
                  max={selectedMedStock || 999}
                  name="quantity"
                  value={form.quantity}
                  onChange={handleChange}
                  onKeyDown={(e) => handleKeyDown(e, submitRef)}
                  disabled={!form.medicine || selectedMedStock === 0}
                  placeholder={form.medicine ? "Ex: 2" : "-"}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-slate-800 dark:text-slate-200 outline-none focus:border-teal-500 disabled:opacity-50"
                />
              </label>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                name="needsDoctor"
                checked={form.needsDoctor}
                onChange={handleChange}
                disabled={isSaving}
                className="w-4 h-4 text-teal-600 rounded border-slate-300 focus:ring-teal-500"
              />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Nécessite de voir le médecin
              </span>
            </label>

            <button
              ref={submitRef}
              type="submit"
              disabled={isSaving}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg bg-teal-600 px-6 py-2.5 text-sm font-bold text-white shadow-md hover:bg-teal-500 transition-colors disabled:opacity-50"
            >
              <CheckCircle2 className="h-5 w-5" />
              {isSaving ? "Validation en cours..." : "Valider le dossier"}
            </button>
          </div>
        </form>
      </FadeInBlock>

      <FadeInBlock delay={150}>
        <section className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden mt-6">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Search className="h-5 w-5 text-slate-500 dark:text-slate-400" />
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-200">
                Registre des actes infirmiers
              </h2>
            </div>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-950 px-2 py-1 rounded border border-slate-200 dark:border-slate-700">
              {entries.length} ligne(s)
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-100 dark:bg-slate-950 border-b border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-semibold">
                <tr>
                  <th className="p-3 border-r border-slate-200 dark:border-slate-800">
                    Heure
                  </th>
                  <th className="p-3 border-r border-slate-200 dark:border-slate-800">
                    Patient
                  </th>
                  <th className="p-3 border-r border-slate-200 dark:border-slate-800">
                    Constantes
                  </th>
                  <th className="p-3 border-r border-slate-200 dark:border-slate-800">
                    Pathologie
                  </th>
                  <th className="p-3 border-r border-slate-200 dark:border-slate-800">
                    Médicament délivré
                  </th>
                  <th className="p-3 border-r border-slate-200 dark:border-slate-800">
                    Statut
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {entries.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="p-8 text-center text-slate-500 dark:text-slate-400"
                    >
                      Aucun acte enregistré pour le moment.
                    </td>
                  </tr>
                ) : (
                  entries.map((entry, index) => (
                    <tr
                      key={entry.id || index}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <td className="p-3 border-r border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400">
                        {new Date(entry.createdAt).toLocaleTimeString("fr-FR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="p-3 border-r border-slate-200 dark:border-slate-800 font-medium text-slate-800 dark:text-slate-200">
                        {entry.patientName || "Patient Inconnu"}{" "}
                        <span className="text-xs font-normal text-slate-400 block mt-0.5">
                          {entry.sexe !== "-" ? `${entry.sexe} • ` : ""}
                          {entry.age !== "-" ? `${entry.age} ans • ` : ""}
                          {entry.service}
                        </span>
                      </td>
                      <td className="p-3 border-r border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 text-xs">
                        T: {entry.temperature}°C / TA: {entry.tension} / Poids:{" "}
                        {entry.poids}kg / Pouls: {entry.pouls}bpm
                      </td>
                      <td className="p-3 border-r border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300">
                        {entry.pathology}
                      </td>
                      <td className="p-3 border-r border-slate-200 dark:border-slate-800">
                        {entry.medicine !== "-" ? (
                          <span className="font-semibold text-teal-600 dark:text-teal-400">
                            {entry.quantity}x {entry.medicine}
                          </span>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="p-3 border-r border-slate-200 dark:border-slate-800">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-bold ${
                            entry.status === "Terminé" ||
                            entry.status.includes("Terminé")
                              ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                              : "bg-[#fefce8] text-[#9d8c0a] dark:bg-[#c2a712]/20 dark:text-[#fde047] border border-[#fef08a] dark:border-[#c2a712]/30"
                          }`}
                        >
                          <div
                            className={`w-1.5 h-1.5 rounded-full ${
                              entry.status === "Terminé" ||
                              entry.status.includes("Terminé")
                                ? "bg-blue-500"
                                : "bg-[#c2a712]"
                            }`}
                          ></div>
                          {entry.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </FadeInBlock>

      {isStockModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800">
            <div className="flex justify-between items-center p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-500 rounded-lg">
                  <Pill className="w-5 h-5" />
                </div>
                <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                  État Rapide des Stocks
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsStockModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-3">
              {stock.length === 0 ? (
                <p className="text-center text-slate-500 py-4">
                  Aucun stock disponible.
                </p>
              ) : (
                uniqueMedNames.map((medName) => {
                  const qty = stock
                    .filter((m) => getMedName(m) === medName)
                    .reduce((sum, current) => sum + getMedQty(current), 0);

                  return (
                    <div
                      key={medName}
                      className="flex justify-between items-center p-3 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30"
                    >
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        {medName}
                      </span>
                      <span
                        className={`text-sm font-bold ${
                          qty === 0
                            ? "text-rose-500"
                            : qty < 50
                              ? "text-amber-500"
                              : "text-emerald-600 dark:text-emerald-400"
                        }`}
                      >
                        {qty}
                      </span>
                    </div>
                  );
                })
              )}
            </div>

            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex justify-end">
              <button
                type="button"
                onClick={() => setIsStockModalOpen(false)}
                className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-semibold rounded-lg"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
