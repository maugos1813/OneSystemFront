import { Eye, EyeOff, Pencil, Plus, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useAuth } from "../context/AuthContext";
import { useT } from "../i18n";
import {
  ApiError,
  createSim,
  deleteSim,
  getPlatformOrganization,
  getSimSecrets,
  listPlatformOrganizations,
  listSims,
  updateSim,
  type SimInput,
} from "../lib/api";
import { trackGlow } from "../lib/glow";
import type { PlatformOrganization, SimCard, SimSecrets } from "../lib/types";

const SECRETS_VISIBLE_MS = 15_000;

interface FormState {
  deviceId: string;
  operator: string;
  iccid: string;
  phoneNumber: string;
  nmu: string;
  pin: string;
  puk: string;
  notes: string;
}

const EMPTY_FORM: FormState = { deviceId: "", operator: "TIM", iccid: "", phoneNumber: "", nmu: "", pin: "", puk: "", notes: "" };

function formFromSim(sim: SimCard): FormState {
  return {
    deviceId: sim.deviceId ?? "",
    operator: sim.operator,
    iccid: sim.iccid,
    phoneNumber: sim.phoneNumber ?? "",
    nmu: sim.nmu ?? "",
    pin: "", // never prefilled: the stored value is only fetched on an explicit "show"
    puk: "",
    notes: sim.notes ?? "",
  };
}

const INPUT =
  "field-input w-full rounded-xl border border-slate-300 px-3 py-2 text-sm dark:border-white/10 dark:bg-white/5 dark:text-white";
const LABEL = "mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300";

