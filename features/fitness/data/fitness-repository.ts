import { supabase } from "../../../infrastructure/supabase/client";
import type { ReadinessInput, ReadinessRecommendation } from "../domain/adaptive-training";

export type BodyHistoryPoint = { date:string; weight:number; waist?:number };
export type NotificationPreference = { enabled:boolean; days:number[]; time:string; advanceMinutes:number };
export type AppPreferences = { unit:"metric"|"imperial"; keepAwake:boolean; sound:boolean; vibration:boolean };
export type SessionHistory = { id:string; completedAt:string; intensity:string; difficulty?:string; duration:number; exercises:Array<{name:string;sets:number;dose:string;actualReps?:number;weightKg?:number;rir?:number}> };
export type DashboardSnapshot = {
  weight?: number;
  waist?: number;
  sleep?: number;
  water?: number;
  equipment?: string[];
  reminderEnabled?: boolean;
  activities: Array<{ id:string; name:string; amount:string; effort:string; time:string }>;
  history: BodyHistoryPoint[];
  completedSessions: number;
  weeklySessions: number;
  streakDays: number;
  currentWeek: number;
  completedToday: boolean;
  readiness?: { input:ReadinessInput; result:ReadinessRecommendation };
  notifications: NotificationPreference;
  recommendedIntensity?: "入门"|"进阶"|"强化";
  sessions: SessionHistory[];
  healthLimitations: string[];
  preferences: AppPreferences;
  goal?: string;
};

type CompletedExercise = { name:string; sets:number; dose:string; rest:number; actualReps?:number; weightKg?:number; rir?:number };

const localDate = (value:Date|string=new Date()) => {
  const date=typeof value==="string"?new Date(value):value;
  return new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Kuala_Lumpur",year:"numeric",month:"2-digit",day:"2-digit"}).format(date);
};

function calculateStreak(dates:string[]) {
  const unique=[...new Set(dates)].sort().reverse();
  if(!unique.length)return 0;
  let cursor=new Date(`${localDate()}T00:00:00+08:00`);
  const latest=new Date(`${unique[0]}T00:00:00+08:00`);
  const gap=Math.round((cursor.getTime()-latest.getTime())/86400000);
  if(gap>1)return 0;
  cursor=latest;
  let streak=0;
  for(const day of unique){
    if(day!==localDate(cursor))break;
    streak++;
    cursor=new Date(cursor.getTime()-86400000);
  }
  return streak;
}

