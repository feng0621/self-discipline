"use client";
/* eslint-disable jsx-a11y/no-autofocus, @next/next/no-img-element */

import { useEffect, useMemo, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import AuthPanel from "../auth/components/AuthPanel";
import LandingPage from "../landing/LandingPage";
import ReadinessCard from "./components/ReadinessCard";
import Starfield from "./components/Starfield";
import FormaIcon from "../../shared/icons/FormaIcon";
import type { ReadinessInput, ReadinessRecommendation } from "./domain/adaptive-training";
import { exercises, quickStages } from "./domain/workout-catalog";
import { deleteBodyLog, deleteExtraActivity, flushSyncQueue, loadDashboard, pendingSyncCount, saveBodyAndProfile, saveCompletedWorkout, saveDailyReadiness, saveExtraActivity, saveNotificationPreferences, saveProfileSettings, saveTrainingGoal, saveUserPreferences, updateWorkoutFeedback } from "./data/fitness-repository";
import type { AppPreferences, BodyHistoryPoint, NotificationPreference, SessionHistory } from "./data/fitness-repository";
import { supabase } from "../../infrastructure/supabase/client";

export default function FitnessApp(){
  const [user,setUser]=useState<User|null>(null);
  const [authReady,setAuthReady]=useState(true);
  const [demoMode,setDemoMode]=useState(false);
  const [showLanding,setShowLanding]=useState(true);
  const [cloudState,setCloudState]=useState<"idle"|"saving"|"synced"|"error">("idle");
  const [done,setDone]=useState<number[]>([]);
  const [guide,setGuide]=useState<number|null>(null);
  const [timer,setTimer]=useState(false);
  const [seconds,setSeconds]=useState(75);
  const [running,setRunning]=useState(false);
  const [tab,setTab]=useState("è®­ç»ƒ");
  const [weight,setWeight]=useState("110.0");
  const [waist,setWaist]=useState("101");
  const [sleep,setSleep]=useState("7.5");
  const [water,setWater]=useState(5);
  const [notice,setNotice]=useState("");
  const [reminder,setReminder]=useState(true);
  const [equipment,setEquipment]=useState(["å¾’æ‰‹","å¼¹åŠ›å¸¦"]);
  const [workoutOpen,setWorkoutOpen]=useState(false);
  const [activeExercise,setActiveExercise]=useState(0);
  const [setsCompleted,setSetsCompleted]=useState(0);
  const [swapped,setSwapped]=useState<number[]>([]);
  const [feedback,setFeedback]=useState("");
  const [lastSessionId,setLastSessionId]=useState("");
  const [timerMode,setTimerMode]=useState<"rest"|"quick">("rest");
  const [quickRecorded,setQuickRecorded]=useState(false);
  const [hour]=useState(()=>new Date().getHours());
  const [todayInfo]=useState(()=>({short:new Intl.DateTimeFormat("zh-CN",{timeZone:"Asia/Kuala_Lumpur",month:"2-digit",day:"2-digit"}).format(new Date()),weekday:new Intl.DateTimeFormat("zh-CN",{timeZone:"Asia/Kuala_Lumpur",weekday:"long"}).format(new Date())}));
  const [restTotal,setRestTotal]=useState(75);
  const [intensity,setIntensity]=useState<"å…¥é—¨"|"è¿›é˜¶"|"å¼ºåŒ–">("å…¥é—¨");
  const [extraOpen,setExtraOpen]=useState(false);
  const [extraName,setExtraName]=useState("å¿«èµ°");
  const [extraAmount,setExtraAmount]=useState("20 åˆ†é’Ÿ");
  const [extraEffort,setExtraEffort]=useState("é€‚ä¸­");
  const [extras,setExtras]=useState<{id:string;name:string;amount:string;effort:string;time:string}[]>([]);
  const [history,setHistory]=useState<BodyHistoryPoint[]>([]);
  const [completedSessions,setCompletedSessions]=useState(0);
  const [weeklySessions,setWeeklySessions]=useState(0);
  const [streakDays,setStreakDays]=useState(0);
  const [currentWeek,setCurrentWeek]=useState(1);
  const [localReady,setLocalReady]=useState(false);
  const [notificationPrefs,setNotificationPrefs]=useState<NotificationPreference>({enabled:true,days:[1,3,5],time:"19:30",advanceMinutes:30});
  const [pendingSync,setPendingSync]=useState(0);
  const [timerDeadline,setTimerDeadline]=useState<number|null>(null);
  const lastTimerPersist=useRef(0);
  const secondsRef=useRef(seconds);
  secondsRef.current=seconds;
  const [exitConfirm,setExitConfirm]=useState(false);
  const [showSummary,setShowSummary]=useState(false);
  const [sessionStartedAt,setSessionStartedAt]=useState(0);
  const [performance,setPerformance]=useState<Record<number,{reps:string;weight:string;rir:string}>>({});
  const [sessions,setSessions]=useState<SessionHistory[]>([]);
  const [selectedSession,setSelectedSession]=useState<SessionHistory|null>(null);
  const [healthLimitations,setHealthLimitations]=useState<string[]>([]);
  const [preferences,setPreferences]=useState<AppPreferences>({unit:"metric",keepAwake:true,sound:true,vibration:true});
  const [avoidAreas,setAvoidAreas]=useState<string[]>([]);
  const [mergePrompt,setMergePrompt]=useState(false);
  const [goal,setGoal]=useState("å‡è„‚ Â· è…¹è‚Œæ˜¾å½¢");
  const [workoutPaused,setWorkoutPaused]=useState(false);

  useEffect(()=>{
    supabase.auth.getUser().then(({data})=>{setUser(data.user);setAuthReady(true)});
    const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,session)=>{setUser(session?.user??null);setAuthReady(true)});
    return()=>subscription.unsubscribe();
  },[]);
  useEffect(()=>{const open=()=>{setDemoMode(true);setShowLanding(false);setTab("è®­ç»ƒ");setWorkoutOpen(true);setSessionStartedAt(Date.now())};if(new URLSearchParams(location.search).get("start")==="training")queueMicrotask(open);navigator.serviceWorker?.addEventListener("message",event=>{if(event.data?.type==="OPEN_TODAY_WORKOUT")open()})},[]);
  useEffect(()=>{
    if(user)return;
    queueMicrotask(()=>{try{
      const raw=localStorage.getItem("forma-demo-state-v1");
      if(raw){const saved=JSON.parse(raw);setDone(saved.done??[]);setWeight(saved.weight??"110.0");setWaist(saved.waist??"101");setSleep(saved.sleep??"7.5");setWater(saved.water??5);setEquipment(saved.equipment??["å¾’æ‰‹","å¼¹åŠ›å¸¦"]);setReminder(saved.reminder??true);setExtras(saved.extras??[]);setHistory(saved.history??[]);setCompletedSessions(saved.completedSessions??0);setWeeklySessions(saved.weeklySessions??0);setStreakDays(saved.streakDays??0);setCurrentWeek(saved.currentWeek??1);setNotificationPrefs(saved.notificationPrefs??{enabled:true,days:[1,3,5],time:"19:30",advanceMinutes:30});}
    }catch{/* Ignore damaged demo data and keep safe defaults. */}finally{setLocalReady(true)}});
  },[user]);
  useEffect(()=>{
    if(user||!localReady)return;
    localStorage.setItem("forma-demo-state-v1",JSON.stringify({done,weight,waist,sleep,water,equipment,reminder,extras,history,completedSessions,weeklySessions,streakDays,currentWeek,notificationPrefs}));
  },[user,localReady,done,weight,waist,sleep,water,equipment,reminder,extras,history,completedSessions,weeklySessions,streakDays,currentWeek,notificationPrefs]);
  useEffect(()=>{
    if(!user)return;
    if(localStorage.getItem("forma-demo-state-v1"))queueMicrotask(()=>setMergePrompt(true));
    const load=async()=>{try{const snapshot=await loadDashboard(user.id);if(snapshot.weight)setWeight((snapshot.weight*(snapshot.preferences.unit==="imperial"?2.20462:1)).toFixed(1));if(snapshot.waist)setWaist((snapshot.waist*(snapshot.preferences.unit==="imperial"?1/2.54:1)).toFixed(1));if(snapshot.sleep)setSleep(String(snapshot.sleep));if(snapshot.water!==undefined)setWater(snapshot.water);if(snapshot.equipment)setEquipment(snapshot.equipment);if(snapshot.reminderEnabled!==undefined)setReminder(snapshot.reminderEnabled);setExtras(snapshot.activities);setHistory(snapshot.history);setSessions(snapshot.sessions);setHealthLimitations(snapshot.healthLimitations);setPreferences(snapshot.preferences);if(snapshot.goal)setGoal(snapshot.goal);setCompletedSessions(snapshot.completedSessions);setWeeklySessions(snapshot.weeklySessions);setStreakDays(snapshot.streakDays);setCurrentWeek(snapshot.currentWeek);setNotificationPrefs(snapshot.notifications);if(snapshot.recommendedIntensity)setIntensity(snapshot.recommendedIntensity);if(snapshot.completedToday)setDone(exercises.map((_,i)=>i));setCloudState("synced")}catch{setCloudState("error")}};
    void load();
  },[user]);

  useEffect(()=>{
    queueMicrotask(()=>setPendingSync(pendingSyncCount()));
    if(!user)return;
    const sync=async()=>{setCloudState("saving");const count=await flushSyncQueue(user.id);setPendingSync(count);setCloudState(count?"error":"synced")};
    if(navigator.onLine)void sync();
    window.addEventListener("online",sync);return()=>window.removeEventListener("online",sync);
  },[user]);

  useEffect(()=>{queueMicrotask(()=>{try{const raw=localStorage.getItem("forma-active-workout-v1");if(!raw)return;const saved=JSON.parse(raw);setDone(saved.done??[]);setSwapped(saved.swapped??[]);setIntensity(saved.intensity??"å…¥é—¨");setActiveExercise(saved.activeExercise??0);setSetsCompleted(saved.setsCompleted??0);setTimerMode(saved.timerMode??"rest");setRestTotal(saved.restTotal??75);setQuickRecorded(saved.quickRecorded??false);setWorkoutPaused(Boolean(saved.workoutPaused));if(saved.deadline&&saved.running){const remaining=Math.max(0,Math.ceil((saved.deadline-Date.now())/1000));setSeconds(remaining);setTimerDeadline(saved.deadline);setRunning(remaining>0)}else setSeconds(saved.seconds??75);setWorkoutOpen(Boolean(saved.workoutOpen));setTimer(Boolean(saved.timer))}catch{/* Ignore stale session data. */}})},[]);
  useEffect(()=>{if(!workoutOpen&&!timer&&!workoutPaused){localStorage.removeItem("forma-active-workout-v1");return}localStorage.setItem("forma-active-workout-v1",JSON.stringify({workoutOpen,timer,workoutPaused,activeExercise,setsCompleted,done,swapped,intensity,timerMode,restTotal,seconds:secondsRef.current,running,deadline:timerDeadline,quickRecorded}));lastTimerPersist.current=Date.now()},[workoutOpen,timer,workoutPaused,activeExercise,setsCompleted,done,swapped,intensity,timerMode,restTotal,running,timerDeadline,quickRecorded]);
  useEffect(()=>{if(!workoutOpen&&!timer)return;if(running&&Date.now()-lastTimerPersist.current<10000)return;localStorage.setItem("forma-active-workout-v1",JSON.stringify({workoutOpen,timer,activeExercise,setsCompleted,done,swapped,intensity,timerMode,restTotal,seconds,running,deadline:timerDeadline,quickRecorded}));lastTimerPersist.current=Date.now()},[seconds,workoutOpen,timer,running,activeExercise,setsCompleted,done,swapped,intensity,timerMode,restTotal,timerDeadline,quickRecorded]);
  useEffect(()=>{const resume=()=>{if(running&&timerDeadline)setSeconds(Math.max(0,Math.ceil((timerDeadline-Date.now())/1000)))};document.addEventListener("visibilitychange",resume);window.addEventListener("focus",resume);return()=>{document.removeEventListener("visibilitychange",resume);window.removeEventListener("focus",resume)}},[running,timerDeadline]);

  useEffect(()=>{
    if(!("Notification" in window)||!notificationPrefs.enabled||Notification.permission!=="granted")return;
    const check=()=>{
      const now=new Date();
      if(!notificationPrefs.days.includes(now.getDay()))return;
      const [hourValue,minuteValue]=notificationPrefs.time.split(":").map(Number);
      const notifyAt=new Date(now);notifyAt.setHours(hourValue,minuteValue-notificationPrefs.advanceMinutes,0,0);
      const key=`forma-reminder-${notifyAt.toDateString()}`;
      if(Math.abs(now.getTime()-notifyAt.getTime())<60000&&!localStorage.getItem(key)){new Notification("FORMA è®­ç»ƒæé†’",{body:`${notificationPrefs.advanceMinutes} åˆ†é’Ÿåå¼€å§‹ä»Šå¤©çš„è®­ç»ƒã€‚`,icon:"/favicon.svg"});localStorage.setItem(key,"1")}
    };
    check();const id=window.setInterval(check,30000);return()=>window.clearInterval(id);
  },[notificationPrefs]);

  useEffect(()=>{if(!running)return;const id=window.setInterval(()=>setSeconds(v=>{if(v<=1){setRunning(false);if(workoutOpen&&timerMode==="rest")setTimer(false);return 0}return v-1}),1000);return()=>window.clearInterval(id)},[running,workoutOpen,timerMode]);
  useEffect(()=>{const locked=workoutOpen||timer||guide!==null||extraOpen;document.documentElement.classList.toggle("overlayLocked",locked);return()=>document.documentElement.classList.remove("overlayLocked")},[workoutOpen,timer,guide,extraOpen]);
  const activeExercises=useMemo(()=>exercises.map((x,i)=>{
    if(intensity==="å…¥é—¨")return {...x,sets:3,dose:i===4?"3 Ã— 20ç§’":i===3?"3 Ã— 12":`3 Ã— ${i===1?10:8}`,rest:75};
    if(intensity==="è¿›é˜¶")return {...x,name:["è·ªå§¿ä¿¯å§æ’‘","å¾’æ‰‹æ·±è¹²","å¼¹åŠ›å¸¦åˆ’èˆ¹åœé¡¿","å•è…¿è¾…åŠ©è‡€æ¡¥","ä¾§å¹³æ¿æ”¯æ’‘"][i],dose:["3 Ã— 10","3 Ã— 12","3 Ã— 12","3 Ã— 10/ä¾§","3 Ã— 20ç§’/ä¾§"][i],sets:3,rest:75};
    return {...x,name:["æ ‡å‡†ä¿¯å§æ’‘","åå‘ç®­æ­¥è¹²","å¼ºé˜»åŠ›å¼¹åŠ›å¸¦åˆ’èˆ¹","å•è…¿è‡€æ¡¥","å¹³æ¿æ”¯æ’‘ç‚¹è‚©"][i],dose:["4 Ã— 8â€“12","4 Ã— 10/ä¾§","4 Ã— 10â€“12","4 Ã— 10/ä¾§","4 Ã— 20æ¬¡"][i],sets:4,rest:90};
  }),[intensity]);
  const riskAreas=[...new Set([...avoidAreas,...healthLimitations])];
  const autoSwapped=[...(riskAreas.some(x=>x.includes("è‚©"))?[0,2]:[]),...(riskAreas.some(x=>x.includes("è†")||x.includes("è„šè¸"))?[1]:[]),...(riskAreas.some(x=>x.includes("è…°"))?[3,4]:[])];
  const effectiveSwapped=[...new Set([...swapped,...autoSwapped])];
  const progress=useMemo(()=>Math.round(done.length/activeExercises.length*100),[done,activeExercises.length]);
  const recentHistory=history.slice(-8);
  const weights=recentHistory.map(x=>x.weight);
  const weightMin=weights.length?Math.min(...weights):0;
  const weightMax=weights.length?Math.max(...weights):0;
  const chartHeights=recentHistory.map(x=>weightMax===weightMin?60:25+(weightMax-x.weight)/(weightMax-weightMin)*65);
  const weightDelta=weights.length>1?Number(weight)-weights[0]:0;
  const waistValues=history.map(x=>x.waist).filter((x):x is number=>x!==undefined);
  const waistDelta=waistValues.length>1?Number(waist)-waistValues[0]:0;
  const quickElapsed=480-seconds;
  let quickCursor=0;
  const quickStageIndex=Math.min(quickStages.findIndex(s=>{quickCursor+=s.duration;return quickElapsed<quickCursor}),quickStages.length-1);
  const safeQuickIndex=quickStageIndex<0?quickStages.length-1:quickStageIndex;
  const clock=`${String(Math.floor(seconds/60)).padStart(2,"0")}:${String(seconds%60).padStart(2,"0")}`;
  const toggle=(i:number)=>setDone(v=>v.includes(i)?v.filter(x=>x!==i):[...v,i]);
  const beginRest=(value:number)=>{setRestTotal(value);setTimerMode("rest");setSeconds(value);setTimerDeadline(Date.now()+value*1000);setRunning(true);setTimer(true)};
  const refreshSyncState=()=>{const count=pendingSyncCount();setPendingSync(count);setCloudState(count?"error":"synced")};
  const startWorkout=()=>{setWorkoutPaused(false);setActiveExercise(0);setSetsCompleted(0);setPerformance({});setSessionStartedAt(Date.now());setFeedback("");setWorkoutOpen(true)};
  const persistWorkout=async()=>{setCompletedSessions(v=>v+1);setWeeklySessions(v=>v+1);setStreakDays(v=>Math.max(1,v));setCurrentWeek(v=>Math.min(12,Math.max(v,Math.ceil((completedSessions+1)/3))));if(!user)return;setCloudState("saving");try{const recorded=activeExercises.map((item,index)=>({...item,actualReps:Number(performance[index]?.reps)||undefined,weightKg:(Number(performance[index]?.weight)||0)*(preferëİ¶¶‰ËkºwµçQíÉ••¹Ñ!¥ÍÑ½Éåm¥t¹‘…Ñ•ôè€‘íÉ••¹Ñ!¥ÍÑ½Éåm¥t¹İ•¥¡Ñô­ôøñÍÁ…¸ùí¤¬Åôğ½ÍÁ…¸øğ½¤ø¤èñÀ±…ÍÍ9…µ”ô‰•µÁÑå¡…ÉĞˆû’şw–¶c¢ê¯’öO¢ºÃ–öW–B;šbû’ë¢Ú/–*üğ½Àùôğ½‘¥Øøñ‘¥Ø±…ÍÍ9…µ”ô‰¡…ÉÑ½½ĞˆøñÍÁ…¸ùíÉ••¹Ñ!¥ÍÑ½ÉålÁtü¹‘…Ñ”üü‹šjš^ƒ¢ºÃ–öT‰ôğ½ÍÁ…¸øñˆû’öO¦7¢Ú/–*ü€¼-ğ½ˆøñÍÁ…¸ùíÉ••¹Ñ!¥ÍÑ½Éä¹…Ğ ´Ä¤ü¹‘…Ñ”üü‹’î+–’¤‰ôğ½ÍÁ…¸øğ½‘¥Øøğ½‘¥Øø(€€€€€€ğ½‘¥Øø(€€€€€€ñ‘¥Ø±…ÍÍ9…µ”ô‰µ•…ÍÕÉ•µ•¹ÑÌˆøñ…ÉÑ¥±”øñÍµ…±°û¢Ã–nÓ–>c–2Xğ½Íµ…±°øñˆùíİ…¥ÍÑ•±Ñ„øÀüˆ¬ˆèˆ‰õíİ…¥ÍÑ•±Ñ„¹Ñ½¥á• Ä¥ô€ñ¤ù´ğ½¤øğ½ˆøñÍÁ…¸û–~ë’ê;–ŞË’şw–¶c¢ºÃ–öTğ½ÍÁ…¸øğ½…ÉÑ¥±”øñ…ÉÑ¥±”øñÍµ…±°ûÒ¿¢º‡¢º·îğ½Íµ…±°øñˆùí½µÁ±•Ñ•‘M•ÍÍ¥½¹Íô€ñ¤ûš²„ğ½¤øğ½ˆøñÍÁ…¸øÄÈƒ–F£n»š‚€ÌØƒš²„ğ½ÍÁ…¸øğ½…ÉÑ¥±”øñ…ÉÑ¥±”øñÍµ…±°û¢ş{î·¢º·îğ½Íµ…±°øñˆùíÍÑÉ•…­…åÍô€ñ¤û–’¤ğ½¤øğ½ˆøñÍÁ…¸ûšv—¢«¢º·î–º3š"C¢ºÃ–öTğ½ÍÁ…¸øğ½…ÉÑ¥±”øğ½‘¥Øø(€€€€€€ñ‘¥Ø±…ÍÍ9…µ”ô‰¡¥ÍÑ½ÉåA…¹•°ˆøñ‘¥ØøñÀ±…ÍÍ9…µ”ô‰­¥­•ÈˆùMMM%=8I!%Yğ½Àøñ Èû¢º·î–:–>Èğ½ Èøğ½‘¥ØùíÍ•ÍÍ¥½¹Ì¹±•¹Ñ ıÍ•ÍÍ¥½¹Ì¹µ…À¡¥Ñ•´ôøñ‰ÕÑÑ½¸­•äõí¥Ñ•´¹¥‘ô½¹±¥¬õì ¤ôùÍ•ÑM•±•Ñ•‘M•ÍÍ¥½¸¡¥Ñ•´¥ôøñÍÁ…¸øñˆùí¹•Ü…Ñ”¡¥Ñ•´¹½µÁ±•Ñ•‘Ğ¤¹Ñ½1½…±•…Ñ•MÑÉ¥¹œ ‰é µ8ˆ¥ôğ½ˆøñÍµ…±°ùí¥Ñ•´¹¥¹Ñ•¹Í¥Ñåôƒ
Üí5…Ñ ¹É½Õ¹¡¥Ñ•´¹‘ÕÉ…Ñ¥½¸¼ØÀ¥ôƒ–"¦J|ğ½Íµ…±°øğ½ÍÁ…¸øñ•´ùí¥Ñ•´¹•á•É¥Í•Ì¹±•¹Ñ¡ôƒ’â«–*£’öpƒŠHğ½•´øğ½‰ÕÑÑ½¸ø¤èñÀû–º3š"C²³’âš²‡¢º·î–B;¾ò3¢şg¦3’òk–ë:Ã¢¾›î¢ºÃ–öWğ½Àùôğ½‘¥Øø(€€€€ğ½Í•Ñ¥½¸ùô((€€€íÑ…ˆôôô‹š"Gjˆ˜˜ñÍ•Ñ¥½¸±…ÍÍ9…µ”ô‰µ½‘Õ±”ÁÉ½™¥±•5½‘Õ±”ˆø(€€€€€€ñ‘¥Ø±…ÍÍ9…µ”ô‰¥‘•¹Ñ¥Ñäˆøñ‘¥Ø±…ÍÍ9…µ”ô‰¥‘•¹Ñ¥Ñå5…É¬ˆù(ğ½‘¥ØøñÀ±…ÍÍ9…µ”ô‰­¥­•ÈˆùQ!1QAI=%1€¼€ÀÀÄğ½Àøñ Äû’âëšnÓ¢öïšnÓ–òëjñ‰È¼øñÍÑÉ½¹œû¢«–ŞÇ¢º·îğ½ÍÑÉ½¹œøğ½ Äøñ‘¥Ø±…ÍÍ9…µ”ô‰¥‘•¹Ñ¥Ñå…Ñ„ˆøñÍÁ…¸øÄäÌ€ñÍµ…±°ù4ğ½Íµ…±°øğ½ÍÁ…¸øñÍÁ…¸ùíİ•¥¡Ñô€ñÍµ…±°ù-ğ½Íµ…±°øğ½ÍÁ…¸øñÍÁ…¸øÈä¸Ô€ñÍµ…±°ù	5$ğ½Íµ…±°øğ½ÍÁ…¸øğ½‘¥Øøğ½‘¥Øø(€€€€€€ñ‘¥Ø±…ÍÍ9…µ”ô‰Í•ÑÑ¥¹Ìˆø(€€€€€€€€ñ…ÉÑ¥±”øñ‘¥ØøñÍµ…±°û¢º·în»š‚ğ½Íµ…±°øñ Ìùí½…±ôğ½ ÌøñÀû¢º‡–"K’òk–nÓîW¢şg’â«n»š‚¢ÂšVĞğ½Àøğ½‘¥Øøñ‰ÕÑÑ½¸½¹±¥¬õì ¤ôùÙ½¥•‘¥Ñ½…° ¥ôûò[¢úDƒŠ\ğ½‰ÕÑÑ½¸øğ½…ÉÑ¥±”ø(€€€€€€€€ñ…ÉÑ¥±”±…ÍÍ9…µ”ô‰Í¡•‘Õ±•M•ÑÑ¥¹œˆøñ‘¥ØøñÍµ…±°û¢º·îš>C¦Hğ½Íµ…±°øñ Ìûš2'’öƒjš^Û¦^Ó–º'š:Hğ½ Ìøñ‘¥Ø±…ÍÍ9…µ”ô‰Í¡•‘Õ±•…åÌˆùímlÄ°‹’â ‰t±lÈ°‹’ê0‰t±lÌ°‹’â$‰t±lĞ°‹–nl‰t±lÔ°‹’êP‰t±lØ°‹–´‰t±lÀ°‹š^”‰ut¹µ…À ¡m‘…ä±±…‰•±t¤ôøñ‰ÕÑÑ½¸­•äõí‘…åô±…ÍÍ9…µ”õí¹½Ñ¥™¥…Ñ¥½¹AÉ•™Ì¹‘…åÌ¹¥¹±Õ‘•Ì¡9Õµ‰•È¡‘…ä¤¤ü‰Í•±•Ñ•ˆèˆ‰ô½¹±¥¬õì ¤ôùÑ½±•I•µ¥¹‘•É…ä¡9Õµ‰•È¡‘…ä¤¥ôùí±…‰•±ôğ½‰ÕÑÑ½¸ø¥ôğ½‘¥Øøñ±…‰•°û¢º·îš^Û¦^Ğ€ñ¥¹ÁÕĞÑåÁ”ô‰Ñ¥µ”ˆÙ…±Õ”õí¹½Ñ¥™¥…Ñ¥½¹AÉ•™Ì¹Ñ¥µ•ô½¹¡…¹”õí”ôùÙ½¥Á•ÉÍ¥ÍÑ9½Ñ¥™¥…Ñ¥½¹Ì¡ì¸¸¹¹½Ñ¥™¥…Ñ¥½¹AÉ•™Ì±Ñ¥µ”é”¹Ñ…É•Ğ¹Ù…±Õ•ô¥ô¼øğ½±…‰•°øğ½‘¥Øøñ‰ÕÑÑ½¸±…ÍÍ9…µ”õíÍİ¥Ñ €‘íÉ•µ¥¹‘•Èü‰½¸ˆèˆ‰õô…É¥„µ±…‰•°ô‹–"š6‹¢º·îš>C¦Hˆ½¹±¥¬õì ¤ôùÙ½¥ÕÁ‘…Ñ•I•µ¥¹‘•È …É•µ¥¹‘•È¥ôøñ¤¼øğ½‰ÕÑÑ½¸øğ½…ÉÑ¥±”ø(€€€€€€€€ñ…ÉÑ¥±”±…ÍÍ9…µ”ô‰•ÅÕ¥Áµ•¹ÑM•ÑÑ¥¹œˆøñ‘¥ØøñÍµ…±°û–>¿R£–f£šv@ğ½Íµ…±°øñ Ìû¢º·î’òk’òc–#’öÿR£–ŞË¦'–f£šv@ğ½ Ìøğ½‘¥Øøñ‘¥Øùíl‹–úKš&,ˆ°‹–òç–*o–â˜ˆ°‹–NG¦Nˆ°‹–—¢ê¯š"ü‰t¹µ…À¡àôøñ‰ÕÑÑ½¸½¹±¥¬õì ¤ôùÕÁ‘…Ñ•ÅÕ¥Áµ•¹Ğ¡à¥ô±…ÍÍ9…µ”õí•ÅÕ¥Áµ•¹Ğ¹¥¹±Õ‘•Ì¡à¤ü‰Í•±•Ñ•ˆèˆ‰ô­•äõíáôùíáôğ½‰ÕÑÑ½¸ø¥ôğ½‘¥Øøğ½…ÉÑ¥±”ø(€€€€€€€€ñ…ÉÑ¥±”±…ÍÍ9…µ”ô‰•ÅÕ¥Áµ•¹ÑM•ÑÑ¥¹œˆøñ‘¥ØøñÍµ…±°û–—–êß¦fC–"Øğ½Íµ…±°øñ Ìû¢«–*£šnÿš6‹nã–Ï–*£’öpğ½ Ìøğ½‘¥Øøñ‘¥Øùíl‹¢
§¦£’â7¦ˆ°‹¢Ã¦£’â7¦ˆ°‹¢w¦£’â7¦ˆ°‹¢k¢âw’â7¦‰t¹µ…À¡àôøñ‰ÕÑÑ½¸½¹±¥¬õì ¤ôùÑ½±•1¥µ¥Ñ…Ñ¥½¸¡à¥ô±…ÍÍ9…µ”õí¡•…±Ñ¡1¥µ¥Ñ…Ñ¥½¹Ì¹¥¹±Õ‘•Ì¡à¤ü‰Í•±•Ñ•ˆèˆ‰ô­•äõíáôùíáôğ½‰ÕÑÑ½¸ø¥ôğ½‘¥Øøğ½…ÉÑ¥±”ø(€€€€€€€€ñ…ÉÑ¥±”øñ‘¥ØøñÍµ…±°û¢º‡¦?–6W’ö4ğ½Íµ…±°øñ ÌùíÁÉ•™•É•¹•Ì¹Õ¹¥Ğôôô‰µ•ÑÉ¥Œˆü‹–³šZƒ
Üƒ–:cÆÌˆè‹ƒ
Üƒ¢.Ç–¾à‰ôğ½ ÌøñÀû–"š6‹–B;¢«–*£š6‹º_:Ãšr'¢úO–”ğ½Àøğ½‘¥Øøñ‰ÕÑÑ½¸½¹±¥¬õíÑ½±•U¹¥Ñôû–"š6‹–6W’ö4ğ½‰ÕÑÑ½¸øğ½…ÉÑ¥±”ø(€€€€€€€€ñ…ÉÑ¥±”øñ‘¥ØøñÍµ…±°û¢º·î–Æ?–æTğ½Íµ…±°øñ Ìû¢º·îš^Û’şwš2–Æ?–æW–âã’ê¸ğ½ Ìøğ½‘¥Øøñ‰ÕÑÑ½¸±…ÍÍ9…µ”õíÍİ¥Ñ €‘íÁÉ•™•É•¹•Ì¹­••Áİ…­”ü‰½¸ˆèˆ‰õô½¹±¥¬õì ¤ôùÙ½¥ÕÁ‘…Ñ•AÉ•™•É•¹•Ì¡ì¸¸¹ÁÉ•™•É•¹•Ì±­••Áİ…­”è…ÁÉ•™•É•¹•Ì¹­••Áİ…­•ô¥ôøñ¤¼øğ½‰ÕÑÑ½¸øğ½…ÉÑ¥±”ø(€€€€€€€€ñ…ÉÑ¥±”øñ‘¥ØøñÍµ…±°û¢º‡š^Û–>7¦š ğ½Íµ…±°øñ Ìûš>C’ë¦~Ï’â;¦r–* ğ½ ÌøñÀùíÁÉ•™•É•¹•Ì¹Í½Õ¹ü‹–Ã¦~Ï–ò–B¼ˆè‹–Ã¦~Ï–Ï¦^´‰ôƒ
ÜíÁÉ•™•É•¹•Ì¹Ù¥‰É…Ñ¥½¸ü‹¦r–*£–ò–B¼ˆè‹¦r–*£–Ï¦^´‰ôğ½Àøğ½‘¥Øøñ‘¥Ø±…ÍÍ9…µ”ô‰ÁÉ•™•É•¹•	ÕÑÑ½¹Ìˆøñ‰ÕÑÑ½¸½¹±¥¬õì ¤ôùÙ½¥ÕÁ‘…Ñ•AÉ•™•É•¹•Ì¡ì¸¸¹ÁÉ•™•É•¹•Ì±Í½Õ¹è…ÁÉ•™•É•¹•Ì¹Í½Õ¹‘ô¥ôû–Ã¦~Ìğ½‰ÕÑÑ½¸øñ‰ÕÑÑ½¸½¹±¥¬õì ¤ôùÙ½¥ÕÁ‘…Ñ•AÉ•™•É•¹•Ì¡ì¸¸¹ÁÉ•™•É•¹•Ì±Ù¥‰É…Ñ¥½¸è…ÁÉ•™•É•¹•Ì¹Ù¥‰É…Ñ¥½¹ô¥ôû¦r–* ğ½‰ÕÑÑ½¸øğ½‘¥Øøğ½…ÉÑ¥±”ø(€€€€€€ğ½‘¥Øø(€€€€ğ½Í•Ñ¥½¸ùô(€€€€ğ½‘¥Øø((€€€€ñ¹…Ø±…ÍÍ9…µ”ô‰µ½‰¥±•9…Øˆ‘…Ñ„µ¥¹‘•àõíl‹¢º·îˆ°‹¢º‡–"Hˆ°‹¢ºÃ–öTˆ°‹š"Gj‰t¹¥¹‘•á=˜¡Ñ…ˆ¥ô…É¥„µ±…‰•°ô‹’âï¢š–¾ó¢"¨ˆùíl‹¢º·îˆ°‹¢º‡–"Hˆ°‹¢ºÃ–öTˆ°‹š"Gj‰t¹µ…À ¡à±¤¤ôøñ‰ÕÑÑ½¸­•äõíáô…É¥„µÕÉÉ•¹ĞõíÑ…ˆôôõàü‰Á…”ˆéÕ¹‘•™¥¹•‘ô½¹±¥¬õì ¤ôùÍ•ÑQ…ˆ¡à¥ô±…ÍÍ9…µ”õíÑ…ˆôôõàü‰…Ñ¥Ù”ˆèˆ‰ôøñˆøñ½Éµ…%½¸¹…µ”õì¡l‰ÑÉ…¥¹¥¹œˆ°‰Á±…¸ˆ°‰É•½Éˆ°‰ÁÉ½™¥±”‰t…Ì½¹ÍĞ¥m¥uô¼øğ½ˆøñÍÁ…¸ùíáôğ½ÍÁ…¸øğ½‰ÕÑÑ½¸ø¥ôğ½¹…Øø(€€€í¹½Ñ¥”˜˜ñ‘¥Ø±…ÍÍ9…µ”ô‰Ñ½…ÍĞˆùí¹½Ñ¥•ôñÍÁ…¸ûŠrLğ½ÍÁ…¸øğ½‘¥Øùô((€€€í™••‘‰…¬˜˜ñ‘¥Ø±…ÍÍ9…µ”ô‰™••‘‰…¬ˆøñ‘¥ØøñÀ±…ÍÍ9…µ”ô‰­¥­•ÈˆùMMM%=8=5A1Qğ½Àøñ Ìû’î+–’§j–òë–ê›š;’æ#š‚ß¾ò|ğ½ Ìøğ½‘¥Øùíl‹–’«¢öïšvøˆ°‹š¶–B#¦ˆ°‹–’«¦jø‰t¹µ…À¡àôøñ‰ÕÑÑ½¸±…ÍÍ9…µ”õí™••‘‰…¬ôôõàü‰…Ñ¥Ù”ˆèˆ‰ô½¹±¥¬õì ¤ôùÙ½¥¡½½Í•••‘‰…¬¡à¥ô­•äõíáôùíáôğ½‰ÕÑÑ½¸ø¥ôñ‰ÕÑÑ½¸±…ÍÍ9…µ”ô‰™••‘‰…­±½Í”ˆ½¹±¥¬õì ¤ôùÍ•Ñ••‘‰…¬ ˆˆ¥ôû\ğ½‰ÕÑÑ½¸øğ½‘¥Øùô((€€€í•á¥Ñ½¹™¥É´˜˜ñ‘¥Ø±…ÍÍ9…µ”ô‰‘•¥Í¥½¹=Ù•É±…äˆÉ½±”ô‰‘¥…±½œˆ…É¥„µµ½‘…°ô‰ÑÉÕ”ˆøñ‘¥Ø±…ÍÍ9…µ”ô‰‘•¥Í¥½¹…ÉˆøñÀ±…ÍÍ9…µ”ô‰­¥­•ÈˆùMMM%=8%8AI=IMLğ½Àøñ Èû¢º·î¢şcšÊ‡šr'îOšvğ½ ÈøñÀû¢şo–ê›–ŞËî?’şw–¶c–r£šr³šrë¾ò3’öƒ–>¿’î—¢7–B;îŸî·ğ½Àøñ‰ÕÑÑ½¸½¹±¥¬õì ¤ôùíÍ•Ñá¥Ñ½¹™¥É´¡™…±Í”¤íÍ•Ñ]½É­½ÕÑA…ÕÍ•¡ÑÉÕ”¤íÍ•Ñ]½É­½ÕÑ=Á•¸¡™…±Í”¥õôûšj–s–æÛ¢7–B;îŸî´ğ½‰ÕÑÑ½¸øñ‰ÕÑÑ½¸±…ÍÍ9…µ”ô‰‘…¹•Èˆ½¹±¥¬õì ¤ôùíÍ•Ñá¥Ñ½¹™¥É´¡™…±Í”¤íÍ•Ñ]½É­½ÕÑA…ÕÍ•¡™…±Í”¤íÍ•Ñ]½É­½ÕÑ=Á•¸¡™…±Í”¤íÍ•ÑQ¥µ•È¡™…±Í”¤íÍ•Ñ½¹”¡mt¤íÍ•ÑA•É™½Éµ…¹”¡íô¤í±½…±MÑ½É…”¹É•µ½Ù•%Ñ•´ ‰™½Éµ„µ…Ñ¥Ù”µİ½É­½ÕĞµØÄˆ¥õôûšRû–òšr³š²‡¢º·îğ½‰ÕÑÑ½¸øñ‰ÕÑÑ½¸±…ÍÍ9…µ”ô‰ÅÕ¥•Ğˆ½¹±¥¬õì ¤ôùÍ•Ñá¥Ñ½¹™¥É´¡™…±Í”¥ôûîŸî·¢º·îğ½‰ÕÑÑ½¸øğ½‘¥Øøğ½‘¥Øùô((€€€íÍ¡½İMÕµµ…Éä˜˜ñ‘¥Ø±…ÍÍ9…µ”ô‰‘•¥Í¥½¹=Ù•É±…äˆÉ½±”ô‰‘¥…±½œˆ…É¥„µµ½‘…°ô‰ÑÉÕ”ˆøñ‘¥Ø±…ÍÍ9…µ”ô‰ÍÕµµ…Éå…ÉˆøñÀ±…ÍÍ9…µ”ô‰­¥­•ÈˆùMMM%=8=5A1Qğ½Àøñ Èû’î+–’§–º3š"C–ú_–ú#––÷ğ½ Èøñ‘¥Ø±…ÍÍ9…µ”ô‰ÍÕµµ…ÉåMÑ…ÑÌˆøñÍÁ…¸øñˆùí5…Ñ ¹µ…à Ä±5…Ñ ¹É½Õ¹ ¡…Ñ”¹¹½Ü ¤µÍ•ÍÍ¥½¹MÑ…ÉÑ•‘Ğ¤¼ØÀÀÀÀ¤¥ôğ½ˆøñÍµ…±°û–"¦J|ğ½Íµ…±°øğ½ÍÁ…¸øñÍÁ…¸øñˆùí‘½¹”¹±•¹Ñ¡ññ…Ñ¥Ù•á•É¥Í•Ì¹±•¹Ñ¡ôğ½ˆøñÍµ…±°û–*£’öpğ½Íµ…±°øğ½ÍÁ…¸øñÍÁ…¸øñˆùí…Ñ¥Ù•á•É¥Í•Ì¹É•‘Õ” ¡ÍÕ´±à¤ôùÍÕ´­à¹Í•ÑÌ°À¥ôğ½ˆøñÍµ…±°ûîğ½Íµ…±°øğ½ÍÁ…¸øğ½‘¥Øøñ‘¥Ø±…ÍÍ9…µ”ô‰ÍÕµµ…Éåá•É¥Í•Ìˆùí…Ñ¥Ù•á•É¥Í•Ì¹µ…À ¡à±¤¤ôøñÍÁ…¸­•äõíà¹¹…µ•ôøñˆùí•™™•Ñ¥Ù•Mİ…ÁÁ•¹¥¹±Õ‘•Ì¡¤¤ıl‹–Šg–’ş¿–6ŸšJDˆ°‹ºÇ–ò?šŞÇ¢æÈˆ°‹–vC–ÿ–òç–*o–â›–"K¢"äˆ°‹¢ng–ò?¢š†”ˆ°‹¦®c’ö7–æÏšvÿšR¿šJD‰um¥téà¹¹…µ•ôğ½ˆøñÍµ…±°ùíÁ•É™½Éµ…¹•m¥tü¹İ•¥¡Ğı€‘íÁ•É™½Éµ…¹•m¥t¹İ•¥¡Ñô€‘íÁÉ•™•É•¹•Ì¹Õ¹¥Ğôôô‰µ•ÑÉ¥Œˆü‰­œˆè‰±ˆ‰ôƒ
Ü€èˆ‰õíÁ•É™½Éµ…¹•m¥tü¹É•ÁÌı€‘íÁ•É™½Éµ…¹•m¥t¹É•ÁÍôƒš²…€é€‘íà¹Í•ÑÍôƒîôğ½Íµ…±°øğ½ÍÁ…¸ø¥ôğ½‘¥Øøñ‘¥Ø±…ÍÍ9…µ”ô‰ÍÕµµ…Éå••‘‰…¬ˆùíl‹–’«¢öïšvøˆ°‹š¶–B#¦ˆ°‹–’«¦jø‰t¹µ…À¡àôøñ‰ÕÑÑ½¸±…ÍÍ9…µ”õí™••‘‰…¬ôôõàü‰…Ñ¥Ù”ˆèˆ‰ô½¹±¥¬õì ¤ôùÙ½¥¡½½Í•••‘‰…¬¡à¥ô­•äõíáôùíáôğ½‰ÕÑÑ½¸ø¥ôğ½‘¥Øøñ‰ÕÑÑ½¸±…ÍÍ9…µ”ô‰ÍÕµµ…Éå½¹”ˆ½¹±¥¬õì ¤ôùíÍ•ÑM¡½İMÕµµ…Éä¡™…±Í”¤íÍ•Ñ••‘‰…¬ ˆˆ¥õôû–º3š"C–æÛ¢şS–nxğ½‰ÕÑÑ½¸øğ½‘¥Øøğ½‘¥Øùô((€€€íÍ•±•Ñ•‘M•ÍÍ¥½¸˜˜ñ‘¥Ø±…ÍÍ9…µ”ô‰‘•¥Í¥½¹=Ù•É±…äˆÉ½±”ô‰‘¥…±½œˆ…É¥„µµ½‘…°ô‰ÑÉÕ”ˆøñ‘¥Ø±…ÍÍ9…µ”ô‰¡¥ÍÑ½Éå•Ñ…¥°ˆøñ‰ÕÑÑ½¸±…ÍÍ9…µ”ô‰‘•Ñ…¥±±½Í”ˆ½¹±¥¬õì ¤ôùÍ•ÑM•±•Ñ•‘M•ÍÍ¥½¸¡¹Õ±°¥ôû\ğ½‰ÕÑÑ½¸øñÀ±…ÍÍ9…µ”ô‰­¥­•ÈˆùMMM%=8Q%0ğ½Àøñ Èùí¹•Ü…Ñ”¡Í•±•Ñ•‘M•ÍÍ¥½¸¹½µÁ±•Ñ•‘Ğ¤¹Ñ½1½…±•…Ñ•MÑÉ¥¹œ ‰é µ8ˆ¥ôğ½ ÈøñÀùíÍ•±•Ñ•‘M•ÍÍ¥½¸¹¥¹Ñ•¹Í¥Ñåôƒ
Üí5…Ñ ¹É½Õ¹¡Í•±•Ñ•‘M•ÍÍ¥½¸¹‘ÕÉ…Ñ¥½¸¼ØÀ¥ôƒ–"¦J|ƒ
ÜíÍ•±•Ñ•‘M•ÍÍ¥½¸¹‘¥™™¥Õ±Ñäüü‹šr«¢¾’îÜ‰ôğ½ÀùíÍ•±•Ñ•‘M•ÍÍ¥½¸¹•á•É¥Í•Ì¹µ…À¡¥Ñ•´ôøñ…ÉÑ¥±”­•äõí¥Ñ•´¹¹…µ•ôøñÍÁ…¸øñˆùí¥Ñ•´¹¹…µ•ôğ½ˆøñÍµ…±°ùí¥Ñ•´¹Í•ÑÍôƒîƒ
Üí¥Ñ•´¹‘½Í•ôğ½Íµ…±°øğ½ÍÁ…¸øñ•´ùí¥Ñ•´¹İ•¥¡Ñ-œı€‘í¥Ñ•´¹İ•¥¡Ñ-ô­œƒ
Ü€èˆ‰õí¥Ñ•´¹…ÑÕ…±I•ÁÌı€‘í¥Ñ•´¹…ÑÕ…±I•ÁÍôƒš²…€èˆ‰õí¥Ñ•´¹É¥È„ôõÕ¹‘•™¥¹•ı€ƒ
ÜI%H€‘í¥Ñ•´¹É¥Éõ€èˆ‰ôğ½•´øğ½…ÉÑ¥±”ø¥ôğ½‘¥Øøğ½‘¥Øùô((€€€íµ•É•AÉ½µÁĞ˜˜ñ‘¥Ø±…ÍÍ9…µ”ô‰‘•¥Í¥½¹=Ù•É±…äˆÉ½±”ô‰‘¥…±½œˆ…É¥„µµ½‘…°ô‰ÑÉÕ”ˆøñ‘¥Ø±…ÍÍ9…µ”ô‰‘•¥Í¥½¹…ÉˆøñÀ±…ÍÍ9…µ”ô‰­¥­•Èˆù1=0Q=U9ğ½Àøñ Èû–B#–æÛ’öO¦ª3¢ºÃ–öW¾ò|ğ½ ÈøñÀûfï–öW–&7’şw–¶c–r£šr³šrëj¢ê¯’öOšVÃš6»–J3¦Šw–’[¢º·î–>¿’î—–B#–æÛ–"Ã’êG®¿ğ½Àøñ‰ÕÑÑ½¸½¹±¥¬õì ¤ôùÙ½¥µ•É••µ½…Ñ„ ¥ôû–B#–æÛ–"Ã–öO–&7¢Ò›–>Üğ½‰ÕÑÑ½¸øñ‰ÕÑÑ½¸±…ÍÍ9…µ”ô‰ÅÕ¥•Ğˆ½¹±¥¬õì ¤ôùí±½…±MÑ½É…”¹É•µ½Ù•%Ñ•´ ‰™½Éµ„µ‘•µ¼µÍÑ…Ñ”µØÄˆ¤íÍ•Ñ5•É•AÉ½µÁĞ¡™…±Í”¥õôû–ş÷V—–æÛšâ¦fğ½‰ÕÑÑ½¸øğ½‘¥Øøğ½‘¥Øùô((€€€í•áÑÉ…=Á•¸˜˜ñ‘¥Ø±…ÍÍ9…µ”ô‰•áÑÉ…=Ù•É±…äˆÉ½±”ô‰‘¥…±½œˆ…É¥„µµ½‘…°ô‰ÑÉÕ”ˆøñ™½É´±…ÍÍ9…µ”ô‰•áÑÉ…M¡••Ğˆ½¹MÕ‰µ¥Ğõí”ôùí”¹ÁÉ•Ù•¹Ñ•™…Õ±Ğ ¤í…‘‘áÑÉ„ ¥õôøñ‘¥Ø±…ÍÍ9…µ”ô‰•áÑÉ…Q½Àˆøñ‘¥ØøñÀ±…ÍÍ9…µ”ô‰­¥­•Èˆù59U01=ğ½Àøñ ÈûšŞï–*ƒ¦Šw–’[¢º·îğ½ Èøğ½‘¥Øøñ‰ÕÑÑ½¸ÑåÁ”ô‰‰ÕÑÑ½¸ˆ½¹±¥¬õì ¤ôùÍ•ÑáÑÉ…=Á•¸¡™…±Í”¥ôû\ğ½‰ÕÑÑ½¸øğ½‘¥Øøñ±…‰•°û¢şC–*£¦†çn¸ñ¥¹ÁÕĞ…ÕÑ½½ÕÌÙ…±Õ”õí•áÑÉ…9…µ•ô½¹¡…¹”õí”ôùÍ•ÑáÑÉ…9…µ”¡”¹Ñ…É•Ğ¹Ù…±Õ”¥ôÁ±…•¡½±‘•Èô‹’ú/–š¾òk–ş¯¢ÖÃšâãšÎÏ¦ªG¢ö˜ˆ¼øğ½±…‰•°øñ‘¥Ø±…ÍÍ9…µ”ô‰•áÑÉ…AÉ•Í•ÑÌˆùíl‹–ş¯¢ÖÀˆ°‹¦ªG¢ö˜ˆ°‹šâãšÎÌˆ°‹"³š–óšŠ¼ˆ°‹¦Šw–’[–*o¦<‰t¹µ…À¡àôøñ‰ÕÑÑ½¸ÑåÁ”ô‰‰ÕÑÑ½¸ˆ±…ÍÍ9…µ”õí•áÑÉ…9…µ”ôôõàü‰…Ñ¥Ù”ˆèˆ‰ô½¹±¥¬õì ¤ôùÍ•ÑáÑÉ…9…µ”¡à¥ô­•äõíáôùíáôğ½‰ÕÑÑ½¸ø¥ôğ½‘¥Øøñ±…‰•°û–º3š"C¦<ñ¥¹ÁÕĞÙ…±Õ”õí•áÑÉ…µ½Õ¹Ñô½¹¡…¹”õí”ôùÍ•ÑáÑÉ…µ½Õ¹Ğ¡”¹Ñ…É•Ğ¹Ù…±Õ”¥ôÁ±…•¡½±‘•Èô‹’ú/–š¾òhÌÀƒ–"¦Jš"X€Ïîƒ\€ÄËš²„ˆ¼øğ½±…‰•°øñ‘¥Ø±…ÍÍ9…µ”ô‰•™™½ÉÑA¥¬ˆøñÍµ…±°û’öOš–òë–ê˜ğ½Íµ…±°ùíl‹¢öïšvøˆ°‹¦’â´ˆ°‹–B–*l‰t¹µ…À¡àôøñ‰ÕÑÑ½¸ÑåÁ”ô‰‰ÕÑÑ½¸ˆ±…ÍÍ9…µ”õí•áÑÉ…™™½ÉĞôôõàü‰…Ñ¥Ù”ˆèˆ‰ô½¹±¥¬õì ¤ôùÍ•ÑáÑÉ…™™½ÉĞ¡à¥ô­•äõíáôùíáôğ½‰ÕÑÑ½¸ø¥ôğ½‘¥Øøñ‰ÕÑÑ½¸±…ÍÍ9…µ”ô‰Í…Ù•áÑÉ„ˆû’şw–¶c–"Ã’î+–’¤€ñˆûŠHğ½ˆøğ½‰ÕÑÑ½¸øğ½™½É´øğ½‘¥Øùô((€€€íİ½É­½ÕÑ=Á•¸˜˜ñ‘¥Ø±…ÍÍ9…µ”ô‰İ½É­½ÕÑ=Ù•É±…äˆÉ½±”ô‰‘¥…±½œˆ…É¥„µµ½‘…°ô‰ÑÉÕ”ˆøñ‘¥Ø±…ÍÍ9…µ”ô‰İ½É­½ÕÑM¡••Ğˆø(€€€€€€ñ‘¥Ø±…ÍÍ9…µ”ô‰İ½É­½ÕÑQ½Àˆøñ‘¥ØøñÀ±…ÍÍ9…µ”ô‰­¥­•Èˆùí¥¹Ñ•¹Í¥Ñå÷¢º·îƒ
Üí…Ñ¥Ù•á•É¥Í”¬Åô½í…Ñ¥Ù•á•É¥Í•Ì¹±•¹Ñ¡ôğ½Àøñ Èû’âOšÎ£¢şg’âîğ½ Èøğ½‘¥Øøñ‰ÕÑÑ½¸½¹±¥¬õì ¤ôùÍ•Ñá¥Ñ½¹™¥É´¡ÑÉÕ”¥ôû\ğ½‰ÕÑÑ½¸øğ½‘¥Øø(€€€€€€ñ‘¥Ø±…ÍÍ9…µ”ô‰İ½É­½ÕÑAÉ½É•ÍÌˆøñ¤ÍÑå±”õííİ¥‘Ñ é€‘ì ¡…Ñ¥Ù•á•É¥Í”­Í•ÑÍ½µÁ±•Ñ•½…Ñ¥Ù•á•É¥Í•Ím…Ñ¥Ù•á•É¥Í•t¹Í•ÑÌ¤½…Ñ¥Ù•á•É¥Í•Ì¹±•¹Ñ ¤¨ÄÀÁô•õô¼øğ½‘¥Øø(€€€€€€ñ‰ÕÑÑ½¸±…ÍÍ9…µ”ô‰İ½É­½ÕÑ5•‘¥„ˆ½¹±¥¬õì ¤ôùÍ•ÑÕ¥‘”¡…Ñ¥Ù•á•É¥Í”¥ôøñ¥µœÍÉŒõí¡ÑÑÁÌè¼½¤¹åÑ¥µœ¹½´½Ù¤¼‘í…Ñ¥Ù•á•É¥Í•Ím…Ñ¥Ù•á•É¥Í•t¹Ù¥‘•½%‘ô½¡Å‘•™…Õ±Ğ¹©Áô…±Ğôˆˆ‘•½‘¥¹œô‰…Íå¹Œˆİ¥‘Ñ ôˆØĞÀˆ¡•¥¡ĞôˆÌäÀˆ¼øñÍÁ…¸ûŠZØƒš~—r/–*£’ös–~ë†šVg–¶˜ğ½ÍÁ…¸øğ½‰ÕÑÑ½¸ø(€€€€€€ñ‘¥Ø±…ÍÍ9…µ”ô‰İ½É­½ÕÑ%¹™¼ˆøñÍµ…±°ùí…Ñ¥Ù•á•É¥Í•Ím…Ñ¥Ù•á•É¥Í•t¹Ñ…É•Ñôğ½Íµ…±°øñ Ìùí•™™•Ñ¥Ù•Mİ…ÁÁ•¹¥¹±Õ‘•Ì¡…Ñ¥Ù•á•É¥Í”¤ıl‹–Šg–’ş¿–6ŸšJDˆ°‹ºÇ–ò?šŞÇ¢æÈˆ°‹–vC–ÿ–òç–*o–â›–"K¢"äˆ°‹¢ng–ò?¢š†”ˆ°‹¦®c’ö7–æÏšvÿšR¿šJD‰um…Ñ¥Ù•á•É¥Í•té…Ñ¥Ù•á•É¥Í•Ím…Ñ¥Ù•á•É¥Í•t¹¹…µ•ôğ½ Ìùí…ÕÑ½Mİ…ÁÁ•¹¥¹±Õ‘•Ì¡…Ñ¥Ù•á•É¥Í”¤˜˜ñÀ±…ÍÍ9…µ”ô‰Íİ…ÁI•…Í½¸ˆû–nƒ’öƒj’â7¦¦£’ö7¾ò3–ŞË¢«–*£š6‹š"C’ö;¢Òš.–*£’ösğ½ÀùôñÀùí…Ñ¥Ù•á•É¥Í•Ím…Ñ¥Ù•á•É¥Í•t¹Õ•ôğ½Àøñ‘¥Ø±…ÍÍ9…µ”ô‰Í•Ñ½ÑÌˆùíÉÉ…ä¹™É½´¡í±•¹Ñ é…Ñ¥Ù•á•É¥Í•Ím…Ñ¥Ù•á•É¥Í•t¹Í•ÑÍô°¡|±¤¤ôøñÍÁ…¸±…ÍÍ9…µ”õí¤ñÍ•ÑÍ½µÁ±•Ñ•ü‰‘½¹”ˆé¤ôôõÍ•ÑÍ½µÁ±•Ñ•ü‰ÕÉÉ•¹Ğˆèˆ‰ô­•äõí¥ôùí¤ñÍ•ÑÍ½µÁ±•Ñ•ü‹ŠrLˆé¤¬ÅôñÍµ…±°û²±í¤¬Å÷îğ½Íµ…±°øğ½ÍÁ…¸ø¥ôğ½‘¥Øøñ‘¥Ø±…ÍÍ9…µ”ô‰Á•É™½Éµ…¹•%¹ÁÕÑÌˆøñ±…‰•°û–º{¦fš²‡šVÀñ¥¹ÁÕĞ¥¹ÁÕÑ5½‘”ô‰¹Õµ•É¥ŒˆÙ…±Õ”õíÁ•É™½Éµ…¹•m…Ñ¥Ù•á•É¥Í•tü¹É•ÁÌüüˆ‰ô½¹¡…¹”õí”ôùÍ•ÑA•É™½Éµ…¹”¡Øôø¡ì¸¸¹Ø±m…Ñ¥Ù•á•É¥Í•téíÉ•ÁÌé”¹Ñ…É•Ğ¹Ù…±Õ”±İ•¥¡ĞéÙm…Ñ¥Ù•á•É¥Í•tü¹İ•¥¡Ğüüˆˆ±É¥ÈéÙm…Ñ¥Ù•á•É¥Í•tü¹É¥Èüüˆ‰õô¤¥ô¼øğ½±…‰•°øñ±…‰•°û¦7¦<íÁÉ•™•É•¹•Ì¹Õ¹¥Ğôôô‰µ•ÑÉ¥Œˆü‰­œˆè‰±ˆ‰ôñ¥¹ÁÕĞ¥¹ÁÕÑ5½‘”ô‰‘•¥µ…°ˆÙ…±Õ”õíÁ•É™½Éµ…¹•m…Ñ¥Ù•á•É¥Í•tü¹İ•¥¡Ğüüˆ‰ô½¹¡…¹”õí”ôùÍ•ÑA•É™½Éµ…¹”¡Øôø¡ì¸¸¹Ø±m…Ñ¥Ù•á•É¥Í•téíÉ•ÁÌéÙm…Ñ¥Ù•á•É¥Í•tü¹É•ÁÌüüˆˆ±İ•¥¡Ğé”¹Ñ…É•Ğ¹Ù…±Õ”±É¥ÈéÙm…Ñ¥Ù•á•É¥Í•tü¹É¥Èüüˆ‰õô¤¥ô¼øğ½±…‰•°øñ±…‰•°û’ög–*lI%Hñ¥¹ÁÕĞ¥¹ÁÕÑ5½‘”ô‰¹Õµ•É¥ŒˆÙ…±Õ”õíÁ•É™½Éµ…¹•m…Ñ¥Ù•á•É¥Í•tü¹É¥Èüüˆ‰ô½¹¡…¹”õí”ôùÍ•ÑA•É™½Éµ…¹”¡Øôø¡ì¸¸¹Ø±m…Ñ¥Ù•á•É¥Í•téíÉ•ÁÌéÙm…Ñ¥Ù•á•É¥Í•tü¹É•ÁÌüüˆˆ±İ•¥¡ĞéÙm…Ñ¥Ù•á•É¥Í•tü¹İ•¥¡Ğüüˆˆ±É¥Èé”¹Ñ…É•Ğ¹Ù…±Õ•õô¤¥ô¼øğ½±…‰•°øğ½‘¥Øøñ‘¥Ø±…ÍÍ9…µ”ô‰±…ÍÑI•ÍÕ±ĞˆøñÍÁ…¸ûšr³š†¢º·î¦<ğ½ÍÁ…¸øñˆùí…Ñ¥Ù•á•É¥Í•Ím…Ñ¥Ù•á•É¥Í•t¹‘½Í•ôƒ
Üƒ’òGš¼í…Ñ¥Ù•á•É¥Í•Ím…Ñ¥Ù•á•É¥Í•t¹É•ÍÑôƒHğ½ˆøğ½‘¥Øøñ‘¥Ø±…ÍÍ9…µ”ô‰İ½É­½ÕÑÑ¥½¹Ìˆøñ‰ÕÑÑ½¸½¹±¥¬õíÁÉ•Ù¥½ÕÍM•Ñô‘¥Í…‰±•õí…Ñ¥Ù•á•É¥Í”ôôôÀ˜™Í•ÑÍ½µÁ±•Ñ•ôôôÁôûŠ@ƒ’â+’âš¶”ğ½‰ÕÑÑ½¸øñ‰ÕÑÑ½¸½¹±¥¬õíÍ­¥Áá•É¥Í•ôû¢ŞÏ¢ş–*£’öpğ½‰ÕÑÑ½¸øğ½‘¥Øøñ‰ÕÑÑ½¸±…ÍÍ9…µ”ô‰™¥¹¥Í¡M•Ğˆ½¹±¥¬õí™¥¹¥Í¡M•Ñôû–º3š"C²°íÍ•ÑÍ½µÁ±•Ñ•¬Åôƒî€ñˆûŠHğ½ˆøğ½‰ÕÑÑ½¸øğ½‘¥Øø(€€€€€íÑ¥µ•È˜™Ñ¥µ•É5½‘”ôôô‰É•ÍĞˆ˜˜ñ‘¥Ø±…ÍÍ9…µ”ô‰¥¹±¥¹•I•ÍĞˆøñÀ±…ÍÍ9…µ”ô‰­¥­•Èˆûî¦^Ó’òGš¼ƒ
Üƒ’â/’âî–6Ï–Â–ò–,ğ½ÀøñÍÑÉ½¹œùí±½­ôğ½ÍÑÉ½¹œøñÍÁ…¸ûšRûšvû¢
§¢¾ò3’şwš2òOš‹–Fó–Bàğ½ÍÁ…¸øñ‘¥Ø±…ÍÍ9…µ”ô‰É•ÍÑ	…Èˆøñ¤ÍÑå±”õííİ¥‘Ñ é€‘í5…Ñ ¹µ…à À°ÄÀÀµÍ•½¹‘Ì½É•ÍÑQ½Ñ…°¨ÄÀÀ¥ô•õô¼øğ½‘¥Øøñ‰ÕÑÑ½¸½¹±¥¬õì ¤ôùíÍ•ÑQ¥µ•È¡™…±Í”¤íÍ•ÑIÕ¹¹¥¹œ¡™…±Í”¤íÍ•ÑQ¥µ•É•…‘±¥¹”¡¹Õ±°¥õôû¢ŞÏ¢ş’òGš¿¾ò3îŸî·¢º·îƒŠHğ½‰ÕÑÑ½¸øğ½‘¥Øùô(€€€€ğ½‘¥Øøğ½‘¥Øùô((€€€íÕ¥‘”„ôõ¹Õ±°˜˜ñ‘¥Ø±…ÍÍ9…µ”ô‰µ½‘…°ˆÉ½±”ô‰‘¥…±½œˆ…É¥„µµ½‘…°ô‰ÑÉÕ”ˆø(€€€€€€ñ‘¥Ø±…ÍÍ9…µ”ô‰Ù¥•İ•Èˆø(€€€€€€€€ñ‰ÕÑÑ½¸±…ÍÍ9…µ”ô‰±½Í”ˆ½¹±¥¬õì ¤ôùÍ•ÑÕ¥‘”¡¹Õ±°¥ôû\ğ½‰ÕÑÑ½¸ø(€€€€€€€€ñ‘¥Ø±…ÍÍ9…µ”ô‰Ù¥‘•½É…µ”ˆø(€€€€€€€€€í•á•É¥Í•ÍmÕ¥‘•t¹Ù¥‘•½%üñ¥™É…µ”±½…‘¥¹œô‰±…éäˆÍÉŒõí¡ÑÑÁÌè¼½İİÜ¹å½ÕÑÕ‰”µ¹½½½­¥”¹½´½•µ‰•¼‘í•á•É¥Í•ÍmÕ¥‘•t¹Ù¥‘•½%‘ôıÉ•°ôÀ™Á±…åÍ¥¹±¥¹”ôÅôÑ¥Ñ±”õí€‘í•á•É¥Í•ÍmÕ¥‘•t¹¹…µ•÷šVg–¶›¢¦ŠEô…±±½Üô‰…•±•É½µ•Ñ•Èì…ÕÑ½Á±…äì±¥Á‰½…ÉµİÉ¥Ñ”ì•¹ÉåÁÑ•µµ•‘¥„ìåÉ½Í½Á”ìÁ¥ÑÕÉ”µ¥¸µÁ¥ÑÕÉ”ˆ…±±½İÕ±±MÉ••¸¼øèñ¥™É…µ”±½…‘¥¹œô‰±…éäˆÍÉŒõí•á•É¥Í•ÍmÕ¥‘•t¹Í½ÕÉ•ôÑ¥Ñ±”õí€‘í•á•É¥Í•ÍmÕ¥‘•t¹¹…µ•÷’âO–ºÛšVg–¶™ô¼ùô(€€€€€€€€ğ½‘¥Øø(€€€€€€€€ñ‘¥Ø±…ÍÍ9…µ”ô‰Ù¥•İ•É%¹™¼ˆøñÀ±…ÍÍ9…µ”ô‰­¥­•Èˆùí•á•É¥Í•ÍmÕ¥‘•t¹ÁÉ½Ù¥‘•Éô€¼=I4U%ğ½Àøñ Èùí•á•É¥Í•ÍmÕ¥‘•t¹¹…µ•ôğ½ Èøñ‘¥Ø±…ÍÍ9…µ”ô‰Õ•É¥ˆøñÍÁ…¸øñÍµ…±°ûš¶†»š>C’èğ½Íµ…±°øñÀùí•á•É¥Í•ÍmÕ¥‘•t¹Õ•ôğ½Àøğ½ÍÁ…¸øñÍÁ…¸øñÍµ…±°û¦ÿ–7¦Rg¢¾¼ğ½Íµ…±°øñÀùí•á•É¥Í•ÍmÕ¥‘•t¹…Ù½¥‘ôğ½Àøğ½ÍÁ…¸øğ½‘¥Øøñ‰ÕÑÑ½¸½¹±¥¬õì ¤ôùí½¹ÍĞÈõ•á•É¥Í•ÍmÕ¥‘•t¹É•ÍĞíÍ•ÑÕ¥‘”¡¹Õ±°¤í‰•¥¹I•ÍĞ¡È¥õôûš"Gr/š’ê¾ò3–ò–/¢º·î€ñˆûŠHğ½ˆøğ½‰ÕÑÑ½¸øğ½‘¥Øø(€€€€€€ğ½‘¥Øø(€€€€ğ½‘¥Øùô((€€€íÑ¥µ•È˜˜„¡İ½É­½ÕÑ=Á•¸˜™Ñ¥µ•É5½‘”ôôô‰É•ÍĞˆ¤˜˜ñ‘¥Ø±…ÍÍ9…µ”õíÑ¥µ•È€‘íÑ¥µ•É5½‘”ôôô‰ÅÕ¥¬ˆü‰ÅÕ¥­Q¥µ•Èˆèˆ‰õôÉ½±”ô‰‘¥…±½œˆ…É¥„µµ½‘…°ô‰ÑÉÕ”ˆøñ‰ÕÑÑ½¸±…ÍÍ9…µ”ô‰±½Í”ˆ½¹±¥¬õì ¤ôùíÍ•ÑQ¥µ•È¡™…±Í”¤íÍ•ÑIÕ¹¹¥¹œ¡™…±Í”¤íÍ•ÑQ¥µ•É•…‘±¥¹”¡¹Õ±°¥õôû\ğ½‰ÕÑÑ½¸øñÀ±…ÍÍ9…µ”ô‰­¥­•ÈˆùíÑ¥µ•É5½‘”ôôô‰ÅÕ¥¬ˆı5=I9%9aAIML€¼€‘íÍ…™•EÕ¥­%¹‘•à¬Åô=€‘íÅÕ¥­MÑ…•Ì¹±•¹Ñ¡õ€è‰I=YId€¼	IQ!‰ôğ½Àøñ ÈùíÑ¥µ•É5½‘”ôôô‰ÅÕ¥¬ˆıÅÕ¥­MÑ…•ÍmÍ…™•EÕ¥­%¹‘•át¹¹…µ”è‹š‹–’7–Fó–Bà‰ôğ½ ÈùíÑ¥µ•É5½‘”ôôô‰ÅÕ¥¬ˆ˜˜ğøñÀ±…ÍÍ9…µ”ô‰ÍÑ…••Ñ…¥°ˆùíÅÕ¥­MÑ…•ÍmÍ…™•EÕ¥­%¹‘•át¹‘•Ñ…¥±ôğ½Àøñ‘¥Ø±…ÍÍ9…µ”ô‰ÅÕ¥­Q¥µ•±¥¹”ˆùíÅÕ¥­MÑ…•Ì¹µ…À ¡Ì±¤¤ôøñÍÁ…¸±…ÍÍ9…µ”õí¤ñÍ…™•EÕ¥­%¹‘•àü‰‘½¹”ˆé¤ôôõÍ…™•EÕ¥­%¹‘•àü‰…Ñ¥Ù”ˆèˆ‰ô­•äõíÌ¹¹…µ•ôøñ¤¼ùíÌ¹¹…µ•ôñÍµ…±°ùíÌ¹‘ÕÉ…Ñ¥½¸¼ØÁ÷–"¦J|ğ½Íµ…±°øğ½ÍÁ…¸ø¥ôğ½‘¥Øøğ¼ùôñ‰ÕÑÑ½¸±…ÍÍ9…µ”õí±½¬€‘íÉÕ¹¹¥¹œü‰±¥Ù”ˆèˆ‰õô½¹±¥¬õíÑ½±•Q¥µ•ÉôøñÍÑÉ½¹œùí±½­ôğ½ÍÑÉ½¹œøñÍÁ…¸ùíÍ•½¹‘ÌôôôÀıÑ¥µ•É5½‘”ôôô‰ÅÕ¥¬ˆü‹šf£î–º3š"@ˆè‹–>¿’î—–ò–/’â/’âîˆéÉÕ¹¹¥¹œü‹¢öï¢›šj–pˆè‹¢öï¢›îŸî´‰ôğ½ÍÁ…¸øğ½‰ÕÑÑ½¸øñ‘¥Ø±…ÍÍ9…µ”ô‰…‘©ÕÍĞˆøñ‰ÕÑÑ½¸½¹±¥¬õì ¤ôù…‘©ÕÍÑQ¥µ•È ´ÄÔ¥ôûŠ"HÄ×Hğ½‰ÕÑÑ½¸øñ‰ÕÑÑ½¸±…ÍÍ9…µ”ô‰¹•áĞˆ½¹±¥¬õì ¤ôùíÍ•ÑQ¥µ•È¡™…±Í”¤íÍ•ÑIÕ¹¹¥¹œ¡™…±Í”¤íÍ•ÑQ¥µ•É•…‘±¥¹”¡¹Õ±°¤í¥˜¡Ñ¥µ•É5½‘”ôôô‰ÅÕ¥¬ˆ¥Ù½¥™¥¹¥Í¡EÕ¥¬ ¥õôùíÑ¥µ•É5½‘”ôôô‰ÅÕ¥¬ˆü‹–º3š"Cšf£îˆè‹’â/’âî‰ôƒŠHğ½‰ÕÑÑ½¸øñ‰ÕÑÑ½¸½¹±¥¬õì ¤ôù…‘©ÕÍÑQ¥µ•È ÄÔ¥ôø¬Ä×Hğ½‰ÕÑÑ½¸øğ½‘¥Øøğ½‘¥Øùô(€€ğ½µ…¥¸ø)ô(