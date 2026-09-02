import { NextResponse } from "next/server";

const SOURCE = "https://www.datos.gov.py/sites/default/files/Barrios_Localidades_Paraguay_Codigos_DGEEC.csv";

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
  return rows;
}

const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

export async function GET() {
  try {
    const res = await fetch(SOURCE, { next: { revalidate: 86400 } });
    if (!res.ok) throw new Error(`Fuente geográfica respondió ${res.status}`);
    const text = await res.text();
    const rows = parseCSV(text);
    if (rows.length < 2) throw new Error("CSV geográfico vacío");

    const header = rows[0].map(norm);
    const idx = (name: string) => header.findIndex(h => h === norm(name));
    const dDept = idx("Descripcion de Departamento");
    const dDistrict = idx("Descripcion de Distrito");
    const dNeighborhood = idx("Descripcion de Barrio/Localidad");
    if (dDept < 0 || dDistrict < 0 || dNeighborhood < 0) throw new Error("Formato geográfico no reconocido");

    const map = new Map<string, { name: string; distritos: Map<string, { name: string; barrios: Set<string> }> }>();
    for (const r of rows.slice(1)) {
      const dept = (r[dDept] || "").trim();
      const district = (r[dDistrict] || "").trim();
      const neighborhood = (r[dNeighborhood] || "").trim();
      if (!dept || !district) continue;
      let dep = map.get(norm(dept));
      if (!dep) { dep = { name: dept, distritos: new Map() }; map.set(norm(dept), dep); }
      let dis = dep.distritos.get(norm(district));
      if (!dis) { dis = { name: district, barrios: new Set() }; dep.distritos.set(norm(district), dis); }
      if (neighborhood) dis.barrios.add(neighborhood);
    }

    const departments = Array.from(map.values()).map(d => ({
      name: d.name,
      distritos: Array.from(d.distritos.values()).map(x => ({ name: x.name, barrios: Array.from(x.barrios).sort((a,b)=>a.localeCompare(b,"es")) }))
        .sort((a,b)=>a.name.localeCompare(b.name,"es"))
    })).sort((a,b)=>a.name.localeCompare(b.name,"es"));

    return NextResponse.json({ source: "INE/Datos.gov.py CNPV 2012", departments }, { headers: { "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800" } });
  } catch (error) {
    return NextResponse.json({ error: "No se pudo cargar la base geográfica oficial." }, { status: 503 });
  }
}
