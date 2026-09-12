"use client";

import { useI18n, LANG_LABELS, Lang } from "@/lib/i18n";

export default function LanguageSwitcher() {
  const { lang, setLang } = useI18n();
  const langs: Lang[] = ["en", "ru", "uz"];

  return (
    <div className="inline-flex overflow-hidden rounded-lg border border-slate-300 bg-white text-xs">
      {langs.map((l) => (
        <button
          key={l}
          onClick={() => setLang(l)}
          className={`px-2.5 py-1 font-medium transition ${
            lang === l
              ? "bg-brand-600 text-white"
              : "text-slate-600 hover:bg-slate-50"
          }`}
        >
          {LANG_LABELS[l]}
        </button>
      ))}
    </div>
  );
}
