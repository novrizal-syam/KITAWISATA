// Small single-series bar charts for the spending report (one hue, values labelled directly).
// Each bar shows its exact value in a tooltip on hover or keyboard focus.
import { rp } from "@/lib/format";

export function HBarList({ rows, label }: { rows: { name: string; value: number; display: string }[]; label: string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="flex flex-col gap-2.5" aria-label={label}>
      {rows.map((r) => (
        <li key={r.name} className="group relative grid grid-cols-[minmax(0,9rem)_1fr_auto] items-center gap-3 outline-none" tabIndex={0}>
          <span className="truncate">{r.name}</span>
          <span className="h-2.5 rounded-full bg-grey-t" aria-hidden>
            <span className="block h-full rounded-full bg-red" style={{ width: `${Math.max(2, (r.value / max) * 100)}%` }} />
          </span>
          <b className="num text-right">{r.display}</b>
          <span role="tooltip" className="pointer-events-none absolute -top-8 left-36 z-10 hidden rounded-md bg-ink px-2 py-1 text-xs font-semibold whitespace-nowrap text-white group-hover:block group-focus:block">
            {r.name}: {rp(r.value)}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function MonthBars({ bars, label }: { bars: { key: string; name: string; value: number; display: string; current: boolean }[]; label: string }) {
  const max = Math.max(1, ...bars.map((b) => b.value));
  return (
    <div role="list" aria-label={label} className="flex h-52 items-end gap-4 border-b border-line2 px-2 pt-6">
      {bars.map((b) => (
        <div key={b.key} role="listitem" tabIndex={0} className="group relative flex h-full flex-1 flex-col items-center justify-end gap-1 outline-none">
          <span className="num text-[12px] font-bold">{b.display}</span>
          <span className={`block w-full max-w-14 rounded-t ${b.current ? "bg-red" : "bg-bar-muted"}`} style={{ height: `${Math.max(1, (b.value / max) * 80)}%` }} aria-hidden />
          <span role="tooltip" className="pointer-events-none absolute -top-2 z-10 hidden rounded-md bg-ink px-2 py-1 text-xs font-semibold whitespace-nowrap text-white group-hover:block group-focus:block">
            {b.name}: {rp(b.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

export function MonthLabels({ names }: { names: string[] }) {
  return <div className="mt-1.5 flex gap-4 px-2">{names.map((n) => <span key={n} className="note flex-1 text-center">{n}</span>)}</div>;
}
