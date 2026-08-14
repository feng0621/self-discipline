import { supabase } from "../../../infrastructure/supabase/client";
import type { ReadinessInput, ReadinessRecommendation } from "../domain/adaptive-training";

export type DashboardSnapshot = {
  weight?: number;
  waist?: number;
  sleep?: number;
  water?: number;
  equipment?: string[];
  reminderEnabled?: boolean;
  activities: Array<{ id:number; name:string; amount:string; effort:string; time:string }>;
};

type CompletedExercise = { name:string; sets:number; dose:string; rest:number };

const today = () => new Date().toISOString().slice(0, 10);

export async function loadDashboard(userId: string): Promise<DashboardSnapshot> {
  const [{data:profile,error:profileError},{data:body,error:bodyError},{data:activities,error:activitiesError}] = await Promise.all([
    supabase.from("profiles").select("current_weight_kg,equipment,reminder_enabled").eq("id",userId).maybeSingle(),
    supabase.from("body_logs").select("weight_kg,waist_cm,sleep_hours,water_cups").eq("user_id",userId).eq("logged_on",today()).maybeSingle(),
    supabase.from("extra_activities").select("activity_name,amount,effort,completed_at").eq("user_id",userId).order("completed_at",{ascending:false}).limit(8),
  ]);
  const error=profileError??bodyError??activitiesError;
  if(error)throw error;
  return {
    weight:body?.weight_kg??profile?.current_weight_kg??undefined,
    waist:body?.waist_cm??undefined,
    sleep:body?.sleep_hours??undefined,
    water:body?.water_cups??undefined,
    equipment:profile?.equipment??undefined,
    reminderEnabled:profile?.reminder_enabled??undefined,
    activities:(activities??[]).map((item,index)=>({id:index+1,name:item.activity_name,amount:item.amount,effort:item.effort,time:new Date(item.completed_at).toLocaleTimeString("zh-CN",{hour:"2-digit",minute:"2-digit"})})),
  };
}

export async function saveCompletedWorkout(userId:string,intensity:string,exercises:CompletedExercise[]) {
  const duration=exercises.reduce((sum,item)=>sum+item.sets*45+item.rest*(item.sets-1),0);
  const {data:session,error}=await supabase.from("workout_sessions").insert({user_id:userId,intensity,duration_seconds:duration,difficulty:"正合适"}).select("id").single();
  if(error||!session)throw error??new Error("Workout session was not created");
  const {error:exerciseError}=await supabase.from("exercise_logs").insert(exercises.map(item=>({session_id:session.id,exercise_name:item.name,sets_completed:item.sets,dose:item.dose})));
  if(exerciseError)throw exerciseError;
}

export async function saveExtraActivity(userId:string,item:{name:string;amount:string;effort:string}) {
  const {error}=await supabase.from("extra_activities").insert({user_id:userId,activity_name:item.name,amount:item.amount,effort:item.effort});
  if(error)throw error;
}

export async function saveBodyAndProfile(userId:string,input:{weight:number;waist:number;sleep:number;water:number;equipment:string[];reminderEnabled:boolean}) {
  const {error}=await supabase.from("body_logs").upsert({user_id:userId,logged_on:today(),weight_kg:input.weight,waist_cm:input.waist,sleep_hours:input.sleep,water_cups:input.water},{onConflict:"user_id,logged_on"});
  if(error)throw error;
  const {error:profileError}=await supabase.from("profiles").update({current_weight_kg:input.weight,equipment:input.equipment,reminder_enabled:input.reminderEnabled}).eq("id",userId);
  if(profileError)throw profileError;
}

export async function saveDailyReadiness(userId:string,input:ReadinessInput,result:ReadinessRecommendation) {
  const {error}=await supabase.from("daily_checkins").upsert({user_id:userId,checked_on:today(),sleep_hours:input.sleepHours,energy:input.energy,soreness:input.soreness,mood:input.mood,available_minutes:input.availableMinutes,sore_areas:input.soreAreas,readiness_score:result.score,recommendation:result},{onConflict:"user_id,checked_on"});
  if(error)throw error;
}
