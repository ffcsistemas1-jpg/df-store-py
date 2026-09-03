import fs from 'node:fs';
const page=fs.readFileSync(new URL('../app/page.tsx', import.meta.url),'utf8');
const ui=fs.readFileSync(new URL('../app/ui.tsx', import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../app/globals.css', import.meta.url),'utf8');
const layout=fs.readFileSync(new URL('../app/layout.tsx', import.meta.url),'utf8');
const checks=[
 ['home uses mobile storefront',/MobileStorefront/.test(page)],
 ['mobile storefront component exists',/export function MobileStorefront/.test(ui)],
 ['mobile category rail exists',/mobile-category-rail/.test(ui)&&/mobile-category-rail/.test(css)],
 ['mobile search exists',/mobile-store-search/.test(ui)&&/mobile-store-search/.test(css)],
 ['mobile product grid exists',/mobile-product-grid/.test(ui)&&/mobile-product-grid/.test(css)],
 ['two column mobile grid',/grid-template-columns\s*:\s*repeat\(2/.test(css)],
 ['professional mobile product card',/mobile-product-card/.test(ui)&&/mobile-product-card/.test(css)],
 ['buy CTA',/Comprar/.test(ui)],
 ['mobile bottom nav',/MobileCustomerNav/.test(ui)&&/mobile-customer-nav/.test(css)],
 ['cart badge',/mobile-cart-badge/.test(ui)&&/mobile-cart-badge/.test(css)],
 ['client nav mounted',/MobileCustomerNav/.test(layout)],
 ['admin not linked from customer nav',!/href=["']\/admin/.test(ui.slice(ui.indexOf('export function MobileCustomerNav')))],
 ['whatsapp lifted above mobile nav',/@media\(max-width:800px\)[\s\S]*?\.whatsapp-float[\s\S]*?bottom:\s*(?:8[0-9]|9[0-9]|1[0-9]{2})px/.test(css)],
 ['mobile hero compact',/mobile-hero/.test(page)&&/mobile-hero/.test(css)],
 ['touch targets 44px',/min-height:\s*44px/.test(css)],
 ['responsive 430 breakpoint',/@media\(max-width:430px\)/.test(css)],
 ['responsive 360 behavior',/@media\(max-width:360px\)/.test(css)],
];
let failed=0;
for(const [name,ok] of checks){console.log(`${ok?'PASS':'FAIL'} ${name}`);if(!ok)failed++;}
console.log(`\n${checks.length-failed}/${checks.length} passed`);
process.exit(failed?1:0);
