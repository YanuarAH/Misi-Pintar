/** Format tampilan khas Indonesia. */

const rupiah = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const plainNumber = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 });

const dateTime = new Intl.DateTimeFormat("id-ID", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Jakarta",
});

const dateOnly = new Intl.DateTimeFormat("id-ID", {
  dateStyle: "medium",
  timeZone: "Asia/Jakarta",
});

export function formatRupiah(value: number): string {
  return rupiah.format(value);
}

export function formatNumber(value: number): string {
  return plainNumber.format(value);
}

export function formatDateTime(value: Date | string | null | undefined): string {
  if (!value) return "-";
  return `${dateTime.format(new Date(value))} WIB`;
}

export function formatDate(value: Date | string | null | undefined): string {
  if (!value) return "-";
  return dateOnly.format(new Date(value));
}

export function formatDuration(minutes: number): string {
  if (minutes < 1) return "kurang dari 1 menit";
  return `sekitar ${Math.round(minutes)} menit`;
}

export function percent(part: number, total: number): number {
  if (!total) return 0;
  return Math.round((part / total) * 100);
}
