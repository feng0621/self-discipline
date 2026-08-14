"use client";

import { useEffect, useRef } from "react";
import Starfield from "../fitness/components/Starfield";
import FormaIcon, { type FormaIconName } from "../../shared/icons/FormaIcon";

type Props = { onEnterDemo: () => void; onLogin: () => void };

const principles: Array<{ icon: FormaIconName; index: string; title: string; body: string }> = [
  { icon: "readiness", index: "01", title: "先读懂身体", body: "睡眠、酸痛、精力与可用时间，共同生成今天的训练强度。" },
  { icon: "adaptive", index: "02", title: "计划会呼吸", body: "状态变了，动作、组数与休息随之改变，而不是让你硬撑。" },
  { icon: "privacy", index: "03", title: "轨迹只属于你", body: "训练与身体记录通过 Supabase 私密同步，由行级安全策略保护。" },
];

export default function LandingPage({ onEnterDemo, onLogin }: Props) {
  const shell = useRef<HTMLElement>(null);

  useEffect(() => {
    const element = shell.current;
    if (!element || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    const move = (event: PointerEvent) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        element.style.setProperty("--pointer-x", `${(event.clientX / innerWidth - 0.5) * 2}`);
        element.style.setProperty("--pointer-y", `${(event.clientY / innerHeight - 0.5) * 2}`);
      });
    };
    addEventListener("pointermove", move, { passive: true });
    return () => { cancelAnimationFrame(frame); removeEventListener("pointermove", move); };
  }, []);

  return (
    <main className="landing" ref={shell}>
      <Starfield intensity={0.34}/>
      <div className="landingBeam" aria-hidden="true"><i/><i/><i/></div>
      <div className="landingGrain" aria-hidden="true"/>

      <nav className="landingNav" aria-label="Landing navigation">
        <a className="landingMark" href="#top" aria-label="FORMA 首页">FOR<span>·</span>MA</a>
        <div className="landingStatus"><i/>ADAPTIVE TRAINING SYSTEM</div>
        <button className="textAction" onClick={onLogin}>登录同步 <FormaIcon name="arrow"/></button>
      </nav>

      <section className="landingHero" id="top">
        <div className="heroCopy">
          <p className="landingEyebrow"><span>FORMA / 01</span> 不靠意志力硬撑</p>
          <h1><span>训练，</span><br/>应该回应<br/><em>今天的你。</em></h1>
          <p className="heroLead">一个会根据睡眠、疲劳与时间调整的私人训练系统。少一点内耗，多一点可以持续的进步。</p>
          <div className="heroActions">
            <button className="landingPrimary" onClick={onEnterDemo}><span>进入今日训练</span><FormaIcon name="arrow"/></button>
            <button className="landingSecondary" onClick={onLogin}>已有档案，登录</button>
          </div>
        </div>

        <div className="orbitStage" aria-label="今日身体准备度 82，建议进行进阶训练">
          <div className="orbitHalo orbitHaloOne"/><div className="orbitHalo orbitHaloTwo"/>
          <div className="orbitSpec orbitSpecTop"><small>READINESS</small><b>82</b><span>/ 100</span></div>
          <div className="orbitSpec orbitSpecSide"><small>TODAY</small><b>进阶</b><span>42 MIN</span></div>
          <div className="orbitCore">
            <svg viewBox="0 0 260 260" aria-hidden="true">
              <circle className="orbitTrack" cx="130" cy="130" r="108"/>
              <circle className="orbitValue" cx="130" cy="130" r="108" pathLength="100"/>
              <path className="bodyGlyph" d="M130 68c12 0 19 8 19 18s-7 17-19 17-19-7-19-17 7-18 19-18Zm0 36v52m-31-33 31-19 31 19m-31 33-27 39m27-39 27 39"/>
              <circle className="joint" cx="130" cy="104" r="3"/><circle className="joint" cx="99" cy="123" r="3"/><circle className="joint" cx="161" cy="123" r="3"/>
            </svg>
            <span>BODY / SIGNAL</span>
          </div>
          <div className="orbitTicker"><span>睡眠 7.5H</span><i/><span>精力良好</span><i/><span>低酸痛</span></div>
        </div>

        <div className="heroIndex" aria-hidden="true"><span>00</span><i/><b>01</b></div>
      </section>

      <section className="principles" aria-labelledby="principles-title">
        <div className="principlesIntro"><p className="landingEyebrow">SYSTEM / LOGIC</p><h2 id="principles-title">克制的界面，<br/>聪明的内核。</h2></div>
        <div className="principleGrid">{principles.map(item => <article key={item.index}>
          <div className="principleIcon"><FormaIcon name={item.icon}/><span>{item.index}</span></div>
          <h3>{item.title}</h3><p>{item.body}</p>
        </article>)}</div>
      </section>

      <section className="landingManifesto">
        <p>CONSISTENCY, WITHOUT PUNISHMENT.</p>
        <h2>自律不是每天逼自己做到满分。<br/><span>是低谷时，仍有一条走得下去的路。</span></h2>
        <button onClick={onEnterDemo}>开始第一天 <FormaIcon name="arrow"/></button>
      </section>

      <footer className="landingFooter"><a className="landingMark" href="#top">FOR<span>·</span>MA</a><p>为长期主义者设计的训练系统。</p><small>© 2026 / KUALA LUMPUR</small></footer>
    </main>
  );
}
