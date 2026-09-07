// Normaliza números de WhatsApp paraguayos al formato internacional que exige
// wa.me (595XXXXXXXXX, sin "+", sin "0" inicial). Sin esto, un número guardado
// como "0974719210" hace que WhatsApp diga "falta un código de país".
export function normalizePyWhatsapp(raw: string): string {
  const digits = String(raw || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("595")) return digits;
  if (digits.startsWith("0")) return "595" + digits.slice(1);
  if (digits.length === 9) return "595" + digits; // ej: 974719210
  return digits;
}

// Un celular paraguayo válido, ya normalizado, es "595" + "9" + 8 dígitos
// (12 dígitos en total, ej: 595982625643). Sirve para avisarle al cliente en
// el checkout si el número que escribió está incompleto o mal tipeado, antes
// de que se guarde y de que el vendedor no pueda contactarlo después.
export function isValidPyWhatsapp(raw: string): boolean {
  const normalized = normalizePyWhatsapp(raw);
  return /^5959\d{8}$/.test(normalized);
}
