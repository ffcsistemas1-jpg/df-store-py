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
    s.from("orders").select("id",{count:"exact",head:true}).eq("is_test",false).neq("status","cancelado"),
    s.from("orders").select("id",{count:"exact",head:true}).eq("is_test",false).eq("status","entregado"),
    s.from("checkout_drafts").select("session,full_name,whatsapp,email,department,city,neighborhood,address,delivery_type,payment_method,shipping_company_id,updated_at").is("completed_at",null).order("updated_at",{ascending:false}).limit(50),
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

export async function POST(req:Request){
  const {s,response}=await adminClient();
  if(!s)return response!;
  let body:any;
  try{body=await req.json()}catch{return NextResponse.json({error:"JSON inválido"},{status:400})}
  const session=String(body?.session||"").trim();
  if(!session)return NextResponse.json({error:"Falta session"},{status:400});

  const {data:draft,error:draftError}=await s.from("checkout_drafts")
    .select("session,full_name,whatsapp,email,department,city,neighborhood,address,delivery_type,payment_method,shipping_company_id,shipping_company_other,preferred_time,invoice_requested,ruc,business_name,maps_url,note,completed_at")
    .eq("session",session).maybeSingle();
  if(draftError)return NextResponse.json({error:draftError.message},{status:500});
  if(!draft)return NextResponse.json({error:"El checkout abandonado ya no existe."},{status:404});
  if(draft.completed_at)return NextResponse.json({error:"Este checkout ya fue convertido o completado."},{status:409});
  if(!draft.full_name||!draft.whatsapp)return NextResponse.json({error:"Faltan nombre y WhatsApp en el checkout."},{status:400});

  const {data:cart,error:cartError}=await s.from("cart_items")
    .select("product_id,quantity,name,price").eq("session",session);
  if(cartError)return NextResponse.json({error:cartError.message},{status:500});
  if(!cart?.length)return NextResponse.json({error:"No quedan productos asociados a este checkout. No puedo registrar la venta automáticamente."},{status:400});

  const items=cart.map((x:any)=>({id:String(x.product_id),quantity:Number(x.quantity||0)})).filter((x:any)=>x.id&&x.quantity>0);
  if(!items.length)return NextResponse.json({error:"El carrito no tiene productos válidos."},{status:400});

  const deliveryType=draft.delivery_type||"delivery";
  const paymentMethod=deliveryType==="interior"?"Transferencia":"Pago al recibir";
  const attribution={
    source:"manual_admin",
    medium:"manual_sale",
    campaign:"manual_sale",
    landing_page:"admin/embudo",
    event_id:""
  };

  const {data:order,error:orderError}=await s.rpc("create_order",{
    p_customer:{
      full_name:draft.full_name,
      whatsapp:normalizePyWhatsapp(draft.whatsapp),
      email:draft.email||null,
      department:draft.department||null,
      city:draft.city||null,
      neighborhood:draft.neighborhood||null,
      address:draft.address||null,
      preferred_time:draft.preferred_time||null,
      invoice_requested:Boolean(draft.invoice_requested),
      ruc:draft.ruc||null,
      business_name:draft.business_name||null,
      maps_url:draft.maps_url||null,
      note:draft.note||null
    },
    p_items:items,
    p_delivery_type:deliveryType,
    p_payment_method:paymentMethod,
    p_shipping_company_id:(deliveryType==="interior"&&draft.shipping_company_id)?draft.shipping_company_id:null,
    p_payment_reference:null,
    p_attribution:attribution
  });
  if(orderError)return NextResponse.json({error:orderError.message},{status:400});

  const created=order as any;
  const {error:statusError}=await s.from("orders").update({
    status:"entregado",
    is_test:false
  }).eq("id",created.id);
  if(statusError)return NextResponse.json({error:"La venta fue creada pero no se pudo cerrar automáticamente: "+statusError.message,order:created},{status:500});

  try{
    await s.rpc("complete_checkout_draft",{p_session:session});
  }catch{}

  return NextResponse.json({
    ok:true,
    orderId:created.id,
    total:Number(created.total||0),
    source:"manual_admin",
    meta:"not_sent"
  });
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
