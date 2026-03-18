// Utilities for forcing "English digits" (ASCII 0-9) regardless of device locale.
// This mainly matters for numeric inputs and any code that uses locale-based formatting.

export function normalizeDigitsToEnglish(input) {
  if (input == null) return "";
  const str = String(input);

  // Arabic-Indic: ٠١٢٣٤٥٦٧٨٩ (U+0660..U+0669)
  // Eastern Arabic-Indic: ۰۱۲۳۴۵۶۷۸۹ (U+06F0..U+06F9)
  return str.replace(/[٠-٩۰-۹]/g, (d) => String(Number(d)));
}
