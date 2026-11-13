import { describe, expect, it } from "vitest";
import { ApprovalRoutingError, currentStep, planApprovalChain, type OrgPerson } from "../approval";

// The prototype's org chart (PT Nusantara Trading Indonesia).
const org = (overrides: Partial<Record<string, Partial<OrgPerson>>> = {}) => {
  const base: OrgPerson[] = [
    { id: "rina", grade: "STAFF", managerId: "budi", isFinanceAdmin: false },
    { id: "budi", grade: "MANAGER", managerId: "andi", isFinanceAdmin: false },
    { id: "fajar", grade: "STAFF", managerId: "hendra", isFinanceAdmin: false },
    { id: "hendra", grade: "MANAGER", managerId: "andi", isFinanceAdmin: false },
    { id: "sari", grade: "STAFF", managerId: "andi", isFinanceAdmin: true },
    { id: "andi", grade: "DIRECTOR", managerId: null, isFinanceAdmin: false },
  ];
  return new Map(base.map((p) => [p.id, { ...p, ...overrides[p.id] }]));
};
const T = 10_000_000;
const ids = (steps: { kind: string; approverId: string }[]) => steps.map((s) => `${s.kind}:${s.approverId}`);

describe("planApprovalChain", () => {
  it("goes up the reporting line to the Director", () => {
    expect(ids(planApprovalChain("rina", org(), 6_676_000, T))).toEqual(["SUPERIOR:budi", "SUPERIOR:andi"]);
  });

  it("adds a Finance check above the threshold", () => {
    expect(ids(planApprovalChain("rina", org(), 12_000_000, T))).toEqual(["SUPERIOR:budi", "SUPERIOR:andi", "FINANCE:sari"]);
  });

  it("does not add Finance at exactly the threshold", () => {
    expect(planApprovalChain("rina", org(), T, T)).toHaveLength(2);
  });

  it("sends a Director's own request to Finance, never to themselves", () => {
    expect(ids(planApprovalChain("andi", org(), 20_920_000, T))).toEqual(["FINANCE:sari"]);
    expect(ids(planApprovalChain("andi", org(), 1_000_000, T))).toEqual(["FINANCE:sari"]);
  });

  it("stops at the Director even if the Director has a manager set", () => {
    expect(ids(planApprovalChain("budi", org({ andi: { managerId: "board" } }), 1, T))).toEqual(["SUPERIOR:andi"]);
  });

  it("does not let the only finance admin check their own request", () => {
    expect(ids(planApprovalChain("sari", org(), 15_000_000, T))).toEqual(["SUPERIOR:andi"]);
  });

  it("fails when nobody can approve", () => {
    const solo = new Map([["x", { id: "x", grade: "DIRECTOR", managerId: null, isFinanceAdmin: true } as OrgPerson]]);
    expect(() => planApprovalChain("x", solo, 1, T)).toThrow(ApprovalRoutingError);
  });

  it("detects a loop in the reporting line", () => {
    const loop = org({ budi: { managerId: "rina" } });
    expect(() => planApprovalChain("rina", loop, 1, T)).toThrow(/loops/);
  });
});

describe("currentStep", () => {
  it("returns the first pending step in order, or null once decided or rejected", () => {
    expect(currentStep([{ order: 2, decision: "PENDING" }, { order: 1, decision: "APPROVED" }])?.order).toBe(2);
    expect(currentStep([{ order: 1, decision: "APPROVED" }])).toBeNull();
    expect(currentStep([{ order: 1, decision: "REJECTED" }, { order: 2, decision: "PENDING" }])).toBeNull();
  });
});