export async function loadDashboard(userId: string): Promise<DashboardSnapshot> {
  const today=localDate();
  const weekStart=new Date(`${today}T00:00:00+08:00`);
  weekStart.setDate(weekStart.getDate()-((weekStart.getDay()+6)%7));
  const [{data:profile,error:profileError},{data:body,error:bodyError},{data:activities,error:activitiesError},{data:history,error:historyError},{data:sessions,error:sessionsError},{data:progress,error:progressError},{data:checkin,error:checkinError},{data:notifications,error:notificationError}] = await Promise.all([
    supabase.from("profiles").select("current_weight_kg,equipment,reminder_enabled,health_limitations,preferences,goal").eq("id",userId).maybeSingle(),
    supabase.from("body_logs").select("weight_kg,waist_cm,sleep_hours,water_cups").eq("user_id",userId).eq("logged_on",today).maybeSingle(),
    supabase.from("extra_activities").select("id,activity_name,amount,effort,completed_at").eq("user_id",userId).order("completed_at",{ascending:false}).limit(20),
    supabase.from("body_logs").select("logged_on,weight_kg,waist_cm").eq("user_id",userId).not("weight_kg","is",null).order("logged_on",{ascending:true}).limit(56),
    supabase.from("workout_sessions").select("id,completed_at,difficulty,intensity,duration_seconds,exercise_logs(exercise_name,sets_completed,dose,actual_reps,weight_kg,rir)").eq("user_id",userId).order("completed_at",{ascending:false}).limit(40),
    supabase.from("user_plan_progress").select("current_week,completed_sessions,streak_days").eq("user_id",userId).maybeSingle(),
    supabase.from("daily_checkins").select("sleep_hours,energy,soreness,mood,available_minutes,sore_areas,recommendation").eq("user_id",userId).eq("checked_on",today).maybeSingle(),
    supabase.from("notification_preferences").select("enabled,training_days,training_time,advance_minutes").eq("user_id",userId).maybeSingle(),
  ]);
  const error=profileError??bodyError??activitiesError??historyError??sessionsError??progressError??checkinError??notificationError;
  if(error)throw error;
  const sessionDates=(sessions??[]).map(item=>localDate(item.completed_at));
  const derivedStreak=calculateStreak(sessionDates);
  const recommendation=checkin?.recommendation as ReadinessRecommendation|undefined;
  const lastSession=sessions?.[0];
  const levels=["入门","进阶","强化"] as const;
  const lastLevel=Math.max(0,levels.indexOf(lastSession?.intensity as typeof levels[number]));
  const daysSinceLast=lastSession?Math.floor((Date.now()-new Date(lastSession.completed_at).getTime())/86400000):0;
  const recommendedLevel=daysSinceLast>=14?Math.max(0,lastLevel-1):lastSession?.difficulty==="太难"?Math.max(0,lastLevel-1):lastSession?.difficulty==="太轻松"?Math.min(2,lastLevel+1):lastLevel;
  return {
    weight:body?.weight_kg??profile?.current_weight_kg??undefined,
    waist:body?.waist_cm??undefined,
    sleep:body?.sleep_hours??undefined,
    water:body?.water_cups??undefined,
    equipment:profile?.equipment??undefined,
    reminderEnabled:notifications?.enabled??profile?.reminder_enabled??undefined,
    activities:(activities??[]).map(item=>({id:item.id,name:item.activity_name,amount:item.amount,effort:item.effort,time:new Date(item.completed_at).toLocaleTimeString("zh-CN",{hour:"2-digit",minute:"2-digit"})})),
    history:(history??[]).map(item=>({date:item.logged_on,weight:Number(item.weight_kg),waist:item.waist_cm==null?undefined:Number(item.waist_cm)})),
    completedSessions:progress?.completed_sessions??sessions?.length??0,
    weeklySessions:(sessions??[]).filter(item=>new Date(item.completed_at)>=weekStart).length,
    streakDays:progress?.streak_days??derivedStreak,
    currentWeek:progress?.current_week??1,
    completedToday:sessionDates.includes(today),
    readiness:checkin&&recommendation?{input:{sleepHours:Number(checkin.sleep_hours),energy:checkin.energy,soreness:checkin.soreness,mood:checkin.mood,availableMinutes:checkin.available_minutes,soreAreas:checkin.sore_areas??[]},result:recommendation}:undefined,
    notifications:{enabled:notifications?.enabled??true,days:notifications?.training_days??[1,3,5],time:(notifications?.training_time??"19:30").slice(0,5),advanceMinutes:notifications?.advance_minutes??30},
    recommendedIntensity:lastSession?levels[recommendedLevel]:undefined,
    sessions:(sessions??[]).map(item=>({id:item.id,completedAt:item.completed_at,intensity:item.intensity,difficulty:item.difficulty??undefined,duration:item.duration_seconds,exercises:(item.exercise_logs??[]).map(log=>({name:log.exercise_name,sets:log.sets_completed,dose:log.dose,actualReps:log.actual_reps??undefined,weightKg:log.weight_kg==null?undefined:Number(log.weight_kg),rir:log.rir??undefined}))})),
    healthLimitations:profile?.health_limitations??[],
    preferences:{unit:"metric",keepAwake:true,sound:true,vibration:true,...(profile?.preferences as Partial<AppPreferences>|null)},
    goal:profile?.goal??undefined,
  };
}

