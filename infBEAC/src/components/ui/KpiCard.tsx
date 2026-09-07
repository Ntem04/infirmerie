// Statistiques pour les rapports BEAC
import type { ReactNode } from "react";

interface KpiCardProps {
  icon: ReactNode;
  count: string | number;
  label: string;
  bg: string;
}

export default function KpiCard({ icon, count, label, bg }: KpiCardProps) {
  return (
    <div className="flex flex-col items-center justify-center p-4 rounded-xl border border-slate-100 bg-white hover:bg-slate-50 transition cursor-pointer shadow-sm">
      <div
        className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${bg}`}
      >
        {icon}
      </div>
      <span className="text-xl font-bold text-[#0F172A]">{count}</span>
      <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold text-center mt-1">
        {label}
      </span>
    </div>
  );
}
