import React from "react";
import { AuthProvider } from "./context/AuthContext";
import { AlertProvider } from "./context/AlertContext";
import { ThemeProvider } from "./context/ThemeContext";
import { AppDataProvider } from "./context/AppDataContext";

interface AppProps {
  children?: React.ReactNode;
}

export default function App({ children }: AppProps) {
  return (
    /* L'AuthProvider gère l'état d'authentification et les rôles de l'infirmerie */
    <AuthProvider>
      {/* L'AlertProvider centralise les pop-ups (Réseau LAN perdu, Stock faible) */}
      <AlertProvider>
        <ThemeProvider>
          <AppDataProvider>
            {/* Conteneur global respectant la charte graphique et la typographie */}
            <div className="app-container min-h-screen bg-slate-50 font-sans text-slate-800 transition-colors duration-200 dark:bg-slate-950 dark:text-slate-200">
              {children}
            </div>
          </AppDataProvider>
        </ThemeProvider>
      </AlertProvider>
    </AuthProvider>
  );
}
