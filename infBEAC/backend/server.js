import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { Low } from "lowdb";
import { JSONFile } from "lowdb/node";
import { App } from "@tinyhttp/app";
import { createApp } from "json-server/lib/app.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const dbPath = join(__dirname, "db.json");

const adapter = new JSONFile(dbPath);
const db = new Low(adapter, {});
await db.read();

const jsonApi = createApp(db, { logger: false });
const app = new App();

// ========================================================
// 1. GESTION DES LOGS AUTOMATIQUES (INTELLIGENTS)
// ========================================================
const logAction = (req) => {
  // On extrait le module et l'ID à partir de l'URL (ex: /queue/Q-1234)
  const urlParts = (req.originalUrl || req.url).split("?")[0].split("/");
  const table = urlParts[1];
  const targetId = urlParts.length > 2 ? urlParts[2] : null;

  if (!table || table === "logs" || table === "api" || table === "db") return;

  let actionName = "MODIFICATION";
  let actionDesc = "modifiée";

  if (req.method === "POST") {
    actionName = "CREATION";
    actionDesc = "ajoutée";
  }
  if (req.method === "DELETE") {
    actionName = "SUPPRESSION";
    actionDesc = "supprimée";
  }

  // --- GÉNÉRATION INTELLIGENTE DU DÉTAIL ---
  let details = `Une entrée a été ${actionDesc} dans le module '${table}'.`;

  if (table === "users") {
    if (req.method === "PATCH")
      details = `Modification des accès ou du mot de passe pour le profil ${targetId || ""}`;
    if (req.method === "POST")
      details = `Création d'un nouveau profil utilisateur dans le système`;
    if (req.method === "DELETE")
      details = `Suppression définitive du profil ${targetId || ""}`;
  } else if (table === "queue" || table === "consultations") {
    if (req.method === "PATCH" || req.method === "PUT")
      details = `Le dossier patient ${targetId || ""} a été mis à jour (Saisie de constantes ou Consultation).`;
    if (req.method === "POST")
      details = `Création d'un nouveau dossier médical patient en file d'attente.`;
  } else if (table === "pharmacie") {
    if (req.method === "POST")
      details = `Ajout d'un nouveau médicament dans l'état des stocks.`;
    if (req.method === "PATCH")
      details = `Mise à jour de la quantité ou péremption pour le médicament ${targetId || ""}.`;
  }

  // --- CAPTURE DE L'IP LOCALE ---
  let ip = req.socket?.remoteAddress || "Local";
  if (ip === "::1" || ip === "127.0.0.1") ip = "Machine Locale (127.0.0.1)";

  // ===================================================================
  // 🔴 CORRECTION ICI : LECTURE DES HEADERS ENVOYÉS PAR REACT
  // ===================================================================
  // On lit les informations passées par le frontend. Si elles sont vides,
  // on met "Inconnu" pour alerter l'admin qu'une requête non identifiée a eu lieu.
  const userName = req.headers["x-user-name"] || "Utilisateur Inconnu";
  const userRole = req.headers["x-user-role"] || "NON SPÉCIFIÉ";

  const newLog = {
    id: "L-" + Date.now().toString(),
    timestamp: new Date().toISOString(),
    userId: userName, // Le nom complet (ex: Dr. Zambo)
    role: userRole, // Le rôle (ex: MEDECIN)
    action: `${actionName}_${table.toUpperCase()}`,
    details: details,
    ipAdresse: ip,
  };

  if (!db.data.logs) db.data.logs = [];
  db.data.logs.push(newLog);
};

