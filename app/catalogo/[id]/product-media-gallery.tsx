"use client";
import {useMemo,useState} from "react";

type Media={id?:string;media_type:"image"|"video";url:string;mime_type?:string|null;original_name?:string|null;sort_order?:number;is_primary?:boolean};

export default function ProductMediaGallery({name,media}:{name:string;media:Media[]}){
 const items=useMemo(()=>[...media].sort((a,b)=>(Number(b.is_primary)-Number(a.is_primary))+(Number(a.sort_order||0)-Number(b.sort_order||0))),[media]);
 const [active,setActive]=useState(0);
 const current=items[active]||null;
 if(!current) return <div className="pic big product-gallery-empty"><b>DF</b></div>;
 return <div className="product-gallery-fixed">
  <div className="product-gallery-stage-fixed">
   {current.media_type==="image" ? <img src={current.url} alt={`${name} - imagen ${active+1}`}/> : <video key={current.url} src={current.url} controls playsInline preload="metadata"/>}
  </div>
  {items.length>1&&<div className="product-gallery-thumbs-fixed" role="list" aria-label="Galería del producto">{items.map((m,i)=><button type="button" key={m.id||`${m.url}-${i}`} className={i===active?"active":""} onClick={()=>setActive(i)} aria-label={`Ver ${m.media_type==="image"?"imagen":"video"} ${i+1}`}>
    {m.media_type==="image"?<img src={m.url} alt="" loading="lazy"/>:<span>▶<small>Video {i+1}</small></span>}
   </button>)}</div>}
  <style jsx>{`
    .product-gallery-fixed{width:100%;min-width:0;overflow:hidden}
    .product-gallery-stage-fixed{width:100%;aspect-ratio:1/1;max-height:620px;background:#f5efeb;border:1px solid #eadfe0;border-radius:18px;display:flex;align-items:center;justify-content:center;overflow:hidden}
    .product-gallery-stage-fixed img,.product-gallery-stage-fixed video{display:block;width:100%;height:100%;max-width:100%;max-height:100%;object-fit:contain}
    .product-gallery-thumbs-fixed{display:flex;gap:10px;overflow-x:auto;padding:12px 2px 4px;max-width:100%}
    .product-gallery-thumbs-fixed button{flex:0 0 72px;width:72px;height:72px;padding:0;border:2px solid #eadfe0;border-radius:10px;background:#fff;overflow:hidden;cursor:pointer}
    .product-gallery-thumbs-fixed button.active{border-color:#98234d;box-shadow:0 0 0 2px rgba(152,35,77,.14)}
    .product-gallery-thumbs-fixed img{width:100%;height:100%;object-fit:cover;display:block}
    .product-gallery-thumbs-fixed span{display:flex;height:100%;align-items:center;justify-content:center;flex-direction:column;color:#98234d;font-weight:800;gap:4px}
    .product-gallery-thumbs-fixed small{font-size:10px;letter-spacing:0}
    @media(max-width:600px){.product-gallery-stage-fixed{aspect-ratio:1/1;border-radius:14px}.product-gallery-thumbs-fixed button{flex-basis:58px;width:58px;height:58px}}
  `}</style>
 </div>;
}
