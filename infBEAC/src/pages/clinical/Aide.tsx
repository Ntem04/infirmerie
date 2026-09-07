import { useState, useEffect, useRef } from "react";
import {
  LifeBuoy,
  BookOpen,
  MessageSquare,
  FileQuestion,
  ChevronDown,
  Laptop,
  Mic,
  WifiOff,
  Download,
  Lightbulb,
  Keyboard,
  Zap,
} from "lucide-react";

// ─── Hook : déclenche l'animation quand l'élément entre dans le viewport ───
function useReveal(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect(); // ne se redéclenche pas
        }
      },
      { threshold },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return { ref, visible };
}

// ─── Wrapper réutilisable ───
function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const { ref, visible } = useReveal();

  return (
    <div
      ref={ref}
      className={className}
      style={{
        transitionProperty: "opacity, transform",
        transitionDuration: "600ms",
        transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)",
        transitionDelay: `${delay}ms`,
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0px)" : "translateY(28px)",
      }}
    >
      {children}
    </div>
  );
}

export default function Aide() {
  const [activeFaq, setActiveFaq] = useState<number | null>(0);

  const faqs = [
    {
      icon: <Mic className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />,
      question: "Comment fonctionne la dictée vocale ?",
      answer:
        "La dictée vocale utilise le microphone de votre ordinateur. Cliquez sur le bouton 'Dicter' à côté du champ souhaité, parlez clairement, et le texte s'écrira automatiquement. Si votre navigateur vous demande l'autorisation d'utiliser le micro, cliquez sur 'Autoriser'.",
    },
    {
      icon: <WifiOff className="w-5 h-5 text-amber-600 dark:text-amber-400" />,
      question: "Que faire si je vois le message 'Système Déconnecté' ?",
      answer:
        "Ce message indique que l'application n'arrive pas à joindre le serveur de base de données (JSON Server). Vérifiez que votre serveur local tourne bien sur le port 3001. Si le problème persiste, relancez le serveur local.",
    },
    {
      icon: <Download className="w-5 h-5 text-blue-600 dark:text-blue-400" />,
      question: "Où sont sauvegardés mes exports PDF et Excel ?",
      answer:
        "Lorsque vous cliquez sur 'Exporter', le fichier est automatiquement téléchargé dans le dossier 'Téléchargements' de votre ordinateur. Le nom du fichier contient la date du jour pour faciliter le classement.",
    },
    {
      icon: (
        <FileQuestion className="w-5 h-5 text-purple-600 dark:text-purple-400" />
      ),
      question: "Comment corriger une information erronée dans un dossier ?",
      answer:
        "Pour le moment, les actes validés sont immuables pour des raisons de traçabilité médico-légale. Si vous avez fait une erreur, vous devez créer une nouvelle entrée dans le dossier du patient en précisant 'Annule et remplace la saisie précédente'.",
    },
  ];

  const quickCards = [
    {
      icon: <BookOpen className="w-6 h-6" />,
      bg: "bg-blue-50 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400",
      title: "Guide d'utilisation",
      desc: "Consultez le manuel complet pour découvrir toutes les fonctionnalités du système.",
    },
    {
      icon: <Laptop className="w-6 h-6" />,
      bg: "bg-[#fefce8] text-[#9d8c0a] dark:bg-[#8B6914]/20 dark:text-[#c2a712]",
      title: "Problème Technique",
      desc: "Diagnostiquez les problèmes de connexion réseau ou d'accès au matériel (micro).",
    },
    {
      icon: <MessageSquare className="w-6 h-6" />,
      bg: "bg-purple-50 text-purple-600 dark:bg-purple-900/40 dark:text-purple-400",
      title: "Suggestions",
      desc: "Proposez de nouvelles fonctionnalités pour améliorer votre outil de travail quotidien.",
    },
  ];

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto bg-slate-50 dark:bg-slate-950 min-h-screen font-sans space-y-8 text-slate-800 dark:text-white transition-colors duration-200">
      {/* ── HERO : apparaît immédiatement (pas de scroll requis) ── */}
      <Reveal delay={0}>
        <div className="relative overflow-hidden bg-[#c2a712] dark:bg-[#8B6914] rounded-[2rem] p-8 md:p-12 shadow-lg transition-colors">
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-white/20 dark:bg-[#6B4F0F]/50 blur-3xl" />
          <div className="absolute bottom-0 right-32 w-40 h-40 rounded-full bg-white/10 dark:bg-[#a98f0b]/30 blur-2xl" />
          <div className="relative z-10 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/20 dark:bg-white/10 border border-white/30 dark:border-white/20 text-white text-sm font-bold mb-6 shadow-sm">
              <LifeBuoy className="w-4 h-4" /> Centre d'Assistance
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-white mb-4">
              Comment pouvons-nous vous aider ?
            </h1>
            <p className="text-white/95 text-lg">
              Retrouvez ici toutes les informations pour maîtriser l'application
              INFIRMERIE+, de la gestion des patients aux exports de données.
            </p>
          </div>
        </div>
      </Reveal>

      {/* ── CARTES RAPIDES : cascade avec délais décalés ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {quickCards.map((card, index) => (
          <Reveal key={index} delay={index * 100}>
            <div className="h-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm hover:shadow-md hover:border-[#c2a712] dark:hover:border-[#8B6914]/50 transition-all group cursor-pointer">
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform ${card.bg}`}
              >
                {card.icon}
              </div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">
                {card.title}
              </h3>
              <p className="text-sm text-slate-600 dark:text-white/70">
                {card.desc}
              </p>
            </div>
          </Reveal>
        ))}
      </div>

      {/* ── GRILLE FAQ + ASTUCES ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* FAQ */}
        <div className="lg:col-span-2 space-y-6">
          <Reveal delay={0}>
            <h2 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-2">
              <FileQuestion className="w-6 h-6 text-[#c2a712] dark:text-[#fde047]" />
              Questions Fréquentes (FAQ)
            </h2>
          </Reveal>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
            {faqs.map((faq, index) => (
              <Reveal key={index} delay={index * 80}>
                <div className="transition-colors">
                  <button
                    onClick={() =>
                      setActiveFaq(activeFaq === index ? null : index)
                    }
                    className={`w-full flex items-center justify-between p-5 text-left transition-colors ${
                      activeFaq === index
                        ? "bg-slate-50 dark:bg-slate-800/50"
                        : "hover:bg-slate-50/60 dark:hover:bg-slate-800/30"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="shrink-0">{faq.icon}</div>
                      <span
                        className={`font-bold ${
                          activeFaq === index
                            ? "text-[#9d8c0a] dark:text-[#fde047]"
                            : "text-slate-800 dark:text-white"
                        }`}
                      >
                        {faq.question}
                      </span>
                    </div>
                    <ChevronDown
                      className={`w-5 h-5 text-slate-400 dark:text-white/50 transition-transform duration-300 ${
                        activeFaq === index ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  <div
                    className={`overflow-hidden transition-all duration-300 ease-in-out ${
                      activeFaq === index
                        ? "max-h-48 opacity-100"
                        : "max-h-0 opacity-0"
                    }`}
                  >
                    <div className="p-5 pt-0 pb-6 text-slate-600 dark:text-white/80 text-sm leading-relaxed pl-14">
                      {faq.answer}
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>

        {/* ASTUCES */}
        <Reveal delay={120}>
          <div className="space-y-6">
            <h2 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-2">
              <Lightbulb className="w-6 h-6 text-[#c2a712] dark:text-[#fde047]" />
              Astuces & Raccourcis
            </h2>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
              <h3 className="font-bold text-slate-800 dark:text-white mb-2">
                Gagnez du temps au quotidien
              </h3>
              <p className="text-sm text-slate-500 dark:text-white/80 mb-6">
                Utilisez ces fonctionnalités intégrées pour accélérer la saisie
                de vos dossiers médicaux.
              </p>

              <div className="space-y-4">
                {[
                  {
                    bg: "bg-amber-50 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400",
                    icon: <Keyboard className="w-4 h-4" />,
                    title: "Navigation Rapide",
                    desc: (
                      <>
                        Utilisez la touche{" "}
                        <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-md text-[10px] font-mono font-bold mx-1 text-slate-800 dark:text-white shadow-sm">
                          Entrée
                        </kbd>{" "}
                        pour passer automatiquement au champ suivant.
                      </>
                    ),
                  },
                  {
                    bg: "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400",
                    icon: <Zap className="w-4 h-4" />,
                    title: "Prescription Express",
                    desc: "Cliquez sur les suggestions au-dessus de l'ordonnance pour ajouter instantanément un médicament courant.",
                  },
                  {
                    bg: "bg-sky-50 text-sky-600 dark:bg-sky-900/40 dark:text-sky-400",
                    icon: <Mic className="w-4 h-4" />,
                    title: "Assistant Vocal",
                    desc: "Activez la dictée vocale pour formuler vos diagnostics et ordonnances à voix haute.",
                  },
                ].map((tip, i) => (
                  <Reveal key={i} delay={i * 100}>
                    <div className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm hover:border-[#c2a712]/50 dark:hover:border-[#8B6914]/40 transition-colors">
                      <div className={`p-2 rounded-lg shrink-0 ${tip.bg}`}>
                        {tip.icon}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800 dark:text-white">
                          {tip.title}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-white/70 mt-1 leading-relaxed">
                          {tip.desc}
                        </p>
                      </div>
                    </div>
                  </Reveal>
                ))}
              </div>

              <div className="mt-8 pt-4 border-t border-slate-100 dark:border-slate-800 text-center">
                <p className="text-xs font-bold text-slate-400 dark:text-white/50">
                  INFIRMERIE+ V1.0.0
                </p>
                <p className="text-[10px] text-slate-400 dark:text-white/40 mt-1">
                  Développé pour la BEAC Agence de Douala
                </p>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </div>
  );
}
