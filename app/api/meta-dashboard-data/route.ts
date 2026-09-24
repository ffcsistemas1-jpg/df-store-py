import { NextResponse } from "next/server";
import { createClient } from "../../../lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const TZ = "-03:00";
const dateOnly = (d: Date) => new Intl.DateTimeFormat("en-CA",{timeZone:"America/Asuncion",year:"numeric",month:"2-digit",day:"2-digit"}).format(d);
const addDays = (value:string,days:number) => { const d=new Date(`${value}T12:00:00Z`); d.setUTCDate(d.getUTCDate()+days); return d.toISOString().slice(0,10); };
const rangeFor = (period:string,startDate:string,endDate:string) => {
  const today=dateOnly(new Date());
  if(period==="custom" && startDate && endDate) return {from:startDate,to:endDate};
  if(period==="1d") return {from:today,to:today};
  if(period==="7d") return {from:addDays(today,-6),to:today};
  if(period==="30d") return {from:addDays(today,-29),to:today};
  return {from:"",to:""};
};
const start=(d:string)=>`${d}T00:00:00${TZ}`;
const end=(d:string)=>`${addDays(d,1)}T00:00:00${TZ}`;

export async function GET(req:Request){
  const s=await createClient();
  const {data:{user}}=await s.auth.getUser();
  if(!user) return NextResponse.json({error:"unauthorized"},{status:401});
  const {data:isAdmin,error:adminError}=await s.rpc("is_admin");
  if(adminError||!isAdmin) return NextResponse.json({error:"forbidden"},{status:403});

  const p=new URL(req.url).searchParams;
  const period=p.get("period")||"1d";
  const startDate=p.get("startDate")||"";
  const endDate=p.get("endDate")||"";
  const range=rangeFor(period,startDate,endDate);

  const visits=s.from("analytics_events").select("session").eq("type","visit");
  const views=s.from("analytics_events").select("session").eq("type","product_view");
  const carts=s.from("cart_items").select("session");
  const checkouts=s.from("checkout_drafts").select("session,completed_at");
  const orders=s.from("orders").select("id,created_at,total,utm_source,utm_campaign,fbclid,event_id").neq("status","cancelado").order("created_at",{ascending:false}).limit(1000);
  const metaEvents=s.from("meta_events_log").select("id,event_id,event_name,status,value,currency,created_at,order_id").order("created_at",{ascending:false}).limit(1000);

  if(range.from&&range.to){
    visits.gte("created_at",start(range.from)).lt("created_at",end(range.to));
    views.gte("created_at",start(range.from)).lt("created_at",end(range.to));
    carts.gte("updated_at",start(range.from)).lt("updated_at",end(range.to));
    checkouts.gte("updated_at",start(range.from)).lt("updated_at",end(range.to));
    orders.gte("created_at",start(range.from)).lt("created_at",end(range.to));
    metaEvents.gte("created_at",start(range.from)).lt("created_at",end(range.to));
  }

  const [v,pv,ca,ch,ord,me]=await Promise.all([visits,views,carts,checkouts,orders,metaEvents]);
  const first=[v,pv,ca,ch,ord,me].find(x=>x.error);
  if(first?.error) return NextResponse.json({error:first.error.message},{status:500});

  const uniq=(rows:any[])=>new Set((rows||[]).map(x=>x.session).filter(Boolean)).size;
  const eventFunnel={
    PageView:uniq(v.data||[]),
    ViewContent:uniq(pv.data||[]),
    AddToCart:uniq(ca.data||[]),
    InitiateCheckout:uniq(ch.data||[]),
    CheckoutAbandoned:new Set((ch.data||[]).filter((x:any)=>!x.completed_at).map((x:any)=>x.session).filter(Boolean)).size,
    Purchase:(ord.data||[]).length
  };
  return NextResponse.json({
    period,
    range,
    eventFunnel,
    events:me.data||[],
    orders:ord.data||[],
    updatedAt:new Date().toISOString()
  },{headers:{"Cache-Control":"no-store"}});
}
