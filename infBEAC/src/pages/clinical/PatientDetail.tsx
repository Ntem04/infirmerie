import React, { useState } from "react";
import {
  LayoutDashboard,
  Users,
  Calendar,
  Pill,
  History,
  Clock,
  FileText,
  Settings,
  Search,
  Bell,
  Plus,
  ChevronDown,
  MoreHorizontal,
  Mic,
  CheckCircle2,
  XCircle,
  FileSpreadsheet,
} from "lucide-react";

export default function ConsultationsView() {
  const [poids, setPoids] = useState<string>("");
  const [pouls, setPouls] = useState<string>("");

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-800">
      {/* SIDEBAR - Bleu Marine Profond BEAC (#0F172A) */}
      <aside className="w-64 bg-[var(--color-beac-primary)] text-slate-300 flex flex-col justify-between shadow-xl z-10">
        <div>
          <div className="flex items-center gap-3 p-6 mb-4 border-b border-slate-700/50">
            <div className="bg-white p-2 rounded-lg">
              <svg
                className="w-6 h-6 text-[#0F172A]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                />
              </svg>
            </div>
            <div>
              <h1 className="font-bold text-white tracking-wide text-lg">
                INFIRMERIE+
              </h1>
              <p className="text-[10px] text-teal-400">
                La santé entre de bonnes mains
              </p>
            </div>
          </div>

          <nav className="space-y-1 px-3">
            <NavItem
              icon={<LayoutDashboard size={20} />}
              label="Tableau de bord"
            />
            <NavItem icon={<Users size={20} />} label="Patients" />
            <NavItem
              icon={<Calendar size={20} />}
              label="Consultations"
              active
            />
            <NavItem icon={<Pill size={20} />} label="Prescriptions" />
            <NavItem icon={<History size={20} />} label="Historique" />
            <NavItem icon={<Clock size={20} />} label="Rendez-vous" />
            <NavItem icon={<FileText size={20} />} label="Rapports" />
            <NavItem icon={<Settings size={20} />} label="Paramètres" />
          </nav>
        </div>

        {/* Profil utilisateur bas de sidebar */}
        <div className="p-4 m-3 bg-slate-800/50 rounded-xl flex items-center justify-between hover:bg-slate-800 transition cursor-pointer">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-50 border-2 border-[var(--color-beac-primary)] overflow-hidden flex items-center justify-center">
              <img
                src="/api/placeholder/40/40"
                alt="Avatar"
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <p className="text-sm font-medium text-white">Sophie Martin</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <p className="text-xs text-slate-400">En ligne</p>
              </div>
            </div>
          </div>
          <ChevronDown size={16} className="text-slate-400" />
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* TOPBAR */}
        <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0">
          <div>
            <h2 className="text-2xl font-bold text-[#0F172A]">Consultations</h2>
            <p className="text-sm text-slate-500 mt-1">
              Gérez les consultations de vos patients
            </p>
          </div>

          <div className="flex items-center gap-6">
            <div className="relative w-80">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                size={18}
              />
              <input
                type="text"
                placeholder="Rechercher un patient..."
                className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--color-beac-primary)]/20 focus:border-[var(--color-beac-primary)] transition-all text-sm"
              />
              <button
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[var(--color-beac-primary)] transition"
                title="Saisie vocale"
              >
                <Mic size={18} />
              </button>
            </div>

            <button className="relative p-2 text-slate-400 hover:text-slate-600 transition">
              <Bell size={22} />
              <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white">
                3
              </span>
            </button>

            <div className="flex items-center gap-3 pl-6 border-l border-slate-200 cursor-pointer">
              <div className="w-9 h-9 rounded-full bg-teal-100 overflow-hidden">
                <img
                  src="/api/placeholder/36/36"
                  alt="Avatar"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="hidden md:block">
                <p className="text-sm font-medium text-[#0F172A]">
                  Sophie Martin
                </p>
                <p className="text-xs text-slate-500 text-right">
                  Infirmier(e)
                </p>
              </div>
              <ChevronDown size={16} className="text-slate-400" />
            </div>
          </div>
        </header>

        {/* SCROLLABLE DASHBOARD */}
        <div className="flex-1 overflow-y-auto p-8">
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 max-w-7xl mx-auto">
            {/* COLONNE GAUCHE (2/3) */}
            <div className="xl:col-span-2 space-y-8">
              {/* Hero Section */}
              <div className="bg-gradient-to-br from-[#0f172a] to-slate-800 rounded-2xl p-8 relative overflow-hidden shadow-lg border border-slate-700">
                <div className="relative z-10 w-2/3">
                  <div className="inline-flex items-center gap-2 bg-teal-500/20 text-teal-300 px-3 py-1 rounded-full text-xs font-medium mb-4 border border-teal-500/30">
                    <Zap size={14} /> ACTION RAPIDE
                  </div>
                  <h3 className="text-3xl font-bold text-white mb-4 leading-tight">
                    Nouvelle
                    <br />
                    consultation
                  </h3>
                  <p className="text-slate-300 mb-8 max-w-sm text-sm">
                    Démarrez une nouvelle consultation et prenez en charge votre
                    patient rapidement.
                  </p>
                  <button className="bg-[#0D9488] hover:bg-teal-500 text-white px-6 py-3 rounded-xl flex items-center gap-2 font-medium transition shadow-lg shadow-teal-900/20">
                    <Plus size={18} /> Nouvelle consultation
                  </button>
                  <div className="flex items-center gap-2 mt-6 text-teal-400/80 text-xs">
                    <CheckCircle2 size={14} /> Données sécurisées et
                    confidentielles
                  </div>
                </div>
                {/* Illustration décorative (Placeholder) */}
                <div className="absolute right-0 bottom-0 w-1/2 h-full opacity-80 pointer-events-none flex items-end justify-end">
                  <img
                    src="/api/placeholder/400/300"
                    alt="Illustration"
                    className="object-cover h-full rounded-br-2xl"
                  />
                </div>
              </div>

              {/* Consultations Récentes Table */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold text-[#0F172A]">
                    Consultations récentes
                  </h3>
                  <div className="flex gap-4">
                    <button className="text-sm font-medium text-[#0D9488] hover:text-teal-700 flex items-center gap-2">
                      <FileSpreadsheet size={16} /> Exporter historique
                    </button>
                    <button className="text-sm font-medium text-[#0D9488] hover:text-teal-700">
                      Voir tout
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="text-slate-400 border-b border-slate-100">
                        <th className="pb-3 font-medium">Patient</th>
                        <th className="pb-3 font-medium">Motif</th>
                        <th className="pb-3 font-medium">Date</th>
                        <th className="pb-3 font-medium">Infirmier(e)</th>
                        <th className="pb-3 font-medium"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      <TableRow
                        init="JD"
                        name="Jean Dupont"
                        age="32"
                        id="00128"
                        motif="Céphalée, fatigue"
                        type="Consultation générale"
                        date="24/05/2024"
                        time="09:15"
                        nurse="Sophie Martin"
                        color="bg-blue-600"
                      />
                      <TableRow
                        init="MM"
                        name="Marie Martin"
                        age="28"
                        id="00127"
                        motif="Suivi de traitement"
                        type="Contrôle"
                        date="23/05/2024"
                        time="11:20"
                        nurse="Sophie Martin"
                        color="bg-pink-500"
                      />
                      <TableRow
                        init="PB"
                        name="Paul Bernard"
                        age="45"
                        id="00126"
                        motif="Douleur abdominale"
                        type="Consultation générale"
                        date="23/05/2024"
                        time="14:45"
                        nurse="Sophie Martin"
                        color="bg-blue-500"
                      />
                      <TableRow
                        init="SL"
                        name="Sophie Leroy"
                        age="31"
                        id="00125"
                        motif="Contrôle médical"
                        type="Suivi"
                        date="22/05/2024"
                        time="16:10"
                        nurse="Sophie Martin"
                        color="bg-green-500"
                      />
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* COLONNE DROITE (1/3) */}
            <div className="space-y-8">
              {/* Constantes : Poids & Pouls (Espace Infirmiere) */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-[#0F172A]">Constantes</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Poids (kg)</label>
                    <input
                      type="number"
                      value={poids}
                                            onChange={(e) => setPoids(e.target.value)}
                      placeholder="ex: 72"
                      className="w-full p-2 rounded-lg border border-slate-200 outline-none focus:ring-1 focus:ring-[var(--color-beac-primary)]/30"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Pouls (bpm)</label>
                    <input
                      type="number"
                      value={pouls}
                                            onChange={(e) => setPouls(e.target.value)}
                      placeholder="ex: 78"
                      className="w-full p-2 rounded-lg border border-slate-200 outline-none focus:ring-1 focus:ring-[var(--color-beac-primary)]/30"
                    />
                  </div>
                </div>
                <div className="mt-4 flex justify-end">
                                  <button
                                    onClick={() => alert(`Constantes enregistrées : Poids ${poids} kg, Pouls ${pouls} bpm`)}
                                    className="px-4 py-2 bg-green-800 text-white rounded-lg"
                                  >
                                    Enregistrer
                                  </button>
                                </div>
              </div>

              {/* Consultations du jour */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold text-[#0F172A]">
                    Consultations du jour
                  </h3>
                  <button className="text-sm font-medium text-[#0D9488] hover:text-teal-700">
                    Voir tout
                  </button>
                </div>

                <div className="space-y-5">
                  <DayConsultItem
                    time="09:30"
                    init="JD"
                    name="Jean Dupont"
                    motif="Consultation générale"
                    status="En cours"
                    color="bg-blue-600"
                  />
                  <DayConsultItem
                    time="11:00"
                    init="MM"
                    name="Marie Martin"
                    motif="Suivi de traitement"
                    status="À venir"
                    color="bg-pink-500"
                  />
                  <DayConsultItem
                    time="14:30"
                    init="PB"
                    name="Paul Bernard"
                    motif="Douleur abdominale"
                    status="À venir"
                    color="bg-blue-500"
                  />
                  <DayConsultItem
                    time="16:00"
                    init="SL"
                    name="Sophie Leroy"
                    motif="Contrôle médical"
                    status="À venir"
                    color="bg-green-500"
                  />
                </div>

                <button className="w-full mt-6 py-3 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition flex items-center justify-center gap-2">
                  <Calendar size={16} /> Voir le planning complet
                </button>
              </div>

              {/* Statistiques du jour */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                <h3 className="text-lg font-bold text-[#0F172A] mb-4">
                  Statistiques du jour
                </h3>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <StatCard
                    icon={<Calendar size={20} className="text-[#0F172A]" />}
                    count="12"
                    label="Total"
                  />
                  <StatCard
                    icon={<CheckCircle2 size={20} className="text-[#22C55E]" />}
                    count="7"
                    label="Terminées"
                  />
                  <StatCard
                    icon={<Clock size={20} className="text-[#F59E0B]" />}
                    count="4"
                    label="À venir"
                  />
                  <StatCard
                    icon={<XCircle size={20} className="text-[#EF4444]" />}
                    count="1"
                    label="Annulée"
                  />
                </div>
              </div>

              {/* Rappels */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                <h3 className="text-lg font-bold text-[#0F172A] mb-4">
                  Rappels importants
                </h3>
                <div className="space-y-3">
                  <ReminderItem
                    icon={<Calendar className="text-purple-500" size={18} />}
                    title="N'oubliez pas la réunion d'équipe"
                    desc="Aujourd'hui à 17h00"
                    bg="bg-purple-50"
                  />
                  <ReminderItem
                    icon={<Pill className="text-[#F59E0B]" size={18} />}
                    title="Vérifier le stock de médicaments"
                    desc="Il reste 5 articles en stock faible"
                    bg="bg-orange-50"
                  />
                  <ReminderItem
                    icon={<FileText className="text-[#0D9488]" size={18} />}
                    title="Mettre à jour les protocoles"
                    desc="Dernière mise à jour : 15/05/2024"
                    bg="bg-teal-50"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

// --- SOUS-COMPOSANTS UTILITAIRES ---

function NavItem({
  icon,
  label,
  active = false,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
}) {
  return (
    <a
      href="#"
      className={`flex items-center gap-3 px-4 py-3 rounded-xl transition ${
        active
          ? "bg-teal-500/10 text-[#0D9488] border-l-4 border-[#0D9488]"
          : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 border-l-4 border-transparent"
      }`}
    >
      {icon}
      <span className="font-medium text-sm">{label}</span>
    </a>
  );
}

function Zap({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
    </svg>
  );
}

interface TableRowProps {
  init: string;
  name: string;
  age: string;
  id: string;
  motif: string;
  type: string;
  date: string;
  time: string;
  nurse: string;
  color: string;
}

function TableRow({
  init,
  name,
  age,
  id,
  motif,
  type,
  date,
  time,
  nurse,
  color,
}: TableRowProps) {
  return (
    <tr className="hover:bg-slate-50 transition group">
      <td className="py-4">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-full text-white flex items-center justify-center font-bold text-sm ${color}`}
          >
            {init}
          </div>
          <div>
            <p className="font-medium text-[#0F172A]">{name}</p>
            <p className="text-xs text-slate-500">
              {age} ans • ID: {id}
            </p>
          </div>
        </div>
      </td>
      <td className="py-4">
        <p className="font-medium text-[#0F172A]">{motif}</p>
        <p className="text-xs text-slate-500">{type}</p>
      </td>
      <td className="py-4">
        <p className="font-medium text-[#0F172A]">{date}</p>
        <p className="text-xs text-slate-500">{time}</p>
      </td>
      <td className="py-4">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-slate-200 overflow-hidden">
            <img src="/api/placeholder/24/24" alt="" />
          </div>
          <p className="text-sm text-slate-600">{nurse}</p>
        </div>
      </td>
      <td className="py-4 text-right">
        <button className="p-2 text-slate-400 hover:text-[#0D9488] opacity-0 group-hover:opacity-100 transition">
          <MoreHorizontal size={18} />
        </button>
      </td>
    </tr>
  );
}

interface DayConsultItemProps {
  time: string;
  init: string;
  name: string;
  motif: string;
  status: string;
  color: string;
}

function DayConsultItem({
  time,
  init,
  name,
  motif,
  status,
  color,
}: DayConsultItemProps) {
  return (
    <div className="flex items-center gap-4">
      <div className="w-12 text-sm font-bold text-slate-700">{time}</div>
      <div
        className={`w-10 h-10 rounded-full text-white flex items-center justify-center font-bold text-sm shrink-0 ${color}`}
      >
        {init}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-[#0F172A] truncate">{name}</p>
        <p className="text-xs text-slate-500 truncate">{motif}</p>
      </div>
      <div>
        {status === "En cours" ? (
          <span className="inline-block px-3 py-1 bg-blue-50 text-blue-600 text-xs font-medium rounded-full">
            En cours
          </span>
        ) : (
          <span className="inline-block px-3 py-1 bg-slate-100 text-slate-600 text-xs font-medium rounded-full">
            À venir
          </span>
        )}
      </div>
    </div>
  );
}

interface StatCardProps {
  icon: React.ReactNode;
  count: string | number;
  label: string;
}

function StatCard({ icon, count, label }: StatCardProps) {
  return (
    <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 flex flex-col items-center justify-center text-center">
      <div className="mb-2">{icon}</div>
      <p className="text-2xl font-bold text-[#0F172A]">{count}</p>
      <p className="text-[10px] uppercase font-semibold text-slate-500 mt-1">
        {label}
      </p>
    </div>
  );
}

interface ReminderItemProps {
  icon: React.ReactNode;
  title: string;
  desc: string;
  bg: string;
}

function ReminderItem({ icon, title, desc, bg }: ReminderItemProps) {
  return (
    <div className="flex items-center gap-4 p-3 rounded-xl hover:bg-slate-50 transition border border-transparent hover:border-slate-100 cursor-pointer">
      <div
        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${bg}`}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-[#0F172A] truncate">{title}</p>
        <p className="text-xs text-slate-500 truncate">{desc}</p>
      </div>
    </div>
  );
}
