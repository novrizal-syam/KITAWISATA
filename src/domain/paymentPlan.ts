// Open Trip split payment, ported from the consumer prototype's splitPlan().
import { addDays, daysBetween } from "./dates";
import { roundThousand } from "./money";

export interface Instalment {
  percent: number;
  due: Date;
  amount: number;
}

/** null means split payment is not offered (14 days or less before departure): pay in full. */
export function splitPlan(total: number, today: Date, departDate: Date): Instalment[] | null {
  const d = daysBetween(today, departDate);
  const down = roundThousand(total * 0.3);
  if (d > 30) {
    const second = roundThousand(total * 0.35);
    return [
      { percent: 30, due: today, amount: down },
      { percent: 35, due: addDays(departDate, -30), amount: second },
      { percent: 35, due: addDays(departDate, -14), amount: total - down - second },
    ];
  }
  if (d > 14) {
    return [
      { percent: 30, due: today, amount: down },
      { percent: 70, due: addDays(departDate, -14), amount: total - down },
    ];
  }
  return null;
}
