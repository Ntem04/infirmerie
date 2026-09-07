﻿import React, { useState, useRef, useEffect } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Eye, EyeOff, ShieldCheck, Plus } from "lucide-react";
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
      // Un léger glissement vers le haut (translate-y-4) parfait pour un formulaire
      className={`transition-all duration-700 ease-out transform ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
      } ${className}`}
    >
      {children}
    </div>
  );
}

export default function Login() {
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!username || username.trim().length < 2) {
      setError("Veuillez entrer un nom d'utilisateur valide.");
      return;
    }
    if (!password || password.length < 6) {
      setError("Le mot de passe est trop court.");
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
      });

      if (!res.ok) {
        throw new Error("Identifiants invalides");
      }

      const data = await res.json();
      setPassword("");

      login({
        id: data.user?.id ?? username,
        username: data.user?.username ?? username,
        role: data.user?.role ?? "admin",
        fullName: data.user?.fullName ?? username,
      });

      navigate("/dashboard");
    } catch (err) {
      setError(
        err instanceof Error && err.message === "Identifiants invalides"
          ? "Identifiant ou mot de passe incorrect."
          : "Impossible de joindre le serveur. Vérifiez que JSON Server est lancé.",
      );
      setPassword("");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center font-sans overflow-hidden">
      {/* L'image de fond apparaît en fondu global */}
      <div
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat animate-in fade-in duration-1000"
        style={{
          backgroundImage:
            "url('https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?q=80&w=2000&auto=format&fit=crop')",
        }}
      >
        <div className="absolute inset-0 bg-[#005ca5]/85 backdrop-blur-[2px]"></div>
      </div>

      <main className="relative z-10 w-full max-w-md p-4 sm:p-6">
        <div className="bg-white rounded-[2rem] shadow-2xl p-6 sm:p-8 md:p-10 border border-white/20">
          <FadeInBlock delay={0}>
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 bg-[#edf5ff] rounded-2xl flex items-center justify-center border-4 border-[#dcecff] shadow-sm transform -translate-y-4 hover:scale-105 transition-transform duration-300">
                <Plus className="w-10 h-10 text-[#005ca5]" strokeWidth={4} />
              </div>
            </div>
          </FadeInBlock>

          <FadeInBlock delay={100}>
            <div className="text-center mb-8 -mt-2">
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">
                INFIRMERIE<span className="text-[#005ca5]">+</span>
              </h1>
              <p className="text-sm font-semibold text-slate-500 mt-1">
                Espace Soignant BEAC
              </p>
            </div>
          </FadeInBlock>

          {error && (
            <FadeInBlock delay={150}>
              <div className="flex items-center gap-3 text-sm text-rose-700 bg-rose-50 border border-rose-100 p-4 rounded-xl mb-6 shadow-sm">
                <ShieldCheck className="w-5 h-5 shrink-0" />
                <p className="font-semibold">{error}</p>
              </div>
            </FadeInBlock>
          )}

          <form
            onSubmit={handleSubmit}
            className="space-y-5"
            autoComplete="on"
            noValidate
          >
            <FadeInBlock delay={200}>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Nom d'utilisateur
                </label>
                <div className="relative">
                  <input
                    name="username"
                    autoComplete="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full border-2 border-slate-100 bg-slate-50/50 rounded-xl px-4 py-3.5 focus:outline-none focus:ring-4 focus:ring-green-500/20 focus:border-green-500 focus:bg-white transition-all text-slate-900 font-medium"
                    placeholder="Ex: M.Zambo"
                    aria-label="Nom d'utilisateur"
                    required
                  />
                </div>
              </div>
            </FadeInBlock>

            <FadeInBlock delay={300}>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Mot de passe
                </label>
                <div className="relative">
                  <input
                    name="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    type={showPassword ? "text" : "password"}
                    className="w-full border-2 border-slate-100 bg-slate-50/50 rounded-xl px-4 py-3.5 focus:outline-none focus:ring-4 focus:ring-green-500/20 focus:border-green-500 focus:bg-white transition-all pr-12 text-slate-900 font-medium"
                    placeholder="••••••••"
                    aria-label="Mot de passe"
                    required
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-green-600 transition-colors rounded-lg focus:outline-none focus:bg-slate-100"
                    aria-label={
                      showPassword
                        ? "Masquer le mot de passe"
                        : "Afficher le mot de passe"
                    }
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>
            </FadeInBlock>

            <FadeInBlock delay={400}>
              <div className="flex items-center justify-between pt-2 pb-2">
                <label className="inline-flex items-center gap-2 text-sm text-slate-600 cursor-pointer hover:text-slate-900 transition-colors">
                  <input
                    type="checkbox"
                    className="form-checkbox h-4 w-4 text-green-600 rounded border-slate-300 focus:ring-green-500"
                  />
                  <span className="font-semibold">Mémoriser ma session</span>
                </label>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-[#c2a712] hover:bg-[#005ca5] active:bg-[#003f77] text-white font-black py-4 rounded-xl disabled:opacity-60 disabled:cursor-not-allowed transition-all shadow-lg shadow-[#c2a712]/30 text-lg"
                >
                  {submitting ? "Vérification..." : "Se connecter"}
                </button>
              </div>
            </FadeInBlock>

            <FadeInBlock delay={500}>
              <div className="pt-6 text-center">
                <p className="text-[11px] text-slate-400 font-medium px-4">
                  Cette application est réservée au personnel autorisé de la
                  BEAC. Toute activité est enregistrée.
                </p>
              </div>
            </FadeInBlock>
          </form>
        </div>
      </main>
    </div>
  );
}
