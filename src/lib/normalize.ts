/**
 * Normalisasi jawaban angka.
 *
 * Aturan (didokumentasikan juga di README):
 *  - spasi dan awalan "Rp" diabaikan
 *  - koma SELALU dianggap tanda desimal (kebiasaan Indonesia): "1,5" = 1.5
 *  - titik dianggap pemisah ribuan bila polanya 1-3 digit lalu kelompok 3 digit
 *    ("25.500" = 25500, "1.500" = 1500); selain itu titik adalah desimal ("2.5" = 2.5)
 *  - bila titik dan koma muncul bersamaan, pemisah yang terakhir adalah desimal
 *  - "3/4" diterima sebagai pecahan
 *  - teks lain (huruf, satuan) ditolak, tidak "ditebak"
 */

function parseDecimalToken(token: string): number | null {
  if (!/^[+-]?\d[\d.,]*$/.test(token)) return null;

  const sign = token.startsWith("-") ? -1 : 1;
  let body = token.replace(/^[+-]/, "");
  if (!body) return null;

  const dots = (body.match(/\./g) ?? []).length;
  const commas = (body.match(/,/g) ?? []).length;

  if (dots > 0 && commas > 0) {
    const lastDot = body.lastIndexOf(".");
    const lastComma = body.lastIndexOf(",");
    if (lastComma > lastDot) body = body.replace(/\./g, "").replace(/,/g, ".");
    else body = body.replace(/,/g, "");
  } else if (commas > 0) {
    if (commas > 1) return null;
    body = body.replace(",", ".");
  } else if (dots > 0) {
    if (/^\d{1,3}(?:\.\d{3})+$/.test(body)) {
      body = body.replace(/\./g, "");
    } else if (dots > 1) {
      return null;
    }
  }

  if (!/^\d+(?:\.\d+)?$/.test(body)) return null;
  const value = Number(body);
  if (!Number.isFinite(value)) return null;
  return sign * value;
}

/** Mengubah input mentah pengguna menjadi angka, atau null bila tidak valid. */
export function parseNumericAnswer(raw: string): number | null {
  if (typeof raw !== "string") return null;

  let text = raw.normalize("NFKC").trim().toLowerCase();
  if (!text) return null;

  text = text.replace(/\s+/g, "").replace(/^rp\.?/, "");
  if (!text) return null;

  const fraction = text.match(/^([+-]?\d+(?:[.,]\d+)?)\/(\d+(?:[.,]\d+)?)$/);
  if (fraction) {
    const numerator = parseDecimalToken(fraction[1]);
    const denominator = parseDecimalToken(fraction[2]);
    if (numerator === null || denominator === null || denominator === 0) return null;
    return numerator / denominator;
  }

  return parseDecimalToken(text);
}

/** Nilai dari jawaban resmi yang tersimpan (boleh berupa pecahan "3/4"). */
export function answerValue(correctAnswer: string): number | null {
  return parseNumericAnswer(correctAnswer);
}

export function numbersMatch(a: number, b: number): boolean {
  return Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(b));
}

export function isNumericAnswerCorrect(correctAnswer: string, submitted: string): boolean {
  const expected = parseNumericAnswer(correctAnswer);
  const actual = parseNumericAnswer(submitted);
  if (expected === null || actual === null) return false;
  return numbersMatch(actual, expected);
}

/** Membandingkan jawaban pilihan ganda secara toleran terhadap spasi/ukuran huruf. */
export function isChoiceAnswerCorrect(correctAnswer: string, submitted: string): boolean {
  const clean = (value: string) => value.trim().replace(/\s+/g, " ").toLocaleLowerCase("id-ID");
  return clean(correctAnswer) === clean(submitted);
}

export function formatDecimalID(value: number, maxFractionDigits = 4): string {
  return new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: maxFractionDigits,
    useGrouping: false,
  }).format(value);
}

/** Bentuk kanonik untuk disimpan: tanpa pemisah ribuan, titik desimal. */
export function canonicalNumeric(value: number): string {
  if (!Number.isFinite(value)) return "";
  return String(Number(value.toFixed(6)));
}