export async function saveCompletedWorkout(userId:string,intensity:string,exercises:CompletedExercise[]) {
  const duration=exercises.reduce((sum,item)=>sum+item.sets*45+item.rest*(item.sets-1),0);
  if(typeof navigator!=="undefined"&&!navigator.onLine)return enqueueSync({kind:"workout",userId,payload:{intensity,duration,exercises,difficulty:"正合适",completedOn:localDate()}});
  const {data,error}=await supabase.rpc("complete_workout",{p_intensity:intensity,p_duration_seconds:duration,p_exercises:exercises.map(item=>({name:item.name,sets:item.sets,dose:item.dose,actual_reps:item.actualReps,weight_kg:item.weightKg,rir:item.rir})),p_difficulty:"正合适",p_completed_on:localDate()});
  if(error||!data)throw error??new Error("Workout session was not created");
  return data as string;
}

export async function updateWorkoutFeedback(userId:string,sessionId:string,difficulty:string) {
  if(sessionId.startsWith("offline-")){updateQueuedWorkout(sessionId,difficulty);return}
  if(typeof navigator!=="undefined"&&!navigator.onLine){enqueueSync({kind:"feedback",userId,payload:{sessionId,difficulty}});return}
  const {error}=await supabase.from("workout_sessions").update({difficulty}).eq("id",sessionId).eq("user_id",userId);
  if(error)throw error;
}

export async function saveExtraActivity(userId:string,item:{name:string;amount:string;effort:string}) {
  if(typeof navigator!=="undefined"&&!navigator.onLine){const id=enqueueSync({kind:"extra",userId,payload:item});return {id,completed_at:new Date().toISOString()}}
  const {data,error}=await supabase.from("extra_activities").insert({user_id:userId,activity_name:item.name,amount:item.amount,effort:item.effort}).select("id,completed_at").single();
  if(error)throw error;
  return data;
}

export async function deleteExtraActivity(userId:string,id:string) {
  if(id.startsWith("offline-")){removeQueued(id);return}
  if(typeof navigator!=="undefined"&&!navigator.onLine){enqueueSync({kind:"delete-extra",userId,payload:{id}});return}
  const {error}=await supabase.from("extra_activities").delete().eq("id",id).eq("user_id",userId);
  if(error)throw error;
}

export async function saveBodyAndProfile(userId:string,input:{weight:number;waist:number;sleep:number;water:number;equipment:string[];reminderEnabled:boolean}) {
  if(typeof navigator!=="undefined"&&!navigator.onLine){enqueueSync({kind:"body",userId,payload:input});return}
  const {error}=await supabase.from("body_logs").upsert({user_id:userId,logged_on:localDate(),weight_kg:input.weight,waist_cm:input.waist,sleep_hours:input.sleep,water_cups:input.water},{onConflict:"user_id,logged_on"});
  if(error)throw error;
  const {error:profileError}=await supabase.from("profiles").update({current_weight_kg:input.weight,equipment:input.equipment,reminder_enabled:input.reminderEnabled}).eq("id",userId);
  if(profileError)throw profileError;
}

export async function saveProfileSettings(userId:string,input:{equipment:string[];reminderEnabled:boolean}) {
  if(typeof navigator!=="undefined"&&!navigator.onLine){enqueueSync({kind:"settings",userId,payload:input});return}
  const {error}=await supabase.from("profiles").update({equipment:input.equipment,reminder_enabled:input.reminderEnabled}).eq("id",userId);
  if(error)throw error;
}

export async function saveUserPreferences(userId:string,input:{healthLimitations:string[];preferences:AppPreferences}) {
  const {error}=await supabase.from("profiles").update({health_limitations:input.healthLimitations,preferences:input.preferences}).eq("id",userId);
  if(error)throw error;
}

export async function saveTrainingGoal(userId:string,goal:string) {
  const {error}=await supabase.from("profiles").update({goal}).eq("id",userId);
  if(error)throw error;
}

export async function deleteBodyLog(userId:string,date:string) {
  const {error}=await supabase.from("body_logs").delete().eq("user_id",userId).eq("logged_on",date);
  if(error)throw error;
}

