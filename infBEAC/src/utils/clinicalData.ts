// src/utils/clinicalData.ts

export interface Patient {
  id: string;
  matricule: string;
  nom: string;
  service: string;
}

export interface Consultation {
  id: string;
  patientId: string;
  motif: string;
  dateConsultation: string;
  heure: string;
  statut: "En attente médecin" | "Constantes à prendre" | "Terminé";
}

// Seulement 3 patients dans notre base de données provisoire
export const MOCK_PATIENTS: Patient[] = [
  {
    id: "P1",
    matricule: "MAT-8472",
    nom: "Jean Dupont",
    service: "Ressources Humaines",
  },
  { id: "P2", matricule: "MAT-9182", nom: "Marie Claire", service: "SSI" },
  {
    id: "P3",
    matricule: "MAT-3321",
    nom: "Paul Atangana",
    service: "Comptabilité",
  },
];

const dateDuJour = new Date().toISOString().split("T")[0];

export const MOCK_CONSULTATIONS: Consultation[] = [
  {
    id: "C1",
    patientId: "P1",
    motif: "Maux de tête",
    dateConsultation: dateDuJour,
    heure: "08:15",
    statut: "En attente médecin",
  },
  {
    id: "C2",
    patientId: "P2",
    motif: "Visite médicale annuelle",
    dateConsultation: dateDuJour,
    heure: "08:45",
    statut: "Constantes à prendre",
  },
  {
    id: "C3",
    patientId: "P3",
    motif: "Renouvellement ordonnance",
    dateConsultation: dateDuJour,
    heure: "09:10",
    statut: "Terminé",
  },
];
