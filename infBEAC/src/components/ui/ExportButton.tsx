import { FileSpreadsheet } from "lucide-react";

interface ExportButtonProps {
  onClick?: () => void;
  label?: string;
}

export default function ExportButton({
  onClick,
  label = "Excel",
}: ExportButtonProps) {
  return (
    <button
      onClick={onClick}
      className="text-sm font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-2 hover:text-teal-600 dark:hover:text-teal-400 transition-all duration-200 px-3 py-1.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 hover:border-teal-200 dark:hover:border-teal-800/50 rounded-lg shadow-sm hover:shadow active:scale-95"
    >
      <FileSpreadsheet
        size={16}
        className="text-emerald-600 dark:text-emerald-500"
      />
      {label}
    </button>
  );
}
