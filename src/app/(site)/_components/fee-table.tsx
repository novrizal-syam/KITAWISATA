import { rp } from "@/lib/format";
import type { T } from "@/i18n";

/** The cancellation fee schedule a traveller agrees to. */
export function FeeTable({ tiers, total, t }: { tiers: { minDaysBefore: number; feePercent: number; minFee: number }[]; total?: number; t: T }) {
  const sorted = [...tiers].sort((a, b) => b.minDaysBefore - a.minDaysBefore);
  const last = sorted[sorted.length - 1];
  const fee = (pct: number, min: number) => (total ? ` · ${rp(Math.min(total, Math.max(Math.round((total * pct) / 100), min)))}` : "");
  return (
    <table className="w-full text-[14px]">
      <thead><tr className="border-b border-line text-left text-[11.5px] tracking-[.06em] text-muted uppercase"><th className="py-2">{t("fees.when")}</th><th className="py-2 text-right">{t("fees.fee")}</th></tr></thead>
      <tbody>
        {sorted.map((x) => (
          <tr key={x.minDaysBefore} className="border-b border-line">
            <td className="py-2">{t("fees.atLeast", { days: x.minDaysBefore })}</td>
            <td className="num py-2 text-right">{x.feePercent}%{x.minFee ? ` (${t("fees.min", { amount: rp(x.minFee) })})` : ""}{fee(x.feePercent, x.minFee)}</td>
          </tr>
        ))}
        {last && <tr><td className="py-2">{t("fees.later", { days: last.minDaysBefore })}</td><td className="num py-2 text-right">100%{total ? ` · ${rp(total)}` : ""}</td></tr>}
      </tbody>
    </table>
  );
}
