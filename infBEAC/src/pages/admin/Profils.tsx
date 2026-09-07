import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  UserCog,
  Search,
  Filter,
  UserPlus,
  Shield,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Save,
  X,
  KeyRound,
  Trash2,
  Key,
  User,
} from "lucide-react";
// NOUVEAU : On importe le contexte d'authentification pour identifier l'auteur
import { useAuth } from "../../context/AuthContext";

const API_BASE_URL = "http://localhost:3001";

// ==========================================
// COMPOSANT UTILITAIRE POUR INTERSECTION OBSERVER
// ==========================================
function FadeInBlock({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const domRef = useRef<HTMLDivElement>(null);
  const [isVisible, setVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 },
    );

    const currentTarget = domRef.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, []);

  return (
    <div
      ref={domRef}
      style={{ transitionDelay: `${delay}ms` }}
      className={`transition-all duration-700 ease-out transform ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-7"
      } ${className}`}
    >
      {children}
    </div>
  );
}

interface UserProfile {
  id: string;
  username: string;
  nomComplet: string;
  role: string;
  isActif: boolean;
  createdAt: string;
}

const ROLES = ["Tous les rôles", "MEDECIN", "INFIRMIERE", "ADMIN_IT"];

export default function Profils() {
  // NOUVEAU : On récupère l'utilisateur connecté pour l'Audit Log
  const { user } = useAuth();

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [apiError, setApiError] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState("Tous les rôles");

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [resetModal, setResetModal] = useState({
    isOpen: false,
    userId: "",
    nomComplet: "",
    newPassword: "",
  });

  const [newUser, setNewUser] = useState({
    nomComplet: "",
    username: "",
    role: "INFIRMIERE",
    password: "",
  });

  // BEST PRACTICE : Création d'un objet réutilisable pour les Headers d'Audit
  const auditHeaders = {
    "Content-Type": "application/json",
    "x-user-name": user?.fullName || user?.nom || user?.username || "Inconnu",
    "x-user-role": user?.role || "NON SPÉCIFIÉ",
  };

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${API_BASE_URL}/users`);
      if (!response.ok) throw new Error("Erreur réseau");

      const data = await response.json();
      setUsers(data);
      setApiError(false);
    } catch (error) {
      console.error("Erreur API Users:", error);
      setApiError(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const nom = u.nomComplet || "";
      const pseudo = u.username || "";

      const matchSearch =
        nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
        pseudo.toLowerCase().includes(searchTerm.toLowerCase());

      const matchRole =
        filterRole === "Tous les rôles" || u.role === filterRole;

      return matchSearch && matchRole;
    });
  }, [users, searchTerm, filterRole]);

  const toggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
        method: "PATCH",
        headers: auditHeaders, // Ajout des infos d'audit
        body: JSON.stringify({ isActif: !currentStatus }),
      });

      if (response.ok) {
        // BEST PRACTICE : On utilise prevUsers pour éviter les décalages d'état React
        setUsers((prevUsers) =>
          prevUsers.map((u) =>
            u.id === userId ? { ...u, isActif: !currentStatus } : u,
          ),
        );
      }
    } catch (error) {
      alert("Erreur lors de la modification du statut.");
    }
  };

  const handleDeleteUser = async (userId: string, nom: string) => {
    if (
      !window.confirm(
        `Êtes-vous sûr de vouloir supprimer définitivement le compte de ${nom} ?`,
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
        method: "DELETE",
        headers: {
          "x-user-name": auditHeaders["x-user-name"],
          "x-user-role": auditHeaders["x-user-role"],
        }, // Ajout des infos d'audit pour le log de suppression
      });

      if (response.ok) {
        setUsers((prevUsers) => prevUsers.filter((u) => u.id !== userId));
      } else {
        throw new Error("Échec de la suppression");
      }
    } catch (error) {
      alert("Erreur lors de la suppression de l'utilisateur.");
    }
  };

  const handleUpdatePassword = async () => {
    if (resetModal.newPassword.length < 4) {
      alert("Le mot de passe doit contenir au moins 4 caractères.");
      return;
    }

    try {
      const response = await fetch(
        `${API_BASE_URL}/users/${resetModal.userId}`,
        {
          method: "PATCH",
          headers: auditHeaders, // Ajout des infos d'audit
          body: JSON.stringify({ password: resetModal.newPassword }),
        },
      );

      if (response.ok) {
        alert("Mot de passe mis à jour avec succès !");
        setResetModal({
          isOpen: false,
          userId: "",
          nomComplet: "",
          newPassword: "",
        });
      } else {
        throw new Error("Échec de la mise à jour");
      }
    } catch (error) {
      alert("Erreur lors de la mise à jour du mot de passe.");
    }
  };

  const handleCreateUser = async () => {
    if (!newUser.nomComplet || !newUser.username || !newUser.password) {
      alert("Veuillez remplir tous les champs obligatoires.");
      return;
    }

    // Défense en profondeur : vérification doublon Frontend
    const isDuplicate = users.some(
      (u) => u.username.toLowerCase() === newUser.username.toLowerCase(),
    );

    if (isDuplicate) {
      alert(
        "Erreur : Ce nom d'utilisateur existe déjà ! Veuillez en choisir un autre.",
      );
      return;
    }

    setIsSaving(true);

    const newId = Date.now().toString();

    const userToSave = {
      id: newId,
      username: newUser.username,
      nomComplet: newUser.nomComplet,
      role: newUser.role,
      password: newUser.password,
      isActif: true,
      createdAt: new Date().toISOString(),
    };

    try {
      const response = await fetch(`${API_BASE_URL}/users`, {
        method: "POST",
        headers: auditHeaders, // Ajout des infos d'audit
        body: JSON.stringify(userToSave),
      });

      if (!response.ok) throw new Error("Échec de la sauvegarde par l'API");

      setNewUser({
        nomComplet: "",
        username: "",
        role: "INFIRMIERE",
        password: "",
      });
      setIsAddModalOpen(false);
      fetchUsers(); // On recharge la liste complète depuis le backend
    } catch (error) {
      console.error("Erreur création profil:", error);
      alert(
        "Une erreur est survenue lors de l'enregistrement. Vérifiez votre serveur local.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  // COULEURS DES BADGES EN NUANCES DE BLEU
  const getRoleBadge = (role: string) => {
    const r = (role || "")
      .toUpperCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

    if (r.includes("MEDECIN") || r.includes("DOCTOR")) {
      return "bg-blue-50 text-blue-700 border-blue-200 dark:bg-transparent dark:text-blue-400 dark:border-blue-800";
    }
    if (r.includes("INFIRMIER") || r.includes("NURSE")) {
      return "bg-sky-50 text-sky-700 border-sky-200 dark:bg-transparent dark:text-sky-400 dark:border-sky-800";
    }
    if (r.includes("ADMIN")) {
      return "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-transparent dark:text-indigo-400 dark:border-indigo-800";
    }

    return "bg-slate-50 text-slate-700 border-slate-200 dark:bg-transparent dark:text-slate-300 dark:border-slate-700";
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto transition-colors duration-500 dark:bg-slate-950 min-h-screen font-sans space-y-6 animate-in fade-in">
      {apiError && (
        <FadeInBlock delay={0}>
          <div className="bg-rose-100 border border-rose-400 text-rose-700 px-4 py-3 rounded-lg flex items-center gap-3 shadow-sm">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <p className="font-bold text-sm">
              Impossible de joindre le serveur. Les profils ne peuvent pas être
              chargés.
            </p>
          </div>
        </FadeInBlock>
      )}

      {/* EN-TÊTE */}
      <FadeInBlock delay={50}>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-2">
              <UserCog className="w-7 h-7 text-blue-700 dark:text-blue-500" />
              Gestion des Profils
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm font-medium">
              Administration des accès et rôles du personnel soignant et IT.
            </p>
          </div>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-800 text-white text-sm font-bold rounded-xl shadow-md shadow-blue-800/20 hover:bg-blue-900 transition"
          >
            <UserPlus className="w-4 h-4" />
            Nouveau Profil
          </button>
        </div>
      </FadeInBlock>

      {/* BARRE DE RECHERCHE ET FILTRES */}
      <FadeInBlock delay={100}>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-slate-400" />
            </div>
            <input
              type="text"
              placeholder="Rechercher par nom ou nom d'utilisateur..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-11 pr-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm font-medium transition-all"
            />
          </div>

          <div className="relative min-w-[250px]">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Filter className="h-5 w-5 text-slate-400" />
            </div>
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="block w-full pl-11 pr-10 py-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm font-medium transition-all appearance-none cursor-pointer"
            >
              {ROLES.map((role, index) => (
                <option key={index} value={role}>
                  {role.replace("_", " ")}
                </option>
              ))}
            </select>
          </div>
        </div>
      </FadeInBlock>

      {/* TABLEAU DES UTILISATEURS */}
      <FadeInBlock delay={150}>
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex justify-between items-center">
            <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-bold">
              Comptes enregistrés
            </div>
            <span className="text-xs font-bold px-3 py-1 bg-transparent border border-slate-300 text-slate-700 dark:border-slate-700 dark:text-slate-300 rounded-lg">
              {filteredUsers.length} compte(s)
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-50 dark:bg-slate-950/50 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-xs">
                <tr>
                  <th className="p-4">Utilisateur</th>
                  <th className="p-4">Rôle</th>
                  <th className="p-4">Statut</th>
                  <th className="p-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {isLoading ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="p-12 text-center text-slate-500 font-medium animate-pulse"
                    >
                      Chargement des profils...
                    </td>
                  </tr>
                ) : filteredUsers.length > 0 ? (
                  filteredUsers.map((u, index) => (
                    <tr
                      key={u.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center font-bold text-slate-600 dark:text-slate-300 shrink-0 uppercase">
                            <User className="w-5 h-5 text-slate-400" />
                          </div>
                          <div>
                            <p className="font-bold text-slate-800 dark:text-white text-base">
                              {u.nomComplet || "Sans Nom"}
                            </p>
                            <p className="text-xs font-mono font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
                              @{u.username || "inconnu"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <span
                          className={`px-2.5 py-1.5 text-[10px] uppercase tracking-wider font-black rounded-md flex w-max items-center gap-1.5 border ${getRoleBadge(u.role)}`}
                        >
                          <Shield className="w-3 h-3" />
                          {(u.role || "Inconnu").replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="p-4">
                        {u.isActif ? (
                          <span className="flex items-center gap-1.5 text-blue-700 dark:text-blue-400 font-bold text-xs bg-blue-50 dark:bg-transparent px-2.5 py-1.5 rounded-md w-max border border-blue-200 dark:border-blue-800/50">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Actif
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 text-red-700 dark:text-red-400 font-bold text-xs bg-red-50 dark:bg-transparent px-2.5 py-1.5 rounded-md w-max border border-red-200 dark:border-red-800/50">
                            <XCircle className="w-3.5 h-3.5" /> Suspendu
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex justify-center items-center gap-2">
                          <button
                            onClick={() => toggleUserStatus(u.id, u.isActif)}
                            title={
                              u.isActif
                                ? "Suspendre le compte"
                                : "Réactiver le compte"
                            }
                            className={`p-2 rounded-lg transition-colors border ${
                              u.isActif
                                ? "bg-white dark:bg-slate-900 border-red-200 dark:border-red-900/50 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30"
                                : "bg-white dark:bg-slate-900 border-blue-200 dark:border-blue-900/50 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30"
                            }`}
                          >
                            {u.isActif ? (
                              <XCircle className="w-4 h-4" />
                            ) : (
                              <CheckCircle2 className="w-4 h-4" />
                            )}
                          </button>

                          <button
                            onClick={() =>
                              setResetModal({
                                isOpen: true,
                                userId: u.id,
                                nomComplet: u.nomComplet,
                                newPassword: "",
                              })
                            }
                            title="Modifier le mot de passe"
                            className="p-2 text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-900/50 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors"
                          >
                            <Key className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleDeleteUser(u.id, u.nomComplet)}
                            title="Supprimer le profil"
                            className="p-2 text-slate-400 hover:text-red-600 dark:hover:text-red-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-200 dark:hover:border-red-800/50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={4}
                      className="p-12 text-center text-slate-500 dark:text-slate-400"
                    >
                      <p className="text-base font-semibold dark:text-white">
                        Aucun profil trouvé
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </FadeInBlock>

      {/* MODALE : RÉINITIALISER LE MOT DE PASSE */}
      {resetModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-500 rounded-lg">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-800 dark:text-white">
                    Nouveau Mot de Passe
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Pour {resetModal.nomComplet}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setResetModal({ ...resetModal, isOpen: false })}
                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              <input
                type="text"
                value={resetModal.newPassword}
                onChange={(e) =>
                  setResetModal({ ...resetModal, newPassword: e.target.value })
                }
                placeholder="Nouveau mot de passe..."
                className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 font-medium transition-all"
              />
            </div>

            <div className="p-5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex justify-end gap-3">
              <button
                onClick={() => setResetModal({ ...resetModal, isOpen: false })}
                className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-sm font-bold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition shadow-sm"
              >
                Annuler
              </button>
              <button
                onClick={handleUpdatePassword}
                className="px-5 py-2 flex items-center gap-2 bg-blue-700 text-white text-sm font-bold rounded-xl hover:bg-blue-800 shadow-md shadow-blue-700/20 transition"
              >
                <Save className="w-4 h-4" /> Valider
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODALE : AJOUTER UN PROFIL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-500 rounded-lg">
                  <UserPlus className="w-5 h-5" />
                </div>
                <h2 className="text-lg font-bold text-slate-800 dark:text-white">
                  Créer un accès utilisateur
                </h2>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5">
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">
                  Nom Complet <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newUser.nomComplet}
                  onChange={(e) =>
                    setNewUser({ ...newUser, nomComplet: e.target.value })
                  }
                  placeholder="Ex: Dr. Marc Zambo"
                  className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-800 dark:text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 font-medium transition-all"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">
                    Nom d'utilisateur <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newUser.username}
                    onChange={(e) =>
                      setNewUser({ ...newUser, username: e.target.value })
                    }
                    placeholder="Ex: M.Zambo"
                    className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-800 dark:text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 font-medium transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300">
                    Rôle <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={newUser.role}
                    onChange={(e) =>
                      setNewUser({ ...newUser, role: e.target.value })
                    }
                    className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-800 dark:text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 font-medium transition-all appearance-none"
                  >
                    <option value="MEDECIN">Médecin</option>
                    <option value="INFIRMIERE">Infirmière</option>
                    <option value="ADMIN_IT">Admin IT</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">
                  Mot de passe provisoire{" "}
                  <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <KeyRound className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type="text"
                    value={newUser.password}
                    onChange={(e) =>
                      setNewUser({ ...newUser, password: e.target.value })
                    }
                    placeholder="Saisissez un mot de passe..."
                    className="block w-full pl-11 pr-4 py-3 border border-slate-300 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-medium transition-all"
                  />
                </div>
              </div>
            </div>

            <div className="p-5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex justify-end gap-3">
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="px-5 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-sm font-bold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition shadow-sm"
              >
                Annuler
              </button>
              <button
                onClick={handleCreateUser}
                disabled={isSaving}
                className="px-6 py-2.5 flex items-center gap-2 bg-blue-800 text-white text-sm font-black rounded-xl hover:bg-blue-900 shadow-md shadow-blue-800/20 transition disabled:opacity-50"
              >
                {isSaving ? (
                  "Enregistrement..."
                ) : (
                  <>
                    <Save className="w-4 h-4" /> Créer le profil
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
