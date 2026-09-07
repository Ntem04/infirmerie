import { Search, Mic } from "lucide-react";

interface MicroInputProps {
  placeholder?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  name?: string;
  list?: string;
  required?: boolean;
  className?: string;
}

export default function MicroInput({
  placeholder = "Rechercher...",
  value,
  onChange,
  name,
  list,
  required,
  className = "",
}: MicroInputProps) {
  return (
    <div className={`relative w-72 lg:w-80 ${className}`}>
      <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
      <input
        type="text"
        name={name}
        list={list}
        required={required}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full pl-10 pr-10 py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl text-sm bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-[var(--color-beac-primary)]/20 focus:border-[var(--color-beac-primary)] transition-all"
      />
      <button
        type="button"
        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[var(--color-beac-primary)] transition-colors"
        title="Activer la saisie vocale"
      >
        <Mic className="w-4 h-4" />
      </button>
    </div>
  );
}
