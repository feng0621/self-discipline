export type Exercise = { name:string; en:string; target:string; dose:string; sets:number; rest:number; videoId?:string; source?:string; provider:string; cue:string; avoid:string };

export const exercises: Exercise[] = [
  { name:"上斜俯卧撑", en:"INCLINE PUSH-UP", target:"胸 · 肩 · 核心", dose:"4 × 12", sets:4, rest:75, videoId:"0JUrOH--Kdk", provider:"NASM", cue:"胸口向支撑面靠近，头、背、髋保持一条直线。", avoid:"耸肩、塌腰或只移动头部" },
  { name:"椅子深蹲", en:"CHAIR SQUAT", target:"臀 · 大腿 · 核心", dose:"4 × 15", sets:4, rest:75, videoId:"QX7HgfPyvDk", provider:"Dr. Elise Brown", cue:"臀部先向后找椅面，膝盖始终朝脚尖方向。", avoid:"快速坐下或膝盖向内扣" },
  { name:"弹力带划船", en:"BAND ROW", target:"背 · 手臂", dose:"4 × 12", sets:4, rest:60, videoId:"WkNuYbWZ8g8", provider:"Whats Up Dude", cue:"胸口保持打开，肘部贴近身体向后拉。", avoid:"耸肩、含胸或身体后仰借力" },
  { name:"臀桥", en:"GLUTE BRIDGE", target:"臀 · 腿后侧", dose:"3 × 18", sets:3, rest:60, videoId:"SKOMwg1JLrU", provider:"NASM", cue:"脚跟发力抬髋，在最高点主动收紧臀部。", avoid:"用腰硬顶或把肋骨过度抬起" },
  { name:"前臂平板支撑", en:"FOREARM PLANK", target:"腹部 · 核心", dose:"3 × 30秒", sets:3, rest:45, videoId:"Vdcy7VrRluA", provider:"ACE Fitness", cue:"收紧腹部与臀部，同时保持均匀呼吸。", avoid:"屏住呼吸、塌腰或臀部抬得过高" },
];

export const quickStages = [
  {name:"关节唤醒",detail:"肩绕环 + 髋部活动",duration:60},
  {name:"椅子深蹲",detail:"40秒训练 · 20秒调整",duration:120},
  {name:"墙壁俯卧撑",detail:"40秒训练 · 20秒调整",duration:120},
  {name:"原地快走",detail:"保持能说短句的速度",duration:120},
  {name:"死虫式",detail:"慢呼吸，腰背贴地",duration:60},
] as const;

