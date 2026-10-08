"use client";
import { useEffect, useMemo, useRef, useState } from "react";

type Media = {
  id?: string;
  media_type: "image" | "video";
  url: string;
  mime_type?: string | null;
  original_name?: string | null;
  sort_order?: number;
  is_primary?: boolean;
};

export default function ProductMediaGallery({name,media}:{name:string;media:Media[]}) {
  const items=useMemo(()=>[...media].sort((a,b)=>Number(b.is_primary)-Number(a.is_primary)+(a.sort_order||0)-(b.sort_order||0)),[media]);
  const [active,setActive]=useState(0);
  const [zoomed,setZoomed]=useState(false);\n  const [zoomScale,setZoomScale]=useState(1);\n  const [zoomX,setZoomX]=useState(0);\n  const [zoomY,setZoomY]=useState(0);\n  const pointers=useRef(new Map<number,{x:number;y:number}>());\n  const pinchStart=useRef<{distance:number;scale:number}|null>(null);
  const trackRef=useRef<HTMLDivElement|null>(null);
  const videoRefs=useRef<Record<number,HTMLVideoElement|null>>({});

  useEffect(()=>{
    const track=trackRef.current;
    if(!track||items.length<2)return;
    const slides=Array.from(track.querySelectorAll<HTMLElement>("[data-gallery-slide]"));
    const observer=new IntersectionObserver(entries=>{
      const visible=entries.filter(e=>e.isIntersecting).sort((a,b)=>b.intersectionRatio-a.intersectionRatio)[0];
      if(!visible)return;
      const index=Number((visible.target as HTMLElement).dataset.index||0);
      setActive(index);
      Object.entries(videoRefs.current).forEach(([key,video])=>{
        if(!video)return;
        if(Number(key)===index&&items[index]?.media_type==="video"){
          video.muted=true;
          void video.play().catch(()=>{});
        }else video.pause();
      });
    },{root:track,threshold:[0.55,0.75,0.9]});
    slides.forEach(slide=>observer.observe(slide));
    return()=>observer.disconnect();
  },[items]);

  const openZoom=()=>{setZoomed(true);setZoomScale(1);setZoomX(0);setZoomY(0);};\n  const closeZoom=()=>{setZoomed(false);setZoomScale(1);setZoomX(0);setZoomY(0);pointers.current.clear();pinchStart.current=null;};\n  const onZoomPointerDown=(e:React.PointerEvent<HTMLImageElement>)=>{e.currentTarget.setPointerCapture(e.pointerId);pointers.current.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pointers.current.size===2){const p=[...pointers.current.values()];pinchStart.current={distance:Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y),scale:zoomScale};}};\n  const onZoomPointerMove=(e:React.PointerEvent<HTMLImageElement>)=>{if(!pointers.current.has(e.pointerId))return;pointers.current.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pointers.current.size===2){const p=[...pointers.current.values()];const d=Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y);const start=pinchStart.current;if(start)setZoomScale(Math.min(4,Math.max(1,start.scale*(d/start.distance))));}else if(zoomScale>1){setZoomX(x=>x+e.movementX);setZoomY(y=>y+e.movementY);}};\n  const onZoomPointerUp=(e:React.PointerEvent<HTMLImageElement>)=>{pointers.current.delete(e.pointerId);if(pointers.current.size<2)pinchStart.current=null;};\n\n  const goTo=(index:number)=>{
    const track=trackRef.current;
    const slide=track?.querySelector<HTMLElement>(`[data-gallery-slide][data-index="${index}"]`);
    if(!track||!slide)return;
    setActive(index);
    slide.scrollIntoView({behavior:"smooth",block:"nearest",inline:"center"});
  };

  if(!items.length)return <div style={{width:"100%",aspectRatio:"1 / 1",display:"grid",placeItems:"center",background:"#f5efeb",borderRadius:18}}><b style={{fontFamily:"Georgia",fontSize:70,color:"#98234d"}}>DF</b></div>;

  return <div data-product-gallery="true" style={{display:"block",position:"relative",width:"100%",maxWidth:"100%",minWidth:0,overflow:"hidden",boxSizing:"border-box"}}>
    <div ref={trackRef} data-product-gallery-track="true" aria-label={`Galería de ${name}`} style={{position:"relative",display:"flex",width:"100%",maxWidth:"100%",aspectRatio:"1 / 1",overflowX:"auto",overflowY:"hidden",overscrollBehaviorX:"contain",WebkitOverflowScrolling:"touch",scrollSnapType:"x mandatory",scrollbarWidth:"none",msOverflowStyle:"none",backgroundColor:"#f5efeb",border:"1px solid #eadfe0",borderRadius:18,boxSizing:"border-box",touchAction:"pan-x"}}>
      {items.map((item,index)=><div key={item.id||`${item.url}-${index}`} data-gallery-slide="true" data-index={index} style={{position:"relative",flex:"0 0 100%",width:"100%",height:"100%",minWidth:0,minHeight:0,overflow:"hidden",scrollSnapAlign:"center",scrollSnapStop:"always",background:"#f5efeb"}}>
        {item.media_type==="image"?<button type="button" onClick={openZoom} aria-label={`Ampliar imagen ${index+1}`} style={{display:"block",width:"100%",height:"100%",padding:0,margin:0,border:0,background:"transparent",cursor:"zoom-in"}}><img src={item.url} alt={`${name} - imagen ${index+1}`} draggable={false} loading={index===0?"eager":"lazy"} style={{display:"block",width:"100%",height:"100%",minWidth:0,minHeight:0,maxWidth:"none",maxHeight:"none",objectFit:"contain",objectPosition:"center center",margin:0,padding:0,border:0,userSelect:"none",pointerEvents:"none"}}/></button>:
        <video ref={node=>{videoRefs.current[index]=node}} src={item.url} controls playsInline muted autoPlay={index===active} preload="auto" loop style={{display:"block",width:"100%",height:"100%",minWidth:0,minHeight:0,maxWidth:"none",maxHeight:"none",objectFit:"contain",margin:0,padding:0,border:0,background:"#000"}}/>}
      </div>)}
    </div>
    {items.length>1&&<div data-product-gallery-thumbs="true" style={{display:"flex",flexDirection:"row",flexWrap:"nowrap",alignItems:"center",gap:10,width:"100%",maxWidth:"100%",overflowX:"auto",overflowY:"hidden",padding:"12px 2px 4px",boxSizing:"border-box",position:"relative",zIndex:3,scrollbarWidth:"none"}}>
      {items.map((item,index)=><button key={item.id||`${item.url}-${index}`} type="button" onClick={()=>goTo(index)} aria-label={`Ir a ${item.media_type==="image"?"imagen":"video"} ${index+1}`} style={{flex:"0 0 64px",width:64,minWidth:64,height:64,minHeight:64,display:"block",padding:0,margin:0,overflow:"hidden",borderRadius:10,border:`2px solid ${index===active?"#98234d":"#eadfe0"}`,background:"#fff",boxSizing:"border-box",cursor:"pointer"}}>
        {item.media_type==="image"?<img src={item.url} alt="" loading="lazy" draggable={false} style={{display:"block",width:"100%",height:"100%",objectFit:"cover",margin:0,padding:0,border:0}}/>:
        <span style={{display:"flex",width:"100%",height:"100%",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:3,color:"#98234d",fontWeight:800,fontSize:18}}><span>▶</span><small style={{fontSize:9,lineHeight:1}}>Video {index+1}</small></span>}
      </button>)}
    </div>}
  </div>;
}