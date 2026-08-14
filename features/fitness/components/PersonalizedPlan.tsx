"use client";
import { useMemo,useState } from "react";
import { defaultTrainingProfile,generatePersonalizedPlan } from "../domain/personalized-plan";
import type { TrainingProfile } from "../domain/personalized-plan";

export default function PersonalizedPlan({value,onSave}:{value?:TrainingProfile;onSave:(value:TrainingProfile)=>void}){
  const [editing,setEditing]=useState(!value);
  const [draft,setDraft]=useState<TrainingProfile>(value??defaultTrainingProfile);
  const profile=value??draft;
  const plan=useMemo(()=>generatePersonalizedPlan(profile),[profile]);
  const set=<K extends keyof TrainingProfile>(key:K,next:TrainingProfile[K])=>setDraft(v=>({...v,[key]:next}));
  const toggleList=(key:"equipment"|"limitations",item:string)=>setDraft(v=>({...v,[key]:v[key].includes(item)?v[key].filter(x=>x!==item):[...v[key],item]}));
  const choice=<K extends keyof TrainingProfile>(key:K,options:Array<{v:TrainingProfile[K];label:string}>)=><div className="profileChoices">{options.map(o=><button type="button" key={String(o.v)} className={draft[key]===o.v?"selected":""} onClick={()=>set(key,o.v)}>{o.label}</button>)}</div>;
  if(editing)return <form className="planBuilder" onSubmit={e=>{e.preventDefault();onSave(draft);setEditing(false)}}>
    <div className="planBuilderHead"><div><p className="kicker">PERSONAL PROGRAM</p><h2>先了解你，再安排训练。</h2><p>信息越完整，训练量、动作选择与恢复安排越准确。</p></div>{value&&<button type="button" onClick={()=>setEditing(false)}>取消</button>}</div>
    <div className="profileFormGrid">
      <fieldset><legend>性别</legend>{choice("gender",[{v:"male",label:"男"},{v:"female",label:"女"},{v:"unspecified",label:"不限定"}])}</fieldset>
      <label>年龄<input type="number" min="14" max="85" value={draft.age} onChange={e=>set("age",Number(e.target.value))}/></label>
      <label>身高（cm）<input type="number" min="120" max="230" value={draft.heightCm} onChange={e=>set("heightCm",Number(e.target.value))}/></label>
      <label>体重（kg）<input type="number" min="30" max="300" step="0.1" value={draft.weightKg} onChange={e=>set("weightKg",Number(e.target.value))}/></label>
      <fieldset><legend>训练经验</legend>{choice("experience",[{v:"beginner",label:"0–6 个月"},{v:"intermediate",label:"6–24 个月"},{v:"advanced",label:"2 年以上"}])}</fieldset>
      <fieldset><legend>主要目标</legend>{choice("primaryGoal",[{v:"fat-loss",label:"减脂"},{v:"muscle-gain",label:"增肌"},{v:"recomposition",label:"体态重组"},{v:"strength",label:"提升力量"},{v:"health",label:"健康体能"}])}</fieldset>
      <fieldset><legend>希望达到的身材</legend>{choice("physiqueGoal",[{v:"lean",label:"精瘦线条"},{v:"athletic",label:"运动型"},{v:"muscular",label:"肌肉感"},{v:"curvy",label:"紧致曲线"},{v:"health",label:"健康匀称"}])}</fieldset>
      <fieldset><legend>每周训练</legend>{choice("daysPerWeek",([2,3,4,5] as const).map(v=>({v,label:`${v} 天`})))}</fieldset>
      <fieldset><legend>单次时间</legend>{choice("minutesPerSession",([30,45,60,75] as const).map(v=>({v,label:`${v} 分钟`})))}</fieldset>
      <fieldset><legend>可用器材</legend><div className="profileChoices">{["徒手","弹力带","哑铃","健身房"].map(x=><button type="button" key={x} className={draft.equipment.includes(x)?"selected":""} onClick={()=>toggleList("equipment",x)}>{x}</button>)}</div></fieldset>
      <fieldset><legend>需要避开的部位</legend><div className="profileChoices">{["肩部不适","腰部不适","膝部不适","脚踝不适"].map(x=><button type="button" key={x} className={draft.limitations.includes(x)?"selected":""} onClick={()=>toggleList("limitations",x)}>{x}</button>)}</div></fieldset>
    </div>
    <p className="medicalNote">如有心血管疾病、孕期、术后恢复或持续性疼痛，请先获得医生或物理治疗师许可。</p>
    <button className="generatePlan">生成我的专业计划 <b>→</b></button>
  </form>;
  return <div className="personalPlan">
    <div className="personalPlanHero"><div><p className="kicker">YOUR TRAINING SYSTEM</p><h2>{plan.title}</h2><p>{plan.summary}</p></div><button onClick={()=>{setDraft(profile);setEditing(true)}}>重新评估 ↗</button></div>
    <div className="planPrinciples"><article><small>训练频率</small><b>{plan.weeklyTarget}</b></article><article><small>有氧与活动</small><b>{plan.cardio}</b></article><article><small>渐进超负荷</small><b>{plan.progression}</b></article><article><small>营养原则</small><b>{plan.nutrition}</b></article></div>
    <div className="generatedWeek">{plan.days.map(day=><article key={day.day}><header><span>{day.day}</span><div><b>{day.focus}</b><small>{day.duration} 分钟 · RIR 2</small></div></header>{day.exercises.map(x=><div key={x.name}><span>{x.name}</span><small>{x.sets} 组 × {x.reps} · 休 {x.rest}</small></div>)}</article>)}</div>
    <p className="planDisclaimer">计划依据一般运动科学原则生成，不替代医疗诊断。出现胸痛、眩晕或尖锐疼痛请立即停止训练。</p>
  </div>;
}
