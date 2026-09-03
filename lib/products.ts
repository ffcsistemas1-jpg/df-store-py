import {createClient} from "./supabase/server";
export type ProductMedia={id:string;media_type:"image"|"video";url:string;storage_path?:string|null;mime_type?:string|null;original_name?:string|null;size_bytes?:number|null;sort_order:number;is_primary:boolean};
export type Product={id:string;name:string;price:number;image_url?:string|null;video_url?:string|null;category?:string|null;description?:string|null;stock?:number;product_media?:ProductMedia[]};
export type Promotion={id:string;badge?:string|null;title:string;description?:string|null;price_text?:string|null;cta_text?:string|null;category?:string|null;image_url?:string|null};
const demo:Product[]=[
{id:"demo-1",name:"Vestido de hilo",price:180000,category:"Ropa",image_url:null,description:"Producto de muestra.",stock:5},
{id:"demo-2",name:"Calza deportiva",price:120000,category:"Ropa",image_url:null,description:"Producto de muestra.",stock:5},
{id:"demo-3",name:"Artículo para el hogar",price:95000,category:"Hogar",image_url:null,description:"Producto de muestra.",stock:5}
];
export async function getProducts(category?:string){try{const s=await createClient();let q=s.from("products").select("id,name,price,image_url,video_url,category,description,stock").eq("active",true).order("created_at",{ascending:false});if(category)q=q.ilike("category",category);const {data}=await q;return data?.length?(data as Product[]):demo.filter(x=>!category||x.category?.toLowerCase()===category.toLowerCase())}catch{return demo.filter(x=>!category||x.category?.toLowerCase()===category.toLowerCase())}}
export async function getProduct(id:string){
 if(id.startsWith("demo-"))return demo.find(x=>x.id===id)||null;
 try{
  const s=await createClient();
  const {data}=await s.from("products").select("id,name,price,image_url,video_url,category,description,stock,product_media(id,media_type,url,storage_path,mime_type,original_name,size_bytes,sort_order,is_primary)").eq("id",id).single();
  if(!data)return null;
  const p=data as unknown as Product;
  if(!p.product_media?.length){
   const legacy:ProductMedia[]=[];
   if(p.image_url)legacy.push({id:"legacy-image",media_type:"image",url:p.image_url,sort_order:0,is_primary:true});
   if(p.video_url)legacy.push({id:"legacy-video",media_type:"video",url:p.video_url,sort_order:0,is_primary:false});
   p.product_media=legacy;
  }
  return p;
 }catch{return null}
}

export async function getPromotions(){
  try{
    const s=await createClient();
    const {data}=await s.from("promotions").select("id,badge,title,description,price_text,cta_text,category,image_url").eq("active",true).order("sort_order",{ascending:true}).order("created_at",{ascending:false});
    return (data||[]) as Promotion[];
  }catch{return []}
}
