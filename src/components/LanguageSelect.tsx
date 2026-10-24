import { LANGUAGES, LANGUAGE_NAME, type Language } from "../i18n";

/** The language a person sees the app, the alerts and the emails in. Chosen by the admin, per account. */
export function LanguageSelect({
  value,
  onChange,
  disabled,
  id,
}: {
  value: Language;
  onChange: (language: Language) => void;
  disabled?: boolean;
  id?: string;
}) {
  return (
    <select
      id={id}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value as Language)}
      className="field-input rounded-xl border border-slate-300 px-3 py-2 text-sm disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-white"
    >
      {LANGUAGES.map((language) => (
        <option key={language} value={language}>
          {LANGUAGE_NAME[language]}
        </option>
      ))}
    </select>
  );
}
