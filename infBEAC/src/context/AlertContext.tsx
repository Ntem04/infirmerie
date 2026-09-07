//Notifications globales (Stock bas, Périmé)
import { createContext, useContext, useState, useCallback } from "react";

import type { ReactNode } from "react";

export type AlertType = "success" | "error" | "warning" | "info";

export interface Alert {
  id: string;
  type: AlertType;
  message: string;
}

interface AlertContextType {
  alerts: Alert[];
  addAlert: (message: string, type: AlertType) => void;
  removeAlert: (id: string) => void;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export function AlertProvider({ children }: { children: ReactNode }) {
  const [alerts, setAlerts] = useState<Alert[]>([]);

  const removeAlert = useCallback((id: string) => {
    setAlerts((prev) => prev.filter((alert) => alert.id !== id));
  }, []);

  const addAlert = useCallback(
    (message: string, type: AlertType) => {
      const id = Math.random().toString(36).substring(2, 9);
      setAlerts((prev) => [...prev, { id, type, message }]);

      // Disparition automatique après 5 secondes pour une meilleure ergonomie
      setTimeout(() => {
        removeAlert(id);
      }, 5000);
    },
    [removeAlert],
  );

  return (
    <AlertContext.Provider value={{ alerts, addAlert, removeAlert }}>
      {children}

      {/* Rendu des alertes flottantes (Toasts) */}
      <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
        {alerts.map((alert) => (
          <div
            key={alert.id}
            className={`px-4 py-3 rounded-xl shadow-lg font-medium text-sm flex items-center justify-between min-w-[250px] pointer-events-auto transition-all transform duration-300 ${
              alert.type === "error"
                ? "bg-red-500 text-white"
                : alert.type === "warning"
                  ? "bg-orange-500 text-white"
                  : alert.type === "success"
                    ? "bg-[#0D9488] text-white"
                    : "bg-[#0F172A] text-white"
            }`}
          >
            <span>{alert.message}</span>
            <button
              onClick={() => removeAlert(alert.id)}
              className="ml-4 opacity-70 hover:opacity-100 transition-opacity font-bold text-lg leading-none"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </AlertContext.Provider>
  );
}

// Hook personnalisé pour déclencher des alertes depuis n'importe quel composant
export const useAlert = () => {
  const context = useContext(AlertContext);
  if (context === undefined) {
    throw new Error(
      "useAlert doit être utilisé à l'intérieur d'un AlertProvider",
    );
  }
  return context;
};
