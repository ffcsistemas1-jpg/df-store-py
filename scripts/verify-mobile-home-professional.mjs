import fs from 'node:fs';
const page=fs.readFileSync(new URL('../app/page.tsx', import.meta.url),'utf8');
const ui=fs.readFileSync(new URL('../app/ui.tsx', import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../app/globals.css', import.meta.url),'utf8');
const checks=[
 ['mobile storefront receives promotions',/MobileStorefront products=\{ps\} promotions=\{promos\}/.test(page)],
 ['mobile header cart shortcut',/mobile-header-cart/.test(ui)&&/mobile-header-cart/.test(css)],
 ['mobile promo strip after products',/mobile-promo-strip/.test(ui)&&/mobile-promo-strip/.test(css)],
 ['mobile trust strip',/mobile-trust-strip/.test(ui)&&/mobile-trust-strip/.test(css)],
 ['real stock urgency badge',/Últimas unidades/.test(ui)],
 ['offer badge',/>OFERTA</.test(ui)],
 ['two column product grid',/mobile-product-grid[\s\S]*grid-template-columns:repeat\(2/.test(css)],
 ['product image uses contain',/mobile-product-card \.pic img\{object-fit:contain/.test(css)],
 ['bottom nav safe area',/safe-area-inset-bottom/.test(css)],
 ['customer mobile contains no admin link',!/href=["']\/admin/.test(ui.slice(ui.indexOf('export function MobileStorefront')))],
];
let failed=0;
for(const [name,ok] of checks){console.log(`${ok?'PASS':'FAIL'} ${name}`); if(!ok)failed++;}
console.log(`\n${checks.length-failed}/${checks.length} passed`);
process.exit(failed?1:0);
