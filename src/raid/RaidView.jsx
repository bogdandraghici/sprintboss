// src/raid/RaidView.jsx
// Command deck: data layers above and below, the scene as pure spectacle between.
import { useMemo, useState, useEffect, useRef } from 'react';
import ArenaScene from './ArenaScene';
import Dock from '../components/Dock';
import FighterBar from '../components/FighterBar';
import TruthTicker from '../components/TruthTicker';
import { EnrageTimer, HpBar, DamageLog } from '../components/hud';
import { deriveParty, deriveMinions, pulseActions } from './raidState';
import { clampArenaHeight } from './arenaResize';

export default function RaidView({ view, pulses, onSelect }) {
  const party = useMemo(() => deriveParty(view), [view]);
  const { minions, horde } = useMemo(() => deriveMinions(view), [view]);
  const actions = pulseActions(pulses, party);

  // Focused fighter (assignee name) or null. Presentation lens only — never
  // mutates `view`, never persisted, not part of retro reconstruction.
  const [focus, setFocus] = useState(null);

  // Session-only arena height (px) the user can drag; null = CSS default (22vh).
  // Presentation lens only — never mutates `view`, never persisted.
  const [arenaH, setArenaH] = useState(null);
  const arenaRef = useRef(null);
  const drag = useRef({ down: false, startY: 0, startH: 0 });

  const onResizeDown = (e) => {
    const h = arenaRef.current?.getBoundingClientRect().height;
    if (h == null) return;
    drag.current = { down: true, startY: e.clientY, startH: h };
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* capture is best-effort */ }
  };
  const onResizeMove = (e) => {
    const d = drag.current;
    if (!d.down) return;
    setArenaH(clampArenaHeight(d.startH + (e.clientY - d.startY), window.innerHeight));
  };
  const onResizeUp = (e) => {
    drag.current.down = false;
    try { e.currentTarget.releasePointerCapture?.(e.pointerId); } catch { /* may already be released */ }
  };
  // pointercancel (touch interrupt, alt-tab, system dialog) can drop the capture
  // without an 'up'; reset so the next drag re-reads a fresh start height.
  const onResizeCancel = () => { drag.current.down = false; };

  // Esc clears the focus.
  useEffect(() => {
    if (!focus) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setFocus(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [focus]);

  // If the focused fighter drops out of the party after a poll, clear focus.
  useEffect(() => {
    if (focus && !party.some((f) => f.name === focus)) setFocus(null);
  }, [party, focus]);

  return (
    <section className="raidview">
      <div className="raid-top">
        <div className="hud-hp">
          <HpBar view={view} onSelect={onSelect} focus={focus} />
        </div>
        <EnrageTimer view={view} />
      </div>
      <div
        className="arena"
        ref={arenaRef}
        style={arenaH != null ? { flex: `0 0 ${arenaH}px` } : undefined}
      >
        <ArenaScene
          view={view} party={party} minions={minions} horde={horde} actions={actions}
          focus={focus} onFocus={setFocus}
        />
        <div className="combat-log">
          <DamageLog view={view} />
        </div>
        <div
          className="arena-resize"
          role="separator"
          aria-orientation="horizontal"
          aria-label="Resize battle scene"
          onPointerDown={onResizeDown}
          onPointerMove={onResizeMove}
          onPointerUp={onResizeUp}
          onPointerCancel={onResizeCancel}
          onDoubleClick={() => setArenaH(null)}
        >
          <span className="arena-resize-grip" />
        </div>
      </div>
      <FighterBar party={party} focus={focus} onFocus={setFocus} />
      <Dock view={view} onSelect={onSelect} focus={focus} />
      <TruthTicker view={view} onSelect={onSelect} focus={focus} />
    </section>
  );
}
