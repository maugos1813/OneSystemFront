import { Battery, Satellite, SignalHigh, Zap } from "lucide-react";
import type { ReactNode } from "react";
import { AVL_ID, type Position } from "../../lib/types";

function Row({
  icon,
  label,
  value,
  pct,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  pct: number;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="brand-gradient-soft flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-blue-600">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center justify-between">
          <span className="text-xs font-medium tracking-wide text-slate-400 uppercase">{label}</span>
          <span className="text-sm font-semibold text-slate-900">{value}</span>
        </div>
        <div className="h-1.5 rounded-full bg-violet-100">
          <div
            className="brand-gradient h-1.5 rounded-full"
            style={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
          />
        </div>
      </div>
    </div>
  );
}

export function StatusList({ position }: { position: Position | null }) {
  if (!position) {
    return <p className="text-sm text-slate-400">Sin datos todavía.</p>;
  }

  const externalVoltage = Number(position.ioData[AVL_ID.EXTERNAL_VOLTAGE] ?? 0) / 1000;
  const batteryVoltage = Number(position.ioData[AVL_ID.BATTERY_VOLTAGE] ?? 0) / 1000;
  const gsmSignal = Number(position.ioData["21"] ?? 0); // 0-5 scale

  return (
    <div className="space-y-5">
      <Row
        icon={<Zap className="h-4 w-4" />}
        label="Voltaje externo"
        value={`${externalVoltage.toFixed(1)} V`}
        pct={((externalVoltage - 9) / (15 - 9)) * 100}
      />
      <Row
        icon={<Battery className="h-4 w-4" />}
        label="Batería dispositivo"
        value={`${batteryVoltage.toFixed(1)} V`}
        pct={((batteryVoltage - 3.3) / (4.2 - 3.3)) * 100}
      />
      <Row
        icon={<Satellite className="h-4 w-4" />}
        label="Satélites GPS"
        value={String(position.satellites)}
        pct={(position.satellites / 16) * 100}
      />
      <Row
        icon={<SignalHigh className="h-4 w-4" />}
        label="Señal GSM"
        value={`${gsmSignal}/5`}
        pct={(gsmSignal / 5) * 100}
      />
    </div>
  );
}
