"use client";
import { useEffect, useRef } from "react";
type Star={x:number;y:number;z:number;size:number;speed:number;alpha:number};
export default function Starfield({intensity=1}:{intensity?:number}){
  const ref=useRef<HTMLCanvasElement>(null);
  useEffect(()=>{
    const canvas=ref.current,context=canvas?.getContext("2d");if(!canvas||!context)return;
    const reduced=window.matchMedia("(prefers-reduced-motion: reduce)").matches;let frame=0,animation=0,width=0,height=0,pointerX=0,pointerY=0,stars:Star[]=[];
    const resize=()=>{const ratio=Math.min(window.devicePixelRatio||1,2);width=innerWidth;height=innerHeight;canvas.width=width*ratio;canvas.height=height*ratio;canvas.style.width=`${width}px`;canvas.style.height=`${height}px`;context.setTransform(ratio,0,0,ratio,0,0);const count=Math.min(180,Math.floor(width*height/8500));stars=Array.from({length:count},()=>({x:Math.random()*width,y:Math.random()*height,z:Math.random(),size:.35+Math.random()*1.35,speed:.02+Math.random()*.09,alpha:.2+Math.random()*.65}))};
    const move=(e:PointerEvent)=>{pointerX=e.clientX/width-.5;pointerY=e.clientY/height-.5};
    const draw=()=>{context.clearRect(0,0,width,height);frame++;for(const star of stars){if(!reduced){star.y+=star.speed*intensity;if(star.y>height+4)star.y=-4}const pulse=reduced?1:.75+Math.sin(frame*.012+star.x)*.25,x=star.x+pointerX*star.z*15,y=star.y+pointerY*star.z*10;context.beginPath();context.fillStyle=`rgba(${star.z>.72?"109,226,255":"218,223,255"},${star.alpha*pulse})`;context.arc(x,y,star.size*(.65+star.z),0,Math.PI*2);context.fill()}if(!reduced&&!document.hidden)animation=requestAnimationFrame(draw)};
    resize();addEventListener("resize",resize);addEventListener("pointermove",move,{passive:true});draw();return()=>{cancelAnimationFrame(animation);removeEventListener("resize",resize);removeEventListener("pointermove",move)};
  },[intensity]);
  return <canvas ref={ref} className="starfield" aria-hidden="true"/>;
}

