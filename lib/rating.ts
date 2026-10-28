export const ratingPattern = "[0-9]{1,2}\\.[0-9]{1,2}";
export const ratingHint =
  "Nhập dạng 3.5 hoặc 3.45; dùng dấu chấm, tối đa 2 chữ số mỗi phía.";
export const validRating = (value: unknown): value is string =>
  typeof value === "string" &&
  new RegExp("^" + ratingPattern + "$").test(value);
export function ratingText(data: Record<string, any>): string {
  return typeof data.rating === "string"
    ? data.rating
    : typeof data.level === "string"
      ? data.level
      : String(data.points ?? "");
}
export function numericRating(value: string): number | null {
  return validRating(value) ? Number(value) : null;
}
