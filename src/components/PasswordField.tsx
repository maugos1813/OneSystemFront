import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";

/** A password box with the eye that shows what was typed (so a password dictated to someone else isn't typed blind). */
export function PasswordField({
  value,
  onChange,
  placeholder,
  required,
  minLength,
  autoFocus,
  className = "",
  inputClassName = "",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  required?: boolean;
  minLength?: number;
  autoFocus?: boolean;
  className?: string;
  inputClassName?: string;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div className={`relative ${className}`}>
      <input
        type={visible ? "text" : "password"}
        required={required}
        minLength={minLength}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoFocus={autoFocus}
        autoComplete="new-password"
        className={`field-input w-full border border-slate-300 pr-9 text-sm dark:border-white/10 dark:bg-white/5 dark:text-white ${inputClassName}`}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
        title={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
        className="absolute inset-y-0 right-0 flex items-center px-2.5 text-slate-400 hover:text-slate-700 dark:hover:text-white"
      >
        {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}
