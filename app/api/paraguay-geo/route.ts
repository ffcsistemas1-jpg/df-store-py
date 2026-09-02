import { NextResponse } from "next/server";

const SOURCES = [
  "https://www.ine.gov.py/microdatos/register/localidades/Barrios_Localidades_Paraguay_Codigos_DGEEC.json",
  "https://www.datos.gov.py/sites/default/files/Barrios_Localidades_Paraguay_Codigos_DGEEC.csv",
];

const norm = (s: string) => String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

function buildGeo(records: any[]) {
  const map = new Map<string, { name: string; distritos: Map<string, { name: string; barrios: Set<string> }> }>();
  for (const r of records) {
    const dept = String(r["Descripción de Departamento"] ?? r["Descripcion de Departamento"] ?? "").trim();
    const district = String(r["Descripción de Distrito"] ?? r["Descripcion de Distrito"] ?? "").trim();
    const neighborhood = String(r["Descripción de Barrio/Localidad"] ?? r["Descripcion de Barrio/Localidad"] ?? "").trim();
    if (!dept || !district) continue;
    let dep = map.get(norm(dept));
    if (!dep) { dep = { name: dept, distritos: new Map() }; map.set(norm(dept), dep); }
    let dis = dep.distritos.get(norm(district));
    if (!dis) { dis = { name: district, barrios: new Set() }; dep.distritos.set(norm(district), dis); }
    if (neighborhood) dis.barrios.add(neighborhood);
  }
  return Array.from(map.values()).map(d => ({
    name: d.name,
    distritos: Array.from(d.distritos.values()).map(x => ({ name: x.name, barrios: Array.from(x.barrios).sort((a,b)=>a.localeCompare(b,"es")) }))
      .sort((a,b)=>a.name.localeCompare(b.name,"es"))
  })).sort((a,b)=>a.name.localeCompare(b.name,"es"));
}

function parseCSV(text: string) {
  const rows: string[][] = [];
  let row: string[] = [], cell = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { row.push(cell); cell = ""; }
    else if (ch === '\n') { row.push(cell); rows.push(row); row = []; cell = ""; }
    else if (ch !== '\r') cell += ch;
  }
  if (cell.length || row.length) { row.push(cell); rows.push(row); }
  if (!rows.length) return [];
  const header = rows[0].map(norm);
  const dept = header.findIndex(x => x === norm("Descripcion de Departamento"));
  const district = header.findIndex(x => x === norm("Descripcion de Distrito"));
  const neighborhood = header.findIndex(x => x === norm("Descripcion de Barrio/Localidad"));
  if (dept < 0 || district < 0 || neighborhood < 0) return [];
  return rows.slice(1).map(r => ({
    "Descripción de Departamento": r[dept],
    "Descripción de Distrito": r[district],
    "Descripción de Barrio/Localidad": r[neighborhood],
  }));
}

export async function GET() {
  for (const source of SOURCES) {
    try {
      const res = await fetch(source, { next: { revalidate: 86400 } });
      if (!res.ok) continue;
      const text = await res.text();
      let records: any[] = [];
      if (source.endsWith(".json")) {
        const parsed = JSON.parse(text);
        records = Array.isArray(parsed) ? parsed : [];
      } else {
        records = parseCSV(text);
      }
      const departments = buildGeo(records);
      if (departments.length) {
        return NextResponse.json(
          { source: "INE Paraguay - Códigos geográficos de Barrios/Localidades CNPV 2012", departments },
          { headers: { "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800" } }
        );
      }
    } catch {}
  }
  return NextResponse.json({ error: "No se pudo cargar la base geográfica oficial." }, { status: 503 });
}
