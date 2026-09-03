"use client";
import {useMemo,useState} from "react";

type Media={id?:string;media_type:"image"|"video";url:string;mime_type?:string|null;original_name?:string|null;sort_order?:number;is_primary?:boolean};

export default function ProductMediaGallery({name,media}:{name:string;media:Media[]}){
 const items=useMemo(()=>[...media].sort((a,b)=>(Number(b.is_primary)-Number(a.is_primary))+(Number(a.sort_order||0)-Number(b.sort_order||0))),[media]);
 const [active,setActive]=useState(0);
 const current=items[active]||null;
 if(!current) return <div className="pic big product-gallery-empty"><b>DF</b></div>;
 return <div className="product-gallery">
  <div className="product-gallery-stage">
   {current.media_type==="image"?<img src={current.url} alt={`${name} - imagen ${active+1}`}/>:<video key={current.url} src={current.url} controls playsInline preload="metadata"/>}
  </div>
  {items.length>1&&<div className="product-gallery-thumbs" role="list" aria-label="Galería del producto">{items.map((m,i)=><button type="button" key={m.id||`${m.url}-${i}`} className={i===active?"active":""} onClick={()=>setActive(i)} aria-label={`Ver ${m.media_type==="image"?"imagen":"video"} ${i+1}`}>
    {m.media_type==="image"?<img src={m.url} alt="" loading="lazy"/>:<span>▶<small>Video {i+1}</small></span>}
   </button>)}</div>}
 </div>;
}
