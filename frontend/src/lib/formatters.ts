const STROOPS_PER_XLM = BigInt(10_000_000);

type StroopsInput = bigint | number | string;

export interface XlmFormatOptions {
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
}

export interface AddressFormatOptions {
  startChars?: number;
  endChars?: number;
}

function normalizeStroops(value: StroopsInput): bigint {
  if (typeof value === "bigint") {
    return value;
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value) || !Number.isInteger(value)) {
      throw new Error("Stroops value must be a finite integer.");
    }

    return BigInt(value);
  }

  const normalized = value.trim();
  if (!/^-?\d+$/.test(normalized)) {
    throw new Error("Stroops value must be an integer string.");
  }

  return BigInt(normalized);
}

export function formatXlm(
  stroops: StroopsInput,
  options: XlmFormatOptions = {},
): string {
  const {
    minimumFractionDigits = 2,
    maximumFractionDigits = 7,
  } = options;

  if (
    minimumFractionDigits < 0 ||
    maximumFractionDigits < minimumFractionDigits ||
    maximumFractionDigits > 7
  ) {
    throw new Error("Invalid XLM fraction digit configuration.");
  }

  const value = normalizeStroops(stroops);
  const sign = value < 0 ? "-" : "";
  const absoluteValue = value < 0 ? -value : value;
  const whole = absoluteValue / STROOPS_PER_XLM;
  const fraction = absoluteValue % STROOPS_PER_XLM;

  let fractionText = fraction.toString().padStart(7, "0");
  fractionText = fractionText.slice(0, maximumFractionDigits);
  fractionText = fractionText.replace(/0+$/, "");

  if (fractionText.length < minimumFractionDigits) {
    fractionText = fractionText.padEnd(minimumFractionDigits, "0");
  }

  const wholeText = whole.toString();
  return `${sign}${wholeText}.${fractionText || "0".repeat(minimumFractionDigits)}`;
}

export function formatAddress(
  address: string,
  options: AddressFormatOptions = {},
): string {
  const { startChars = 4, endChars = 4 } = options;
  const normalized = address.trim();

  if (!normalized) {
    return "";
  }

  const minimumVisibleLength = startChars + endChars + 3;
  if (normalized.length <= minimumVisibleLength) {
    return normalized;
  }

  return `${normalized.slice(0, startChars)}...${normalized.slice(-endChars)}`;
}

export function formatAbsoluteDate(
  value: Date | string | number,
  locale = "en-US",
): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error("Invalid date value.");
  }

  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function formatRelativeDate(
  value: Date | string | number,
  now: Date = new Date(),
  locale = "en-US",
): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error("Invalid date value.");
  }

  const diffInSeconds = Math.round((date.getTime() - now.getTime()) / 1000);
  const formatter = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });

  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ["year", 31_536_000],
    ["month", 2_592_000],
    ["week", 604_800],
    ["day", 86_400],
    ["hour", 3_600],
    ["minute", 60],
    ["second", 1],
  ];

  for (const [unit, unitSeconds] of units) {
    if (Math.abs(diffInSeconds) >= unitSeconds || unit === "second") {
      return formatter.format(Math.round(diffInSeconds / unitSeconds), unit);
    }
  }

  return formatter.format(0, "second");
}
