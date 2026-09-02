"use client";
import { createClient } from "./supabase/client";
import { getCartSession } from "./cart-session";

// Analítica mínima para el embudo de ventas del Admin. Solo guarda: un tipo de evento
// ('visit' o 'product_view'), la sesión anónima (misma cookie que ya usa el carrito) y,
// para product_view, el id del producto. Nada de datos personales.

export function trackVisit(){
  if(typeof window==="undefined") return;
  try{
    if(sessionStorage.getItem("df_visit_logged")) return;
    sessionStorage.setItem("df_visit_logged","1");
  }catch{}
  const session=getCartSession(); if(!session) return;
  const s=createClient();
  s.from("analytics_events").insert({session,type:"visit"}).then(({error}:any)=>{if(error)console.error("No se pudo registrar la visita",error)});
}

export function trackProductView(productId:string){
  if(typeof window==="undefined" || !productId) return;
  const session=getCartSession(); if(!session) return;
  const s=createClient();
  s.from("analytics_events").insert({session,type:"product_view",product_id:String(productId)}).then(({error}:any)=>{if(error)console.error("No se pudo registrar la vista del producto",error)});
}
