"use client";
import { useEffect, useRef } from "react";
type Star={x:number;y:number;z:number;size:number;speed:number;alpha:number};
export default function Starfield({intensity=1}:{intensity?:number}){
  const ref=useRef<HTMLCanvasElement>(null);
  useEffect(()=>{
    const canvas=ref.current,context=canvas?.getContext("2d");if(!canvas||!context)return;
    const reduced=window.matchMedia("(prefers-reduced-motion: reduce)").matches;const mobile=window.matchMedia("(max-width: 760px)").matches;let frame=0,animation=0,width=0,height=0,pointerX=0,pointerY=0,stars:Star[]=[],lastPaint=0,resizeFrame=0;
    const resize=()=>{const ratio=Math.min(window.devicePixelRatio||1,mobile?1.25:1.6);width=innerWidth;height=innerHeight;canvas.width=Math.round(width*ratio);canvas.height=Math.round(height*ratio);canvas.style.width=`${width}px`;canvas.style.height=`${height}px`;context.setTransform(ratio,0,0,ratio,0,0);const count=Math.min(mobile?72:128,Math.floor(width*height/(mobile?11500:10000)));stars=Array.from({length:count},()=>({x:Math.random()*width,y:Math.random()*height,z:Math.random(),size:.35+Math.random()*1.25,speed:.02+Math.random()*.08,alpha:.2+Math.random()*.6}))};
    const scheduleResize=()=>{cancelAnimationFrame(resizeFrame);resizeFrame=requestAnimationFrame(resize)};
    const move=(e:PointerEvent)=>{pointerX=e.clientX/width-.5;pointerY=e.clientY/height-.5};
    const paint=()=>{context.clearRect(0,0,width,height);frame++;for(const star of stars){if(!reduced){star.y+=star.speed*intensity;if(star.y>height+4)star.y=-4}const pulse=reduced?1:.78+Math.sin(frame*.018+star.x)*.22,x=star.x+pointerX*star.z*12,y=star.y+pointerY*star.z*8;context.beginPath();context.fillStyle=`rgba(${star.z>.72?"109,226,255":"218,223,255"},${star.alpha*pulse})`;context.arc(x,y,star.size*(.65+star.z),0,Math.PI*2);context.fill()}};
    const draw=(time:number)=>{if(time-lastPaint>=33){paint();lastPaint=time}if(!reduced&&!document.hidden)animation=requestAnimationFrame(draw)};
    const visibility=()=>{cancelAnimationFrame(animation);if(!document.hidden&&!reduced)animation=requestAnimationFrame(draw)};
    resize();paint();addEventListener("resize",scheduleResize,{passive:true});if(!mobile)addEventListener("pointermove",move,{passive:true});document.addEventListener("visibilitychange",visibility);if(!reduced)animation=requestAnimationFrame(draw);return()=>{cancelAnimationFrame(animation);cancelAnimationFrame(resizeFrame);removeEventListener("resize",scheduleResize);removeEventListener("pointermove",move);document.removeEventListener("visibilitychange",visibility)};
  },[intensity]);
  return <canvas ref={ref} className="starfield" aria-hidden="true"/>;
}
