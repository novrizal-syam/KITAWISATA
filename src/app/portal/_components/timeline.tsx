import { currentStep } from "@/domain/approval";
import { fmtDay } from "@/lib/format";
import type { SppdWithDetails } from "@/server/portal";

const KIND = { SUPERIOR: "Approval", FINANCE: "Finance budget check" } as const;

export function ApprovalTimeline({ s }: { s: SppdWithDetails }) {
  const now = s.status === "PENDING_APPROVAL" ? currentStep(s.steps) : null;
  const items: { state: "done" | "now" | "bad" | "later"; title: string; sub: string }[] = [
    { state: "done", title: `Submitted by ${s.employee.name}`, sub: s.submittedAt ? fmtDay(s.submittedAt) : "" },
    ...s.steps.map((st) => ({
      state: st.decision === "APPROVED" ? "done" as const : st.decision === "REJECTED" ? "bad" as const : now?.id === st.id ? "now" as const : "later" as const,
      title: `${KIND[st.kind]}: ${st.approver.name}${st.approver.title ? ` (${st.approver.title})` : ""}`,
      sub: st.decision === "APPROVED" ? `Approved ${fmtDay(st.decidedAt!)}${st.note ? ` · “${st.note}”` : ""}`
        : st.decision === "REJECTED" ? `Rejected ${fmtDay(st.decidedAt!)} · “${st.note}”`
        : now?.id === st.id ? "Waiting for a decision" : s.status === "REJECTED" ? "Not needed" : "Next in line",
    })),
  ];
  const dot = { done: "bg-green text-white", now: "border-2 border-amber bg-amber-t text-amber", bad: "bg-red text-white", later: "border-2 border-line2 bg-white text-muted" };
  const icon = { done: "✓", now: "…", bad: "✕", later: "" };
  return (
    <ol className="flex flex-col">
      {items.map((it, i) => (
        <li key={i} className="relative flex gap-3 pb-4 last:pb-0">
          {i < items.length - 1 && <span aria-hidden className="absolute top-7 left-[13px] h-[calc(100%-28px)] w-0.5 bg-line" />}
          <span aria-hidden className={`grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold ${dot[it.state]}`}>{icon[it.state]}</span>
          <div><b>{it.title}</b><div className="note">{it.sub}</div></div>
        </li>
      ))}
    </ol>
  );
}
