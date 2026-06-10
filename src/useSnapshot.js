import { useCallback, useEffect, useRef, useState } from 'react';

// Polls /api/snapshot. Detects events that are new since the previous poll
// (by timestamp) and hands them to onEvents — that's what drives the boss
// hit / heal animations within one poll cycle of a real Jira change.
export function useSnapshot(onEvents) {
  const [snap, setSnap] = useState(null);
  const [error, setError] = useState(null);
  const lastSeen = useRef(null);
  const pollMs = useRef(60_000);
  const handler = useRef(onEvents);
  handler.current = onEvents;

  const fetchOnce = useCallback(async () => {
    try {
      const res = await fetch('/api/snapshot');
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error || res.statusText);
        return false;
      }
      setError(null);
      pollMs.current = json.pollMs || 60_000;
      const maxTs = Math.max(0, ...(json.events || []).map((e) => e.ts));
      if (lastSeen.current == null) {
        lastSeen.current = maxTs; // first load: don't replay history as live events
      } else {
        const fresh = (json.events || []).filter((e) => e.ts > lastSeen.current);
        if (fresh.length) {
          lastSeen.current = maxTs;
          handler.current?.(fresh);
        }
      }
      setSnap(json);
      return true;
    } catch (e) {
      setError(e.message);
      return false;
    }
  }, []);

  useEffect(() => {
    let dead = false;
    let timer;
    const loop = async () => {
      const ok = await fetchOnce();
      // Recover fast from a down/just-starting server; cruise at pollMs otherwise.
      if (!dead) timer = setTimeout(loop, ok ? pollMs.current : 5000);
    };
    loop();
    const onVis = () => document.visibilityState === 'visible' && fetchOnce();
    document.addEventListener('visibilitychange', onVis);
    return () => {
      dead = true;
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [fetchOnce]);

  return { snap, error, refetch: fetchOnce };
}

// Short-lived animation triggers (boss hits, heals, bay alerts).
export function usePulses() {
  const [pulses, setPulses] = useState([]);
  const counter = useRef(0);
  const fire = useCallback((events) => {
    const stamped = events.map((e) => ({ ...e, id: `p${counter.current++}` }));
    setPulses((p) => [...p, ...stamped]);
    for (const s of stamped) {
      setTimeout(() => setPulses((p) => p.filter((x) => x.id !== s.id)), 3500);
    }
  }, []);
  return [pulses, fire];
}
