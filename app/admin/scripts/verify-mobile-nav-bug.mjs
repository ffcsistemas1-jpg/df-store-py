import fs from 'node:fs';
const css=fs.readFileSync('app/globals.css','utf8');
const ui=fs.readFileSync('app/ui.tsx','utf8');
const checks=[
 ['mobile nav cancels inherited top',/\.mobile-customer-nav\{[^}]*top:auto/.test(css)],
 ['mobile nav resets inherited padding',/\.mobile-customer-nav\{[^}]*padding:0 0 max\(/.test(css)],
 ['header nav mobile rule scoped to header',/@media\(max-width:800px\)\{\.head nav\{/.test(css)],
 ['customer nav remains fixed',/\.mobile-customer-nav\{[^}]*position:fixed/.test(css)],
 ['mobile storefront exists',/export function MobileStorefront/.test(ui)],
];
let fail=0; for(const [name,ok] of checks){console.log(`${ok?'PASS':'FAIL'} ${name}`); if(!ok) fail++;}
console.log(`${checks.length-fail}/${checks.length}`); process.exit(fail?1:0);
