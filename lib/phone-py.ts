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
