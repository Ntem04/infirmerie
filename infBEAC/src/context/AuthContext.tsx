//Session & Permissions
// src/context/AuthContext.tsx
import { createContext, useContext, useState, useEffect } from "react";
import type { ReactNode } from "react";

export type Role = "INFIRMIERE" | "MEDECIN" | "ADMIN";

export const roleHomeMap: Record<Role, string> = {
  INFIRMIERE: "/soins",
  MEDECIN: "/dashboard",
  ADMIN: "/logs",
};

export const normalizeRole = (value?: string | null): Role | null => {
  if (!value) return null;

  const normalized = value.trim().toUpperCase();

  if (["ADMIN", "ADMIN_IT", "SUPER_ADMIN"].includes(normalized)) {
    return "ADMIN";
  }

  if (["INFIRMIERE", "NURSE", "INFIRMIER", "INFERMIERE"].includes(normalized)) {
    return "INFIRMIERE";
  }

  if (["MEDECIN", "DOCTOR", "MEDICAL", "MÉDECIN"].includes(normalized)) {
    return "MEDECIN";
  }

  return null;
};

export interface User {
  id: string | number;
  username?: string;
  matricule?: string;
  nom?: string;
  prenom?: string;
  role: Role;
  fullName?: string;
}

// 1. LE CONTRAT (L'Interface)
interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  login: (userData: User) => void;
  logout: () => void;
  logEvent: (
    action: string,
    details: string,
    customUser?: User,
  ) => Promise<void>;
}

const STORAGE_KEY = "infbeac-user";
const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [user, setUser] = useState<User | null>(null);

  // ========================================================
  // 2. L'IMPLÉMENTATION (La Fonction)
  // ========================================================
  const logEvent = async (
    action: string,
    details: string,
    customUser?: User,
  ) => {
    const activeUser = customUser || user;
    if (!activeUser) return; // Si personne n'est identifié, on ne log pas

    try {
      await fetch("http://localhost:3001/logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: "L-" + Date.now().toString(),
          timestamp: new Date().toISOString(),
          userId: activeUser.fullName || activeUser.username || "Inconnu",
          userName: activeUser.fullName || activeUser.username || "Inconnu",
          role: activeUser.role,
          action: action,
          details: details,
          ipAdresse: "Client Web (React)",
        }),
      });
    } catch (e) {
      console.warn("Échec de l'envoi du log d'audit :", e);
    }
  };

  useEffect(() => {
    const savedUser = localStorage.getItem(STORAGE_KEY);

    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser) as User;
        const normalizedRole = normalizeRole(parsedUser.role);

        if (!normalizedRole) {
          localStorage.removeItem(STORAGE_KEY);
          return;
        }

        const safeUser: User = { ...parsedUser, role: normalizedRole };
        setUser(safeUser);
        setIsAuthenticated(true);
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }

    setIsLoading(false);
  }, []);

  const login = (userData: User) => {
    const normalizedRole = normalizeRole(userData.role);
    const safeUser: User = {
      ...userData,
      role: normalizedRole ?? "ADMIN",
    };

    setUser(safeUser);
    setIsAuthenticated(true);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(safeUser));

    // NOUVEAU : Enregistrement de la connexion
    logEvent("CONNEXION", "Ouverture de session réussie", safeUser);
  };

  const logout = () => {
    // NOUVEAU : Enregistrement de la déconnexion
    if (user) {
      logEvent(
        "DÉCONNEXION",
        "Fermeture de session et destruction du token",
        user,
      );
    }

    setIsAuthenticated(false);
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <AuthContext.Provider
      // 3. LA DISTRIBUTION (L'ajout au Provider)
      value={{ isAuthenticated, isLoading, user, login, logout, logEvent }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error(
      "useAuth doit être utilisé à l'intérieur d'un AuthProvider",
    );
  }
  return context;
};
