import { useState, useRef, useEffect } from "react";
import {
  Mic,
  MicOff,
  Save,
  Stethoscope,
  Activity,
  Pill,
  ArrowLeft,
  User,
  Building2,
  PlusCircle,
  Plus,
  Minus,
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const API_BASE_URL = "http://localhost:3001";

const SERVICES_BEAC = [
  "Service Émission Monétaire et Circulation Fiduciaire",
  "Service Comptabilité, Budget, Contrôle de Gestion et Gestion Administrative des Marchés",
  "Service Ressources Humaines, Formation, Affaires Juridiques et Organisation",
  "Service Systèmes d'Information",
  "Service Patrimoine, Moyens Généraux et Relations Publiques",
  "Service Études et Statistiques, Activités Bancaires et Financement des Économies",
];

const QUICK_MEDS = [
  "Paracétamol 1g",
  "Ibuprofène 400mg",
  "Amoxicilline 500mg",
  "Spasfon",
  "Vitamine C",
  "Artéméther/Luméfantrine (ACT)",
];

export default function DossierMedical() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const auditHeaders = {
    "Content-Type": "application/json",
    "x-user-name":
      user?.fullName || user?.nom || user?.username || "Médecin BEAC",
    "x-user-role": user?.role || "MEDECIN",
  };

  const navPatient = (location.state as any)?.patient;
  const locationStateTitle = (location.state as any)?.title ?? "Consultation";
  const initialId = String(navPatient?.id || navPatient?.matricule || "P-0000");

  const [patientInfo, setPatientInfo] = useState({
    id: initialId,
    temperature: navPatient?.temperature || "-",
    tension: navPatient?.tension || "-",
    poids: navPatient?.poids || "-",
    pouls: navPatient?.pouls || "-",
  });

  const [form, setForm] = useState({
    nom: navPatient?.nom || navPatient?.name || "",
    service: navPatient?.service || "",
    diagnostic: "",
    ordonnance: "",
    arretTravail: "0",
  });

  const [showQuickMeds, setShowQuickMeds] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const nomRef = useRef<HTMLInputElement>(null);
  const serviceRef = useRef<HTMLSelectElement>(null);
  const diagnosticRef = useRef<HTMLTextAreaElement>(null);
  const ordonnanceRef = useRef<HTMLTextAreaElement>(null);
  const arretRef = useRef<HTMLInputElement>(null);

  // RÉCUPÉRATION ET SYNCHRONISATION DES CONSTANTES
  useEffect(() => {
    const fetchPatientData = async () => {
      try {
        let foundPatientId = patientInfo.id;

        // 1. Si l'ID est générique ou absent, recherche du patient par son nom
        if (
          (!foundPatientId || foundPatientId === "P-0000") &&
          form.nom.trim()
        ) {
          const searchRes = await fetch(
            `${API_BASE_URL}/patients?nomComplet=${encodeURIComponent(form.nom.trim())}`,
          );
          if (searchRes.ok) {
            const matches = await searchRes.json();
            if (matches.length > 0) {
              foundPatientId = matches[0].id;
              setPatientInfo((prev) => ({ ...prev, id: matches[0].id }));
              setForm((prev) => ({
                ...prev,
                service: matches[0].service || prev.service,
              }));
            }
          }
        }

        // 2. Récupération des constantes depuis actes_infirmiers
        if (foundPatientId && foundPatientId !== "P-0000") {
          const response = await fetch(
            `${API_BASE_URL}/actes_infirmiers?patientId=${foundPatientId}`,
          );
          if (response.ok) {
            const data = await response.json();

            // FILTRE STRICT : On cherche uniquement un acte en attente
            const pendingEntry = data
              .reverse()
              .find((e: any) => e.status === "En attente médecin");

            if (pendingEntry) {
              // Il y a de nouvelles constantes non clôturées, on les charge
              setPatientInfo((prev) => ({
                ...prev,
                temperature: pendingEntry.temperature || "-",
                tension: pendingEntry.tension || "-",
                poids: pendingEntry.poids || "-",
                pouls: pendingEntry.pouls || "-",
              }));

              setForm((prev) => ({
                ...prev,
                diagnostic:
                  pendingEntry.pathology && pendingEntry.pathology !== "-"
                    ? pendingEntry.pathology
                    : prev.diagnostic,
              }));
            } else {
              // Aucun acte en attente (soit une consultation directe, soit des actes anciens terminés)
              // On force la remise à zéro des constantes pour éviter les résidus du passé
              setPatientInfo((prev) => ({
                ...prev,
                temperature: "-",
                tension: "-",
                poids: "-",
                pouls: "-",
              }));
            }
          }
        }
      } catch (error) {
        console.error("Erreur chargement données consultation:", error);
      }
    };

    fetchPatientData();
  }, [patientInfo.id, form.nom]);

  // DICTÉE VOCALE
  const [isListening, setIsListening] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

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
        let finalTranscript = "";
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }

        if (finalTranscript && isListening) {
          setForm((prev) => ({
            ...prev,
            [isListening]:
              prev[isListening as keyof typeof form] +
              " " +
              finalTranscript.trim(),
          }));
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error("Erreur reconnaissance vocale:", event.error);
        setIsListening(null);
      };
    }

    return () => {
      if (recognitionRef.current) recognitionRef.current.stop();
    };
  }, [isListening]);

  const toggleListening = (fieldName: string) => {
    if (isListening === fieldName) {
      recognitionRef.current?.stop();
      setIsListening(null);
    } else {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        setIsListening(fieldName);
        recognitionRef.current.start();
      } else {
        alert("La dictée vocale n'est pas supportée par ce navigateur.");
      }
    }
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLTextAreaElement | HTMLInputElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleKeyDown = (
    e: React.KeyboardEvent,
    nextRef: { current: { focus: () => void } | null },
  ) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      nextRef.current?.focus();
    }
  };

  const handleQuickAddMed = (med: string) => {
    setForm((prev) => {
      const currentText = prev.ordonnance.trim();
      const prefix = currentText ? "\n- " : "- ";
      return { ...prev, ordonnance: currentText + prefix + med + " : " };
    });
  };

  const handleIncrementAT = () => {
    setForm((prev) => ({
      ...prev,
      arretTravail: String(Number(prev.arretTravail) + 1),
    }));
  };

  const handleDecrementAT = () => {
    setForm((prev) => ({
      ...prev,
      arretTravail: String(Math.max(0, Number(prev.arretTravail) - 1)),
    }));
  };

  // CLÔTURE ET SAUVEGARDE DE LA CONSULTATION
  const handleSave = async () => {
    const trimmedNom = form.nom.trim();
    if (!trimmedNom) {
      alert("Le nom du patient est obligatoire.");
      nomRef.current?.focus();
      return;
    }

    setIsSaving(true);

    try {
      let finalPatientId = patientInfo.id;

      // 1. Réconciliation de l'ID réel du patient
      if (!finalPatientId || finalPatientId === "P-0000") {
        const searchRes = await fetch(
          `${API_BASE_URL}/patients?nomComplet=${encodeURIComponent(trimmedNom)}`,
        );
        if (searchRes.ok) {
          const matches = await searchRes.json();
          if (matches.length > 0) {
            finalPatientId = matches[0].id;
          } else {
            // Création si inexistant
            const newPId = `P-${Date.now()}`;
            const createPRes = await fetch(`${API_BASE_URL}/patients`, {
              method: "POST",
              headers: auditHeaders,
              body: JSON.stringify({
                id: newPId,
                nomComplet: trimmedNom,
                sexe: "-",
                age: "-",
                service: form.service || "Non renseigné",
                createdAt: new Date().toISOString(),
              }),
            });
            const createdData = await createPRes.json();
            finalPatientId = createdData.id || newPId;
          }
        }
      }

      const motif = form.diagnostic.trim() || "Consultation générale";

      // 2. Enregistrement de l'acte médical avec l'ID normalisé
      const acteMedical = {
        id: Date.now().toString(),
        patientId: finalPatientId,
        date: new Date().toLocaleDateString("fr-FR", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        }),
        timestamp: Date.now(),
        plaintes: motif,
        examen: "Examen clinique réalisé",
        diagnostic: form.diagnostic.trim(),
        ordonnance: form.ordonnance.trim(),
        arret: form.arretTravail,
        constantesSnapshot: {
          ...patientInfo,
          id: finalPatientId,
        },
      };

      await fetch(`${API_BASE_URL}/actes_medicaux`, {
        method: "POST",
        headers: auditHeaders,
        body: JSON.stringify(acteMedical),
      });

      // 3. Mise à jour ou suppression dans la file d'attente
      const queueRes = await fetch(`${API_BASE_URL}/queue`);
      if (queueRes.ok) {
        const queueList: any[] = await queueRes.json();
        const queueItem = queueList.find(
          (q) =>
            q.patientId === finalPatientId ||
            q.nom?.toLowerCase() === trimmedNom.toLowerCase(),
        );

        if (queueItem) {
          await fetch(`${API_BASE_URL}/queue/${queueItem.id}`, {
            method: "PATCH",
            headers: auditHeaders,
            body: JSON.stringify({
              statut: "Terminé",
              motif,
              nom: trimmedNom,
            }),
          });
        }
      }

      // 4. Clôture de l'acte infirmier correspondant
      const nurseRes = await fetch(
        `${API_BASE_URL}/actes_infirmiers?patientId=${finalPatientId}`,
      );
      if (nurseRes.ok) {
        const nurseEntries = await nurseRes.json();
        const pendingEntry = nurseEntries
          .reverse()
          .find((e: any) => e.status === "En attente médecin");

        if (pendingEntry) {
          await fetch(`${API_BASE_URL}/actes_infirmiers/${pendingEntry.id}`, {
            method: "PATCH",
            headers: auditHeaders,
            body: JSON.stringify({ status: "Terminé" }),
          });
        }
      }

      alert("Dossier médical clôturé avec succès !");
      navigate("/consultations");
    } catch (error) {
      console.error("Erreur sauvegarde consultation:", error);
      alert("Erreur lors de la sauvegarde.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto transition-colors duration-200 dark:bg-slate-950 min-h-screen font-sans">
      {/* EN-TÊTE */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
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
              <Stethoscope className="w-6 h-6 text-[#c2a712]" />
              {locationStateTitle}
            </h1>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">
              ID Patient :{" "}
              <span className="font-mono text-[#9d8c0a] dark:text-[#fde047] font-bold">
                {patientInfo.id}
              </span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-2.5 text-sm font-bold text-white bg-[#c2a712] rounded-lg hover:bg-[#a98f0b] shadow-lg shadow-[#c2a712]/30 transition w-full md:w-auto justify-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              "Sauvegarde..."
            ) : (
              <>
                <Save className="w-4 h-4" /> Clôturer le dossier
              </>
            )}
          </button>
        </div>
      </div>

      {/* CORPS DU DOSSIER */}
      <div className="space-y-6" id="contenu-medical">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
          <h2 className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            Identité & Constantes (Par Infirmière)
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <User className="w-4 h-4 text-[#c2a712]" /> Nom complet
              </label>
              <input
                ref={nomRef}
                type="text"
                name="nom"
                value={form.nom}
                onChange={handleChange}
                onKeyDown={(e) =>
                  handleKeyDown(e, { current: serviceRef.current })
                }
                placeholder="Ex: Jean Dupont"
                className="w-full p-3 rounded-xl border bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 outline-none transition-all border-slate-200 dark:border-slate-800 focus:border-[#c2a712] focus:ring-1 focus:ring-[#c2a712] font-bold"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#c2a712]" /> Service
                d'affectation
              </label>
              <select
                ref={serviceRef}
                name="service"
                value={form.service}
                onChange={handleChange}
                onKeyDown={(e) => handleKeyDown(e, diagnosticRef)}
                className="w-full p-3 rounded-xl border bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 outline-none transition-all border-slate-200 dark:border-slate-800 focus:border-[#c2a712] focus:ring-1 focus:ring-[#c2a712] appearance-none truncate"
              >
                <option value="">Sélectionnez un service...</option>
                {SERVICES_BEAC.map((srv, idx) => (
                  <option key={idx} value={srv}>
                    {srv}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full border-t border-slate-100 dark:border-slate-800 pt-6">
            <div className="bg-[#fefce8] dark:bg-slate-800/80 p-4 rounded-xl border border-[#fef08a] dark:border-slate-700 shadow-sm">
              <span className="text-[10px] uppercase font-bold text-[#9d8c0a] dark:text-slate-400 block mb-1">
                Température
              </span>
              <span className="font-black text-lg text-slate-900 dark:text-white">
                {patientInfo.temperature}{" "}
                {patientInfo.temperature !== "-" ? "°C" : ""}
              </span>
            </div>
            <div className="bg-[#fefce8] dark:bg-slate-800/80 p-4 rounded-xl border border-[#fef08a] dark:border-slate-700 shadow-sm">
              <span className="text-[10px] uppercase font-bold text-[#9d8c0a] dark:text-slate-400 block mb-1">
                Tension
              </span>
              <span className="font-black text-lg text-slate-900 dark:text-white">
                {patientInfo.tension}
              </span>
            </div>
            <div className="bg-[#fefce8] dark:bg-slate-800/80 p-4 rounded-xl border border-[#fef08a] dark:border-slate-700 shadow-sm">
              <span className="text-[10px] uppercase font-bold text-[#9d8c0a] dark:text-slate-400 block mb-1">
                Poids
              </span>
              <span className="font-black text-lg text-slate-900 dark:text-white">
                {patientInfo.poids} {patientInfo.poids !== "-" ? "kg" : ""}
              </span>
            </div>
            <div className="bg-[#fefce8] dark:bg-slate-800/80 p-4 rounded-xl border border-[#fef08a] dark:border-slate-700 shadow-sm">
              <span className="text-[10px] uppercase font-bold text-[#9d8c0a] dark:text-slate-400 block mb-1">
                Pouls
              </span>
              <span className="font-black text-lg text-slate-900 dark:text-white">
                {patientInfo.pouls} {patientInfo.pouls !== "-" ? "bpm" : ""}
              </span>
            </div>
          </div>
        </div>

        {/* DIAGNOSTIC */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <label className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#c2a712]" /> Diagnostic Retenu
            </label>
            <button
              type="button"
              onClick={() => toggleListening("diagnostic")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                isListening === "diagnostic"
                  ? "bg-rose-100 text-rose-600 border border-rose-200 animate-pulse"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
              }`}
            >
              {isListening === "diagnostic" ? (
                <Mic className="w-3.5 h-3.5" />
              ) : (
                <MicOff className="w-3.5 h-3.5" />
              )}
              {isListening === "diagnostic" ? "Écoute..." : "Dicter"}
            </button>
          </div>
          <textarea
            ref={diagnosticRef}
            name="diagnostic"
            value={form.diagnostic}
            onChange={handleChange}
            onKeyDown={(e) => handleKeyDown(e, ordonnanceRef)}
            rows={3}
            placeholder="Ex: Paludisme, Angine... (Cliquez sur 'Dicter' pour parler)"
            className={`w-full p-4 rounded-xl border bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 outline-none transition-all ${
              isListening === "diagnostic"
                ? "border-rose-400 ring-2 ring-rose-100 dark:ring-rose-900/30"
                : "border-slate-200 dark:border-slate-700 focus:border-[#c2a712] focus:ring-2 focus:ring-[#c2a712]/20"
            }`}
          />
        </div>

        {/* ORDONNANCE */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex justify-between items-center mb-1">
            <label className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide flex items-center gap-2">
              <Pill className="w-4 h-4 text-[#c2a712]" /> Ordonnance Médicale
            </label>
            <button
              type="button"
              onClick={() => toggleListening("ordonnance")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                isListening === "ordonnance"
                  ? "bg-rose-100 text-rose-600 border border-rose-200 animate-pulse"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
              }`}
            >
              {isListening === "ordonnance" ? (
                <Mic className="w-3.5 h-3.5" />
              ) : (
                <MicOff className="w-3.5 h-3.5" />
              )}
              {isListening === "ordonnance" ? "Écoute..." : "Dicter"}
            </button>
          </div>

          {showQuickMeds && (
            <div className="flex flex-wrap gap-2 mb-3 animate-in fade-in slide-in-from-top-2 duration-200">
              {QUICK_MEDS.map((med, idx) => (
                <button
                  key={idx}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleQuickAddMed(med)}
                  className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border border-[#fef08a] bg-[#fefce8] text-[#9d8c0a] hover:bg-[#c2a712] hover:text-white dark:border-slate-700 dark:bg-slate-800 dark:text-[#fde047] dark:hover:bg-[#c2a712] dark:hover:text-white transition-colors shadow-sm"
                >
                  <PlusCircle className="w-3 h-3" />
                  {med}
                </button>
              ))}
            </div>
          )}

          <textarea
            ref={ordonnanceRef}
            name="ordonnance"
            value={form.ordonnance}
            onChange={handleChange}
            onFocus={() => setShowQuickMeds(true)}
            onBlur={() => setShowQuickMeds(false)}
            onKeyDown={(e) => handleKeyDown(e, arretRef)}
            rows={5}
            placeholder="Cliquez ici pour afficher les suggestions ou tapez librement la posologie..."
            className={`w-full p-4 rounded-xl border bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 outline-none transition-all ${
              isListening === "ordonnance"
                ? "border-rose-400 ring-2 ring-rose-100 dark:ring-rose-900/30"
                : "border-slate-200 dark:border-slate-700 focus:border-[#c2a712] focus:ring-2 focus:ring-[#c2a712]/20"
            }`}
          />

          {/* ARRÊT DE TRAVAIL */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
            <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
              Jours de repos prescrits (AT) :
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleDecrementAT}
                className="w-10 h-10 flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors shadow-sm"
              >
                <Minus className="w-4 h-4" />
              </button>

              <input
                ref={arretRef}
                type="number"
                name="arretTravail"
                value={form.arretTravail}
                onChange={handleChange}
                min="0"
                className="w-16 h-10 text-center font-black text-lg text-[#9d8c0a] dark:text-[#fde047] bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-[#c2a712]/20 focus:border-[#c2a712] outline-none transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />

              <button
                type="button"
                onClick={handleIncrementAT}
                className="w-10 h-10 flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors shadow-sm"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            {Number(form.arretTravail) > 0 && (
              <span className="text-xs font-semibold text-amber-600 dark:text-amber-500 bg-amber-50 dark:bg-amber-900/20 px-3 py-1.5 rounded-full animate-in fade-in">
                Arrêt maladie généré
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
