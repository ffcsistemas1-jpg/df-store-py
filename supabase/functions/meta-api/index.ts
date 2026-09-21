// @ts-ignore Deno-only npm: specifier; Supabase Edge Runtime resolves this module.
import { withSupabase } from "npm:@supabase/server@^1";
const GRAPH_VERSION="v26.0";
const ALLOWED_EVENTS=new Set(["PageView","ViewContent","AddToCart","InitiateCheckout","Purchase"]);
function json(data:unknown,status=200){return Response.json(data,{status,headers:{"Cache-Control":"no-store"}})}
async function getSecret(admin:any,name:string){const {data,error}=await admin.rpc("get_meta_runtime_secret",{p_name:name});if(error)throw new Error(`secret_error:${name}`);return String(data||"").trim()}
function normalizeAccount(v:unknown){return String(v||"").replace(/^act_/,"").replace(/[^0-9]/g,"")}
async function sha256(value:string){const bytes=new TextEncoder().encode(value.trim().toLowerCase());const digest=await crypto.subtle.digest("SHA-256",bytes);return Array.from(new Uint8Array(digest)).map(b=>b.toString(16).padStart(2,"0")).join("")}
async function sendCapi(admin:any,body:any){
 const eventName=String(body?.event_name||"");
 const eventId=String(body?.event_id||"").trim();
 if(!ALLOWED_EVENTS.has(eventName)||eventId.length<8||eventId.length>128)return json({status:"invalid_event"},400);

 let order:any=null;
 if(eventName==="Purchase"){
   const orderId=String(body?.order_id||"").trim();
   if(!orderId)return json({status:"purchase_requires_order_id"},400);
   const {data:found,error:orderError}=await admin.from("orders").select("id,total,event_id,customer_id,fbp,fbc,landing_page,created_at").eq("id",orderId).maybeSingle();
   if(orderError)return json({status:"order_lookup_error"},500);
   if(!found)return json({status:"purchase_order_not_found"},404);
   order=found;
   if(order.event_id&&order.event_id!==eventId)return json({status:"purchase_event_mismatch"},409);
   const sentValue=Number(body?.value||0);
   if(sentValue>0&&Math.abs(Number(order.total||0)-sentValue)>1)return json({status:"purchase_value_mismatch"},409);

   const {data:claimed,error:claimError}=await admin.rpc("claim_meta_event",{p_event_name:eventName,p_event_id:eventId,p_order_id:orderId});
   if(claimError)return json({status:"idempotency_not_configured",error:claimError.message},503);
   if(!claimed){
     const {data:dispatch}=await admin.from("meta_event_dispatches").select("status").eq("event_name",eventName).eq("event_id",eventId).maybeSingle();
     if(dispatch?.status==="sent")return json({status:"already_sent",event_id:eventId});
     return json({status:"already_processing",event_id:eventId},202);
   }

   const [{data:customer},{data:items}]=await Promise.all([
     admin.from("customers").select("email,whatsapp").eq("id",order.customer_id).maybeSingle(),
     admin.from("order_items").select("product_id,quantity").eq("order_id",orderId).order("id",{ascending:true})
   ]);
   body={...body};
   if(!body.email&&customer?.email)body.email=customer.email;
   if(!body.phone&&customer?.whatsapp)body.phone=customer.whatsapp;
   if(!Array.isArray(body.content_ids))body.content_ids=(items||[]).map((x:any)=>String(x.product_id));
   if(body.num_items===undefined)body.num_items=(items||[]).reduce((n:number,x:any)=>n+Number(x.quantity||0),0);
   if(!body.fbp&&order.fbp)body.fbp=order.fbp;
   if(!body.fbc&&order.fbc)body.fbc=order.fbc;
   if(!body.event_source_url&&order.landing_page)body.event_source_url=order.landing_page;
   body.value=Number(order.total||0);
   body.currency="PYG";
 }

 const {data:settings,error}=await admin.from("store_settings").select("meta_pixel_id").eq("id",1).maybeSingle();
 if(error){
   if(eventName==="Purchase")await admin.rpc("record_meta_event_result",{p_event_id:eventId,p_event_name:eventName,p_order_id:body?.order_id||null,p_value:Number(body?.value||0)||null,p_currency:"PYG",p_status:"error",p_response:{status:"config_error"}});
   return json({status:"config_error"},500);
 }
 const pixelId=String(settings?.meta_pixel_id||"").trim();
 const token=await getSecret(admin,"meta_capi_access_token");
 if(!pixelId||!token){
   if(eventName==="Purchase")await admin.rpc("record_meta_event_result",{p_event_id:eventId,p_event_name:eventName,p_order_id:body?.order_id||null,p_value:Number(body?.value||0)||null,p_currency:"PYG",p_status:"not_configured",p_response:{status:"not_configured"}});
   return json({status:"not_configured"});
 }
 const rawEmail=String(body?.email||"").trim();
 const rawPhone=String(body?.phone||"").replace(/\D/g,"");
 const userData:any={...(body?.user_data||{})};
 if(rawEmail)userData.em=await sha256(rawEmail);
 if(rawPhone)userData.ph=await sha256(rawPhone);
 if(body?.fbp)userData.fbp=String(body.fbp);
 if(body?.fbc)userData.fbc=String(body.fbc);
 if(body?.client_ip_address)userData.client_ip_address=String(body.client_ip_address);
 if(body?.client_user_agent)userData.client_user_agent=String(body.client_user_agent);
 const customData:any={...(body?.custom_data||{})};
 if(eventName==="Purchase"){
   customData.currency="PYG";
   customData.value=Number(body?.value||0);
   if(Array.isArray(body?.content_ids))customData.content_ids=body.content_ids.map((x:any)=>String(x));
   if(body?.content_type)customData.content_type=String(body.content_type);
   if(body?.num_items!==undefined)customData.num_items=Number(body.num_items||0);
 }
 const eventPayload={data:[{event_name:eventName,event_time:Number(body?.event_time)||Math.floor(Date.now()/1000),event_id:eventId,action_source:"website",event_source_url:body?.event_source_url?String(body.event_source_url).slice(0,2048):undefined,user_data:userData,custom_data:customData}]};
 let response:Response;
 let meta:any;
 try{
   response=await globalThis.fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${pixelId}/events?access_token=${encodeURIComponent(token)}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(eventPayload)});
   meta=await response.json().catch(()=>({error:"invalid_meta_response"}));
 }catch(e:any){
   if(eventName==="Purchase")await admin.rpc("record_meta_event_result",{p_event_id:eventId,p_event_name:eventName,p_order_id:body?.order_id||null,p_value:Number(body?.value||0)||null,p_currency:"PYG",p_status:"network_error",p_response:{error:String(e?.message||e)}});
   return json({status:"network_error"},502);
 }
 const status=response.ok?"sent":"error";
 try{
   await admin.rpc("record_meta_event_result",{p_event_id:eventId,p_event_name:eventName,p_order_id:body?.order_id||null,p_value:Number(body?.value||customData?.value||0)||null,p_currency:String(body?.currency||customData?.currency||"PYG"),p_status:status,p_response:meta});
 }catch(e){console.error("meta_log_error",e)}
 return json({status,meta},response.ok?200:502);
}
function validDate(v:string){return /^\d{4}-\d{2}-\d{2}$/.test(v)}
function actionValue(list:unknown,matcher:RegExp){return Array.isArray(list)?list.filter((x:any)=>matcher.test(String(x?.action_type||""))).reduce((n:number,x:any)=>n+Number(x?.value||0),0):0}
async function getAllCampaigns(accountId:string,token:string){const out:any[]=[];let nextUrl:string|null=`https://graph.facebook.com/${GRAPH_VERSION}/act_${accountId}/campaigns?fields=id,name,status,effective_status,configured_status&limit=100&access_token=${encodeURIComponent(token)}`;for(let i=0;i<10&&nextUrl;i++){const response:Response=await globalThis.fetch(nextUrl,{cache:"no-store"});const data:any=await response.json().catch(()=>({}));if(!response.ok)throw new Error(data?.error?.message||"No se pudieron consultar las campañas de Meta.");out.push(...(Array.isArray(data?.data)?data.data:[]));nextUrl=typeof data?.paging?.next==="string"?data.paging.next:null}return out}
async function getCampaignInsights(accountId:string,token:string,startDate:string,endDate:string,period:string){const url=new URL(`https://graph.facebook.com/${GRAPH_VERSION}/act_${accountId}/insights`);url.searchParams.set("fields","campaign_id,campaign_name,spend,impressions,reach,frequency,clicks,ctr,cpm,cpc,actions,action_values,purchase_roas");url.searchParams.set("level","campaign");if(validDate(startDate)&&validDate(endDate))url.searchParams.set("time_range",JSON.stringify({since:startDate,until:endDate}));else if(period==="1d"||period==="7d"||period==="30d"||period==="all")url.searchParams.set("date_preset",period==="1d"?"today":period==="7d"?"last_7d":period==="30d"?"last_30d":"maximum");else throw new Error("Rango de fechas inválido para Meta Ads.");url.searchParams.set("limit","500");url.searchParams.set("access_token",token);const response:Response=await globalThis.fetch(url,{cache:"no-store"});const data:any=await response.json().catch(()=>({}));if(!response.ok)throw new Error(data?.error?.message||"No se pudieron consultar los datos de campañas.");return Array.isArray(data?.data)?data.data:[]}
async function getInsights(admin:any,body:any){const {data:settings,error}=await admin.from("store_settings").select("meta_ad_account_id").eq("id",1).maybeSingle();if(error)return json({configured:false,connected:false,error:error.message},500);const accountId=normalizeAccount(settings?.meta_ad_account_id);const period=String(body?.period||"30d");const startDate=String(body?.startDate||"");const endDate=String(body?.endDate||"");const validRange=validDate(startDate)&&validDate(endDate);if(period==="custom"&&!validRange)return json({configured:true,connected:false,period,error:"Para un período personalizado debés indicar fecha inicial y fecha final válidas."},400);if(validRange&&startDate>endDate)return json({configured:true,connected:false,period,error:"La fecha inicial no puede ser posterior a la fecha final."},400);if(!validRange&&!["1d","7d","30d","all"].includes(period))return json({configured:true,connected:false,period,error:"Período inválido: no se permite consultar un rango implícito o acumulado."},400);const marketingToken=await getSecret(admin,"meta_marketing_access_token");if(!accountId||!marketingToken)return json({configured:false,connected:false,period,reason:"missing_ad_account_or_marketing_token"});const url=new URL(`https://graph.facebook.com/${GRAPH_VERSION}/act_${accountId}/insights`);url.searchParams.set("fields","spend,impressions,reach,frequency,clicks,ctr,cpm,cpc,actions,action_values,purchase_roas");if(validRange)url.searchParams.set("time_range",JSON.stringify({since:startDate,until:endDate}));else if(period==="1d"||period==="7d"||period==="30d"||period==="all")url.searchParams.set("date_preset",period==="1d"?"today":period==="7d"?"last_7d":period==="30d"?"last_30d":"maximum");else return json({configured:true,connected:false,period,error:"Período inválido."},400);url.searchParams.set("level","account");url.searchParams.set("access_token",marketingToken);const response:Response=await globalThis.fetch(url,{cache:"no-store"});const jsonData:any=await response.json().catch(()=>({}));if(!response.ok)return json({configured:true,connected:false,period,error:jsonData?.error?.message||"Meta API error"},502);const row=jsonData?.data?.[0]||{};const purchases=actionValue(row.actions,/purchase/i);const purchaseValue=actionValue(row.action_values,/purchase/i);const spend=Number(row.spend||0);let campaigns:any[]=[];try{const [allCampaigns,campaignInsights]=await Promise.all([getAllCampaigns(accountId,marketingToken),getCampaignInsights(accountId,marketingToken,startDate,endDate,period)]);const byId=new Map<string,any>();for(const c of campaignInsights){const id=String(c?.campaign_id||"");if(!id)continue;byId.set(id,{spend:Number(c.spend||0),impressions:Number(c.impressions||0),reach:Number(c.reach||0),frequency:Number(c.frequency||0),clicks:Number(c.clicks||0),ctr:Number(c.ctr||0),cpm:Number(c.cpm||0),cpc:Number(c.cpc||0),purchases:actionValue(c.actions,/purchase/i),purchaseValue:actionValue(c.action_values,/purchase/i),roas:Number(c.purchase_roas?.[0]?.value||0)||0})}campaigns=allCampaigns.map((c:any)=>{const x=byId.get(String(c.id))||{};const s=Number(x.spend||0);const pv=Number(x.purchaseValue||0);return {id:String(c.id),name:String(c.name||"Sin nombre"),status:String(c.status||""),effectiveStatus:Array.isArray(c.effective_status)?String(c.effective_status[0]||""):String(c.effective_status||""),configuredStatus:String(c.configured_status||""),spend:s,impressions:Number(x.impressions||0),reach:Number(x.reach||0),frequency:Number(x.frequency||0),clicks:Number(x.clicks||0),ctr:Number(x.ctr||0),cpm:Number(x.cpm||0),cpc:Number(x.cpc||0),purchases:Number(x.purchases||0),purchaseValue:pv,roas:s>0?pv/s:0}})}catch(e:any){console.error("campaigns_error",e)}return json({configured:true,connected:true,period,startDate:validDate(startDate)?startDate:null,endDate:validDate(endDate)?endDate:null,spend,impressions:Number(row.impressions||0),reach:Number(row.reach||0),frequency:Number(row.frequency||0),clicks:Number(row.clicks||0),ctr:Number(row.ctr||0),cpm:Number(row.cpm||0),cpc:Number(row.cpc||0),purchases,purchaseValue,costPerPurchase:purchases>0?spend/purchases:0,roas:spend>0?purchaseValue/spend:0,campaigns,updatedAt:new Date().toISOString()})}
async function saveSecrets(supabase:any,body:any){const {data,isAdminError}=await supabase.rpc("is_admin").then((r:any)=>({data:r.data,isAdminError:r.error}));if(isAdminError||(!isAdminError&&data!==true))return json({error:"forbidden"},403);for(const [key,value] of [["meta_capi_access_token",body?.capiAccessToken],["meta_marketing_access_token",body?.marketingAccessToken]] as const){if(value!==undefined){const {error}=await supabase.rpc("set_meta_runtime_secret",{p_name:key,p_value:String(value||"").trim()});if(error)return json({error:"No se pudo guardar uno de los tokens de Meta."},500)}}return json({ok:true})}
export default {fetch:withSupabase({auth:["user","publishable"]},async(req:Request,ctx:any)=>{if(req.method!=="POST")return json({error:"method_not_allowed"},405);let body:any;try{body=await req.json()}catch{return json({error:"invalid_body"},400)}try{const action=String(body?.action||"");if(action==="save_secrets")return saveSecrets(ctx.supabase,body);if(action==="capi")return sendCapi(ctx.supabaseAdmin,body);if(action==="insights")return getInsights(ctx.supabaseAdmin,body);return json({error:"unknown_action"},400)}catch(e){console.error(e);return json({error:"meta_runtime_error"},500)}})}