export function SimsPage() {
  const t = useT();
  const { currentUser } = useAuth();
  // SIMs are OneSystec's: it picks the client they belong to, and that client's devices are the ones it can put them in.
  const [orgs, setOrgs] = useState<PlatformOrganization[]>([]);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [orgDevices, setOrgDevices] = useState<Array<{ id: string; imei: string; plate: string | null }>>([]);
  const [sims, setSims] = useState<SimCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<SimCard | "new" | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [revealed, setRevealed] = useState<Record<string, SimSecrets | "loading">>({});
  const hideTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    listPlatformOrganizations()
      .then((rows) => {
        setOrgs(rows);
        setOrgId((current) => current ?? (rows.find((o) => o.id === currentUser?.orgId) ?? rows[0])?.id ?? null);
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : t("sims.loadClientsFailed")));
  }, [currentUser?.orgId, t]);

  const refetch = useCallback(() => {
    if (!orgId) return;
    setSims([]);
    Promise.all([listSims(orgId), getPlatformOrganization(orgId)])
      .then(([rows, org]) => {
        setSims(rows);
        setOrgDevices(org.deviceList.map((d) => ({ id: d.id, imei: d.imei, plate: d.vehicle?.plate ?? d.vehicle?.name ?? null })));
        setError(null);
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : t("sims.loadFailed")))
      .finally(() => setLoading(false));
  }, [orgId, t]);

  useEffect(() => {
    // Picking the client from inside the new-SIM form must not close that form.
    setEditing((current) => (current === "new" ? current : null));
    refetch();
  }, [refetch]);

  useEffect(() => {
    const timers = hideTimers.current;
    return () => Object.values(timers).forEach(clearTimeout);
  }, []);

  const plateByDevice = useMemo(() => {
    const map = new Map<string, string>();
    for (const d of orgDevices) if (d.plate) map.set(d.id, d.plate);
    return map;
  }, [orgDevices]);

  // A tracker can hold one SIM: offer the free ones, plus the one this SIM already sits in.
  const availableDevices = useMemo(() => {
    const taken = new Set(sims.filter((s) => s.deviceId && (editing === "new" || editing === null || s.id !== editing.id)).map((s) => s.deviceId));
    return orgDevices.filter((d) => !taken.has(d.id));
  }, [orgDevices, sims, editing]);

  function startNew() {
    setEditing("new");
    setForm(EMPTY_FORM);
    setFormError(null);
  }

  function startEdit(sim: SimCard) {
    setEditing(sim);
    setForm(formFromSim(sim));
    setFormError(null);
  }

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
    try {
      const base: SimInput = {
        deviceId: form.deviceId || null,
        operator: form.operator.trim() || "TIM",
        phoneNumber: form.phoneNumber,
        nmu: form.nmu,
        notes: form.notes,
      };
      if (editing === "new") {
        await createSim({ ...base, iccid: form.iccid, pin: form.pin, puk: form.puk }, orgId ?? undefined);
      } else if (editing) {
        // Secrets are only sent when typed, so editing other fields never touches them.
        await updateSim(editing.id, { ...base, iccid: form.iccid, ...(form.pin ? { pin: form.pin } : {}), ...(form.puk ? { puk: form.puk } : {}) }, orgId ?? undefined);
        hideSecrets(editing.id);
      }
      setEditing(null);
      refetch();
    } catch (err) {
      setFormError(err instanceof ApiError || err instanceof Error ? err.message : t("sims.saveFailed"));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(sim: SimCard) {
    if (!confirm(t("sims.confirmDelete", { sim: sim.phoneNumber ?? sim.iccid }))) return;
    try {
      await deleteSim(sim.id, orgId ?? undefined);
      if (editing && editing !== "new" && editing.id === sim.id) setEditing(null);
      refetch();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("sims.deleteFailed"));
    }
  }

  function hideSecrets(id: string) {
    clearTimeout(hideTimers.current[id]);
    setRevealed((current) => {
      const { [id]: _hidden, ...rest } = current;
      return rest;
    });
  }

  async function showSecrets(sim: SimCard) {
    setRevealed((current) => ({ ...current, [sim.id]: "loading" }));
    try {
      const secrets = await getSimSecrets(sim.id, orgId ?? undefined);
      setRevealed((current) => ({ ...current, [sim.id]: secrets }));
      hideTimers.current[sim.id] = setTimeout(() => hideSecrets(sim.id), SECRETS_VISIBLE_MS);
    } catch (err) {
      hideSecrets(sim.id);
      setError(err instanceof Error ? err.message : t("sims.secretsFailed"));
    }
  }

  const editingSim = editing && editing !== "new" ? editing : null;

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-6 lg:p-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-white">{t("sims.title")}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {t("sims.intro")}
          </p>
          <label className="mt-3 flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
            {t("sims.client")}
            <select
              value={orgId ?? ""}
              onChange={(e) => {
                setLoading(true);
                setOrgId(e.target.value);
              }}
              className="field-input rounded-xl border border-slate-300 px-3 py-1.5 text-sm dark:border-white/10 dark:bg-white/5 dark:text-white"
            >
              {orgs.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        {!editing && (
          <button onClick={startNew} className="brand-button flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium">
            <Plus className="h-4 w-4" />
            {t("sims.add")}
          </button>
        )}
      </div>

      {editing && (
        <form
          onSubmit={handleSubmit}
          onMouseMove={trackGlow}
          className="glow float-card mb-6 rounded-2xl border border-white bg-white p-4 shadow-lg shadow-slate-200/50 sm:p-6 dark:border-white/10 dark:bg-[#111729] dark:shadow-black/40"
        >
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              {editingSim ? t("sims.editTitle") : t("sims.newTitle")}
            </p>
            <button
              type="button"
              onClick={() => setEditing(null)}
              aria-label={t("sims.cancel")}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="sm:col-span-2 lg:col-span-3">
              <label className={LABEL} htmlFor="sim-client">
                {t("sims.clientOfSim")}
              </label>
              {/* A SIM belongs to one client. Changing it here switches the whole page to that client (and its devices). */}
              <select
                id="sim-client"
                value={orgId ?? ""}
                disabled={!!editingSim}
                onChange={(e) => {
                  set("deviceId", "");
                  setLoading(true);
                  setOrgId(e.target.value);
                }}
                className={`${INPUT} disabled:opacity-60`}
              >
                {orgs.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="lg:col-span-2">
              <label className={LABEL} htmlFor="sim-device">
                {t("sims.device")}
              </label>
              <select id="sim-device" value={form.deviceId} onChange={(e) => set("deviceId", e.target.value)} className={INPUT}>
                <option value="">{t("sims.unassigned")}</option>
                {availableDevices.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.imei}
                    {plateByDevice.get(d.id) ? ` · ${plateByDevice.get(d.id)}` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={LABEL} htmlFor="sim-operator">
                {t("sims.operator")}
              </label>
              <input id="sim-operator" value={form.operator} onChange={(e) => set("operator", e.target.value)} maxLength={50} className={INPUT} />
            </div>

            <div className="lg:col-span-2">
              <label className={LABEL} htmlFor="sim-iccid">
                {t("sims.iccidLabel")}
              </label>
              <input
                id="sim-iccid"
                required
                value={form.iccid}
                onChange={(e) => set("iccid", e.target.value)}
                placeholder="8939010002782221067-K48H"
                className={`${INPUT} font-mono`}
              />
            </div>
            <div>
              <label className={LABEL} htmlFor="sim-phone">
                {t("sims.phoneLabel")}
              </label>
              <input
                id="sim-phone"
                value={form.phoneNumber}
                onChange={(e) => set("phoneNumber", e.target.value)}
                placeholder="+39 331 5326088"
                inputMode="tel"
                className={INPUT}
              />
            </div>

            <div>
              <label className={LABEL} htmlFor="sim-nmu">
                NMU
              </label>
              <input id="sim-nmu" value={form.nmu} onChange={(e) => set("nmu", e.target.value)} maxLength={20} className={INPUT} />
            </div>
            <div>
              <label className={LABEL} htmlFor="sim-pin">
                PIN
              </label>
              <input
                id="sim-pin"
                value={form.pin}
                onChange={(e) => set("pin", e.target.value)}
                inputMode="numeric"
                autoComplete="off"
                maxLength={8}
                placeholder={editingSim?.hasPin ? t("sims.pinKeep") : "0000"}
                className={INPUT}
              />
            </div>
            <div>
              <label className={LABEL} htmlFor="sim-puk">
                PUK
              </label>
              <input
                id="sim-puk"
                value={form.puk}
                onChange={(e) => set("puk", e.target.value)}
                inputMode="numeric"
                autoComplete="off"
                maxLength={8}
                placeholder={editingSim?.hasPuk ? t("sims.pukKeep") : t("sims.pukDigits")}
                className={INPUT}
              />
            </div>

            <div className="sm:col-span-2 lg:col-span-3">
              <label className={LABEL} htmlFor="sim-notes">
                {t("sims.notes")}
              </label>
              <textarea
                id="sim-notes"
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
                rows={2}
                maxLength={2000}
                placeholder={t("sims.notesPlaceholder")}
                className={INPUT}
              />
            </div>
          </div>

          {formError && <p className="mt-4 text-sm text-red-600 dark:text-red-400">{formError}</p>}

          <div className="mt-5 flex gap-2">
            <button
              type="submit"
              disabled={submitting}
              className="brand-button rounded-xl px-5 py-2 text-sm font-medium disabled:opacity-50"
            >
              {editingSim ? t("sims.saveChanges") : t("sims.save")}
            </button>
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="rounded-xl px-5 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10"
            >
              {t("sims.cancel")}
            </button>
          </div>
        </form>
      )}

      {error && (
        <p className="mb-4 rounded-xl bg-red-50 px-4 py-2 text-sm text-red-600 dark:bg-red-500/10 dark:text-red-400">{error}</p>
      )}

      {loading && <p className="text-sm text-slate-500 dark:text-slate-400">{t("common.loading")}</p>}

      {!loading && !error && sims.length === 0 && (
        <p className="text-sm text-slate-500 dark:text-slate-400">{t("sims.none")}</p>
      )}

      {sims.length > 0 && (
        <div className="float-card overflow-x-auto rounded-2xl border border-white bg-white shadow-lg shadow-slate-200/50 dark:border-white/10 dark:bg-[#111729] dark:shadow-black/40">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="border-b border-violet-100 bg-violet-50/60 text-xs text-slate-500 uppercase dark:border-white/10 dark:bg-white/5 dark:text-slate-400">
              <tr>
                <th className="px-4 py-2 font-medium">{t("sims.colDevice")}</th>
                <th className="px-4 py-2 font-medium">{t("sims.operator")}</th>
                <th className="px-4 py-2 font-medium">{t("sims.colNumber")}</th>
                <th className="px-4 py-2 font-medium">ICCID</th>
                <th className="px-4 py-2 font-medium">NMU</th>
                <th className="px-4 py-2 font-medium">PIN / PUK</th>
                <th className="px-4 py-2 text-right font-medium">{t("sims.colActions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/10">
              {sims.map((sim) => {
                const secrets = revealed[sim.id];
                return (
                  <tr key={sim.id}>
                    <td className="px-4 py-3">
                      {sim.device ? (
                        <>
                          <p className="font-medium text-slate-900 dark:text-white">{sim.vehicle?.plate ?? sim.vehicle?.name ?? t("sims.noVehicle")}</p>
                          <p className="font-mono text-xs text-slate-400 dark:text-slate-500">{sim.device.imei}</p>
                        </>
                      ) : (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500 dark:bg-white/10 dark:text-slate-400">
                          {t("sims.inStock")}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{sim.operator}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-slate-900 dark:text-white">{sim.phoneNumber ?? "—"}</td>
                    <td className="px-4 py-3 font-mono text-xs break-all text-slate-600 dark:text-slate-300">{sim.iccid}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{sim.nmu ?? "—"}</td>
                    <td className="px-4 py-3">
                      {!sim.hasPin && !sim.hasPuk ? (
                        <span className="text-slate-400">—</span>
                      ) : secrets && secrets !== "loading" ? (
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-slate-900 dark:text-white">
                            PIN {secrets.pin ?? "—"} · PUK {secrets.puk ?? "—"}
                          </span>
                          <button
                            onClick={() => hideSecrets(sim.id)}
                            aria-label={t("sims.hidePinPuk")}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-white"
                          >
                            <EyeOff className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => showSecrets(sim)}
                          disabled={secrets === "loading"}
                          className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-violet-600 hover:bg-violet-50 disabled:opacity-50 dark:text-violet-400 dark:hover:bg-white/10"
                        >
                          <Eye className="h-4 w-4" />
                          <span className="font-mono tracking-widest">••••</span> {t("sims.show")}
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <button
                        onClick={() => startEdit(sim)}
                        aria-label={t("sims.edit")}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-violet-50 hover:text-violet-600 dark:hover:bg-white/10"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(sim)}
                        aria-label={t("sims.delete")}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
