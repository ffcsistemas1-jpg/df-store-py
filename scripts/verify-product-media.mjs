import fs from 'node:fs';
const form=fs.readFileSync('app/admin/product-form.tsx','utf8');
const lib=fs.readFileSync('lib/products.ts','utf8');
const detail=fs.readFileSync('app/catalogo/[id]/page.tsx','utf8');
const sql=fs.readFileSync('supabase/PATCH-PRODUCT-MEDIA.sql','utf8');
const checks=[
 ['up to five images selected',/MAX_IMAGES\s*=\s*5/.test(form)&&/multiple/.test(form)],
 ['up to five videos selected',/MAX_VIDEOS\s*=\s*5/.test(form)],
 ['resumable TUS upload protocol',/upload\/resumable/.test(form)&&/Tus-Resumable/.test(form)],
 ['supports production publishable key',/NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY/.test(form)],
 ['upload progress implemented',/onProgress/.test(form)],
 ['product_media table migration',/create table if not exists public\.product_media/i.test(sql)],
 ['media type constrained',/media_type.*image.*video/is.test(sql)],
 ['position and primary supported',/sort_order/i.test(sql)&&/is_primary/i.test(sql)],
 ['RLS admin write',/is_admin\(\)/i.test(sql)],
 ['products query includes product_media',/product_media/.test(lib)],
 ['product detail renders gallery',/ProductMediaGallery/.test(detail)],
 ['legacy image_url preserved',/image_url/.test(form)&&/image_url/.test(sql)],
 ['legacy video_url preserved',/video_url/.test(form)&&/video_url/.test(sql)],
];
let fail=0; for(const [name,ok] of checks){console.log(`${ok?'PASS':'FAIL'} ${name}`); if(!ok) fail++;}
console.log(`${checks.length-fail}/${checks.length}`); process.exit(fail?1:0);
