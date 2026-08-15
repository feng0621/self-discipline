"use client";
/* eslint-disable jsx-a11y/no-autofocus, @next/next/no-img-element */

import { useEffect, useMemo, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import AuthPanel from "../auth/components/AuthPanel";
import LandingPage from "../landing/LandingPage";
import ReadinessCard from "./components/ReadinessCard";
import PersonalizedPlan from "./components/PersonalizedPlan";
import FormaIcon from "../../shared/icons/FormaIcon";
import type { ReadinessInput, ReadinessRecommendation } from "./domain/adaptive-training";
import { exercises, quickStages } from "./domain/workout-catalog";
import { deleteBodyLog, deleteExtraActivity, flushSyncQueue, loadDashboard, loadTrainingProfile, pendingSyncCount, saveBodyAndProfile, saveCompletedWorkout, saveDailyReadiness, saveExtraActivity, saveNotificationPreferences, saveProfileSettings, saveTrainingGoal, saveTrainingProfile, saveUserPreferences, updateWorkoutFeedback } from "./data/fitness-repository";
import type { AppPreferences, BodyHistoryPoint, NotificationPreference, SessionHistory } from "./data/fitness-repository";
import type { TrainingProfile } from "./domain/personalized-plan";
import { supabase } from "../../infrastructure/supabase/client";

const lowImpactNames=["墙壁俯卧撑","箱式深蹲","坐姿弹力带划船","蛙式臀桥","高位平板支撑","仰卧交替抬腿","死虫式"];
const intermediateNames=["跪姿俯卧撑","徒手深蹲","弹力带划船停顿","单腿辅助臀桥","侧平板支撑","死虫式停顿","屈膝反向卷腹"];
const advancedNames=["标准俯卧撑","反向箭步蹲","强阻力弹力带划船","单腿臀桥","平板支撑点肩","负重死虫式","慢速反向卷腹"];

export default function FitnessApp(){
  const [user,setUser]=useState<User|null>(null);
  const [authReady,setAuthReady]=useState(false);
  const [demoMode,setDemoMode]=useState(false);
  const [showLanding,setShowLanding]=useState(true);
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
  const [lastSessionId,setLastSessionId]=useState("");
  const [timerMode,setTimerMode]=useState<"rest"|"quick">("rest");
  const [quickRecorded,setQuickRecorded]=useState(false);
  const [hour]=useState(()=>new Date().getHours());
  const [todayInfo]=useState(()=>({short:new Intl.DateTimeFormat("zh-CN",{timeZone:"Asia/Kuala_Lumpur",month:"2-digit",day:"2-digit"}).format(new Date()),weekday:new Intl.DateTimeFormat("zh-CN",{timeZone:"Asia/Kuala_Lumpur",weekday:"long"}).format(new Date())}));
  const [restTotal,setRestTotal]=useState(75);
  const [intensity,setIntensity]=useState<"入门"|"进阶"|"强化">("入门");
  const [extraOpen,setExtraOpen]=useState(false);
  const [extraName,setExtraName]=useState("快走");
  const [extraAmount,setExtraAmount]=useState("20 分钟");
  const [extraEffort,setExtraEffort]=useState("适中");
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
  const [goal,setGoal]=useState("减脂 · 腹肌显形");
  const [trainingProfile,setTrainingProfile]=useState<TrainingProfile|undefined>();
  const [workoutPaused,setWorkoutPaused]=useState(false);
  const [elapsedSeconds,setElapsedSeconds]=useState(0);

  useEffect(()=>{
    let active=true;
    supabase.auth.getSession().then(({data})=>{if(!active)return;setUser(data.session?.user??null);setAuthReady(true)}).catch(()=>{if(active)setAuthReady(true)});
    const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,session)=>{setUser(session?.user??null);setAuthReady(true)});
    return()=>{active=false;subscription.unsubscribe()};
  },[]);
  useEffect(()=>{const open=()=>{setDemoMode(true);setShowLanding(false);setTab("训练");setWorkoutOpen(true);setSessionStartedAt(Date.now())};if(new URLSearchParams(location.search).get("start")==="training")queueMicrotask(open);navigator.serviceWorker?.addEventListener("message",event=>{if(event.data?.type==="OPEN_TODAY_WORKOUT")open()})},[]);
  useEffect(()=>{
    if(user)return;
    queueMicrotask(()=>{try{
      const raw=localStorage.getItem("forma-demo-state-v1");
      if(raw){const saved=JSON.parse(raw);setDone(saved.done??[]);setWeight(saved.weight??"110.0");setWaist(saved.waist??"101");setSleep(saved.sleep??"7.5");setWater(saved.water??5);setEquipment(saved.equipment??["徒手","弹力带"]);setReminder(saved.reminder??true);setExtras(saved.extras??[]);setHistory(saved.history??[]);setCompletedSessions(saved.completedSessions??0);setWeeklySessions(saved.weeklySessions??0);setStreakDays(saved.streakDays??0);setCurrentWeek(saved.currentWeek??1);setNotificationPrefs(saved.notificationPrefs??{enabled:true,days:[1,3,5],time:"19:30",advanceMinutes:30});}
    }catch{/* Ignore damaged demo data and keep safe defaults. */}finally{setLocalReady(true)}});
  },[user]);
  useEffect(()=>{if(user)return;queueMicrotask(()=>{try{const raw=localStorage.getItem("forma-training-profile-v1");if(raw)setTrainingProfile(JSON.parse(raw) as TrainingProfile)}catch{/* Keep the onboarding defaults. */}})},[user]);
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
    if(!user)return;
    void loadTrainingProfile(user.id).then(profile=>{if(profile)setTrainingProfile(profile)}).catch(()=>{});
  },[user]);

  useEffect(()=>{
    queueMicrotask(()=>setPendingSync(pendingSyncCount()));
    if(!user)return;
    const sync=async()=>{setCloudState("saving");const count=await flushSyncQueue(user.id);setPendingSync(count);setCloudState(count?"error":"synced")};
    if(navigator.onLine)void sync();
    window.addEventListener("online",sync);return()=>window.removeEventListener("online",sync);
  },[user]);

  useEffect(()=>{queueMicrotask(()=>{try{const raw=localStorage.getItem("forma-active-workout-v1");if(!raw)return;const saved=JSON.parse(raw);setDone(saved.done??[]);setSwapped(saved.swapped??[]);setIntensity(saved.intensity??"入门");setActiveExercise(saved.activeExercise??0);setSetsCompleted(saved.setsCompleted??0);setTimerMode(saved.timerMode??"rest");setRestTotal(saved.restTotal??75);setQuickRecorded(saved.quickRecorded??false);setWorkoutPaused(Boolean(saved.workoutPaused));setSessionStartedAt(saved.sessionStartedAt??Date.now());if(saved.deadline&&saved.running){const remaining=Math.max(0,Math.ceil((saved.deadline-Date.now())/1000));setSeconds(remaining);setTimerDeadline(saved.deadline);setRunning(remaining>0)}else setSeconds(saved.seconds??75);setWorkoutOpen(Boolean(saved.workoutOpen));setTimer(Boolean(saved.timer))}catch{/* Ignore stale session data. */}})},[]);
  useEffect(()=>{if(!workoutOpen&&!timer&&!workoutPaused){localStorage.removeItem("forma-active-workout-v1");return}localStorage.setItem("forma-active-workout-v1",JSON.stringify({workoutOpen,timer,workoutPaused,sessionStartedAt,activeExercise,setsCompleted,done,swapped,intensity,timerMode,restTotal,seconds:secondsRef.current,running,deadline:timerDeadline,quickRecorded}));lastTimerPersist.current=Date.now()},[workoutOpen,timer,workoutPaused,sessionStartedAt,activeExercise,setsCompleted,done,swapped,intensity,timerMode,restTotal,running,timerDeadline,quickRecorded]);
  useEffect(()=>{if(!workoutOpen&&!timer)return;if(running&&Date.now()-lastTimerPersist.current<10000)return;localStorage.setItem("forma-active-workout-v1",JSON.stringify({workoutOpen,timer,sessionStartedAt,activeExercise,setsCompleted,done,swapped,intensity,timerMode,restTotal,seconds,running,deadline:timerDeadline,quickRecorded}));lastTimerPersist.current=Date.now()},[seconds,workoutOpen,timer,sessionStartedAt,running,activeExercise,setsCompleted,done,swapped,intensity,timerMode,restTotal,timerDeadline,quickRecorded]);
  useEffect(()=>{const resume=()=>{if(running&&timerDeadline)setSeconds(Math.max(0,Math.ceil((timerDeadline-Date.now())/1000)))};document.addEventListener("visibilitychange",resume);window.addEventListener("focus",resume);return()=>{document.removeEventListener("visibilitychange",resume);window.removeEventListener("focus",resume)}},[running,timerDeadline]);

  useEffect(()=>{
    if(!("Notification" in window)||!notificationPrefs.enabled||Notification.permission!=="granted")return;
    const check=()=>{
      const now=new Date();
      if(!notificationPrefs.days.includes(now.getDay()))return;
      const [hourValue,minuteValue]=notificationPrefs.time.split(":").map(Number);
      const notifyAt=new Date(now);notifyAt.setHours(hourValue,minuteValue-notificationPrefs.advanceMinutes,0,0);
      const key=`forma-reminder-${notifyAt.toDateString()}`;
      if(Math.abs(now.getTime()-notifyAt.getTime())<60000&&!localStorage.getItem(key)){new Notification("FORMA 训练提醒",{body:`${notificationPrefs.advanceMinutes} 分钟后开始今天的训练。`,icon:"/favicon.svg"});localStorage.setItem(key,"1")}
    };
    check();const id=window.setInterval(check,30000);return()=>window.clearInterval(id);
  },[notificationPrefs]);

  useEffect(()=>{if(!running)return;const id=window.setInterval(()=>setSeconds(v=>{if(v<=1){setRunning(false);if(workoutOpen&&timerMode==="rest")setTimer(false);return 0}return v-1}),1000);return()=>window.clearInterval(id)},[running,workoutOpen,timerMode]);
  useEffect(()=>{if(!workoutOpen||!sessionStartedAt)return;const update=()=>setElapsedSeconds(Math.max(0,Math.floor((Date.now()-sessionStartedAt)/1000)));update();const id=window.setInterval(update,1000);return()=>window.clearInterval(id)},[workoutOpen,sessionStartedAt]);
  useEffect(()=>{const locked=workoutOpen||timer||guide!==null||extraOpen;document.documentElement.classList.toggle("overlayLocked",locked);return()=>document.documentElement.classList.remove("overlayLocked")},[workoutOpen,timer,guide,extraOpen]);
  const activeExercises=useMemo(()=>exercises.map((x,i)=>{
    if(intensity==="入门")return {...x,sets:3,dose:["3 × 8","3 × 10","3 × 10","3 × 12","3 × 20秒","3 × 8/侧","3 × 10"][i],rest:i>=4?45:75};
    if(intensity==="进阶")return {...x,name:intermediateNames[i],dose:["3 × 10","3 × 12","3 × 12","3 × 10/侧","3 × 25秒/侧","3 × 10/侧","3 × 12"][i],sets:3,rest:i>=4?50:75};
    return {...x,name:advancedNames[i],dose:["4 × 8–12","4 × 10/侧","4 × 10–12","4 × 10/侧","4 × 20次","4 × 10/侧","4 × 12–15"][i],sets:4,rest:i>=4?60:90};
  }),[intensity]);
  const riskAreas=[...new Set([...avoidAreas,...healthLimitations])];
  const autoSwapped=[...(riskAreas.some(x=>x.includes("肩"))?[0,2]:[]),...(riskAreas.some(x=>x.includes("膝")||x.includes("脚踝"))?[1]:[]),...(riskAreas.some(x=>x.includes("腰"))?[3,4]:[])];
  const effectiveSwapped=[...new Set([...swapped,...autoSwapped])];
  const progress=useMemo(()=>Math.round(done.length/activeExercises.length*100),[done,activeExercises.length]);
  const planProgress=Math.min(100,Math.round(completedSessions/36*100));
  const weeklyTarget=trainingProfile?.daysPerWeek??3;
  const phaseIndex=currentWeek<=2?0:currentWeek<=6?1:currentWeek<=10?2:3;
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
  const elapsedClock=`${String(Math.floor(elapsedSeconds/60)).padStart(2,"0")}:${String(elapsedSeconds%60).padStart(2,"0")}`;
  const toggle=(i:number)=>setDone(v=>v.includes(i)?v.filter(x=>x!==i):[...v,i]);
  const beginRest=(value:number)=>{setRestTotal(value);setTimerMode("rest");setSeconds(value);setTimerDeadline(Date.now()+value*1000);setRunning(true);setTimer(true)};
  const refreshSyncState=()=>{const count=pendingSyncCount();setPendingSync(count);setCloudState(count?"error":"synced")};
  const startWorkout=()=>{setWorkoutPaused(false);setActiveExercise(0);setSetsCompleted(0);setPerformance({});setSessionStartedAt(Date.now());setFeedback("");setWorkoutOpen(true)};
  const persistWorkout=async()=>{setCompletedSessions(v=>v+1);setWeeklySessions(v=>v+1);setStreakDays(v=>Math.max(1,v));setCurrentWeek(v=>Math.min(12,Math.max(v,Math.ceil((completedSessions+1)/3))));if(!user)return;setCloudState("saving");try{const recorded=activeExercises.map((item,index)=>({...item,actualReps:Number(performance[index]?.reps)||undefined,weightKg:(Number(performance[index]?.weight)||0)*(preferences.unit==="imperial"?1/2.20462:1)||undefined,rir:Number(performance[index]?.rir)||undefined}));const id=await saveCompletedWorkout(user.id,intensity,recorded);setLastSessionId(id);refreshSyncState()}catch{setCloudState("error")}};
  const finishSet=()=>{const current=activeExercises[activeExercise];if(setsCompleted+1<current.sets){setSetsCompleted(v=>v+1);beginRest(current.rest);return}setDoneExercise(activeExercise);if(activeExercise<activeExercises.length-1){setActiveExercise(v=>v+1);setSetsCompleted(0);beginRest(current.rest)}else{setWorkoutOpen(false);setFeedback("正合适");setShowSummary(true);void persistWorkout();flash("训练完成，记录已保存")}};
  const previousSet=()=>{if(setsCompleted>0){setSetsCompleted(v=>v-1);return}if(activeExercise>0){setActiveExercise(v=>v-1);setSetsCompleted(Math.max(0,activeExercises[activeExercise-1].sets-1));setDone(v=>v.filter(x=>x!==activeExercise-1))}};
  const skipExercise=()=>{setDoneExercise(activeExercise);if(activeExercise<activeExercises.length-1){setActiveExercise(v=>v+1);setSetsCompleted(0)}else{setWorkoutOpen(false);setShowSummary(true);void persistWorkout()}};
  const setDoneExercise=(i:number)=>setDone(v=>v.includes(i)?v:[...v,i]);
  const startQuick=()=>{setQuickRecorded(false);setTimerMode("quick");setSeconds(480);setTimerDeadline(Date.now()+480000);setRunning(true);setTimer(true)};
  const toggleTimer=()=>{setRunning(value=>{const next=!value;setTimerDeadline(next?Date.now()+seconds*1000:null);return next})};
  const adjustTimer=(delta:number)=>setSeconds(value=>{const next=Math.max(0,value+delta);if(running)setTimerDeadline(Date.now()+next*1000);return next});
  const finishQuick=async()=>{if(quickRecorded)return;setQuickRecorded(true);setCompletedSessions(v=>v+1);setWeeklySessions(v=>v+1);setStreakDays(v=>Math.max(1,v));if(user){setCloudState("saving");try{const quickExercises=quickStages.map(stage=>({name:stage.name,sets:1,dose:`${stage.duration} 秒`,rest:0}));const id=await saveCompletedWorkout(user.id,"入门",quickExercises);setLastSessionId(id);refreshSyncState()}catch{setCloudState("error")}}flash("晨练完成，记录已保存")};
  const flash=(message:string)=>{setNotice(message);window.setTimeout(()=>setNotice(""),2200)};
  const addExtra=async()=>{if(!extraName.trim()||!extraAmount.trim())return;const item={id:crypto.randomUUID(),name:extraName.trim(),amount:extraAmount.trim(),effort:extraEffort,time:new Date().toLocaleTimeString("zh-CN",{hour:"2-digit",minute:"2-digit"})};setExtras(v=>[item,...v]);setExtraOpen(false);if(user){setCloudState("saving");try{const saved=await saveExtraActivity(user.id,item);setExtras(v=>v.map(x=>x.id===item.id?{...x,id:saved.id}:x));refreshSyncState()}catch{setExtras(v=>v.filter(x=>x.id!==item.id));setCloudState("error")}}flash(user?"额外训练已保存":"额外训练已保存在本机")};
  const removeExtra=async(id:string)=>{const previous=extras;setExtras(v=>v.filter(x=>x.id!==id));if(!user)return;try{await deleteExtraActivity(user.id,id);refreshSyncState();flash("额外训练已删除")}catch{setExtras(previous);flash("删除失败，请稍后重试")}};
  const saveBodyLog=async()=>{const values=[Number(weight),Number(waist),Number(sleep)];if(values.some(x=>!Number.isFinite(x)||x<=0)||Number(sleep)>24){flash("请填写有效的体重、腰围和睡眠时间");return}const metricWeight=preferences.unit==="metric"?Number(weight):Number(weight)/2.20462;const metricWaist=preferences.unit==="metric"?Number(waist):Number(waist)*2.54;const point={date:new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Kuala_Lumpur"}).format(new Date()),weight:metricWeight,waist:metricWaist};setHistory(v=>[...v.filter(x=>x.date!==point.date),point].sort((a,b)=>a.date.localeCompare(b.date)));if(!user){flash("今天的身体记录已保存在本机");return}setCloudState("saving");try{await saveBodyAndProfile(user.id,{weight:metricWeight,waist:metricWaist,sleep:Number(sleep),water,equipment,reminderEnabled:reminder});refreshSyncState();flash("今天的身体记录已保存")}catch{setCloudState("error");flash("保存失败，请稍后重试")}};
  const chooseFeedback=async(value:string)=>{setFeedback(value);if(user&&lastSessionId){try{await updateWorkoutFeedback(user.id,lastSessionId,value);refreshSyncState();flash(`已记录：${value}，下次计划会自动调整`)}catch{flash("训练感受保存失败")}}else flash(`已记录：${value}`)};
  const persistNotifications=async(next:NotificationPreference)=>{setNotificationPrefs(next);setReminder(next.enabled);if(!user)return;setCloudState("saving");try{await Promise.all([saveProfileSettings(user.id,{equipment,reminderEnabled:next.enabled}),saveNotificationPreferences(user.id,next)]);refreshSyncState()}catch{setCloudState("error")}};
  const updateReminder=async(enabled:boolean)=>{if(enabled&&"Notification" in window&&Notification.permission==="default")await Notification.requestPermission();await persistNotifications({...notificationPrefs,enabled});flash(enabled?"训练提醒已开启":"训练提醒已关闭")};
  const toggleReminderDay=(day:number)=>{const days=notificationPrefs.days.includes(day)?notificationPrefs.days.filter(x=>x!==day):[...notificationPrefs.days,day].sort();void persistNotifications({...notificationPrefs,days})};
  const updateEquipment=(value:string)=>{const next=equipment.includes(value)?equipment.filter(x=>x!==value):[...equipment,value];setEquipment(next);if(user)void saveProfileSettings(user.id,{equipment:next,reminderEnabled:reminder}).then(refreshSyncState).catch(()=>setCloudState("error"))};
  const saveReadiness=async(input:ReadinessInput,result:ReadinessRecommendation)=>{setIntensity(result.intensity);setAvoidAreas(input.soreAreas);if(!user){flash(`已采用${result.intensity}建议（演示模式）`);return}setCloudState("saving");try{await saveDailyReadiness(user.id,input,result);refreshSyncState();flash(input.soreAreas.length?`已避开：${input.soreAreas.join("、")}`:"今日训练已经自适应调整")}catch{setCloudState("error");flash("状态保存失败")}};
  const updatePreferences=async(next:AppPreferences,limits=healthLimitations)=>{setPreferences(next);setHealthLimitations(limits);if(user)try{await saveUserPreferences(user.id,{healthLimitations:limits,preferences:next})}catch{flash("偏好保存失败")}};
  const toggleUnit=()=>{const imperial=preferences.unit==="metric";setWeight(value=>(Number(value)*(imperial?2.20462:1/2.20462)).toFixed(1));setWaist(value=>(Number(value)*(imperial?1/2.54:2.54)).toFixed(1));void updatePreferences({...preferences,unit:imperial?"imperial":"metric"})};
  const toggleLimitation=(value:string)=>{const next=healthLimitations.includes(value)?healthLimitations.filter(x=>x!==value):[...healthLimitations,value];void updatePreferences(preferences,next)};
  const removeTodayLog=async()=>{const date=new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Kuala_Lumpur"}).format(new Date());setHistory(v=>v.filter(x=>x.date!==date));if(user)try{await deleteBodyLog(user.id,date);flash("今天的记录已删除")}catch{flash("删除失败")}};
  const retrySync=async()=>{if(!user)return;setCloudState("saving");const count=await flushSyncQueue(user.id);setPendingSync(count);setCloudState(count?"error":"synced");flash(count?"仍有项目等待网络":"同步完成")};
  const mergeDemoData=async()=>{if(!user)return;try{const saved=JSON.parse(localStorage.getItem("forma-demo-state-v1")??"{}");if(saved.weight&&saved.waist)await saveBodyAndProfile(user.id,{weight:Number(saved.weight),waist:Number(saved.waist),sleep:Number(saved.sleep)||7,water:Number(saved.water)||0,equipment:saved.equipment??equipment,reminderEnabled:saved.reminder??reminder});for(const item of saved.extras??[])await saveExtraActivity(user.id,item);localStorage.removeItem("forma-demo-state-v1");setMergePrompt(false);flash("本机体验记录已合并")}catch{flash("合并失败，请稍后重试")}};
  const editGoal=async()=>{const next=window.prompt("输入你的训练目标",goal)?.trim();if(!next)return;setGoal(next);if(user)try{await saveTrainingGoal(user.id,next);flash("训练目标已更新")}catch{flash("目标保存失败")}};
  const persistTrainingProfile=async(next:TrainingProfile)=>{setTrainingProfile(next);setEquipment(next.equipment.length?next.equipment:["徒手"]);setHealthLimitations(next.limitations);localStorage.setItem("forma-training-profile-v1",JSON.stringify(next));if(!user){flash("个性化计划已保存在本机");return}setCloudState("saving");try{await saveTrainingProfile(user.id,next);refreshSyncState();flash("专业训练计划已生成并同步")}catch{setCloudState("error");flash("计划已保存在本机，云端同步失败")}};

  useEffect(()=>{if(!workoutOpen||!preferences.keepAwake||!("wakeLock" in navigator))return;let lock:WakeLockSentinel|null=null;navigator.wakeLock.request("screen").then(value=>{lock=value}).catch(()=>undefined);return()=>{void lock?.release()}},[workoutOpen,preferences.keepAwake]);
  useEffect(()=>{if(seconds!==0||(!timer&&!workoutOpen))return;if(preferences.vibration&&"vibrate" in navigator)navigator.vibrate([180,80,180]);if(preferences.sound){try{const audio=new AudioContext();const oscillator=audio.createOscillator();oscillator.connect(audio.destination);oscillator.frequency.value=660;oscillator.start();oscillator.stop(audio.currentTime+.18)}catch{/* Audio feedback is optional. */}}},[seconds,timer,workoutOpen,preferences.sound,preferences.vibration]);
  const dayPlan=hour<10?{greeting:"早上好，",title:"先唤醒身体。",name:"8 分钟晨练",detail:"低冲击唤醒 · 5 个环节 · 无器械",action:startQuick}:hour<17?{greeting:"下午好，",title:"练一轮力量。",name:"全身力量 A",detail:"5 个动作 · 约 42 分钟 · 组间休息 45—75 秒",action:startWorkout}:hour<22?{greeting:"晚上好，",title:"今天练全身。",name:"全身力量 A",detail:"5 个动作 · 约 42 分钟 · 每组保留 2 次余力",action:startWorkout}:{greeting:"夜深了，",title:"做舒缓恢复。",name:"睡前恢复",detail:"呼吸与拉伸 · 8 分钟 · 不做高强度训练",action:startQuick};

  if(!authReady)return <main className="bootScreen"><span>FORMA°</span><i/></main>;
  if(!user&&!demoMode&&showLanding)return <LandingPage onEnterDemo={()=>setDemoMode(true)} onLogin={()=>setShowLanding(false)}/>;
  if(!user&&!demoMode)return <AuthPanel onContinueDemo={()=>setDemoMode(true)} onBack={()=>setShowLanding(true)}/>;

  return <main className="app">
    <aside className="rail"><span>FORMA / 12</span><i/><small>110.0 KG</small></aside>
    <header className="nav">
      <button className="wordmark">FORMA<span>°</span></button>
      <div className="navCenter"><b>W02</b><span>十二周重塑计划</span></div>
      <button className="cloudStatus" data-state={cloudState} data-pending={pendingSync>0} onClick={()=>void retrySync()} aria-label="重试数据同步"><i/>{user?(pendingSync?`已存本机 · ${pendingSync} 项待同步`:cloudState==="saving"?"同步中":cloudState==="error"?"点击重试":"云端已连接"):"本机保存"}</button>
      <button className="profile" onClick={()=>user?void supabase.auth.signOut():(setDemoMode(false),setShowLanding(false))} aria-label={user?"退出登录":"进入登录"}>{user?.email?.[0]?.toUpperCase()??"J"}</button>
    </header>

    <nav className="desktopTabs">{["训练","计划","记录","我的"].map(x=><button key={x} onClick={()=>setTab(x)} className={tab===x?"active":""}>{x}<span>↗</span></button>)}</nav>
    <div key={tab} className="pageTransition">

    {tab==="训练"&&<>
    <div className="kineticBand" aria-hidden="true"><div><span>上斜俯卧撑</span><i>●</i><span>椅子深蹲</span><i>●</i><span>弹力带划船</span><i>●</i><span>臀桥</span><i>●</i><span>平板支撑</span><i>●</i><span>上斜俯卧撑</span><i>●</i><span>椅子深蹲</span></div></div>

    <section className="dashboard">
      <div className="intro">
        <div className="date"><span>{todayInfo.short}</span><i>{todayInfo.weekday}</i></div>
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
        <div className="statRow"><span><small>连续训练</small><b>{String(streakDays).padStart(2,"0")} <i>天</i></b></span><span><small>本周训练</small><b>{String(weeklySessions).padStart(2,"0")} <i>次</i></b></span><span><small>累计训练</small><b>{completedSessions}<i>次</i></b></span></div>
      </div>
    </section>

    <section className="smartDeck">
      <article className="adaptCard"><div className="adaptIcon"><FormaIcon name="adaptive"/></div><div><p className="kicker">SMART ADAPTATION</p><h3>已按你的器材调整</h3><p>{equipment.join(" · ") || "徒手"} · 低冲击 · 约 42 分钟</p></div><button onClick={()=>setTab("我的")}>调整器材</button></article>
      <article className="quickCard"><div><span>08:00</span><p className="kicker">MORNING EXPRESS</p><h3>起床就练，唤醒全身</h3><p>深蹲 · 墙壁俯卧撑 · 原地快走 · 死虫式</p></div><button onClick={startQuick}>开始晨练 <b>→</b></button></article>
    </section>
    <section className="quickLaunch" aria-label="快捷训练"><button onClick={()=>workoutPaused?(setWorkoutPaused(false),setWorkoutOpen(true)):startWorkout()}><b>{workoutPaused?"继续未完成训练":"开始力量训练"}</b><span>{workoutPaused?`动作 ${activeExercise+1} · 第 ${setsCompleted+1} 组`:"完整计划 · 约 42 分钟"}</span></button><button onClick={startQuick}><b>10 分钟快速练</b><span>无器材 · 全身唤醒</span></button><button onClick={()=>{setIntensity("入门");startWorkout()}}><b>今天很累</b><span>自动切换恢复档</span></button></section>

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
              <img src={thumb} alt="" loading="lazy" decoding="async" width="640" height="430"/>
              <span className="mediaShade"/><span className="playIcon">▶</span><small>{x.provider} · 教学</small>
            </button>
            <div className="cardBody">
              <span className="index">{String(i+1).padStart(2,"0")}</span>
              <div className="name"><small>{x.en}</small><h3>{effectiveSwapped.includes(i)?lowImpactNames[i]:x.name}</h3><p>{autoSwapped.includes(i)?"根据不适部位自动替换":x.target}</p><button className="swap" onClick={()=>setSwapped(v=>v.includes(i)?v.filter(n=>n!==i):[...v,i])}>{effectiveSwapped.includes(i)?"恢复原动作":"替换动作"} ↻</button></div>
              <div className="dose"><small>训练量</small><b>{x.dose}</b></div>
              <button className="completeButton" onClick={()=>toggle(i)}>{complete?<><b>✓</b><span>已完成</span></>:<><b>+</b><span>完成</span></>}</button>
            </div>
          </article>
        })}
      </div>
      <div className="extraTraining"><div className="extraHead"><div><p className="kicker">EXTRA ACTIVITY</p><h2>计划之外，也算进步。</h2><p>记录你另外完成的运动，不会改变原训练计划。</p></div><button onClick={()=>setExtraOpen(true)}>＋ 添加额外训练</button></div>{extras.length>0&&<div className="extraList">{extras.map(x=><article key={x.id}><span>✓</span><div><b>{x.name}</b><small>{x.amount} · {x.effort}强度 · {x.time}</small></div><button aria-label={`删除${x.name}`} onClick={()=>void removeExtra(x.id)}>×</button></article>)}</div>}</div>
    </section>

    <section className="coach"><span>COACH NOTE</span><p>动作标准，比次数漂亮更重要。</p><small>关节疼痛不是训练效果；出现尖锐疼痛请立即停止。</small></section>
    </>}

    {tab==="计划"&&<section className="module planModule">
      <div className="moduleHero"><p className="kicker">PERSONAL TRAINING SYSTEM</p><h1>你的数据，<br/><strong>决定训练路线。</strong></h1><div className="moduleMeta"><span><small>当前位置</small><b>第 {String(currentWeek).padStart(2,"0")} 周</b></span><span><small>累计完成</small><b>{String(completedSessions).padStart(2,"0")} 次</b></span><span><small>本周完成</small><b>{weeklySessions} 次</b></span></div></div>
      <PersonalizedPlan value={trainingProfile} onSave={next=>void persistTrainingProfile(next)}/>
      {trainingProfile&&<><div className="phaseTitle"><p className="kicker">12-WEEK PROGRESSION</p><h2>四阶段周期路线</h2></div>
      <div className="phaseRail">
        {[{n:"01",title:"唤醒",sub:"建立动作模式",weeks:"01—02"},{n:"02",title:"推进",sub:"提高训练容量",weeks:"03—06"},{n:"03",title:"强化",sub:"力量与核心",weeks:"07—10"},{n:"04",title:"显形",sub:"巩固与减脂",weeks:"11—12"}].map((p,i)=><article key={p.n} className={i===phaseIndex?"current":i<phaseIndex?"completed":""}><span>{i<phaseIndex?"✓":p.n}</span><div><small>WEEK {p.weeks}</small><h2>{p.title}</h2><p>{p.sub}</p></div><i>{i<phaseIndex?"已完成":i===phaseIndex?"进行中":i===phaseIndex+1?"下一阶段":"未开始"}</i></article>)}
      </div>
      <div className="planProgress"><div><span><small>12 周总进度</small><b>{completedSessions} / 36 次</b></span><strong>{planProgress}%</strong></div><i><b style={{width:`${planProgress}%`}}/></i><div className="weekSteps">{Array.from({length:12},(_,i)=><span key={i} className={i+1<currentWeek?"done":i+1===currentWeek?"current":""}><b>{i+1}</b><small>{i+1===currentWeek?`${Math.min(weeklySessions,weeklyTarget)}/${weeklyTarget}`:"周"}</small></span>)}</div></div>
      </>}
    </section>}

    {tab==="记录"&&<section className="module recordModule">
      <div className="moduleHero compact"><p className="kicker">BODY LOG / PRIVATE</p><h1>变化，<br/><strong>正在发生。</strong></h1></div>
      <div className="recordGrid">
        <form className="checkin" onSubmit={e=>{e.preventDefault();void saveBodyLog()}}><span className="formNo">{todayInfo.short.replace("/"," / ")}</span><h2>今日身体打卡</h2><label>体重 <span><input value={weight} onChange={e=>setWeight(e.target.value)} inputMode="decimal"/> {preferences.unit==="metric"?"kg":"lb"}</span></label><label>腰围 <span><input value={waist} onChange={e=>setWaist(e.target.value)} inputMode="decimal"/> {preferences.unit==="metric"?"cm":"in"}</span></label><label>睡眠 <span><input value={sleep} onChange={e=>setSleep(e.target.value)} inputMode="decimal"/> 小时</span></label><div className="water"><small>今日饮水</small><div>{[1,2,3,4,5,6,7,8].map(n=><button type="button" aria-label={`${n}杯水`} className={n<=water?"filled":""} onClick={()=>setWater(n===water?n-1:n)} key={n}>●</button>)}</div><b>{water} / 8 杯</b></div><button className="saveRecord">{cloudState==="saving"?"正在同步…":"保存今日记录 →"}</button><button type="button" className="deleteRecord" onClick={()=>void removeTodayLog()}>删除今天的记录</button></form>
        <div className="trajectory"><div className="trajectoryHead"><span><small>起始体重</small><b>{weights[0]?.toFixed(1)??weight}</b></span><span><small>当前体重</small><b>{weight}</b></span><span className="delta">{weightDelta>0?"+":""}{weightDelta.toFixed(1)} kg</span></div><div className="chart" aria-label="最近八次体重变化图">{chartHeights.length?chartHeights.map((h,i)=><i key={recentHistory[i].date} style={{height:`${h}%`}} title={`${recentHistory[i].date}: ${recentHistory[i].weight} kg`}><span>{i+1}</span></i>):<p className="emptyChart">保存身体记录后显示趋势</p>}</div><div className="chartFoot"><span>{recentHistory[0]?.date??"暂无记录"}</span><b>体重趋势 / KG</b><span>{recentHistory.at(-1)?.date??"今天"}</span></div></div>
      </div>
      <div className="measurements"><article><small>腰围变化</small><b>{waistDelta>0?"+":""}{waistDelta.toFixed(1)} <i>cm</i></b><span>基于已保存记录</span></article><article><small>累计训练</small><b>{completedSessions} <i>次</i></b><span>12 周目标 36 次</span></article><article><small>连续训练</small><b>{streakDays} <i>天</i></b><span>来自训练完成记录</span></article></div>
      <div className="historyPanel"><div><p className="kicker">SESSION ARCHIVE</p><h2>训练历史</h2></div>{sessions.length?sessions.map(item=><button key={item.id} onClick={()=>setSelectedSession(item)}><span><b>{new Date(item.completedAt).toLocaleDateString("zh-CN")}</b><small>{item.intensity} · {Math.round(item.duration/60)} 分钟</small></span><em>{item.exercises.length} 个动作 →</em></button>):<p>完成第一次训练后，这里会出现详细记录。</p>}</div>
    </section>}

    {tab==="我的"&&<section className="module profileModule">
      <div className="identity"><div className="identityMark">J</div><p className="kicker">ATHLETE PROFILE / 001</p><h1>为更轻、更强的<br/><strong>自己训练。</strong></h1><div className="identityData"><span>193 <small>CM</small></span><span>{weight} <small>KG</small></span><span>29.5 <small>BMI</small></span></div></div>
      <div className="settings">
        <article><div><small>个性化训练档案</small><h3>{trainingProfile?`${trainingProfile.gender==="male"?"男":trainingProfile.gender==="female"?"女":"未限定"} · 每周 ${trainingProfile.daysPerWeek} 练 · ${trainingProfile.minutesPerSession} 分钟`:"尚未完成评估"}</h3><p>包含目标身材、经验、时间与身体信息</p></div><button onClick={()=>setTab("计划")}>{trainingProfile?"查看计划":"开始评估"} ↗</button></article>
        <article><div><small>训练目标</small><h3>{goal}</h3><p>计划会围绕这个目标调整</p></div><button onClick={()=>void editGoal()}>编辑 ↗</button></article>
        <article className="scheduleSetting"><div><small>训练提醒</small><h3>按你的时间安排</h3><div className="scheduleDays">{[[1,"一"],[2,"二"],[3,"三"],[4,"四"],[5,"五"],[6,"六"],[0,"日"]].map(([day,label])=><button key={day} className={notificationPrefs.days.includes(Number(day))?"selected":""} onClick={()=>toggleReminderDay(Number(day))}>{label}</button>)}</div><label>训练时间 <input type="time" value={notificationPrefs.time} onChange={e=>void persistNotifications({...notificationPrefs,time:e.target.value})}/></label></div><button className={`switch ${reminder?"on":""}`} aria-label="切换训练提醒" onClick={()=>void updateReminder(!reminder)}><i/></button></article>
        <article className="equipmentSetting"><div><small>可用器材</small><h3>训练会优先使用已选器材</h3></div><div>{["徒手","弹力带","哑铃","健身房"].map(x=><button onClick={()=>updateEquipment(x)} className={equipment.includes(x)?"selected":""} key={x}>{x}</button>)}</div></article>
        <article className="equipmentSetting"><div><small>健康限制</small><h3>自动替换相关动作</h3></div><div>{["肩部不适","腰部不适","膝部不适","脚踝不适"].map(x=><button onClick={()=>toggleLimitation(x)} className={healthLimitations.includes(x)?"selected":""} key={x}>{x}</button>)}</div></article>
        <article><div><small>计量单位</small><h3>{preferences.unit==="metric"?"公斤 · 厘米":"磅 · 英寸"}</h3><p>切换后自动换算现有输入</p></div><button onClick={toggleUnit}>切换单位</button></article>
        <article><div><small>训练屏幕</small><h3>训练时保持屏幕常亮</h3></div><button className={`switch ${preferences.keepAwake?"on":""}`} onClick={()=>void updatePreferences({...preferences,keepAwake:!preferences.keepAwake})}><i/></button></article>
        <article><div><small>计时反馈</small><h3>提示音与震动</h3><p>{preferences.sound?"声音开启":"声音关闭"} · {preferences.vibration?"震动开启":"震动关闭"}</p></div><div className="preferenceButtons"><button onClick={()=>void updatePreferences({...preferences,sound:!preferences.sound})}>声音</button><button onClick={()=>void updatePreferences({...preferences,vibration:!preferences.vibration})}>震动</button></div></article>
      </div>
    </section>}
    </div>

    <nav className="mobileNav" data-index={["训练","计划","记录","我的"].indexOf(tab)} aria-label="主要导航">{["训练","计划","记录","我的"].map((x,i)=><button key={x} aria-current={tab===x?"page":undefined} onClick={()=>setTab(x)} className={tab===x?"active":""}><b><FormaIcon name={(["training","plan","record","profile"] as const)[i]}/></b><span>{x}</span></button>)}</nav>
    {notice&&<div className="toast">{notice}<span>✓</span></div>}

    {feedback&&<div className="feedback"><div><p className="kicker">SESSION COMPLETE</p><h3>今天的强度怎么样？</h3></div>{["太轻松","正合适","太难"].map(x=><button className={feedback===x?"active":""} onClick={()=>void chooseFeedback(x)} key={x}>{x}</button>)}<button className="feedbackClose" onClick={()=>setFeedback("")}>×</button></div>}

    {exitConfirm&&<div className="decisionOverlay" role="dialog" aria-modal="true"><div className="decisionCard"><p className="kicker">SESSION IN PROGRESS</p><h2>训练还没有结束。</h2><p>进度已经保存在本机，你可以稍后继续。</p><button onClick={()=>{setExitConfirm(false);setWorkoutPaused(true);setWorkoutOpen(false)}}>暂停并稍后继续</button><button className="danger" onClick={()=>{setExitConfirm(false);setWorkoutPaused(false);setWorkoutOpen(false);setTimer(false);setDone([]);setPerformance({});localStorage.removeItem("forma-active-workout-v1")}}>放弃本次训练</button><button className="quiet" onClick={()=>setExitConfirm(false)}>继续训练</button></div></div>}

    {showSummary&&<div className="decisionOverlay" role="dialog" aria-modal="true"><div className="summaryCard"><p className="kicker">SESSION COMPLETE</p><h2>今天完成得很好。</h2><div className="summaryStats"><span><b>{Math.max(1,Math.round((Date.now()-sessionStartedAt)/60000))}</b><small>分钟</small></span><span><b>{done.length||activeExercises.length}</b><small>动作</small></span><span><b>{activeExercises.reduce((sum,x)=>sum+x.sets,0)}</b><small>组</small></span></div><div className="summaryExercises">{activeExercises.map((x,i)=><span key={x.name}><b>{effectiveSwapped.includes(i)?lowImpactNames[i]:x.name}</b><small>{performance[i]?.weight?`${performance[i].weight} ${preferences.unit==="metric"?"kg":"lb"} · `:""}{performance[i]?.reps?`${performance[i].reps} 次`:`${x.sets} 组`}</small></span>)}</div><div className="summaryFeedback">{["太轻松","正合适","太难"].map(x=><button className={feedback===x?"active":""} onClick={()=>void chooseFeedback(x)} key={x}>{x}</button>)}</div><button className="summaryDone" onClick={()=>{setShowSummary(false);setFeedback("")}}>完成并返回</button></div></div>}

    {selectedSession&&<div className="decisionOverlay" role="dialog" aria-modal="true"><div className="historyDetail"><button className="detailClose" onClick={()=>setSelectedSession(null)}>×</button><p className="kicker">SESSION DETAIL</p><h2>{new Date(selectedSession.completedAt).toLocaleDateString("zh-CN")}</h2><p>{selectedSession.intensity} · {Math.round(selectedSession.duration/60)} 分钟 · {selectedSession.difficulty??"未评价"}</p>{selectedSession.exercises.map(item=><article key={item.name}><span><b>{item.name}</b><small>{item.sets} 组 · {item.dose}</small></span><em>{item.weightKg?`${item.weightKg} kg · `:""}{item.actualReps?`${item.actualReps} 次`:""}{item.rir!==undefined?` · RIR ${item.rir}`:""}</em></article>)}</div></div>}

    {mergePrompt&&<div className="decisionOverlay" role="dialog" aria-modal="true"><div className="decisionCard"><p className="kicker">LOCAL DATA FOUND</p><h2>合并体验记录？</h2><p>登录前保存在本机的身体数据和额外训练可以合并到云端。</p><button onClick={()=>void mergeDemoData()}>合并到当前账号</button><button className="quiet" onClick={()=>{localStorage.removeItem("forma-demo-state-v1");setMergePrompt(false)}}>忽略并清除</button></div></div>}

    {extraOpen&&<div className="extraOverlay" role="dialog" aria-modal="true"><form className="extraSheet" onSubmit={e=>{e.preventDefault();addExtra()}}><div className="extraTop"><div><p className="kicker">MANUAL LOG</p><h2>添加额外训练</h2></div><button type="button" onClick={()=>setExtraOpen(false)}>×</button></div><label>运动项目<input autoFocus value={extraName} onChange={e=>setExtraName(e.target.value)} placeholder="例如：快走、游泳、骑车"/></label><div className="extraPresets">{["快走","骑车","游泳","爬楼梯","额外力量"].map(x=><button type="button" className={extraName===x?"active":""} onClick={()=>setExtraName(x)} key={x}>{x}</button>)}</div><label>完成量<input value={extraAmount} onChange={e=>setExtraAmount(e.target.value)} placeholder="例如：30 分钟或 3组 × 12次"/></label><div className="effortPick"><small>体感强度</small>{["轻松","适中","吃力"].map(x=><button type="button" className={extraEffort===x?"active":""} onClick={()=>setExtraEffort(x)} key={x}>{x}</button>)}</div><button className="saveExtra">保存到今天 <b>→</b></button></form></div>}

    {workoutOpen&&<div className="workoutOverlay" role="dialog" aria-modal="true"><div className="workoutSheet">
      <div className="workoutTop"><div><p className="kicker">{intensity}训练 · 动作 {activeExercise+1}/{activeExercises.length}</p><h2>专注这一组。</h2></div><span className="sessionClock"><small>训练用时</small><b>{elapsedClock}</b></span><button onClick={()=>setExitConfirm(true)} aria-label="暂停或退出训练">×</button></div>
      <div className="workoutProgress"><i style={{width:`${((activeExercise+setsCompleted/activeExercises[activeExercise].sets)/activeExercises.length)*100}%`}}/></div>
      <div className="workoutMetrics"><span><small>当前组</small><b>{setsCompleted+1} / {activeExercises[activeExercise].sets}</b></span><span><small>目标训练量</small><b>{activeExercises[activeExercise].dose}</b></span><span><small>组间休息</small><b>{activeExercises[activeExercise].rest} 秒</b></span></div>
      <button className="workoutMedia" onClick={()=>setGuide(activeExercise)}><img src={`https://i.ytimg.com/vi/${activeExercises[activeExercise].videoId}/hqdefault.jpg`} alt="" decoding="async" width="640" height="390"/><span>▶ 查看动作基础教学</span></button>
      <div className="workoutInfo"><small>{activeExercises[activeExercise].target}</small><h3>{effectiveSwapped.includes(activeExercise)?lowImpactNames[activeExercise]:activeExercises[activeExercise].name}</h3>{autoSwapped.includes(activeExercise)&&<p className="swapReason">因你的不适部位，已自动换成低负担动作。</p>}<p>{activeExercises[activeExercise].cue}</p><div className="setDots">{Array.from({length:activeExercises[activeExercise].sets},(_,i)=><span className={i<setsCompleted?"done":i===setsCompleted?"current":""} key={i}>{i<setsCompleted?"✓":i+1}<small>第{i+1}组</small></span>)}</div><div className="performanceInputs"><label>实际次数<input inputMode="numeric" value={performance[activeExercise]?.reps??""} onChange={e=>setPerformance(v=>({...v,[activeExercise]:{reps:e.target.value,weight:v[activeExercise]?.weight??"",rir:v[activeExercise]?.rir??""}}))}/></label><label>重量 {preferences.unit==="metric"?"kg":"lb"}<input inputMode="decimal" value={performance[activeExercise]?.weight??""} onChange={e=>setPerformance(v=>({...v,[activeExercise]:{reps:v[activeExercise]?.reps??"",weight:e.target.value,rir:v[activeExercise]?.rir??""}}))}/></label><label>余力 RIR<input inputMode="numeric" value={performance[activeExercise]?.rir??""} onChange={e=>setPerformance(v=>({...v,[activeExercise]:{reps:v[activeExercise]?.reps??"",weight:v[activeExercise]?.weight??"",rir:e.target.value}}))}/></label></div><div className="lastResult"><span>本档训练量</span><b>{activeExercises[activeExercise].dose} · 休息 {activeExercises[activeExercise].rest} 秒</b></div><div className="workoutActions"><button onClick={previousSet} disabled={activeExercise===0&&setsCompleted===0}>← 上一步</button><button onClick={skipExercise}>跳过动作</button></div><button className="finishSet" onClick={finishSet}>完成第 {setsCompleted+1} 组 <b>→</b></button></div>
      {timer&&timerMode==="rest"&&<div className="inlineRest"><p className="kicker">{setsCompleted>0?`休息中 · 第 ${setsCompleted} 组已完成`:"动作间休息"}</p><strong>{clock}</strong><span>放松肩膀，保持缓慢呼吸</span><div className="restBar"><i style={{width:`${Math.max(0,100-seconds/restTotal*100)}%`}}/></div><div className="restAdjust"><button onClick={()=>adjustTimer(-15)}>−15 秒</button><button className="restPause" onClick={toggleTimer}>{running?"暂停":"继续"}</button><button onClick={()=>adjustTimer(15)}>+15 秒</button></div><div className="nextUp"><small>接下来</small><b>{`${effectiveSwapped.includes(activeExercise)?lowImpactNames[activeExercise]:activeExercises[activeExercise].name} · 第 ${setsCompleted+1} 组`}</b></div><button className="skipRest" onClick={()=>{setTimer(false);setRunning(false);setTimerDeadline(null)}}>结束休息，继续训练 →</button></div>}
    </div></div>}

    {guide!==null&&<div className="modal" role="dialog" aria-modal="true">
      <div className="viewer">
        <button className="close" onClick={()=>setGuide(null)}>×</button>
        <div className="videoFrame">
          {exercises[guide].videoId?<iframe loading="lazy" src={`https://www.youtube-nocookie.com/embed/${exercises[guide].videoId}?rel=0&playsinline=1`} title={`${exercises[guide].name}教学视频`} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen/>:<iframe loading="lazy" src={exercises[guide].source} title={`${exercises[guide].name}专家教学`}/>}
        </div>
        <div className="viewerInfo"><p className="kicker">{exercises[guide].provider} / FORM GUIDE</p><h2>{exercises[guide].name}</h2><div className="cueGrid"><span><small>正确提示</small><p>{exercises[guide].cue}</p></span><span><small>避免错误</small><p>{exercises[guide].avoid}</p></span></div><button onClick={()=>{const r=exercises[guide].rest;setGuide(null);beginRest(r)}}>我看懂了，开始训练 <b>→</b></button></div>
      </div>
    </div>}

    {timer&&!(workoutOpen&&timerMode==="rest")&&<div className={`timer ${timerMode==="quick"?"quickTimer":""}`} role="dialog" aria-modal="true"><button className="close" onClick={()=>{setTimer(false);setRunning(false);setTimerDeadline(null)}}>×</button><p className="kicker">{timerMode==="quick"?`MORNING EXPRESS / ${safeQuickIndex+1} OF ${quickStages.length}`:"RECOVERY / BREATHE"}</p><h2>{timerMode==="quick"?quickStages[safeQuickIndex].name:"恢复呼吸"}</h2>{timerMode==="quick"&&<><p className="stageDetail">{quickStages[safeQuickIndex].detail}</p><div className="quickTimeline">{quickStages.map((s,i)=><span className={i<safeQuickIndex?"done":i===safeQuickIndex?"active":""} key={s.name}><i/>{s.name}<small>{s.duration/60}分钟</small></span>)}</div></>}<button className={`clock ${running?"live":""}`} onClick={toggleTimer}><strong>{clock}</strong><span>{seconds===0?timerMode==="quick"?"晨练完成":"可以开始下一组":running?"轻触暂停":"轻触继续"}</span></button><div className="adjust"><button onClick={()=>adjustTimer(-15)}>−15秒</button><button className="next" onClick={()=>{setTimer(false);setRunning(false);setTimerDeadline(null);if(timerMode==="quick")void finishQuick()}}>{timerMode==="quick"?"完成晨练":"下一组"} →</button><button onClick={()=>adjustTimer(15)}>+15秒</button></div></div>}
  </main>
}
