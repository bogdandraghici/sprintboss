import { useEffect, useMemo, useRef, useState } from 'react';
import Avatar from './Avatar';
import Ticket from './Ticket';
import { fmtDateTime, fmtDate, DAY } from '../lib';
import FighterCard from '../raid/FighterCard';
import { deriveParty } from '../raid/raidState';

/* ── standup: per-person — what moved in the last 24h, and where
      everything else is parked ───────────────────────────────────── */

function buildStandup(snap, t0) {
  const doneIdx = snap.doneIdx;
  const colName = (c) => snap.columns[c]?.name ?? '?';
  const byName = new Map();

  for (const i of snap.issues) {
    if (!i.assignee) continue;

    const before = i.colHistory.filter((h) => h.ts <= t0);
    const fromCol = before.length ? before[before.length - 1].col : null; // null = not in sprint yet
    const moves = i.colHistory.filter((h) => h.ts > t0);
    const flags = (i.flagHistory || []).filter((f) => f.ts > t0);
    const joined = i.addedAt > t0;

    // Finished before the window and untouched since: not standup material.
    if (fromCol === doneIdx && !moves.length && !flags.length) continue;

    const entry = byName.get(i.assignee) || { name: i.assignee, avatar: i.assigneeAvatar, moved: [], still: [] };
    entry.avatar ||= i.assigneeAvatar;

    if (moves.length || flags.length || joined) {
      // Endpoints only: where it stood at the window start, where it is now.
      let from = joined && fromCol === null ? 'joined sprint' : colName(fromCol ?? i.colHistory[0].col);
      let to = moves.length ? colName(moves[moves.length - 1].col) : colName(i.col);
      if (!moves.length && flags.length) {
        // Flag-only change: surface the blockage itself.
        if (i.blocked) to = 'blocked';
        else from = 'blocked';
      }
      entry.moved.push({
        issue: i,
        from,
        to,
        done: i.done,
        blockedNow: i.blocked,
        lastTs: Math.max(...moves.map((m) => m.ts), ...flags.map((f) => f.ts), joined ? i.addedAt : 0),
      });
    } else if (!i.done) {
      entry.still.push(i);
    }
    byName.set(i.assignee, entry);
  }

  const people = [...byName.values()];
  for (const p of people) {
    p.moved.sort((a, b) => b.lastTs - a.lastTs);
    p.still.sort((a, b) => b.daysInColumn - a.daysInColumn);
  }
  people.sort((a, b) => b.moved.length - a.moved.length || a.name.localeCompare(b.name));
  return people;
}

// Collapse identical movements ("Code Review ▸ Done" ×2) into one header.
function groupMoves(moved) {
  const out = [];
  const byKey = new Map();
  for (const m of moved) {
    const key = `${m.from} ▸ ${m.to}`;
    let g = byKey.get(key);
    if (!g) {
      g = { key, from: m.from, to: m.to, done: m.done, blocked: m.blockedNow, items: [] };
      byKey.set(key, g);
      out.push(g);
    }
    g.items.push(m);
  }
  return out;
}

function groupParked(still) {
  const out = [];
  const byKey = new Map();
  for (const i of still) {
    let g = byKey.get(i.colName);
    if (!g) {
      g = { key: i.colName, items: [] };
      byKey.set(i.colName, g);
      out.push(g);
    }
    g.items.push(i);
  }
  return out;
}