export async function saveNotificationPreferences(userId:string,input:NotificationPreference) {
  if(typeof navigator!=="undefined"&&!navigator.onLine){enqueueSync({kind:"notifications",userId,payload:input});return}
  const {error}=await supabase.from("notification_preferences").upsert({user_id:userId,enabled:input.enabled,training_days:input.days,training_time:input.time,advance_minutes:input.advanceMinutes},{onConflict:"user_id"});
  if(error)throw error;
}

export async function saveDailyReadiness(userId:string,input:ReadinessInput,result:ReadinessRecommendation) {
  if(typeof navigator!=="undefined"&&!navigator.onLine){enqueueSync({kind:"readiness",userId,payload:{input,result}});return}
  const {error}=await supabase.from("daily_checkins").upsert({user_id:userId,checked_on:localDate(),sleep_hours:input.sleepHours,energy:input.energy,soreness:input.soreness,mood:input.mood,available_minutes:input.availableMinutes,sore_areas:input.soreAreas,readiness_score:result.score,recommendation:result},{onConflict:"user_id,checked_on"});
  if(error)throw error;
}

type SyncOperation = { id:string; kind:"workout"|"feedback"|"extra"|"delete-extra"|"body"|"settings"|"notifications"|"readiness"; userId:string; payload:unknown };
const queueKey="forma-sync-queue-v1";
const readQueue=():SyncOperation[]=>{try{return JSON.parse(localStorage.getItem(queueKey)??"[]")}catch{return[]}};
const writeQueue=(queue:SyncOperation[])=>localStorage.setItem(queueKey,JSON.stringify(queue));
function enqueueSync(operation:Omit<SyncOperation,"id">){const id=`offline-${crypto.randomUUID()}`;writeQueue([...readQueue(),{...operation,id}]);return id}
function removeQueued(id:string){writeQueue(readQueue().filter(item=>item.id!==id))}
function updateQueuedWorkout(id:string,difficulty:string){writeQueue(readQueue().map(item=>item.id===id&&item.kind==="workout"?{...item,payload:{...(item.payload as object),difficulty}}:item))}

export function pendingSyncCount(){return typeof localStorage==="undefined"?0:readQueue().length}

export async function flushSyncQueue(userId:string){
  if(typeof navigator==="undefined"||!navigator.onLine)return pendingSyncCount();
  const queue=readQueue();
  for(const operation of queue.filter(item=>item.userId===userId)){
    try{
      const p=operation.payload as Record<string, unknown>;
      if(operation.kind==="workout"){
        const queuedExercises=p.exercises as CompletedExercise[];
        const {error}=await supabase.rpc("complete_workout",{p_intensity:p.intensity as string,p_duration_seconds:p.duration as number,p_exercises:queuedExercises.map(item=>({name:item.name,sets:item.sets,dose:item.dose,actual_reps:item.actualReps,weight_kg:item.weightKg,rir:item.rir})),p_difficulty:p.difficulty as string,p_completed_on:p.completedOn as string});if(error)throw error;
      }else if(operation.kind==="feedback"){const {error}=await supabase.from("workout_sessions").update({difficulty:p.difficulty}).eq("id",p.sessionId).eq("user_id",userId);if(error)throw error;
      }else if(operation.kind==="extra"){const {error}=await supabase.from("extra_activities").insert({user_id:userId,activity_name:p.name,amount:p.amount,effort:p.effort});if(error)throw error;
      }else if(operation.kind==="delete-extra"){const {error}=await supabase.from("extra_activities").delete().eq("id",p.id).eq("user_id",userId);if(error)throw error;
      }else if(operation.kind==="body"){await saveBodyAndProfile(userId,p as Parameters<typeof saveBodyAndProfile>[1]);
      }else if(operation.kind==="settings"){await saveProfileSettings(userId,p as Parameters<typeof saveProfileSettings>[1]);
      }else if(operation.kind==="notifications"){await saveNotificationPreferences(userId,p as NotificationPreference);
      }else if(operation.kind==="readiness"){await saveDailyReadiness(userId,p.input as ReadinessInput,p.result as ReadinessRecommendation)}
      removeQueued(operation.id);
    }catch{break}
  }
  return pendingSyncCount();
}
