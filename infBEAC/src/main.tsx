import React from "react";
import ReactDOM from "react-dom/client";
import {
  createBrowserRouter,
  RouterProvider,
  Navigate,
} from "react-router-dom";
import App from "./App.tsx";
import "./index.css";
import { normalizeRole, roleHomeMap, useAuth } from "./context/AuthContext";

// --- Composants de Layout ---
import MainLayout from "./components/layout/MainLayout";
import RoleGate from "./components/layout/RoleGate";

// --- Pages ---
import Dashboard from "./pages/dashboard/Dashboard";
import Consultations from "./pages/clinical/Consultations";
import DossierMedical from "./pages/clinical/DossierMedical";
import Epidemiology from "./pages/clinical/Epidemiology";
import ExcelWorkbook from "./pages/clinical/ExcelWorkbook";
import Inventory from "./pages/pharmacy/Inventory";
import ErrorPage from "./pages/ErrorPage";
import Login from "./pages/auth/Login.tsx";
import AuthLayout from "./components/layout/AuthLayout";
import ProtectedRoute from "./components/layout/ProtectedRoute";
import DossierPatient from "./pages/clinical/DossierPatient.tsx";
import Patients from "./pages/clinical/Patients.tsx";
import Aide from "./pages/clinical/Aide.tsx";
import Historyt from "./pages/clinical/Historyt.tsx";
import Logs from "./pages/admin/Logs.tsx";
import Profils from "./pages/admin/Profils.tsx";
import HistoriquePharmacie from "./pages/clinical/HistoriquePharmacie.tsx";
import DossierPatientInfirmiere from "./pages/clinical/DossierPatientInfirmiere.tsx";
// Composant fictif pour le Login (à déplacer dans src/pages/auth/Login.tsx plus tard)

function RoleHomeRedirect() {
  const { user } = useAuth();
  const currentRole = user ? normalizeRole(user.role) : null;
  const destination = currentRole ? roleHomeMap[currentRole] : "/auth";

  return <Navigate to={destination} replace />;
}

// =========================================
// CONFIGURATION DU ROUTER (createBrowserRouter)
// =========================================
const router = createBrowserRouter([
  {
    path: "/auth",
    element: (
      <AuthLayout>
        <Login />
      </AuthLayout>
    ),
  },

  {
    path: "/",
    element: (
      <ProtectedRoute>
        <MainLayout />
      </ProtectedRoute>
    ),
    errorElement: <ErrorPage />,
    children: [
      {
        index: true,
        element: <RoleHomeRedirect />,
      },
      {
        path: "dashboard",
        element: (
          <RoleGate allowedRoles={["MEDECIN"]}>
            <Dashboard />
          </RoleGate>
        ),
      },
      {
        path: "consultations",
        element: (
          <RoleGate allowedRoles={["MEDECIN"]}>
            <Consultations />
          </RoleGate>
        ),
      },
      {
        path: "histpharm",
        element: (
          <RoleGate allowedRoles={["INFIRMIERE"]}>
            <HistoriquePharmacie />
          </RoleGate>
        ),
      },
      {
        path: "soins",
        element: (
          <RoleGate allowedRoles={["INFIRMIERE"]}>
            <ExcelWorkbook />
          </RoleGate>
        ),
      },
      {
        path: "excel",
        element: (
          <RoleGate allowedRoles={["INFIRMIERE"]}>
            <ExcelWorkbook />
          </RoleGate>
        ),
      },
      {
        path: "epidemiologie",
        element: (
          <RoleGate allowedRoles={["MEDECIN"]}>
            <Epidemiology />
          </RoleGate>
        ),
      },
      {
        path: "dossier-medical",
        element: (
          <RoleGate allowedRoles={["MEDECIN"]}>
            <DossierMedical />
          </RoleGate>
        ),
      },
      {
        path: "patients",
        element: (
          <RoleGate allowedRoles={["MEDECIN", "INFIRMIERE"]}>
            <Patients />
          </RoleGate>
        ),
      },
      {
        path: "pharmacie",
        element: (
          <RoleGate allowedRoles={["INFIRMIERE"]}>
            <Inventory />
          </RoleGate>
        ),
      },
      {
        path: "reports/history",
        element: (
          <RoleGate allowedRoles={["MEDECIN"]}>
            <Historyt />
          </RoleGate>
        ),
      },
      {
        path: "reports",
        element: (
          <RoleGate allowedRoles={["MEDECIN"]}>
            <div className="p-8 dark:text-slate-200">
              Rapports (En construction)
            </div>
          </RoleGate>
        ),
      },
      {
        path: "profils",
        element: (
          <RoleGate allowedRoles={["ADMIN"]}>
            <Profils />
          </RoleGate>
        ),
      },
      {
        path: "logs",
        element: (
          <RoleGate allowedRoles={["ADMIN"]}>
            <Logs />
          </RoleGate>
        ),
      },
      {
        path: "*",
        element: <ErrorPage />,
      },
      {
        path: "dossier-patient",
        element: (
          <RoleGate allowedRoles={["MEDECIN", "INFIRMIERE"]}>
            <DossierPatient />
          </RoleGate>
        ),
      },
      {
        path: "dossier-patient-infirmiere",
        element: (
          <RoleGate allowedRoles={["INFIRMIERE"]}>
            <DossierPatientInfirmiere />
          </RoleGate>
        ),
      },
      {
        path: "aide",
        element: <Aide />,
      },
    ],
  },
]);
// Enregistrement du Service Worker
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((error) => {
      console.error("Échec de l'enregistrement du Service Worker:", error);
    });
  });
}

// =========================================
// RENDU DE L'APPLICATION
// =========================================
ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App>
      <RouterProvider router={router} />
    </App>
  </React.StrictMode>,
);
