import {createClient} from "./supabase/server";
export type Product={id:string;name:string;price:number;image_url?:string|null;video_url?:string|null;category?:string|null;description?:string|null;stock?:number};
const demo:Product[]=[
{id:"demo-1",name:"Vestido de hilo",price:180000,category:"Ropa",image_url:null,description:"Producto de muestra.",stock:5},
{id:"demo-2",name:"Calza deportiva",price:120000,category:"Ropa",image_url:null,description:"Producto de muestra.",stock:5},
{id:"demo-3",name:"Artículo para el hogar",price:95000,category:"Hogar",image_url:null,description:"Producto de muestra.",stock:5}
];
export async function getProducts(category?:string){try{const s=await createClient();let q=s.from("products").select("id,name,price,image_url,video_url,category,description,stock").eq("active",true).order("created_at",{ascending:false});if(category)q=q.ilike("category",category);const {data}=await q;return data?.length?(data as Product[]):demo.filter(x=>!category||x.category?.toLowerCase()===category.toLowerCase())}catch{return demo.filter(x=>!category||x.category?.toLowerCase()===category.toLowerCase())}}
export async function getProduct(id:string){if(id.startsWith("demo-"))return demo.find(x=>x.id===id)||null;try{const s=await createClient();const {data}=await s.from("products").select("id,name,price,image_url,video_url,category,description,stock").eq("id",id).single();return data as Product|null}catch{return null}}