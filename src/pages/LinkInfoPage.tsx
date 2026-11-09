import { QrCode } from "lucide-react";
import { Link } from "react-router-dom";
import { useT } from "../i18n";

/** Where a phone's camera app lands when it reads the QR of the web's login: it explains that the code is scanned from inside the app. */
export function LinkInfoPage() {
  const t = useT();
  return (
    <main className="flex min-h-dvh items-center justify-center bg-[#071a4a] px-6 py-10 text-white">
      <div className="w-full max-w-sm rounded-3xl border border-sky-300/30 bg-[#0a2260]/55 p-6 text-center shadow-2xl shadow-black/40">
        <QrCode className="mx-auto mb-4 h-12 w-12 text-sky-300" strokeWidth={1.5} />
        <h1 className="mb-2 text-xl font-semibold">{t("vincular.title")}</h1>
        <p className="mb-6 text-sm text-sky-100/90">{t("vincular.body")}</p>
        <Link to="/login" className="inline-block rounded-xl bg-gradient-to-r from-sky-400 via-blue-500 to-violet-500 px-5 py-2.5 text-sm font-semibold text-white">
          {t("vincular.back")}
        </Link>
      </div>
    </main>
  );
}
