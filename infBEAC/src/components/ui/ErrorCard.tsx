import { XCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface ErrorCardProps {
  title?: string;
  message?: string;
  code?: string | number;
}

export default function ErrorCard({
  title = "Une erreur est survenue",
  message = "Désolé, la page demandée est introuvable ou une erreur est survenue.",
  code,
}: ErrorCardProps) {
  const navigate = useNavigate();

  return (
    <div className="max-w-xl mx-auto p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-lg text-center">
      <div className="flex items-center justify-center w-20 h-20 rounded-full bg-red-50 mx-auto mb-4">
        <XCircle className="w-10 h-10 text-red-600" />
      </div>
      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">{title}</h1>
      {code && (
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">Code: {code}</p>
      )}
      <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">{message}</p>

      <div className="flex justify-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:translate-y-[-1px]"
        >
          Retour
        </button>
        <button
          onClick={() => navigate("/dashboard")}
          className="px-4 py-2 rounded-lg bg-[var(--color-beac-primary)] text-white hover:brightness-90"
        >
          Aller au tableau de bord
        </button>
      </div>
    </div>
  );
}
