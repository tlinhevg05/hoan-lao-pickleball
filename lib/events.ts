import type { Tournament } from "./types";
export const deadlineAt = (date: string) =>
  new Date(date + "T23:59:59.999+07:00").getTime();
export const deadlinePassed = (
  t: Pick<Tournament, "deadline">,
  now = Date.now(),
) => now > deadlineAt(t.deadline);
export function eventStatus(
  t: Pick<Tournament, "status" | "deadline" | "opensAt"> & {
    officialAt?: string | null;
  },
  now = Date.now(),
): "open" | "soon" | "closed" | "finalized" {
  if (t.officialAt) return "finalized";
  if (t.status === "closed" || deadlinePassed(t, now)) return "closed";
  if (t.opensAt && now < new Date(t.opensAt + "T00:00:00+07:00").getTime())
    return "soon";
  return "open";
}
export function compareEvents(a: Tournament, b: Tournament) {
  const order = { open: 0, soon: 1, closed: 2, finalized: 3 };
  return (
    order[eventStatus(a)] - order[eventStatus(b)] ||
    (eventStatus(a) === "closed"
      ? b.date.localeCompare(a.date)
      : a.date.localeCompare(b.date)) ||
    a.id.localeCompare(b.id)
  );
}
export function rejectionsPublished(
  t: Pick<Tournament, "deadline" | "officialAt">,
) {
  return !!t.officialAt && deadlinePassed(t);
}
export const isDoubles = (category: string) =>
  /^đôi(?:\s|$)/iu.test(category.trim());
export const pairingLabel = (mode: Tournament["pairingMode"]) =>
  mode === "self"
    ? "VĐV đăng ký cùng đồng đội"
    : mode === "draw"
      ? "BTC ghép cặp"
      : "";
export function feeAmountOf(d: Record<string, any>): string {
  if (typeof d.feeAmount === "string") return d.feeAmount;
  return String(d.fee || "").replace(/\D/g, "");
}
export function formatFee(
  amount: string,
  unit: "athlete" | "pair" = "athlete",
) {
  return amount !== "" && /^\d+$/.test(amount)
    ? Number(amount).toLocaleString("vi-VN") +
        " đồng/" +
        (unit === "pair" ? "cặp" : "VĐV")
    : "Sẽ cập nhật";
}

export function nextEventTransitionDelay(
  tournaments: Pick<Tournament, "opensAt" | "deadline">[],
  now = Date.now(),
) {
  const times = tournaments
    .flatMap((t) => [
      new Date(t.opensAt + "T00:00:00+07:00").getTime(),
      deadlineAt(t.deadline) + 1,
    ])
    .filter((v) => Number.isFinite(v) && v > now);
  return times.length
    ? Math.min(2147483647, Math.min(...times) - now + 50)
    : null;
}
