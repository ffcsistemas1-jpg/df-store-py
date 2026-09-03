import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "../../../lib/supabase/server";
import MetaAdsDashboard from "./meta-ads-dashboard";

export default async function MetaAds() {
  const s = await createClient();
  const { data: { user } } = await s.auth.getUser();
  if (!user) redirect("/admin/login");
  const { data: isAdmin } = await s.rpc("is_admin");
  if (!isAdmin) return <section><small>DF STORE PY</small><h1>Acceso denegado</h1><p>Tu cuenta ({user.email}) no tiene permisos de administrador.</p></section>;

  return (
    <section>
      <div className="title">
        <div><small>ADMINISTRADOR</small><h1>Meta Ads</h1></div>
        <Link href="/admin">← Admin</Link>
      </div>
      <MetaAdsDashboard />
    </section>
  );
}
