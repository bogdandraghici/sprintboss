// The factory golem. Flat SVG, themed via CSS variables, animated via CSS.
// Every detail encodes state: chest gauge needle = HP remaining,
// cracks appear as HP drops, eyes/steam go red when enraged.

export default function BossFigure({ hpFrac = 1 }) {
  // Gauge sweeps -80° (full HP) → +80° (dead).
  const needle = -80 + 160 * (1 - Math.max(0, Math.min(1, hpFrac)));

  return (
    <svg className="boss" viewBox="0 0 260 240" xmlns="http://www.w3.org/2000/svg">
      {/* ground shadow */}
      <ellipse cx="130" cy="232" rx="72" ry="6" fill="#000" opacity="0.3" />

      {/* steam */}
      <circle className="steam steam-a" cx="82" cy="12" r="6" />
      <circle className="steam steam-b" cx="178" cy="12" r="7" />
      <circle className="steam steam-c" cx="86" cy="10" r="4.5" />

      {/* smokestacks */}
      <rect x="74" y="16" width="16" height="32" rx="3" fill="var(--steel-3)" stroke="var(--steel-2)" strokeWidth="2.5" />
      <rect x="170" y="16" width="16" height="32" rx="3" fill="var(--steel-3)" stroke="var(--steel-2)" strokeWidth="2.5" />
      <rect x="70" y="11" width="24" height="8" rx="2.5" fill="var(--steel-2)" />
      <rect x="166" y="11" width="24" height="8" rx="2.5" fill="var(--steel-2)" />

      {/* legs + feet */}
      <rect x="98" y="190" width="18" height="34" rx="4" fill="var(--steel-3)" stroke="var(--steel-2)" strokeWidth="2.5" />
      <rect x="144" y="190" width="18" height="34" rx="4" fill="var(--steel-3)" stroke="var(--steel-2)" strokeWidth="2.5" />
      <rect x="88" y="221" width="38" height="11" rx="3.5" fill="var(--steel-2)" />
      <rect x="134" y="221" width="38" height="11" rx="3.5" fill="var(--steel-2)" />

      {/* arms + fists */}
      <rect x="38" y="102" width="20" height="62" rx="10" fill="var(--steel-3)" stroke="var(--steel-2)" strokeWidth="2.5" />
      <rect x="202" y="102" width="20" height="62" rx="10" fill="var(--steel-3)" stroke="var(--steel-2)" strokeWidth="2.5" />
      <circle cx="48" cy="174" r="13" fill="var(--steel)" stroke="var(--steel-2)" strokeWidth="2.5" />
      <circle cx="212" cy="174" r="13" fill="var(--steel)" stroke="var(--steel-2)" strokeWidth="2.5" />

      {/* boiler body */}
      <rect x="62" y="84" width="136" height="112" rx="16" fill="var(--steel)" stroke="var(--steel-2)" strokeWidth="3" />
      <path d="M62 110 H198" stroke="var(--steel-2)" strokeWidth="2" />
      {[80, 106, 132, 158, 184].map((x) => (
        <circle key={`rt${x}`} cx={x} cy="97" r="2.6" fill="var(--steel-2)" />
      ))}
      {[80, 106, 132, 158, 184].map((x) => (
        <circle key={`rb${x}`} cx={x} cy="186" r="2.6" fill="var(--steel-2)" />
      ))}

      {/* damage cracks (HP-driven) */}
      <path className="crack" data-show={hpFrac < 0.55} d="M84 122 l11 9 -6 11 12 9" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <path className="crack" data-show={hpFrac < 0.3} d="M176 174 l-10 -8 5 -10 -11 -8" strokeWidth="2.5" fill="none" strokeLinecap="round" />

      {/* chest HP gauge */}
      <circle cx="130" cy="150" r="27" fill="var(--steel-3)" stroke="var(--steel-2)" strokeWidth="3" />
      {[-80, -40, 0, 40, 80].map((a) => (
        <line
          key={a}
          x1="130" y1="128" x2="130" y2="133"
          stroke="var(--dim)" strokeWidth="2" strokeLinecap="round"
          transform={`rotate(${a} 130 150)`}
        />
      ))}
      <path d="M 144.1 128.7 A 26 26 0 0 1 155.6 145.5" fill="none" stroke="var(--red)" strokeWidth="3.5" strokeLinecap="round" opacity="0.8" />
      <g transform={`rotate(${needle} 130 150)`} style={{ transition: 'transform 0.9s cubic-bezier(0.2, 0.9, 0.3, 1.2)' }}>
        <line x1="130" y1="150" x2="130" y2="129" stroke="var(--ink)" strokeWidth="3.5" strokeLinecap="round" />
        <line x1="130" y1="150" x2="130" y2="157" stroke="var(--ink)" strokeWidth="5" strokeLinecap="round" opacity="0.55" />
      </g>
      <circle cx="130" cy="150" r="4.5" fill="var(--ink)" />

      {/* neck + head */}
      <rect x="118" y="84" width="24" height="8" fill="var(--steel-2)" />
      <rect x="94" y="40" width="72" height="50" rx="10" fill="var(--steel)" stroke="var(--steel-2)" strokeWidth="3" />

      {/* antenna */}
      <rect x="128" y="28" width="4" height="14" fill="var(--steel-2)" />
      <circle className="eye" cx="130" cy="25" r="4" />

      {/* eyes (+ angry brows, enrage only) */}
      <circle className="eye" cx="114" cy="64" r="7" />
      <circle className="eye" cx="146" cy="64" r="7" />
      <circle cx="116" cy="62" r="2.2" fill="#fff" opacity="0.8" />
      <circle cx="148" cy="62" r="2.2" fill="#fff" opacity="0.8" />
      <rect className="brow" x="103" y="50" width="23" height="6" rx="2" transform="rotate(20 114 53)" />
      <rect className="brow" x="134" y="50" width="23" height="6" rx="2" transform="rotate(-20 146 53)" />

      {/* mouth grate */}
      <rect x="116" y="76" width="28" height="6" rx="2" fill="var(--steel-3)" stroke="var(--steel-2)" strokeWidth="1.5" />
      <line x1="123" y1="76" x2="123" y2="82" stroke="var(--steel-2)" strokeWidth="1.5" />
      <line x1="130" y1="76" x2="130" y2="82" stroke="var(--steel-2)" strokeWidth="1.5" />
      <line x1="137" y1="76" x2="137" y2="82" stroke="var(--steel-2)" strokeWidth="1.5" />

      {/* hit flash overlay */}
      <rect className="flash" x="30" y="6" width="200" height="228" rx="24" />
    </svg>
  );
}
