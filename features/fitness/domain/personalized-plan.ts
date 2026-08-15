export type TrainingProfile = {
  gender:"male"|"female"|"unspecified";
  age:number;
  heightCm:number;
  weightKg:number;
  experience:"beginner"|"intermediate"|"advanced";
  physiqueGoal:"lean"|"athletic"|"muscular"|"curvy"|"health";
  primaryGoal:"fat-loss"|"muscle-gain"|"recomposition"|"strength"|"health";
  daysPerWeek:2|3|4|5;
  minutesPerSession:30|45|60|75;
  equipment:string[];
  limitations:string[];
};

export type PlannedDay={day:string;focus:string;duration:number;exercises:Array<{name:string;sets:string;reps:string;rest:string}>};
export type PersonalizedPlan={title:string;summary:string;weeklyTarget:string;cardio:string;progression:string;nutrition:string;days:PlannedDay[]};

const library={
  push:["俯卧撑 / 哑铃卧推","上斜俯卧撑","哑铃肩推"],
  pull:["弹力带划船 / 坐姿划船","单臂哑铃划船","面拉"],
  squat:["高脚杯深蹲 / 箱式深蹲","分腿蹲","台阶上步"],
  hinge:["哑铃罗马尼亚硬拉","臀桥 / 臀推","鸟狗式"],
  core:["死虫式 + 侧平板支撑","反向卷腹 + 前臂平板支撑","鸟狗式 + 行李箱提重"],
};

export const defaultTrainingProfile:TrainingProfile={gender:"unspecified",age:28,heightCm:170,weightKg:70,experience:"beginner",physiqueGoal:"athletic",primaryGoal:"recomposition",daysPerWeek:3,minutesPerSession:45,equipment:["徒手"],limitations:[]};

export function generatePersonalizedPlan(p:TrainingProfile):PersonalizedPlan{
  const level=p.experience==="beginner"?{sets:"2–3",reps:"8–12",rest:"60–90 秒"}:p.experience==="intermediate"?{sets:"3–4",reps:"6–12",rest:"75–120 秒"}:{sets:"4",reps:"5–10",rest:"90–150 秒"};
  const names=p.daysPerWeek<=3?["全身 A","全身 B","全身 C"]:p.daysPerWeek===4?["上肢 A","下肢 A","上肢 B","下肢 B"]:["推","拉","腿","上肢综合","下肢与核心"];
  const weekdays=["周一","周二","周三","周四","周五"];
  const abFocused=p.primaryGoal==="fat-loss"||p.primaryGoal==="recomposition"||p.physiqueGoal==="lean"||p.physiqueGoal==="athletic";
  const pool=[library.squat,library.push,library.pull,library.hinge,library.core];
  const days=names.slice(0,p.daysPerWeek).map((focus,index)=>({day:weekdays[index],focus:abFocused?`${focus} · 腹肌`:focus,duration:p.minutesPerSession,exercises:[...pool.map((group,i)=>({name:group[(index+i)%group.length],sets:level.sets,reps:i===4?"30–45 秒":level.reps,rest:i===4?"45–60 秒":level.rest})),...(abFocused?[{name:["反向卷腹","侧平板支撑","慢速登山者"][index%3],sets:"3",reps:index%3===1?"25–35 秒/侧":"10–15",rest:"45–60 秒"}]:[])]}));
  const goalName={lean:"精瘦线条",athletic:"运动型体态",muscular:"明显肌肉量",curvy:"紧致曲线",health:"健康体能"}[p.physiqueGoal];
  const focus={"fat-loss":"减脂","muscle-gain":"增肌","recomposition":"体态重组",strength:"力量提升",health:"健康与体能"}[p.primaryGoal];
  const cardio=p.primaryGoal==="fat-loss"?"每周 2–3 次 25–35 分钟低强度有氧，日均 8,000–10,000 步。":"每周 1–2 次 20–30 分钟低强度有氧，作为心肺与恢复补充。";
  const nutrition=p.primaryGoal==="muscle-gain"?"维持轻微热量盈余；每日蛋白质约 1.6–2.2 g/kg。":p.primaryGoal==="fat-loss"?"采用温和热量缺口；每日蛋白质约 1.6–2.2 g/kg，避免极端节食。":"优先稳定体重与高蛋白饮食；每日蛋白质约 1.6–2.0 g/kg。";
  return {title:`${goalName} · 12 周${focus}计划`,summary:`根据 ${p.age} 岁、${p.experience==="beginner"?"入门":p.experience==="intermediate"?"进阶":"高级"}经验、每周 ${p.daysPerWeek} 练和单次 ${p.minutesPerSession} 分钟生成。${abFocused?"每次训练安排 2 类核心刺激，兼顾腹直肌、深层稳定与侧腹。":""}`,weeklyTarget:`每周 ${p.daysPerWeek} 次力量训练；核心每周 3–4 次、每次 6–10 有效组。`,cardio,progression:"先保证动作标准。当所有工作组都达到次数上限且仍保留 2 次余力，下周增加 1–2 次重复、5–10 秒静力时间或 2.5%–5% 负重；每第 4 周训练量降低约 25%。",nutrition,days};
}
