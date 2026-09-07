import React, { useState, useMemo, useEffect, useRef } from "react";
import { CATALOGUE_MEDICAMENTS } from "../../utils/mockData";
import MicroInput from "../../components/ui/MicroInput";
import { useAppData } from "../../context/AppDataContext";
import { useAuth } from "../../context/AuthContext";

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

// Types
type StockEntry = {
  id: string;
  nomMedicament: string;
  dateArrivee: string;
  datePeremption: string;
  quantite: number;
};

export const Inventory: React.FC = () => {
  const { addHistory } = useAppData();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"stocks" | "ajout">("stocks");
  const [expandedRows, setExpandedRows] = useState<string[]>([]);

  // VRAI STOCK VENANT DE LA BASE DE DONNÉES
  const [dbStocks, setDbStocks] = useState<StockEntry[]>([]);

  const [formData, setFormData] = useState({
    nomMedicament: "",
    dateArrivee: new Date().toISOString().split("T")[0],
    datePeremption: "",
    quantite: 0,
  });

  // ==========================================
  // RÉCUPÉRATION DEPUIS LE SERVEUR
  // ==========================================
  const fetchStocks = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/pharmacie`);
      if (res.ok) {
        const data = await res.json();
        setDbStocks(data);
      }
    } catch (error) {
      console.error("Erreur serveur pharmacie:", error);
    }
  };

  useEffect(() => {
    fetchStocks();
  }, []);

  // ==========================================
  // LOGIQUE MÉTIER : Consolidation & FEFO
  // ==========================================
  const consolidatedStocks = useMemo(() => {
    const grouped = new Map<
      string,
      {
        nom: string;
        quantiteTotale: number;
        prochainePeremption: string;
        details: { datePeremption: string; quantite: number }[];
      }
    >();

    // On utilise dbStocks au lieu du mock stockEntries
    dbStocks.forEach((entry) => {
      if (!grouped.has(entry.nomMedicament)) {
        grouped.set(entry.nomMedicament, {
          nom: entry.nomMedicament,
          quantiteTotale: entry.quantite,
          prochainePeremption: entry.datePeremption,
          details: [
            { datePeremption: entry.datePeremption, quantite: entry.quantite },
          ],
        });
      } else {
        const current = grouped.get(entry.nomMedicament)!;
        current.quantiteTotale += entry.quantite;

        if (
          new Date(entry.datePeremption) < new Date(current.prochainePeremption)
        ) {
          current.prochainePeremption = entry.datePeremption;
        }

        const existingDetail = current.details.find(
          (d) => d.datePeremption === entry.datePeremption,
        );
        if (existingDetail) {
          existingDetail.quantite += entry.quantite;
        } else {
          current.details.push({
            datePeremption: entry.datePeremption,
            quantite: entry.quantite,
          });
        }
      }
    });

    return Array.from(grouped.values()).map((med) => ({
      ...med,
      details: med.details.sort(
        (a, b) =>
          new Date(a.datePeremption).getTime() -
          new Date(b.datePeremption).getTime(),
      ),
    }));
  }, [dbStocks]);

  const stockAlerts = useMemo(
    () =>
      dbStocks.filter(
        (entry) =>
          entry.quantite <= 0 ||
          (entry.datePeremption &&
            new Date(entry.datePeremption).getTime() <= Date.now()),
      ),
    [dbStocks],
  );

  const toggleRow = (nomMedicament: string) => {
    setExpandedRows((prev) =>
      prev.includes(nomMedicament)
        ? prev.filter((name) => name !== nomMedicament)
        : [...prev, nomMedicament],
    );
  };

  const getStatusBadge = (quantite: number, peremption: string) => {
    if (quantite === 0)
      return (
        <span className="text-red-600 dark:text-rose-500 font-bold">
          Rupture
        </span>
      );
    const daysToExpiry =
      (new Date(peremption).getTime() - new Date().getTime()) /
      (1000 * 3600 * 24);
    if (daysToExpiry < 90)
      return (
        <span className="text-orange-600 dark:text-amber-500 font-bold">
          Péremption Proche
        </span>
      );
    if (quantite <= 50)
      return (
        <span className="text-yellow-600 dark:text-yellow-500 font-bold">
          Stock Faible
        </span>
      );
    return (
      <span className="text-emerald-700 dark:text-emerald-400 font-semibold">
        Normal
      </span>
    );
  };

  // ==========================================
  // ENREGISTREMENT SUR LE SERVEUR
  // ==========================================
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newEntry: StockEntry = {
      id: `E-${Date.now()}`,
      nomMedicament: formData.nomMedicament,
      dateArrivee: formData.dateArrivee,
      datePeremption: formData.datePeremption,
      quantite: Number(formData.quantite),
    };

    try {
      // 1. Sauvegarde dans la base de données (db.json -> pharmacie)
      const res = await fetch(`${API_BASE_URL}/pharmacie`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newEntry),
      });

      if (!res.ok) throw new Error("Échec serveur");

      // 2. Mise à jour de l'affichage local immédiatement
      setDbStocks((prev) => [...prev, newEntry]);

      // (Optionnel) Ajout dans l'historique global
      addHistory({
        id: `H-${Date.now()}`,
        date: new Date().toLocaleString(),
        action: "ENTRÉE",
        medicament: formData.nomMedicament,
        quantiteMouvement: Number(formData.quantite),
        utilisateur:
          user?.fullName ||
          [user?.prenom, user?.nom].filter(Boolean).join(" ") ||
          user?.username ||
          "Infirmière",
      });

      // 3. Réinitialisation
      setFormData({
        nomMedicament: "",
        dateArrivee: new Date().toISOString().split("T")[0],
        datePeremption: "",
        quantite: 0,
      });
      setActiveTab("stocks");
      alert("Médicament ajouté au stock avec succès !");
    } catch (error) {
      console.error(error);
      alert(
        "Erreur lors de l'enregistrement. Le serveur json-server est-il allumé ?",
      );
    }
  };

  // ==========================================
  // RENDU UI
  // ==========================================
  return (
    <div className="p-4 md:p-8 font-sans text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-950 min-h-full transition-colors duration-200">
      <FadeInBlock delay={0}>
        <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-200 dark:border-slate-800 pb-4 gap-4">
          <h1 className="text-2xl font-bold text-emerald-800 dark:text-emerald-500">
            Gestion de la Pharmacie
          </h1>
        </div>
      </FadeInBlock>

      {stockAlerts.length > 0 && (
        <FadeInBlock delay={50}>
          <div className="mb-6 rounded-xl border border-rose-300 bg-rose-50 p-4 text-rose-800 shadow-sm dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300">
            <p className="font-black">Alerte stock</p>
            <ul className="mt-2 list-inside list-disc text-sm font-semibold">
              {stockAlerts.map((entry) => (
                <li key={entry.id}>
                  {entry.nomMedicament} :{" "}
                  {entry.quantite <= 0
                    ? "stock épuisé"
                    : `lot périmé le ${new Date(entry.datePeremption).toLocaleDateString("fr-FR")}`}
                </li>
              ))}
            </ul>
          </div>
        </FadeInBlock>
      )}

      {/* Onglets */}
      <FadeInBlock delay={50}>
        <div className="flex space-x-2 mb-6 border-b border-slate-200 dark:border-slate-800">
          <button
            onClick={() => setActiveTab("stocks")}
            className={`px-6 py-2.5 font-medium rounded-t-md transition-colors ${
              activeTab === "stocks"
                ? "bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 border-t-2 border-emerald-500 shadow-sm"
                : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-900/50"
            }`}
          >
            État des Stocks
          </button>
          <button
            onClick={() => setActiveTab("ajout")}
            className={`px-6 py-2.5 font-medium rounded-t-md transition-colors ${
              activeTab === "ajout"
                ? "bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 border-t-2 border-emerald-500 shadow-sm"
                : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-900/50"
            }`}
          >
            + Ajouter un Médicament
          </button>
        </div>
      </FadeInBlock>

      {/* ---------------- VUE 1 : STOCKS & HISTORIQUE ---------------- */}
      {activeTab === "stocks" && (
        <FadeInBlock delay={100}>
          <div className="space-y-8">
            <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm transition-colors duration-200">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                      <th className="p-4 font-semibold">Nom du Médicament</th>
                      <th className="p-4 font-semibold text-center">
                        Quantité Totale
                      </th>
                      <th className="p-4 font-semibold">
                        Prochaine Péremption
                      </th>
                      <th className="p-4 font-semibold">Statut</th>
                      <th className="p-4 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                    {consolidatedStocks.length === 0 && (
                      <tr>
                        <td
                          colSpan={5}
                          className="p-8 text-center text-slate-500"
                        >
                          Aucun médicament en stock dans la base de données.
                        </td>
                      </tr>
                    )}
                    {consolidatedStocks.map((med, idx) => {
                      const isExpanded = expandedRows.includes(med.nom);
                      return (
                        <React.Fragment key={idx}>
                          <tr
                            className={`hover:bg-slate-50 dark:hover:bg-slate-800/30 cursor-pointer transition-colors ${isExpanded ? "bg-slate-50 dark:bg-slate-800/30" : ""} animate-in fade-in slide-in-from-bottom-2 duration-300 fill-mode-both`}
                            style={{ animationDelay: `${idx * 30}ms` }}
                            onClick={() => toggleRow(med.nom)}
                          >
                            <td className="p-4 font-medium text-slate-900 dark:text-slate-100">
                              {med.nom}
                            </td>
                            <td className="p-4 font-bold text-base text-center text-emerald-700 dark:text-emerald-400">
                              {med.quantiteTotale}
                            </td>
                            <td className="p-4 text-slate-600 dark:text-slate-400">
                              {new Date(
                                med.prochainePeremption,
                              ).toLocaleDateString()}
                            </td>
                            <td className="p-4">
                              {getStatusBadge(
                                med.quantiteTotale,
                                med.prochainePeremption,
                              )}
                            </td>
                            <td className="p-4 text-right text-emerald-600 dark:text-emerald-500 font-medium text-xs uppercase tracking-wider">
                              {isExpanded ? "Fermer ▲" : "Détails ▼"}
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr className="bg-slate-50 dark:bg-slate-950/50 animate-in fade-in duration-300">
                              <td colSpan={5} className="p-0">
                                <div className="p-4 pl-8 md:pl-12 border-l-4 border-emerald-500">
                                  <table className="w-full md:w-2/3 text-sm text-left">
                                    <thead>
                                      <tr className="text-slate-500 dark:text-slate-400">
                                        <th className="py-2 px-4 font-medium">
                                          Date de Péremption
                                        </th>
                                        <th className="py-2 px-4 font-medium text-right">
                                          Quantité Restante
                                        </th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                      {med.details.map((detail, dIdx) => (
                                        <tr key={dIdx}>
                                          <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                                            {new Date(
                                              detail.datePeremption,
                                            ).toLocaleDateString()}
                                          </td>
                                          <td className="py-3 px-4 text-right font-semibold text-slate-700 dark:text-slate-300">
                                            {detail.quantite}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </FadeInBlock>
      )}

      {/* ---------------- VUE 2 : FORMULAIRE D'AJOUT ---------------- */}
      {activeTab === "ajout" && (
        <FadeInBlock delay={100}>
          <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm p-6 max-w-2xl mx-auto transition-colors duration-200">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Nom du Médicament
                </label>
                <MicroInput
                  placeholder="Ex: Taper pour chercher..."
                  required
                  list="medicaments-catalogue"
                  value={formData.nomMedicament}
                  onChange={(e) =>
                    setFormData({ ...formData, nomMedicament: e.target.value })
                  }
                  className="w-full"
                />
                <datalist id="medicaments-catalogue">
                  {CATALOGUE_MEDICAMENTS.map((med, index) => (
                    <option key={index} value={med} />
                  ))}
                </datalist>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Date de Réception
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.dateArrivee}
                    onChange={(e) =>
                      setFormData({ ...formData, dateArrivee: e.target.value })
                    }
                    className="w-full p-3 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-colors [color-scheme:light] dark:[color-scheme:dark]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Date de Péremption
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.datePeremption}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        datePeremption: e.target.value,
                      })
                    }
                    className="w-full p-3 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-colors [color-scheme:light] dark:[color-scheme:dark]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Quantité (Entrée en stock)
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={formData.quantite || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      quantite: Number(e.target.value),
                    })
                  }
                  className="w-full p-3 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-colors"
                  placeholder="Ex: 50"
                />
              </div>
              <div className="pt-6 border-t border-slate-200 dark:border-slate-800 flex justify-end">
                <button
                  type="submit"
                  className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-3 px-8 rounded-md transition-colors shadow-sm"
                >
                  Enregistrer l'Entrée
                </button>
              </div>
            </form>
          </div>
        </FadeInBlock>
      )}
    </div>
  );
};

export default Inventory;
