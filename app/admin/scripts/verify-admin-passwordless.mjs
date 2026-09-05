import fs from 'node:fs';
const read=(p)=>fs.readFileSync(new URL('../'+p, import.meta.url),'utf8');
const login=read('app/admin/login/page.tsx');
const manifest=read('app/admin/manifest.ts');
const shell=read('app/admin/admin-shell.tsx');
const checks=[
 ['Admin login uses OTP/magic link', login.includes('signInWithOtp')],
 ['Admin login has no password input', !login.includes('type="password"') && !login.includes('signInWithPassword')],
 ['Admin manifest starts in /admin', manifest.includes('start_url: "/admin"')],
 ['Admin manifest is standalone', manifest.includes('display: "standalone"')],
 ['Admin shell has install action', shell.includes('Instalar DF Store PY Admin')],
 ['Admin mobile bottom nav exists', shell.includes('admin-mobile-bottom-nav')],
];
let fail=0; for(const [name,ok] of checks){console.log(`${ok?'PASS':'FAIL'} ${name}`); if(!ok) fail++;}
if(fail){console.error(`\n${fail}/${checks.length} checks failed`);process.exit(1)}
console.log(`\n${checks.length}/${checks.length} checks passed`);
