// ==========================================
// TYPES ET INTERFACES
// ==========================================

export interface PatientQueueItem {
  id: string;
  heure: string;
  nom: string;
  service: string;
  motif: string;
  statut: "En attente médecin" | "Constantes à prendre" | "Terminé";
}

export interface DashboardKPI {
  patientsDuJour: number;
  totalPatientsConsulte: number;
  alertesPharmacie: number;
}

export interface DashboardData {
  kpi: DashboardKPI;
  queue: PatientQueueItem[];
}

// ==========================================
// FONCTION DE GÉNÉRATION DES DONNÉES
// ==========================================

export function getDynamicDashboardData(): DashboardData {
  // Ici, dans une vraie application, ces données proviendraient d'une API ou d'une base de données.
  // Pour l'instant, on renvoie des données de simulation (mock) adaptées à ton tableau de bord.

  return {
    kpi: {
      patientsDuJour: 14,
      totalPatientsConsulte: 12450, // Total depuis le début de l'année/utilisation
      alertesPharmacie: 3, // Ce chiffre devrait correspondre aux alertes réelles de ton mock pharmacie
    },
    queue: [
      {
        id: "Q-001",
        heure: "08:15",
        nom: "Marc Zambo",
        service: "SSI",
        motif: "Syndrome Grippal",
        statut: "En attente médecin",
      },
      {
        id: "Q-002",
        heure: "08:45",
        nom: "Alice Ndongo",
        service: "Ressources Humaines",
        motif: "Fatigue Visuelle",
        statut: "Constantes à prendre",
      },
      {
        id: "Q-003",
        heure: "09:10",
        nom: "Paul Essomba",
        service: "Comptabilité",
        motif: "Blessure (Coupure légère)",
        statut: "En attente médecin",
      },
      {
        id: "Q-004",
        heure: "09:30",
        nom: "Sophie Etoundi",
        service: "Service Émission Monétaire",
        motif: "Suivi Tension",
        statut: "Terminé",
      },
      {
        id: "Q-005",
        heure: "10:05",
        nom: "Lucie Mbia",
        service: "Patrimoine",
        motif: "Maux de tête",
        statut: "Constantes à prendre",
      },
    ],
  };
}
