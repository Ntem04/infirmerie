import { useRouteError } from "react-router-dom";
import ErrorCard from "../components/ui/ErrorCard";

export default function ErrorPage() {
  const error = useRouteError();

  // Extract useful fields from known error shapes
  const status = (error as any)?.status || (error as any)?.statusCode || null;
  const statusText = (error as any)?.statusText || null;
  const message =
    (error as any)?.message || (error as any)?.data || statusText || "Une erreur est survenue.";

  const title = status === 404 ? "Page introuvable" : "Erreur";

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100">
      <div className="w-full max-w-3xl">
        <ErrorCard title={title} message={String(message)} code={status ?? undefined} />

        {/* If the error is an actual Error, show stack in dev */}
        {typeof error === "object" && error !== null && (error as any).stack && (
          <pre className="mt-4 p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-md text-xs text-slate-500 overflow-auto">
            {(error as any).stack}
          </pre>
        )}
      </div>
    </div>
  );
}
