export type ReadinessInput = { sleepHours:number; energy:number; soreness:number; mood:number; availableMinutes:number; soreAreas:string[] };
export type ReadinessRecommendation = { score:number; intensity:"入门"|"进阶"|"强化"; title:string; detail:string; duration:number; note:string };

export function calculateReadiness(input: ReadinessInput): ReadinessRecommendation {
  const sleepScore = Math.min(100, Math.max(20, (input.sleepHours / 8) * 100));
  const energyScore = input.energy * 20;
  const moodScore = input.mood * 20;
  const sorenessScore = 110 - input.soreness * 20;
  const score = Math.round(sleepScore * .35 + energyScore * .3 + sorenessScore * .25 + moodScore * .1);
  const duration = Math.min(input.availableMinutes, score < 55 ? 15 : score < 78 ? 30 : 45);
  if (score < 55) return { score, intensity:"入门", title:"恢复轨道", detail:`${duration} 分钟低强度活动与核心激活`, duration, note:input.soreAreas.length?`已避开：${input.soreAreas.join("、")}`:"今天优先恢复，不追求训练量。" };
  if (score < 78) return { score, intensity:"进阶", title:"稳定推进", detail:`${duration} 分钟全身力量训练`, duration, note:input.sleepHours<7?"睡眠略少，组间休息增加 15 秒。":"状态稳定，保持两次动作余力。" };
  return { score, intensity:"强化", title:"高能窗口", detail:`${duration} 分钟力量与核心挑战`, duration, note:"状态优秀，可以提高训练容量，但动作质量优先。" };
}

