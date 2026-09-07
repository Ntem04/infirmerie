//Structure des exports Excel/PDF
// src/types/user.types.ts
import { z } from "zod";

// Remplacement de l'enum natif par z.enum pour respecter erasableSyntaxOnly
export const UserRoleSchema = z.enum(["INFIRMIERE", "MEDECIN", "ADMIN_IT"]);

// Inférence du type à partir du schéma Zod
export type UserRole = z.infer<typeof UserRoleSchema>;

export const UserSchema = z.object({
  id: z.string().uuid(),
  matricule: z.string().min(3).max(20),
  nom: z.string(),
  prenom: z.string(),
  email: z.string().email().optional(),
  role: UserRoleSchema,
  isActif: z.boolean(),
});

export type User = z.infer<typeof UserSchema>;

export interface AuthResponse {
  user: User;
  message: string;
}
