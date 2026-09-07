// src/utils/mockData.ts

export interface StockEntry {
  id: string;
  nomMedicament: string;
  dateArrivee: string;
  datePeremption: string;
  quantite: number;
}

export interface HistoryLog {
  id: string;
  date: string;
  action: "ENTRÉE" | "DÉLIVRANCE";
  medicament: string;
  quantiteMouvement: number;
  utilisateur: string;
}

// Le catalogue prédéfini pour l'autocomplétion (datalist)
export const CATALOGUE_MEDICAMENTS = [
  "Paracétamol 500mg - Comprimé",
  "Paracétamol 1000mg - Comprimé",
  "Amoxicilline 1g - Gélule",
  "Quinine Injectable",
  "Ibuprofène 400mg - Comprimé",
  "Sirop Toux Sèche",
  "Spasfon - Comprimé",
  "Diclofénac 50mg - Comprimé",
];

// Données initiales pour simuler la base de données
export const MOCK_STOCK_ENTRIES: StockEntry[] = [
  {
    id: "E1",
    nomMedicament: "Paracétamol 500mg - Comprimé",
    dateArrivee: "2026-01-15",
    datePeremption: "2026-12-01",
    quantite: 50,
  },
  {
    id: "E2",
    nomMedicament: "Paracétamol 500mg - Comprimé",
    dateArrivee: "2026-08-01",
    datePeremption: "2027-09-15",
    quantite: 800,
  },
  {
    id: "E3",
    nomMedicament: "Amoxicilline 1g - Gélule",
    dateArrivee: "2025-11-10",
    datePeremption: "2026-10-31",
    quantite: 15,
  },
  {
    id: "E4",
    nomMedicament: "Spasfon - Comprimé",
    dateArrivee: "2026-05-20",
    datePeremption: "2026-08-30",
    quantite: 30,
  }, // Péremption très proche
];

export const MOCK_HISTORY_LOGS: HistoryLog[] = [
  {
    id: "h1",
    date: "15/08/2026 08:30",
    action: "DÉLIVRANCE",
    medicament: "Paracétamol 500mg - Comprimé",
    quantiteMouvement: -2,
    utilisateur: "Sophie Martin",
  },
  {
    id: "h2",
    date: "14/08/2026 14:15",
    action: "ENTRÉE",
    medicament: "Amoxicilline 1g - Gélule",
    quantiteMouvement: 15,
    utilisateur: "Sophie Martin",
  },
];
