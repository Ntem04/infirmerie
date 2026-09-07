import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { HistoryLog, StockEntry } from "../utils/mockData";

export interface SharedPatient {
  id: string;
  nom: string;
  age: number | string;
  sexe: string;
  service: string;
  telephone: string;
  derniereConsultation: string;
  statut: string;
}

export interface SharedQueueItem {
  id: string;
  nom: string;
  service: string;
  motif: string;
  statut: string;
  heure: string;
}

interface AppDataState {
  patients: SharedPatient[];
  queue: SharedQueueItem[];
  stockEntries: StockEntry[];
  history: HistoryLog[];
}

interface AppDataContextType extends AppDataState {
  refreshFromStorage: () => void;
  addPatient: (patient: SharedPatient) => void;
  upsertPatient: (patient: SharedPatient) => void;
  addQueueItem: (item: SharedQueueItem) => void;
  upsertQueueItem: (item: SharedQueueItem) => void;
  updateQueueItem: (id: string, patch: Partial<SharedQueueItem>) => void;
  addStockEntry: (entry: StockEntry) => void;
  addHistory: (entry: HistoryLog) => void;
  clearHistory: () => void;
}

const STORAGE_KEY = "infbeac-shared-state";

const defaultState: AppDataState = {
  patients: [],
  queue: [],
  stockEntries: [],
  history: [],
};

const readStorage = (): AppDataState => {
  if (typeof window === "undefined") return defaultState;

  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved) return defaultState;

    const parsed = JSON.parse(saved) as Partial<AppDataState>;
    return {
      patients: parsed.patients ?? [],
      queue: parsed.queue ?? [],
      stockEntries: parsed.stockEntries ?? [],
      history: parsed.history ?? [],
    };
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
    return defaultState;
  }
};

const AppDataContext = createContext<AppDataContextType | undefined>(undefined);

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppDataState>(defaultState);

  useEffect(() => {
    setState(readStorage());
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const payload = JSON.stringify(state);
    window.localStorage.setItem(STORAGE_KEY, payload);
    window.dispatchEvent(
      new CustomEvent<AppDataState>("infbeac:data-sync", { detail: state }),
    );
  }, [state]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY && event.newValue) {
        try {
          const parsed = JSON.parse(event.newValue) as Partial<AppDataState>;
          setState({
            patients: parsed.patients ?? [],
            queue: parsed.queue ?? [],
            stockEntries: parsed.stockEntries ?? [],
            history: parsed.history ?? [],
          });
        } catch {
          // ignore invalid JSON payloads
        }
      }
    };

    const handleCustomEvent = (event: Event) => {
      const detail = (event as CustomEvent<AppDataState>).detail;
      if (detail) {
        setState(detail);
      }
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener("infbeac:data-sync", handleCustomEvent);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("infbeac:data-sync", handleCustomEvent);
    };
  }, []);

  const refreshFromStorage = () => setState(readStorage());

  const addPatient = (patient: SharedPatient) => {
    setState((previous) => ({
      ...previous,
      patients: [patient, ...previous.patients.filter((item) => item.id !== patient.id)],
    }));
  };

  const upsertPatient = (patient: SharedPatient) => {
    setState((previous) => {
      const exists = previous.patients.some((item) => item.id === patient.id);
      return {
        ...previous,
        patients: exists
          ? previous.patients.map((item) => (item.id === patient.id ? { ...item, ...patient } : item))
          : [patient, ...previous.patients],
      };
    });
  };

  const addQueueItem = (item: SharedQueueItem) => {
    setState((previous) => {
      const exists = previous.queue.some((entry) => entry.id === item.id);
      return {
        ...previous,
        queue: exists
          ? previous.queue.map((entry) => (entry.id === item.id ? { ...entry, ...item } : entry))
          : [item, ...previous.queue],
      };
    });
  };

  const upsertQueueItem = (item: SharedQueueItem) => {
    setState((previous) => {
      const exists = previous.queue.some((entry) => entry.id === item.id);
      return {
        ...previous,
        queue: exists
          ? previous.queue.map((entry) => (entry.id === item.id ? { ...entry, ...item } : entry))
          : [item, ...previous.queue],
      };
    });
  };

  const updateQueueItem = (id: string, patch: Partial<SharedQueueItem>) => {
    setState((previous) => {
      const existing = previous.queue.find((item) => item.id === id);
      const itemToAdd: SharedQueueItem = {
        id,
        nom: patch.nom ?? existing?.nom ?? "Patient",
        service: patch.service ?? existing?.service ?? "Non renseigné",
        motif: patch.motif ?? existing?.motif ?? "Consultation générale",
        statut: patch.statut ?? existing?.statut ?? "Terminé",
        heure: patch.heure ?? existing?.heure ?? new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
      };

      return {
        ...previous,
        queue: existing
          ? previous.queue.map((item) => (item.id === id ? { ...item, ...patch } : item))
          : [itemToAdd, ...previous.queue],
      };
    });
  };

  const addStockEntry = (entry: StockEntry) => {
    setState((previous) => ({
      ...previous,
      stockEntries: [entry, ...previous.stockEntries],
    }));
  };

  const addHistory = (entry: HistoryLog) => {
    setState((previous) => ({
      ...previous,
      history: [entry, ...previous.history],
    }));
  };

  const clearHistory = () => {
    setState((previous) => ({ ...previous, history: [] }));
  };

  const value = useMemo<AppDataContextType>(
    () => ({
      ...state,
      refreshFromStorage,
      addPatient,
      upsertPatient,
      addQueueItem,
      upsertQueueItem,
      updateQueueItem,
      addStockEntry,
      addHistory,
      clearHistory,
    }),
    [state],
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData() {
  const context = useContext(AppDataContext);
  if (!context) {
    throw new Error("useAppData must be used inside an AppDataProvider");
  }
  return context;
}
