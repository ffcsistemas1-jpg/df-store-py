import fs from 'node:fs';
const read=(p)=>fs.readFileSync(new URL('../'+p, import.meta.url),'utf8');
const ui=read('app/ui.tsx');
const api=read('app/api/meta-capi/route.ts');
const checkout=read('app/checkout/page.tsx');
const sql=read('supabase/PATCH-META-HARDENING.sql');
const checks=[
 ['PageView base script does not fire an unkeyed browser PageView', !ui.includes("fbq('track', 'PageView')")],
 ['CAPI validates allowed event names', api.includes('ALLOWED_EVENTS')],
 ['Purchase is resolved from a server-side DB RPC', api.includes('get_meta_purchase_payload')],
 ['Purchase caller does not send client value as source of truth', /event_name:\s*["']Purchase["'][\s\S]{0,180}order_id:result\.id/.test(checkout) && !/event_name:\s*["']Purchase["'][\s\S]{0,220}value:result\.total/.test(checkout)],
 ['Meta hardening migration has idempotency table', sql.includes('meta_event_dispatches')],
 ['Meta hardening migration revokes public log_meta_event execution', /revoke\s+execute[\s\S]+log_meta_event[\s\S]+anon/i.test(sql)],
 ['Meta hardening migration defines secure Purchase payload RPC', sql.includes('get_meta_purchase_payload')],
];
let fail=0; for(const [name,ok] of checks){console.log(`${ok?'PASS':'FAIL'} ${name}`); if(!ok) fail++;}
if(fail){console.error(`\n${fail}/${checks.length} checks failed`);process.exit(1)}
console.log(`\n${checks.length}/${checks.length} checks passed`);
