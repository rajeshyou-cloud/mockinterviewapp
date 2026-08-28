'use client';

import { useEffect, useRef } from 'react';

type FlowCard = {
  number: string;
  eyebrow: string;
  title: string;
  description: string;
  tone: 'violet' | 'cyan' | 'amber';
};

const flowCards: readonly FlowCard[] = [
  {
    number: '01',
    eyebrow: 'THINK',
    title: 'Plan with context',
    description: 'The orchestrator combines the request with retrieved evidence, memory, and an explicit execution plan.',
    tone: 'violet',
  },
  {
    number: '02',
    eyebrow: 'ACT',
    title: 'Route safe actions',
    description: 'The agent selects models, tools, MCP servers, or APIs while guardrails and human approvals control risk.',
    tone: 'cyan',
  },
  {
    number: '03',
    eyebrow: 'LEARN',
    title: 'Evaluate every run',
    description: 'Traces, quality checks, cost signals, and outcomes feed an improvement loop without silently changing policy.',
    tone: 'amber',
  },
] as const;

function Signal({ path, start, end }: { path: string; start: number; end: number }) {
  const fadeIn = Math.max(0, start - 0.015);
  const fadeOut = Math.min(1, end + 0.015);
  return <circle className="agentSignal" r="7">
    <animateMotion calcMode="linear" dur="12s" keyPoints="0;0;1;1" keyTimes={`0;${start};${end};1`} path={path} repeatCount="indefinite" />
    <animate attributeName="opacity" dur="12s" keyTimes={`0;${fadeIn};${start};${end};${fadeOut};1`} repeatCount="indefinite" values="0;0;1;1;0;0" />
  </circle>;
}

