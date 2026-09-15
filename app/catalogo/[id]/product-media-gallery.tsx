"use client";
import {useMemo,useState} from "react";

type Media={id?:string;media_type:"image"|"video";url:string;mime_type?:string|null;original_name?:string|null;sort_order?:number;is_primary?:boolean};

export default function ProductMediaGallery({name,media}:{name:string;media:Media[]}){
 const items=useMemo(()=>[...media].sort((a,b)=>(Number(b.is_primary)-Number(a.is_primary))+(Number(a.sort_order||0)-Number(b.sort_order||0))),[media]);
 const [active,setActive]=useState(0);
 const current=items[active]||null;
 if(!current) return <div className="pic big product-gallery-empty"><b>DF</b></div>;

 return <div
   className="product-gallery-fixed"
   style={{width:"100%",minWidth:0,maxWidth:"100%",overflow:"hidden",boxSizing:"border-box"}}
 >
   <div
     className="product-gallery-stage-fixed"
     style={{
       position:"relative",
       width:"100%",
       maxWidth:"100%",
       aspectRatio:"1 / 1",
       height:"auto",
       maxHeight:620,
       background:"#f5efeb",
       border:"1px solid #eadfe0",
       borderRadius:18,
       display:"flex",
       alignItems:"center",
       justifyContent:"center",
       overflow:"hidden",
       boxSizing:"border-box",
       isolation:"isolate"
     }}
   >
     {current.media_type==="image" ? <img
       src={current.url}
       alt={`${name} - imagen ${active+1}`}
       style={{display:"block",width:"100%",height:"100%",maxWidth:"100%",maxHeight:"100%",objectFit:"contain",objectPosition:"center",flex:"0 0 auto"}}
     /> : <video
       key={current.url}
       src={current.url}
       controls
       playsInline
       preload="metadata"
       style={{display:"block",width:"100%",height:"100%",maxWidth:"100%",maxHeight:"100%",objectFit:"contain"}}
     />}
   </div>
   {items.length>1&&<div
     className="product-gallery-thumbs-fixed"
     role="list"
     aria-label="Galería del producto"
     style={{display:"flex",flexWrap:"nowrap",gap:10,overflowX:"auto",overflowY:"hidden",padding:"12px 2px 4px",width:"100%",maxWidth:"100%",boxSizing:"border-box",position:"relative",zIndex:2}}
   >{items.map((m,i)=><button
     type="button"
     key={m.id||`${m.url}-${i}`}
     className={i===active?"active":""}
     onClick={()=>setActive(i)}
     aria-label={`Ver ${m.media_type==="image"?"imagen":"video"} ${i+1}`}
     style={{flex:"0 0 72px",width:72,height:72,minWidth:72,padding:0,border:`2px solid ${i===active?"#98234d":"#eadfe0"}`,borderRadius:10,background:"#fff",overflow:"hidden",cursor:"pointer",boxSizing:"border-box"}}
   >
     {m.media_type==="image"?<img src={m.url} alt="" loading="lazy" style={{width:"100%",height:"100%",maxWidth:"100%",objectFit:"cover",display:"block"}}/>:<span style={{display:"flex",height:"100%",alignItems:"center",justifyContent:"center",flexDirection:"column",color:"#98234d",fontWeight:800,gap:4}}>▶<small style={{fontSize:10,letterSpacing:0}}>Video {i+1}</small></span>}
   </button>)}
   </div>}
   <style jsx>{`
     .product-gallery-fixed *{box-sizing:border-box}
     .product-gallery-thumbs-fixed button.active{box-shadow:0 0 0 2px rgba(152,35,77,.14)}
     @media(max-width:600px){
       .product-gallery-stage-fixed{border-radius:14px!important}
       .product-gallery-thumbs-fixed button{flex-basis:58px!important;width:58px!important;height:58px!important;min-width:58px!important}
     }
   `}</style>
 </div>;
}
