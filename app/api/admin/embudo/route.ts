import {NextResponse} from "next/server";
import {createClient} from "../../../../lib/supabase/server";
import {normalizePyWhatsapp} from "../../../../lib/phone-py";

const CONTACT_WHATSAPP = "595974719210";
const DEFAULT_MESSAGE = "¡Hola, {nombre}! 😊 ¿Cómo estás?\nNotamos que casi terminaste tu compra en DF Store PY. 🛍️\nSi tuviste algún inconveniente o necesitás ayuda para finalizar el pedido, escribinos. ¡Estamos para ayudarte! 💕";

async function adminClient(){
  const s=await createClient();
  const {data:{user},error:userError}=await s.auth.getUser();
  if(userError||!user) return {s:null,response:NextResponse.json({error:"No autenticado"},{status:401})};
  const {data:isAdmin,error:adminError}=await s.rpc("is_admin");
  if(adminError||!isAdmin) return {s:null,response:NextResponse.json({error:"Acceso denegado"},{status:403})};
  return {s,response:null};
}

const uniq=(rows:any[])=>new Set((rows||[]).map(r=>r.session).filter(Boolean)).size;

export async function GET(){
  const {s,response}=await adminClient();
  if(!s)return response!;
  const [visits,views,carts,checkouts,orders,delivered,abandoned,settings]=await Promise.all([
    s.from("analytics_events").select("session").eq("type","visit"),
    s.from("analytics_events").select("session").eq("type","product_view"),
    s.from("cart_items").select("session"),
    s.from("checkout_drafts").select("session"),
    s.from("orders").select("id",{count:"exact",head:true}),
    s.from("orders").select("id",{count:"exact",head:true}).eq("status","entregado"),
    s.from("checkout_drafts").select("session,full_name,whatsapp,email,department,city,neighborhood,address,delivery_type,payment_method,updated_at").is("completed_at",null).order("updated_at",{ascending:false}).limit(50),
    s.from("store_settings").select("whatsapp,abandoned_checkout_message").eq("id",1).maybeSingle()
  ]);
  const firstError=[visits,views,carts,checkouts,orders,delivered,abandoned,settings].find(r=>r.error);
  if(firstError?.error)return NextResponse.json({error:firstError.error.message},{status:500});
  return NextResponse.json({
    stages:[
      {label:"Visitas",value:uniq(visits.data||[])},
      {label:"Productos vistos",value:uniq(views.data||[])},
      {label:"Carritos",value:uniq(carts.data||[])},
      {label:"Checkout iniciado",value:uniq(checkouts.data||[])},
      {label:"Pedidos",value:orders.count||0},
      {label:"Entregados",value:delivered.count||0}
    ],
    drafts:abandoned.data||[],
    settings:{
      whatsapp:normalizePyWhatsapp(settings.data?.whatsapp||"")||CONTACT_WHATSAPP,
      abandoned_checkout_message:settings.data?.abandoned_checkout_message||DEFAULT_MESSAGE
    }
  });
}

export async function PATCH(req:Request){
  const {s,response}=await adminClient();
  if(!s)return response!;
  let body:any;
  try{body=await req.json()}catch{return NextResponse.json({error:"JSON inválido"},{status:400})}
  const clean=normalizePyWhatsapp(body?.whatsapp||"")||CONTACT_WHATSAPP;
  const message=String(body?.abandoned_checkout_message||"").trim()||DEFAULT_MESSAGE;
  const {error}=await s.from("store_settings").update({whatsapp:clean,abandoned_checkout_message:message}).eq("id",1);
  if(error)return NextResponse.json({error:error.message},{status:500});
  return NextResponse.json({ok:true,whatsapp:clean,abandoned_checkout_message:message});
}

export async function DELETE(req:Request){
  const {s,response}=await adminClient();
  if(!s)return response!;
  let body:any;
  try{body=await req.json()}catch{return NextResponse.json({error:"JSON inválido"},{status:400})}
  const session=String(body?.session||"").trim();
  if(!session)return NextResponse.json({error:"Falta session"},{status:400});
  const {error}=await s.from("checkout_drafts").delete().eq("session",session);
  if(error)return NextResponse.json({error:error.message},{status:500});
  return NextResponse.json({ok:true});
}