function AgenticDiagram() {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const setPlayback = (visible: boolean) => {
      if (reducedMotion.matches || !visible) svg.pauseAnimations();
      else svg.unpauseAnimations();
    };
    const observer = new IntersectionObserver(([entry]) => setPlayback(Boolean(entry?.isIntersecting)), { threshold: 0.18 });
    const handleMotionPreference = () => setPlayback(svg.getBoundingClientRect().top < window.innerHeight && svg.getBoundingClientRect().bottom > 0);

    observer.observe(svg);
    reducedMotion.addEventListener('change', handleMotionPreference);
    handleMotionPreference();
    return () => {
      observer.disconnect();
      reducedMotion.removeEventListener('change', handleMotionPreference);
    };
  }, []);

  return <svg ref={svgRef} className="agenticDiagram" viewBox="0 0 1200 760" role="img" aria-labelledby="agentic-diagram-title agentic-diagram-description">
    <title id="agentic-diagram-title">Generic enterprise Agentic AI architecture</title>
    <desc id="agentic-diagram-description">A request travels through an agent orchestrator, planning, model routing, memory, retrieval, tools, human approval and guardrails. Observability and evaluation create a controlled learning loop.</desc>
    <defs>
      <linearGradient id="agentic-bg" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#f8f5ff"/><stop offset=".5" stopColor="#effbff"/><stop offset="1" stopColor="#fff8e8"/></linearGradient>
      <linearGradient id="agentic-main" x1="0" y1="0" x2="1" y2="0"><stop stopColor="#7047eb"/><stop offset=".48" stopColor="#0b9fc0"/><stop offset="1" stopColor="#ef7a35"/></linearGradient>
      <filter id="agentic-shadow" x="-20%" y="-30%" width="140%" height="170%"><feDropShadow dx="0" dy="10" stdDeviation="10" floodColor="#23325c" floodOpacity=".11"/></filter>
      <marker id="agentic-arrow" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto"><path d="M1 1 9 5 1 9" fill="none" stroke="#72819a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></marker>
    </defs>

    <rect x="5" y="5" width="1190" height="750" rx="38" fill="url(#agentic-bg)" stroke="#d9d9eb" strokeWidth="2"/>
    <path className="agentSketch" d="M32 75c18-13 33-13 47-1M1118 62c19 2 33 12 43 29M1117 701c17-4 33 1 45 15"/>

    <g className="agentLayerLabel"><rect x="42" y="35" width="202" height="34" rx="17"/><text x="143" y="57">REQUEST &amp; CONTROL</text></g>
    <g className="agentLayerLabel intelligence"><rect x="390" y="35" width="216" height="34" rx="17"/><text x="498" y="57">AGENT INTELLIGENCE</text></g>
    <g className="agentLayerLabel action"><rect x="790" y="35" width="183" height="34" rx="17"/><text x="881" y="57">SAFE EXECUTION</text></g>

    <g className="agentCard user" filter="url(#agentic-shadow)"><rect x="42" y="116" width="145" height="126" rx="24"/><circle cx="114" cy="155" r="19"/><path d="M80 210c5-24 20-35 34-35s29 11 34 35"/><text x="114" y="228">USER / APP</text></g>
    <g className="agentCard orchestrator" filter="url(#agentic-shadow)"><rect x="240" y="103" width="184" height="152" rx="25"/><path d="M292 157h80M292 178h80M310 199h44"/><circle cx="279" cy="157" r="7"/><circle cx="279" cy="178" r="7"/><circle cx="297" cy="199" r="7"/><text x="332" y="226">ORCHESTRATOR</text><text className="sub" x="332" y="244">state · policy · coordination</text></g>
    <g className="agentCard planner" filter="url(#agentic-shadow)"><rect x="481" y="103" width="164" height="152" rx="25"/><path d="M522 145h82M522 166h56M522 187h72"/><path d="m507 144 4 4 7-8m-11 25 4 4 7-8m-11 25 4 4 7-8"/><text x="563" y="226">PLAN &amp; REASON</text><text className="sub" x="563" y="244">goals · steps · trade-offs</text></g>
    <g className="agentCard router" filter="url(#agentic-shadow)"><rect x="702" y="103" width="164" height="152" rx="25"/><path d="M740 179h33M773 179l28-31M773 179l28 0M773 179l28 31"/><circle cx="736" cy="179" r="9"/><rect x="803" y="136" width="30" height="22" rx="8"/><rect x="803" y="168" width="30" height="22" rx="8"/><rect x="803" y="200" width="30" height="22" rx="8"/><text x="784" y="236">MODEL ROUTER</text></g>
    <g className="agentCard execute" filter="url(#agentic-shadow)"><rect x="1012" y="116" width="146" height="126" rx="24"/><path d="m1053 178 21 21 40-47"/><text x="1085" y="225">RESPONSE</text></g>

    <path className="agentPath main" d="M187 179C207 177 218 177 240 179M424 179h57M645 179h57M866 179c48 0 89 0 146 0" markerEnd="url(#agentic-arrow)"/>

    <g className="agentCard memory" filter="url(#agentic-shadow)"><rect x="228" y="335" width="198" height="128" rx="24"/><ellipse cx="275" cy="375" rx="24" ry="9"/><path d="M251 375v41c0 12 48 12 48 0v-41M251 396c0 12 48 12 48 0"/><text x="342" y="378">MEMORY</text><text className="sub" x="342" y="399">short + long term</text><text className="sub" x="342" y="419">session context</text></g>
    <g className="agentCard rag" filter="url(#agentic-shadow)"><rect x="459" y="335" width="198" height="128" rx="24"/><circle cx="504" cy="383" r="19"/><path d="m518 397 16 16M495 383h18M504 374v18"/><text x="565" y="378">RAG</text><text className="sub" x="565" y="399">vector retrieval</text><text className="sub" x="565" y="419">grounded evidence</text></g>
    <g className="agentCard tools" filter="url(#agentic-shadow)"><rect x="690" y="319" width="220" height="160" rx="24"/><path d="M732 369h48M732 399h48M732 429h48"/><circle cx="719" cy="369" r="7"/><circle cx="719" cy="399" r="7"/><circle cx="719" cy="429" r="7"/><text x="837" y="365">TOOLS</text><text className="sub" x="837" y="388">functions · MCP</text><text className="sub" x="837" y="409">external APIs</text><text className="sub" x="837" y="430">enterprise systems</text></g>
    <g className="agentCard human" filter="url(#agentic-shadow)"><rect x="949" y="319" width="209" height="160" rx="24"/><path d="M985 371h39M985 399h39M985 427h39"/><path d="m1070 382 13 13 25-29"/><text x="1064" y="444">HUMAN APPROVAL</text><text className="sub" x="1064" y="462">high-risk actions</text></g>

    <path className="agentPath branch" d="M563 255v39c0 22-44 22-112 22H327v19M563 255v80M784 255v64M910 399h39" markerEnd="url(#agentic-arrow)"/>
    <path className="agentPath return" d="M327 335v-27c0-18 22-28 50-28h106M558 335v-30c0-16 17-25 37-25h68c21 0 39-10 39-25" markerEnd="url(#agentic-arrow)"/>

    <g className="guardrailBand"><rect x="86" y="520" width="1028" height="74" rx="25"/><path d="M124 557 142 546l18 11v13c0 10-7 18-18 23-11-5-18-13-18-23Z"/><path d="m134 568 6 6 11-13"/><text x="179" y="553">GUARDRAILS &amp; SECURITY</text><text x="179" y="575" className="sub">identity · permissions · validation · privacy · policy enforcement</text><g className="guardrailPills"><rect x="759" y="539" width="98" height="35" rx="17"/><text x="808" y="561">CHECK</text><rect x="871" y="539" width="96" height="35" rx="17"/><text x="919" y="561">ALLOW</text><rect x="981" y="539" width="98" height="35" rx="17"/><text x="1030" y="561">BLOCK</text></g></g>

    <g className="opsBand"><rect x="86" y="628" width="1028" height="76" rx="25"/><text x="126" y="658">OBSERVE</text><text className="sub" x="126" y="680">logs · traces · cost</text><path d="M310 667h91" markerEnd="url(#agentic-arrow)"/><text x="438" y="658">EVALUATE</text><text className="sub" x="438" y="680">quality · safety · outcomes</text><path d="M642 667h91" markerEnd="url(#agentic-arrow)"/><text x="768" y="658">IMPROVE</text><text className="sub" x="768" y="680">prompts · tools · policy</text><path className="learningLoop" d="M976 665c95 0 111-36 111-86" markerEnd="url(#agentic-arrow)"/></g>

    <Signal path="M187 179 C207 177 218 177 240 179 L481 179 L702 179 C820 179 901 179 1012 179" start={0.02} end={0.43}/>
    <Signal path="M563 255 L563 335" start={0.24} end={0.4}/>
    <Signal path="M327 335 L327 308 C327 286 360 280 483 280" start={0.29} end={0.48}/>
    <Signal path="M784 255 L784 319" start={0.38} end={0.53}/>
    <Signal path="M910 399 L949 399" start={0.5} end={0.62}/>
    <Signal path="M126 666 L401 666 L642 666 L894 666 C1035 666 1087 638 1087 579" start={0.62} end={0.96}/>
  </svg>;
}

