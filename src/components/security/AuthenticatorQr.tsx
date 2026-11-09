import qrcode from "qrcode-generator";
import { useMemo } from "react";
import { useT } from "../../i18n";

/** The QR code of an otpauth:// address, drawn as an SVG (always dark on white, whatever the theme: scanners need the contrast). */
export function AuthenticatorQr({ uri, size = 176, label }: { uri: string; size?: number; label?: string }) {
  const t = useT();
  const { cells, count } = useMemo(() => {
    const qr = qrcode(0, "M");
    qr.addData(uri);
    qr.make();
    const total = qr.getModuleCount();
    const dark: Array<[number, number]> = [];
    for (let row = 0; row < total; row++) for (let col = 0; col < total; col++) if (qr.isDark(row, col)) dark.push([row, col]);
    return { cells: dark, count: total };
  }, [uri]);

  const quiet = 3; // the blank border a QR code needs around it
  const box = count + quiet * 2;
  return (
    <svg
      role="img"
      aria-label={label ?? t("security.qrAlt")}
      viewBox={`0 0 ${box} ${box}`}
      width={size}
      height={size}
      shapeRendering="crispEdges"
      className="rounded-xl bg-white"
    >
      <rect width={box} height={box} fill="#fff" />
      {cells.map(([row, col]) => (
        <rect key={`${row}-${col}`} x={col + quiet} y={row + quiet} width="1" height="1" fill="#0b1220" />
      ))}
    </svg>
  );
}
