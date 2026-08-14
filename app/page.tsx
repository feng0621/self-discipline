"use client";
/* eslint-disable jsx-a11y/no-autofocus, @next/next/no-img-element */

import { useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import AuthPanel from "../components/AuthPanel";
import ReadinessCard from "../components/ReadinessCard";
import Starfield from "../components/Starfield";
import type { ReadinessRecommendation } from "../lib/adaptive-training";
import { supabase } from "../lib/supabase";

type Exercise = { name:string; en:string; target:string; dose:string; sets:number; rest:number; videoId?:string; source?:string; provider:string; cue:string; avoid:string };

const exercises: Exercise[] = [
  { name:"上斜俯卧撑", en:"INCLINE PUSH-UP", target:"胸 · 肩 · 核心", dose:"4 × 12", sets:4, rest:75, videoId:"0JUrOH--Kdk", provider:"NASM", cue:"胸口向支撑面靠近，头、背、髋保持一条直线。", avoid:"耸肩、塌腰或只移动头部" },
  { name:"椅子深蹲", en:"CHAIR SQUAT", target:"臀 · 大腿 · 核心", dose:"4 × 15", sets:4, rest:75, videoId:"QX7HgfPyvDk", provider:"Dr. Elise Brown", cue:"臀部先向后找椅面，膝盖始终朝脚尖方向。", avoid:"快速坐下或膝盖向内扣" },
  { name:"弹力带划船", en:"BAND ROW", target:"背 · 手臂", dose:"4 × 12", sets:4, rest:60, videoId:"WkNuYbWZ8g8", provider:"Whats Up Dude", cue:"胸口保持打开，肘部贴近身体向后拉。", avoid:"耸肩、含胸或身体后仰借力" },
  { name:"臀桥", en:"GLUTE BRIDGE", target:"臀 · 腿后侧", dose:"3 × 18", sets:3, rest:60, videoId:"SKOMwg1JLrU", provider:"NASM", cue:"脚跟发力抬髋，在最高点主动收紧臀部。", avoid:"用腰硬顶或把肋骨过度抬起" },
  { name:"前臂平板支撑", en:"FOREARM PLANK", target:"腹部 · 核心", dose:"3 × 30秒", sets:3, rest:45, videoId:"Vdcy7VrRluA", provider:"ACE Fitness", cue:"收紧腹部与臀部，同时保持均匀呼吸。", avoid:"屏住呼吸、塌腰或臀部抬得过高" },
];

const quickStages = [
  {name:"关节唤醒",detail:"肩绕环 + 髋部活动",duration:60},
  {name:"椅子深蹲",detail:"40秒训练 · 20秒调整",duration:120},
  {name:"墙壁俯卧撑",detail:"40秒训练 · 20秒调整",duration:120},
  {name:"原地快走",detail:"保持能说短句的速度",duration:120},
  {name:"死虫式",detail:"慢呼吸，腰背贴地",duration:60},
];

export default function Home(){
  const [user,setUser]=useState<User|null>(null);
  const [authReady,setAuthReady]=useState(true);
  const [demoMode,setDemoMode]=useState(true);
  const [cloudState,setCloudState]=useState<"idle"|"saving"|"synced"|"error">("idle");
  const [done,setDone]=useState<number[]>([]);
  const [guide,setGuide]=useState<number|null>(null);
  const [timer,setTimer]=useState(false);
  const [seconds,setSeconds]=useState(75);
  const [running,setRunning]=useState(false);
  const [tab,setTab]=useState("训练");
  const [weight,setWeight]=useState("110.0");
  const [waist,setWaist]=useState("101");
  const [sleep,setSleep]=useState("7.5");
  const [water,setWater]=useState(5);
  const [notice,setNotice]=useState("");
  const [reminder,setReminder]=useState(true);
  const [equipment,setEquipment]=useState(["徒手","弹力带"]);
  const [workoutOpen,setWorkoutOpen]=useState(false);
  const [activeExercise,setActiveExercise]=useState(0);
  const [setsCompleted,setSetsCompleted]=useState(0);
  const [swapped,setSwapped]=useState<number[]>([]);
  const [feedback,setFeedback]=useState("");
  const [timerMode,setTimerMode]=useState<"rest"|"quick">("rest");
  const [hour]=useState(()=>new Date().getHours());
  const [restTotal,setRestTotal]=useState(75);
  const [intensity,setIntensity]=useState<"入门"|"进阶"|"强化">("入门");
  const [extraOpen,setExtraOpen]=useState(false);
  const [extraName,setExtraName]=useState("快走");
  const [extraAmount,setExtraAmount]=useState("20 分钟");
  const [extraEffort,setExtraEffort]=useState("适中");
  const [extras,setExtras]=useState<{id:number;name:string;amount:string;effort:string;time:string}[]>([]);

  useEffect(()=>{
    supabase.auth.getUser().then(({data})=>{setUser(data.user);setAuthReady(true)});
    const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,session)=>{setUser(session?.user??null);setAuthReady(true)});
    return()=>subscription.unsubscribe();
  },[]);
  useEffect(()=>{
    if(!user)return;
    const load=async()=>{
      const today=new Date().toISOString().slice(0,10);
      const [{data:profile},{data:body},{data:activities}]=await Promise.all([
        supabase.from("profiles").select("current_weight_kg,equipment,reminder_enabled").eq("id",user.id).maybeSingle(),
        supabase.from("body_logs").select("weight_kg,waist_cm,sleep_hours,water_cups").eq("user_id",user.id).eq("logged_on",today).maybeSingle(),
        supabase.from("extra_activities").select("activity_name,amount,effort,completed_at").eq("user_id",user.id).order("completed_at",{ascending:false}).limit(8),
      ]);
      if(profile?.current_weight_kg)setWeight(String(profile.current_weight_kg));
      if(profile?.equipment)setEquipment(profile.equipment);
      if(typeof profile?.reminder_enabled==="boolean")setReminder(profile.reminder_enabled);
      if(body){if(body.weight_kg)setWeight(String(body.weight_kg));if(body.waist_cm)setWaist(String(body.waist_cm));if(body.sleep_hours)setSleep(String(body.sleep_hours));if(body.water_cups!==null)setWater(body.water_cups)}
      if(activities)setExtras(activities.map((x,index)=>({id:index+1,name:x.activity_name,amount:x.amount,effort:x.effort,time:new Date(x.completed_at).toLocaleTimeString("zh-CN",{hour:"2-digit",minute:"2-digit"})})));
      setCloudState("synced");
    };
    void load();
  },[user]);

  useEffect(()=>{if(!running)return;const id=window.setInterval(()=>setSeconds(v=>{if(v<=1){setRunning(false);if(workoutOpen&&timerMode==="rest")setTimer(false);return 0}return v-1}),1000);return()=>window.clearInterval(id)},[running,workoutOpen,timerMode]);
  useEffect(()=>{const locked=workoutOpen||timer||guide!==null||extraOpen;document.documentElement.classList.toggle("overlayLocked",locked);return()=>document.documentElement.classList.remove("overlayLocked")},[workoutOpen,timer,guide,extraOpen]);
  const activeExercises=useMemo(()=>exercises.map((x,i)=>{
    if(intensity==="入门")return {...x,sets:3,dose:i===4?"3 × 20秒":i===3?"3 × 12":`3 × ${i===1?10:8}`,rest:75};
    if(intensity==="进阶")return {...x,name:["跪姿俯卧撑","徒手深蹲","弹力带划船停顿","单腿辅助臀桥","侧平板支撑"][i],dose:["3 × 10","3 × 12","3 × 12","3 × 10/侧","3 × 20秒/侧"][i],sets:3,rest:75};
    return {...x,name:["标准俯卧撑","反向箭步蹲","强阻力弹力带划船","单腿臀桥","平板支撑点肩"][i],dose:["4 × 8–12","4 × 10/侧","4 × 10–12","4 × 10/侧","4 × 20次"][i],sets:4,rest:90};
  }),[intensity]);
  const progress=useMemo(()=>Math.round(done.length/activeExercises.length*100),[done,activeExercises.length]);
  const quickElapsed=480-seconds;
  let quickCursor=0;
  const quickStageIndex=Math.min(quickStages.findIndex(s=>{quickCursor+=s.duration;return quickElapsed<quickCursor}),quickStages.length-1);
  const safeQuickIndex=quickStageIndex<0?quickStages.length-1:quickStageIndex;
  const clock=`${String(Math.floor(seconds/60)).padStart(2,"0")}:${String(seconds%60).padStart(2,"0")}`;
  const toggle=(i:number)=>setDone(v=>v.includes(i)?v.filter(x=>x!==i):[...v,i]);
  const beginRest=(value:number)=>{setRestTotal(value);setTimerMode("rest");setSeconds(value);setRunning(true);setTimer(true)};
  const startWorkout=()=>{setActiveExercise(0);setSetsCompleted(0);setFeedback("");setWorkoutOpen(true)};
  const persistWorkout=async()=>{if(!user)return;setCloudState("saving");const{data:session,error}=await supabase.from("workout_sessions").insert({user_id:user.id,intensity,duration_seconds:activeExercises.reduce((sum,x)=>sum+x.sets*45+x.rest*(x.sets-1),0),difficulty:"正合适"}).select("id").single();if(error||!session){setCloudState("error");return}await supabase.from("exercise_logs").insert(activeExercises.map(x=>({session_id:session.id,exercise_name:x.name,sets_completed:x.sets,dose:x.dose})));setCloudState("synced")};
  const finishSet=()=>{const current=activeExercises[activeExercise];if(setsCompleted+1<current.sets){setSetsCompleted(v=>v+1);beginRest(current.rest);return}setDoneExercise(activeExercise);if(activeExercise<activeExercises.length-1){setActiveExercise(v=>v+1);setSetsCompleted(0);beginRest(current.rest)}else{setWorkoutOpen(false);setFeedback("正合适");void persistWorkout();flash(user?"训练完成，记录已同步":"训练完成，登录后可云端同步")}};
  const setDoneExercise=(i:number)=>setDone(v=>v.includes(i)?v:[...v,i]);
  const startQuick=()=>{setTimerMode("quick");setSeconds(480);setRunning(true);setTimer(true)};
  const flash=(message:string)=>{setNotice(message);window.setTimeout(()=>setNotice(""),2200)};
  const addExtra=async()=>{if(!extraName.trim()||!extraAmount.trim())return;const item={id:Date.now(),name:extraName.trim(),amount:extraAmount.trim(),effort:extraEffort,time:new Date().toLocaleTimeString("zh-CN",{hour:"2-digit",minute:"2-digit"})};setExtras(v=>[item,...v]);setExtraOpen(false);if(user){setCloudState("saving");const{error}=await supabase.from("extra_activities").insert({user_id:user.id,activity_name:item.name,amount:item.amount,effort:item.effort});setCloudState(error?"error":"synced")}flash(user?"额外训练已同步":"额外训练已保存在演示会话")};
  const saveBodyLog=async()=>{if(!user){flash("演示模式不会云端保存");return}setCloudState("saving");const today=new Date().toISOString().slice(0,10);const{error}=await supabase.from("body_logs").upsert({user_id:user.id,logged_on:today,weight_kg:Number(weight),waist_cm:Number(waist),sleep_hours:Number(sleep),water_cups:water},{onConflict:"user_id,logged_on"});if(!error)await supabase.from("profiles").update({current_weight_kg:Number(weight),equipment,reminder_enabled:reminder}).eq("id",user.id);setCloudState(error?"error":"synced");flash(error?"同步失败，请稍后重试":"今天的身体记录已同步")};
  const saveReadiness=async(input:{sleepHours:number;energy:number;soreness:number;mood:number;availableMinutes:number;soreAreas:string[]},result:ReadinessRecommendation)=>{setIntensity(result.intensity);if(!user){flash(`已采用${result.intensity}建议（演示模式）`);return}setCloudState("saving");const{error}=await supabase.from("daily_checkins").upsert({user_id:user.id,checked_on:new Date().toISOString().slice(0,10),sleep_hours:input.sleepHours,energy:input.energy,soreness:input.soreness,mood:input.mood,available_minutes:input.availableMinutes,sore_areas:input.soreAreas,readiness_score:result.score,recommendation:result},{onConflict:"user_id,checked_on"});setCloudState(error?"error":"synced");flash(error?"状态保存失败":"今日训练已经自适应调整")};
  const dayPlan=hour<10?{greeting:"早上好，",title:"先唤醒身体。",name:"8 分钟晨练",detail:"低冲击唤醒 · 5 个环节 · 无器械",action:startQuick}:hour<17?{greeting:"下午好，",title:"练一轮力量。",name:"全身力量 A",detail:"5 个动作 · 约 42 分钟 · 组间休息 45—75 秒",action:startWorkout}:hour<22?{greeting:"晚上好，",title:"今天练全身。",name:"全身力量 A",detail:"5 个动作 · 约 42 分钟 · 每组保留 2 次余力",action:startWorkout}:{greeting:"夜深了，",title:"做舒缓恢复。",name:"睡前恢复",detail:"呼吸与拉伸 · 8 分钟 · 不做高强度训练",action:startQuick};

  if(!authReady)return <main className="bootScreen"><span>FORMA°</span><i/></main>;
  if(!user&&!demoMode)return <><Starfield/><AuthPanel onContinueDemo={()=>setDemoMode(true)}/></>;

  return <main className="app">
    <Starfield intensity={intensity==="强化"?1.4:1}/>
    <div className="nebulaField" aria-hidden="true"/>
    <aside className="rail"><span>FORMA / 12</span><i/><small>110.0 KG</small></aside>
    <header className="nav">
      <button className="wordmark">FORMA<span>°</span></button>
      <div className="navCenter"><b>W02</b><span>十二周重塑计划</span></div>
      <div className="cloudStatus" data-state={cloudState}><i/>{user?(cloudState==="saving"?"同步中":cloudState==="error"?"同步失败":"云端已连接"):"演示模式"}</div>
      <button className="profile" onClick={()=>user?void supabase.auth.signOut():setDemoMode(false)} aria-label={user?"退出登录":"进入登录"}>{user?.email?.[0]?.toUpperCase()??"J"}</button>
    </header>

    <nav className="desktopTabs">{["训练","计划","记录","我的"].map(x=><button key={x} onClick={()=>setTab(x)} className={tab===x?"active":""}>{x}<span>↗</span></button>)}</nav>
    <div key={tab} className="pageTransition">

    {tab==="训练"&&<>
    <div className="kineticBand" aria-hidden="true"><div><span>上斜俯卧撑</span><i>●</i><span>椅子深蹲</span><i>●</i><span>弹力带划船</span><i>●</i><span>臀桥</span><i>●</i><span>平板支撑</span><i>●</i><span>上斜俯卧撑</span><i>●</i><span>椅子深蹲</span></div></div>

    <section className="dashboard">
      <div className="intro">
        <div className="date"><span>08.14</span><i>星期五</i></div>
        <p className="kicker">DAY 12 · STRENGTH / A</p>
        <h1><span>{dayPlan.greeting}</span><br/><strong>{dayPlan.title}</strong></h1>
        <p className="brief"><b>现在推荐：{dayPlan.name}</b><br/>{dayPlan.detail}</p>
        <button className="start" onClick={dayPlan.action}><span>开始{dayPlan.name}</span><b>→</b></button>
      </div>

      <div className="scorePanel">
        <div className="scoreTop"><span>今日完成度</span><small>{done.length} / {exercises.length} 动作</small></div>
        <div className="score"><strong>{String(progress).padStart(2,"0")}</strong><sup>%</sup><i style={{"--score":`${progress}%`} as React.CSSProperties}/></div>
        <div className="week">
          {["一","二","三","四","五","六","日"].map((d,i)=><span key={d} className={i<4?"past":i===4?"today":""}><b>{d}</b><i>{i<4?"✓":i===4?"12":""}</i></span>)}
        </div>
        <div className="statRow"><span><small>连续打卡</small><b>08 <i>天</i></b></span><span><small>本周训练</small><b>03 <i>次</i></b></span><span><small>今日步数</small><b>6.8<i>k</i></b></span></div>
      </div>
    </section>

    <section className="smartDeck">
      <article className="adaptCard"><div className="adaptIcon">◎</div><div><p className="kicker">SMART ADAPTATION</p><h3>已按你的器材调整</h3><p>{equipment.join(" · ") || "徒手"} · 低冲击 · 约 42 分钟</p></div><button onClick={()=>setTab("我的")}>调整器材</button></article>
      <article className="quickCard"><div><span>08:00</span><p className="kicker">MORNING EXPRESS</p><h3>起床就练，唤醒全身</h3><p>深蹲 · 墙壁俯卧撑 · 原地快走 · 死虫式</p></div><button onClick={startQuick}>开始晨练 <b>→</b></button></article>
    </section>

    <ReadinessCard onSave={saveReadiness}/>

    <section className="intensityDeck"><div><p className="kicker">PROGRESSIVE LOAD</p><h2>今天想练到什么程度？</h2><p>提升档位会更换动作、组数和休息时间，不加入跳跃动作。</p></div><div className="intensitySwitch">{[{n:"入门",d:"动作稳定优先"},{n:"进阶",d:"增加单侧控制"},{n:"强化",d:"力量与核心挑战"}].map(x=><button className={intensity===x.n?"active":""} onClick={()=>{setIntensity(x.n as typeof intensity);setDone([]);setSwapped([]);flash(`已切换为${x.n}训练`)}} key={x.n}><b>{x.n}</b><span>{x.d}</span></button>)}</div></section>

    <section className="session">
      <div className="sessionHead"><div><p className="kicker">TODAY / TRAINING</p><h2>今日训练清单</h2></div><div className="legend"><span><i/>待完成</span><span><i/>已完成</span></div></div>
      <div className="cards">
        {activeExercises.map((x,i)=>{
          const complete=done.includes(i);
          const thumb=x.videoId?`https://i.ytimg.com/vi/${x.videoId}/hqdefault.jpg`:"https://images.squarespace-cdn.com/content/v1/5f2dbf7615c5ac6ba97c51ca/1603759528829-8XQ5XSBN1QR35ZRDA4FG/chairsquattutorial.jpg";
          return <article className={`card ${complete?"complete":""}`} key={x.name}>
            <button className="media" onClick={()=>setGuide(i)} aria-label={`观看${x.name}教学`}>
              <img src={thumb} alt=""/>
              <span className="mediaShade"/><span className="playIcon">▶</span><small>{x.provider} · 教学</small>
            </button>
            <div className="cardBody">
              <span className="index">{String(i+1).padStart(2,"0")}</span>
              <div className="name"><small>{x.en}</small><h3>{swapped.includes(i)?["墙壁俯卧撑","箱式深蹲","坐姿弹力带划船","蛙式臀桥","高位平板支撑"][i]:x.name}</h3><p>{x.target}</p><button className="swap" onClick={()=>setSwapped(v=>v.includes(i)?v.filter(n=>n!==i):[...v,i])}>{swapped.includes(i)?"恢复原动作":"替换动作"} ↻</button></div>
              <div className="dose"><small>训练量</small><b>{x.dose}</b></div>
              <button className="completeButton" onClick={()=>toggle(i)}>{complete?<><b>✓</b><span>已完成</span></>:<><b>+</b><span>完成</span></>}</button>
            </div>
          </article>
        })}
      </div>
      <div className="extraTraining"><div className="extraHead"><div><p className="kicker">EXTRA ACTIVITY</p><h2>计划之外，也算进步。</h2><p>记录你另外完成的运动，不会改变原训练计划。</p></div><button onClick={()=>setExtraOpen(true)}>＋ 添加额外训练</button></div>{extras.length>0&&<div className="extraList">{extras.map(x=><article key={x.id}><span>✓</span><div><b>{x.name}</b><small>{x.amount} · {x.effort}强度 · {x.time}</small></div><button aria-label={`删除${x.name}`} onClick={()=>setExtras(v=>v.filter(y=>y.id!==x.id))}>×</button></article>)}</div>}</div>
    </section>

    <section className="coach"><span>COACH NOTE</span><p>动作标准，比次数漂亮更重要。</p><small>关节疼痛不是训练效果；出现尖锐疼痛请立即停止。</small></section>
    </>}

    {tab==="计划"&&<section className="module planModule">
      <div className="moduleHero"><p className="kicker">12-WEEK FIELD MAP</p><h1>不是日历，<br/><strong>是你的身体路线。</strong></h1><div className="moduleMeta"><span><small>当前位置</small><b>第 02 周</b></span><span><small>完成训练</small><b>05 / 36</b></span><span><small>下一阶段</small><b>还有 09 天</b></span></div></div>
      <div className="phaseRail">
        {[{n:"01",title:"唤醒",sub:"建立动作模式",weeks:"01—02"},{n:"02",title:"推进",sub:"提高训练容量",weeks:"03—06"},{n:"03",title:"强化",sub:"力量与核心",weeks:"07—10"},{n:"04",title:"显形",sub:"巩固与减脂",weeks:"11—12"}].map((p,i)=><article key={p.n} className={i===0?"current":""}><span>{p.n}</span><div><small>WEEK {p.weeks}</small><h2>{p.title}</h2><p>{p.sub}</p></div><i>{i===0?"进行中":i===1?"下一阶段":"未开始"}</i></article>)}
      </div>
      <div className="weekBoard"><div className="boardHead"><div><p className="kicker">WEEK 02</p><h2>本周安排</h2></div><span>3 次力量 · 3 次快走</span></div><div className="dayStrip">{["一","二","三","四","五","六","日"].map((d,i)=><button key={d} className={i===4?"today":i<4?"done":""}><small>周{d}</small><b>{["力量 A","快走","力量 B","快走","力量 A","长距离","恢复"][i]}</b><span>{i<4?"✓":i===4?"今天":""}</span></button>)}</div></div>
    </section>}

    {tab==="记录"&&<section className="module recordModule">
      <div className="moduleHero compact"><p className="kicker">BODY LOG / PRIVATE</p><h1>变化，<br/><strong>正在发生。</strong></h1></div>
      <div className="recordGrid">
        <form className="checkin" onSubmit={e=>{e.preventDefault();void saveBodyLog()}}><span className="formNo">08 / 14</span><h2>今日身体打卡</h2><label>体重 <span><input value={weight} onChange={e=>setWeight(e.target.value)} inputMode="decimal"/> kg</span></label><label>腰围 <span><input value={waist} onChange={e=>setWaist(e.target.value)} inputMode="decimal"/> cm</span></label><label>睡眠 <span><input value={sleep} onChange={e=>setSleep(e.target.value)} inputMode="decimal"/> 小时</span></label><div className="water"><small>今日饮水</small><div>{[1,2,3,4,5,6,7,8].map(n=><button type="button" aria-label={`${n}杯水`} className={n<=water?"filled":""} onClick={()=>setWater(n)} key={n}>●</button>)}</div><b>{water} / 8 杯</b></div><button className="saveRecord">{cloudState==="saving"?"正在同步…":"保存今日记录 →"}</button></form>
        <div className="trajectory"><div className="trajectoryHead"><span><small>起始体重</small><b>112.4</b></span><span><small>当前体重</small><b>{weight}</b></span><span className="delta">−2.4 kg</span></div><div className="chart" aria-label="近八周体重变化图">{[90,82,86,72,68,57,51,42].map((h,i)=><i key={i} style={{height:`${h}%`}}><span>{i+1}</span></i>)}</div><div className="chartFoot"><span>7月01日</span><b>体重趋势 / KG</b><span>今天</span></div></div>
      </div>
      <div className="measurements"><article><small>腰围变化</small><b>−4.0 <i>cm</i></b><span>目标 92 cm</span></article><article><small>累计训练</small><b>05 <i>次</i></b><span>本月目标 12 次</span></article><article><small>连续打卡</small><b>08 <i>天</i></b><span>最佳纪录 11 天</span></article></div>
    </section>}

    {tab==="我的"&&<section className="module profileModule">
      <div className="identity"><div className="identityMark">J</div><p className="kicker">ATHLETE PROFILE / 001</p><h1>为更轻、更强的<br/><strong>自己训练。</strong></h1><div className="identityData"><span>193 <small>CM</small></span><span>{weight} <small>KG</small></span><span>29.5 <small>BMI</small></span></div></div>
      <div className="settings">
        <article><div><small>训练目标</small><h3>减脂 · 腹肌显形</h3><p>每周目标下降 0.4—0.8 kg</p></div><button onClick={()=>flash("目标编辑将在下一版本开放")}>编辑 ↗</button></article>
        <article><div><small>训练提醒</small><h3>周一、三、五 · 19:30</h3><p>训练前 30 分钟提醒</p></div><button className={`switch ${reminder?"on":""}`} aria-label="切换训练提醒" onClick={()=>{setReminder(!reminder);flash(!reminder?"训练提醒已开启":"训练提醒已关闭")}}><i/></button></article>
        <article className="equipmentSetting"><div><small>可用器材</small><h3>训练会优先使用已选器材</h3></div><div>{["徒手","弹力带","哑铃","健身房"].map(x=><button onClick={()=>setEquipment(v=>v.includes(x)?v.filter(y=>y!==x):[...v,x])} className={equipment.includes(x)?"selected":""} key={x}>{x}</button>)}</div></article>
        <article><div><small>健康保护</small><h3>低冲击模式已开启</h3><p>避免跳跃和高冲击跑动</p></div><button onClick={()=>flash("低冲击模式保持开启")}>查看 ↗</button></article>
      </div>
    </section>}
    </div>

    <nav className="mobileNav" data-index={["训练","计划","记录","我的"].indexOf(tab)} aria-label="主要导航">{["训练","计划","记录","我的"].map((x,i)=><button key={x} aria-current={tab===x?"page":undefined} onClick={()=>setTab(x)} className={tab===x?"active":""}><b>{["⌂","▦","⌁","◎"][i]}</b><span>{x}</span></button>)}</nav>
    {notice&&<div className="toast">{notice}<span>✓</span></div>}

    {feedback&&<div className="feedback"><div><p className="kicker">SESSION COMPLETE</p><h3>今天的强度怎么样？</h3></div>{["太轻松","正合适","太难"].map(x=><button className={feedback===x?"active":""} onClick={()=>{setFeedback(x);flash(`已记录：${x}，下次计划会自动调整`)}} key={x}>{x}</button>)}<button className="feedbackClose" onClick={()=>setFeedback("")}>×</button></div>}

    {extraOpen&&<div className="extraOverlay" role="dialog" aria-modal="true"><form className="extraSheet" onSubmit={e=>{e.preventDefault();addExtra()}}><div className="extraTop"><div><p className="kicker">MANUAL LOG</p><h2>添加额外训练</h2></div><button type="button" onClick={()=>setExtraOpen(false)}>×</button></div><label>运动项目<input autoFocus value={extraName} onChange={e=>setExtraName(e.target.value)} placeholder="例如：快走、游泳、骑车"/></label><div className="extraPresets">{["快走","骑车","游泳","爬楼梯","额外力量"].map(x=><button type="button" className={extraName===x?"active":""} onClick={()=>setExtraName(x)} key={x}>{x}</button>)}</div><label>完成量<input value={extraAmount} onChange={e=>setExtraAmount(e.target.value)} placeholder="例如：30 分钟或 3组 × 12次"/></label><div className="effortPick"><small>体感强度</small>{["轻松","适中","吃力"].map(x=><button type="button" className={extraEffort===x?"active":""} onClick={()=>setExtraEffort(x)} key={x}>{x}</button>)}</div><button className="saveExtra">保存到今天 <b>→</b></button></form></div>}

    {workoutOpen&&<div className="workoutOverlay" role="dialog" aria-modal="true"><div className="workoutSheet">
      <div className="workoutTop"><div><p className="kicker">{intensity}训练 · {activeExercise+1}/{activeExercises.length}</p><h2>专注这一组。</h2></div><button onClick={()=>setWorkoutOpen(false)}>×</button></div>
      <div className="workoutProgress"><i style={{width:`${((activeExercise+setsCompleted/activeExercises[activeExercise].sets)/activeExercises.length)*100}%`}}/></div>
      <button className="workoutMedia" onClick={()=>setGuide(activeExercise)}><img src={`https://i.ytimg.com/vi/${activeExercises[activeExercise].videoId}/hqdefault.jpg`} alt=""/><span>▶ 查看动作基础教学</span></button>
      <div className="workoutInfo"><small>{activeExercises[activeExercise].target}</small><h3>{swapped.includes(activeExercise)?["墙壁俯卧撑","箱式深蹲","坐姿弹力带划船","蛙式臀桥","高位平板支撑"][activeExercise]:activeExercises[activeExercise].name}</h3><p>{activeExercises[activeExercise].cue}</p><div className="setDots">{Array.from({length:activeExercises[activeExercise].sets},(_,i)=><span className={i<setsCompleted?"done":i===setsCompleted?"current":""} key={i}>{i<setsCompleted?"✓":i+1}<small>第{i+1}组</small></span>)}</div><div className="lastResult"><span>本档训练量</span><b>{activeExercises[activeExercise].dose} · 休息 {activeExercises[activeExercise].rest} 秒</b></div><button className="finishSet" onClick={finishSet}>完成第 {setsCompleted+1} 组 <b>→</b></button></div>
      {timer&&timerMode==="rest"&&<div className="inlineRest"><p className="kicker">组间休息 · 下一组即将开始</p><strong>{clock}</strong><span>放松肩膀，保持缓慢呼吸</span><div className="restBar"><i style={{width:`${Math.max(0,100-seconds/restTotal*100)}%`}}/></div><button onClick={()=>{setTimer(false);setRunning(false)}}>跳过休息，继续训练 →</button></div>}
    </div></div>}

    {guide!==null&&<div className="modal" role="dialog" aria-modal="true">
      <div className="viewer">
        <button className="close" onClick={()=>setGuide(null)}>×</button>
        <div className="videoFrame">
          {exercises[guide].videoId?<iframe src={`https://www.youtube-nocookie.com/embed/${exercises[guide].videoId}?rel=0&playsinline=1`} title={`${exercises[guide].name}教学视频`} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen/>:<iframe src={exercises[guide].source} title={`${exercises[guide].name}专家教学`}/>} 
        </div>
        <div className="viewerInfo"><p className="kicker">{exercises[guide].provider} / FORM GUIDE</p><h2>{exercises[guide].name}</h2><div className="cueGrid"><span><small>正确提示</small><p>{exercises[guide].cue}</p></span><span><small>避免错误</small><p>{exercises[guide].avoid}</p></span></div><button onClick={()=>{const r=exercises[guide].rest;setGuide(null);beginRest(r)}}>我看懂了，开始训练 <b>→</b></button></div>
      </div>
    </div>}

    {timer&&!(workoutOpen&&timerMode==="rest")&&<div className={`timer ${timerMode==="quick"?"quickTimer":""}`} role="dialog" aria-modal="true"><button className="close" onClick={()=>{setTimer(false);setRunning(false)}}>×</button><p className="kicker">{timerMode==="quick"?`MORNING EXPRESS / ${safeQuickIndex+1} OF ${quickStages.length}`:"RECOVERY / BREATHE"}</p><h2>{timerMode==="quick"?quickStages[safeQuickIndex].name:"恢复呼吸"}</h2>{timerMode==="quick"&&<><p className="stageDetail">{quickStages[safeQuickIndex].detail}</p><div className="quickTimeline">{quickStages.map((s,i)=><span className={i<safeQuickIndex?"done":i===safeQuickIndex?"active":""} key={s.name}><i/>{s.name}<small>{s.duration/60}分钟</small></span>)}</div></>}<button className={`clock ${running?"live":""}`} onClick={()=>setRunning(!running)}><strong>{clock}</strong><span>{seconds===0?timerMode==="quick"?"晨练完成":"可以开始下一组":running?"轻触暂停":"轻触继续"}</span></button><div className="adjust"><button onClick={()=>setSeconds(v=>Math.max(0,v-15))}>−15秒</button><button className="next" onClick={()=>{setTimer(false);setRunning(false);if(timerMode==="quick")flash("晨练完成，身体已唤醒")}}>{timerMode==="quick"?"完成晨练":"下一组"} →</button><button onClick={()=>setSeconds(v=>v+15)}>+15秒</button></div></div>}
  </main>
}