export function AgenticArchitecture() {
  return <section className="marketingSection agenticSection" id="agentic-architecture" aria-labelledby="agentic-heading">
    <div className="marketingHeading agenticHeading">
      <div><p className="marketingEyebrow">AGENTIC AI, VISUALISED</p><h2 id="agentic-heading">How an enterprise AI agent thinks, acts, and improves.</h2></div>
      <div className="agenticIntro"><p>Follow a request through orchestration, grounded reasoning, controlled tool use, human approval, and measurable evaluation.</p><span><i/> Animated process flow</span></div>
    </div>
    <div className="agenticCanvas"><span className="agenticPanHint">Swipe to explore the architecture →</span><AgenticDiagram/><div className="agenticLegend" aria-hidden="true"><span><i className="signal"/>Active information</span><span><i className="control"/>Control boundary</span><span><i className="learning"/>Evaluation loop</span></div></div>
    <div className="agenticFlowGrid">{flowCards.map((flow)=><article className={`agenticFlowCard ${flow.tone}`} key={flow.number}><div><span>{flow.number}</span><small>{flow.eyebrow}</small></div><h3>{flow.title}</h3><p>{flow.description}</p><div className="miniFlow" aria-hidden="true"><i/><i/><i/><b/></div></article>)}</div>
    <div className="agenticCta"><div><span>AGENTIC AI INTERVIEW TRACK</span><strong>Practise Agentic AI interviews</strong><p>The dedicated track is being prepared. Start now with a released technical interview and build the same structured explanation skills.</p></div><a href="#interview-setup">Start with a released track <span aria-hidden="true">→</span></a></div>
  </section>;
}
