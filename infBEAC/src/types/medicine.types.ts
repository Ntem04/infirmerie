//DCI, lots, péremption, seuils alertes
// src/types/medicine.types.ts
import { z } from "zod";

// Schéma de validation strict pour prévenir les injections et erreurs de saisie
export const MedicineSchema = z.object({
  id: z.string().uuid("L'ID doit être un UUID valide."),
  codeBarre: z
    .string()
    .min(5)
    .max(50)
    .regex(
      /^[a-zA-Z0-9-]+$/,
      "Caractères invalides détectés dans le code-barres",
    ),
  nomCommercial: z.string().min(2, "Le nom est trop court").max(100),
  forme: z.enum(["COMPRIME", "SIROP", "INJECTABLE", "POMMADE", "GELULES"]),
  dosage: z.string().max(50),
  quantiteEnStock: z
    .number()
    .int()
    .nonnegative("La quantité ne peut pas être négative"),
  seuilAlerte: z.number().int().positive("Le seuil d'alerte doit être positif"),
  datePeremption: z.date().refine((date) => date > new Date(), {
    message: "La date de péremption doit être dans le futur",
  }),
});

// Inférence du type TypeScript à partir du schéma Zod
export type Medicine = z.infer<typeof MedicineSchema>;

// Type pour la création d'un nouveau médicament (Omit de l'ID généré par le backend)
export type CreateMedicineDTO = Omit<Medicine, "id">;