// ========================================================
// 2. SYNCHRONISATION DES STATISTIQUES (KPI & EPIDEMIOLOGIE)
// ========================================================
const syncDerivedCollections = () => {
  const queue = Array.isArray(db.data?.queue) ? db.data.queue : [];
  const pharmacy = Array.isArray(db.data?.pharmacie) ? db.data.pharmacie : [];

  const epidemiologie = queue.map((item) => ({
    id: item.id,
    patient: item.nom ?? item.patient ?? "Inconnu",
    service: item.service ?? "Service Non Renseigné",
    motif:
      item.motif ??
      item.pathologie ??
      item.diagnostic ??
      "Consultation générale",
    statut: item.statut ?? "En attente médecin",
    date: item.date ?? new Date().toISOString(),
  }));

  const today = new Date();
  const patientsDuJour = queue.filter((item) => {
    const createdDate = item.date ? new Date(item.date) : null;
    if (!createdDate || Number.isNaN(createdDate.getTime())) return false;
    return (
      createdDate.getFullYear() === today.getFullYear() &&
      createdDate.getMonth() === today.getMonth() &&
      createdDate.getDate() === today.getDate()
    );
  }).length;

  const AUJOURDHUI = new Date().getTime();
  const alertesPharmacie = pharmacy.filter((entry) => {
    const isLowStock = Number(entry.quantite) <= 50;
    const daysToExpiry =
      (new Date(entry.datePeremption).getTime() - AUJOURDHUI) /
      (1000 * 3600 * 24);
    const isExpiringSoon = daysToExpiry > 0 && daysToExpiry < 90;
    return isLowStock || isExpiringSoon;
  }).length;

  db.data = {
    ...db.data,
    queue,
    consultations: queue,
    epidemiologie,
    kpi: {
      patientsDuJour,
      totalPatientsConsulte: queue.length,
      alertesPharmacie: alertesPharmacie,
    },
  };

  db.write();
};

// ========================================================
// 3. INTERCEPTEUR DES REQUÊTES
// ========================================================
app.use((req, res, next) => {
  const isAuth = req.method === "POST" && req.url === "/api/auth/login";

  if (!isAuth) {
    const isMutation =
      ["POST", "PATCH", "PUT", "DELETE"].includes(req.method) &&
      req.url !== "/db";

    if (isMutation) {
      const end = res.end.bind(res);
      res.end = (...args) => {
        try {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            logAction(req);
            syncDerivedCollections();
          }
        } catch (error) {
          console.warn("Erreur sync au moment de la mutation:", error);
        }
        return end(...args);
      };
    }

    // On autorise la lecture des headers personnalisés
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, x-user-name, x-user-role",
    );

    return next();
  }

  const contentType = req.headers["content-type"] ?? "";
  if (!contentType.includes("application/json")) {
    return next();
  }

  let rawBody = "";
  req.setEncoding("utf8");
  req.on("data", (chunk) => {
    rawBody += chunk;
  });
  req.on("end", () => {
    try {
      req.body = rawBody ? JSON.parse(rawBody) : {};
      next();
    } catch {
      res.status(400).json({ message: "Format JSON invalide" });
    }
  });
});

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET,POST,PUT,PATCH,DELETE,OPTIONS",
  );
  // Important : Ajout des Custom Headers ici aussi pour le CORS preflight
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, x-user-name, x-user-role",
  );
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

// Route d'authentification
app.post("/api/auth/login", async (req, res) => {
  const { username, password } = req.body ?? {};
  const users = db.data?.users ?? [];

  const user = users.find(
    (item) => item.username === username && item.password === password,
  );

  if (!user) {
    return res.status(401).json({ message: "Identifiants invalides" });
  }

  if (user.isActif === false) {
    return res
      .status(403)
      .json({ message: "Ce compte a été suspendu par l'administrateur" });
  }

  return res.status(200).json({
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
      fullName: user.fullName ?? user.nomComplet ?? user.username,
    },
    token: "demo-token",
  });
});

// Intercepteur doublons utilisateurs
app.post("/users", (req, res, next) => {
  const { username } = req.body ?? {};
  const users = db.data?.users ?? [];

  const isDuplicate = users.some(
    (u) => u.username.toLowerCase() === (username || "").toLowerCase(),
  );

  if (isDuplicate) {
    return res.status(409).json({ message: "Erreur : Ce compte existe déjà." });
  }

  next();
});

app.use(jsonApi);

const port = 3001;
app.listen(port, () => {
  console.log(`JSON Server backend démarré sur le PORT :${port}`);
});
