// Formatea y parsea números con separador de miles al estilo paraguayo (10.000 = diez mil).
// Se usa en los inputs de precio/costo del panel de administración.

export function formatGs(value: string | number): string {
  const digits = String(value).replace(/[^\d]/g, "");
  if (!digits) return "";
  return Number(digits).toLocaleString("es-PY");
}

export function parseGs(formatted: string): number {
  const digits = String(formatted).replace(/[^\d]/g, "");
  return digits ? Number(digits) : 0;
}
