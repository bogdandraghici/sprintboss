// src/components/TooltipLayer.jsx
// The one tooltip in the app. Any DOM element can declare data-tip="…" and
// this root-mounted layer renders it as a single fixed-position bubble — a
// pseudo-element approach would be clipped by the dock's internally-scrolling
// columns. Nested [data-tip] resolves to the innermost (closest()). Hover-only
// by design: the TV has no pointer, so the wall display never sees it.
import { useEffect, useRef, useState } from 'react';

const SHOW_DELAY = 150; // ms before the bubble appears
const TOP_FLIP = 64; // px — anchors above this line get the bubble below them
const EDGE = 150; // px — keep the bubble's center clear of the viewport edges

export default function TooltipLayer() {
  const [tip, setTip] = useState(null); // { text, x, y, below }
  const timer = useRef(null);
  const anchor = useRef(null);

  useEffect(() => {
    const hide = () => {
      clearTimeout(timer.current);
      anchor.current = null;
      setTip(null);
    };
    const onOver = (e) => {
      const el = e.target instanceof Element ? e.target.closest('[data-tip]') : null;
      if (el === anchor.current) return;
      clearTimeout(timer.current);
      anchor.current = el;
      setTip(null);
      if (!el) return;
      timer.current = setTimeout(() => {
        if (!el.isConnected) return hide();
        const text = el.getAttribute('data-tip');
        if (!text) return;
        const r = el.getBoundingClientRect();
        const below = r.top < TOP_FLIP;
        setTip({ text, x: r.left + r.width / 2, y: below ? r.bottom : r.top, below });
      }, SHOW_DELAY);
    };
    // pointerover covers anchor-to-anchor moves; pointerout only matters when
    // the cursor leaves the window entirely (no further over events fire).
    const onOut = (e) => {
      if (!e.relatedTarget) hide();
    };
    const onKey = (e) => e.key === 'Escape' && hide();
    document.addEventListener('pointerover', onOver);
    document.addEventListener('pointerout', onOut);
    document.addEventListener('pointerdown', hide);
    document.addEventListener('scroll', hide, true);
    document.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(timer.current);
      document.removeEventListener('pointerover', onOver);
      document.removeEventListener('pointerout', onOut);
      document.removeEventListener('pointerdown', hide);
      document.removeEventListener('scroll', hide, true);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  if (!tip) return null;
  const x = Math.max(EDGE, Math.min(window.innerWidth - EDGE, tip.x));
  return (
    <div
      className="tipbox mono"
      aria-hidden="true"
      data-below={tip.below || undefined}
      style={{ left: x, top: tip.y }}
    >
      {tip.text}
    </div>
  );
}