export function StandupOverlay({ snap, onExit, onSelect }) {
  const people = useMemo(() => buildStandup(snap, snap.now - DAY), [snap]);
  const [sel, setSel] = useState(0);
  const person = people[Math.min(sel, people.length - 1)];
  const party = useMemo(() => deriveParty(snap), [snap]);
  const fighter = person ? party.find((f) => f.name === person.name) : null;

  useEffect(() => {
    const onKey = (e) => {
      if (document.querySelector('.backdrop')) return; // ticket modal owns the keys
      if (e.key === 'Escape') onExit();
      if (e.key === 'ArrowRight') setSel((s) => (s + 1) % people.length);
      if (e.key === 'ArrowLeft') setSel((s) => (s - 1 + people.length) % people.length);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [people.length, onExit]);

  return (
    <div className="standup">
      <div className="text-center">
        <div className="label" style={{ color: 'var(--teal)' }}>Standup · last 24h</div>
        <div className="label label-faint mt-1">←/→ to switch · ESC to exit</div>
      </div>

      <div className="su-people">
        {people.map((p, i) => (
          <button key={p.name} className="person" data-on={i === sel} data-idle={p.moved.length === 0} onClick={() => setSel(i)}>
            <Avatar name={p.name} src={p.avatar} size="1.5rem" />
            <span className="person-name">{p.name.split(' ')[0]}</span>
            {p.moved.length > 0 && <span className="person-count">{p.moved.length}</span>}
          </button>
        ))}
        {people.length === 0 && <span className="label label-faint">No assigned tickets in this sprint.</span>}
      </div>

      {person && (
        <div className="su-body">
          {fighter && <FighterCard fighter={fighter} movedCount={person.moved.length} />}
          <div className="panel su-board">
          <div className="flex items-center mb-2">
            <span className="label label-faint ml-auto">
              {person.moved.length} moved · {person.still.length} parked
            </span>
          </div>

          <div className="label mb-1" style={{ color: 'var(--teal)' }}>Moved yesterday</div>
          {person.moved.length === 0 && (
            <div className="text-[0.78rem] mb-2" style={{ color: 'var(--faint)' }}>Nothing moved in the last 24h.</div>
          )}
          {groupMoves(person.moved).map((g) => (
            <div key={g.key}>
              <div className="su-group">
                <span className="su-from">{g.from}</span>
                <span className="su-arrow">▸</span>
                <span className="su-to" data-k={g.done ? 'done' : g.blocked ? 'blocked' : ''}>{g.to}</span>
                {g.items.length > 1 && <span className="su-count">×{g.items.length}</span>}
                <span className="su-rule" />
              </div>
              <div className="flex flex-col gap-[0.45rem]">
                {g.items.map((m) => (
                  <Ticket key={m.issue.key} issue={m.issue} view={snap} onSelect={(i) => onSelect?.(i)} />
                ))}
              </div>
            </div>
          ))}

          <div className="label mt-5 mb-1 label-faint">Still parked</div>
          {person.still.length === 0 && (
            <div className="text-[0.78rem]" style={{ color: 'var(--faint)' }}>Nothing else on their belt.</div>
          )}
          {groupParked(person.still).map((g) => (
            <div key={g.key}>
              <div className="su-group">
                <span className="su-from">{g.key}</span>
                {g.items.length > 1 && <span className="su-count">×{g.items.length}</span>}
                <span className="su-rule" />
              </div>
              <div className="flex flex-col gap-[0.45rem]">
                {g.items.map((i) => (
                  <Ticket key={i.key} issue={i} view={snap} onSelect={(x) => onSelect?.(x)} />
                ))}
              </div>
            </div>
          ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── retro: scrub the whole sprint ─────────────────────────────── */

export function RetroBar({ snap, t, setT, onExit }) {
  const start = snap.sprint.start;
  const max = Math.min(snap.now, snap.sprint.end);
  const span = max - start;
  const [playing, setPlaying] = useState(false);
  const raf = useRef();

  useEffect(() => {
    if (!playing) return;
    let last = performance.now();
    const step = (nowMs) => {
      const dt = nowMs - last;
      last = nowMs;
      setT((cur) => {
        const next = cur + (span / 30_000) * dt; // whole sprint in ~30s
        if (next >= max) { setPlaying(false); return max; }
        return next;
      });
      raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf.current);
  }, [playing, span, max, setT]);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onExit();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onExit]);

  const marks = snap.events.filter((e) => ['done', 'scope-added', 'blocked'].includes(e.type) && e.ts <= max);
  const day = Math.floor((t - start) / DAY) + 1;
  const totalDays = Math.ceil((snap.sprint.end - start) / DAY);

  return (
    <div className="panel retrobar">
      <button
        className="iconbtn"
        style={{ width: '2.4rem', height: '2.4rem', fontSize: '1rem' }}
        onClick={() => {
          if (!playing && t >= max - 1000) setT(start);
          setPlaying((p) => !p);
        }}
      >
        {playing ? '❚❚' : '▶'}
      </button>
      <div className="retro-slider">
        <div className="retro-marks">
          {marks.map((e, i) => (
            <span
              key={i}
              className="retro-mark"
              data-t={e.type}
              style={{ left: `${((e.ts - start) / span) * 100}%` }}
              data-tip={`${e.key} · ${fmtDate(e.ts)}`}
            >
              {e.type === 'done' ? '▾' : e.type === 'scope-added' ? '✚' : '⛌'}
            </span>
          ))}
        </div>
        <input
          type="range"
          min={0}
          max={1000}
          value={span ? ((t - start) / span) * 1000 : 0}
          onChange={(e) => {
            setPlaying(false);
            setT(start + (Number(e.target.value) / 1000) * span);
          }}
        />
      </div>
      <div className="text-right flex-none" style={{ minWidth: '11rem' }}>
        <div className="mono font-bold text-[0.9rem]">Day {Math.max(1, day)} / {totalDays}</div>
        <div className="label label-faint">{fmtDateTime(t)}</div>
      </div>
      <button
        className="chip"
        style={{ color: 'var(--teal)', borderColor: 'var(--teal)', padding: '0.5em 1em' }}
        onClick={onExit}
      >
        ⏎ BACK TO LIVE
      </button>
    </div>
  );
}
