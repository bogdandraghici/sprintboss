// src/components/Dock.jsx
// The data half of the command deck: real tickets, grouped by board column and,
// within each column, sub-grouped by story (the Jira parent). Every parent gets
// its own colored sub-header + a hairline story-wide progress meter (even a
// single-ticket story); only truly parentless tickets fold into the quiet
// "Other" cluster (no meter, story names inline where needed).
import { useMemo } from 'react';
import Ticket from './Ticket';
import { deriveDock, groupByStory, storyColor, storyProgress } from '../raid/raidState';

export default function Dock({ view, onSelect, focus = null }) {
  const { groups, blocked } = useMemo(() => deriveDock(view, focus), [view, focus]);
  // Story-wide (never focus-filtered): the meter is a fact about the objective,
  // not the person — the cards beneath already filter.
  const progress = useMemo(() => storyProgress(view), [view]);
  return (
    <div className="dock">
      {groups.map((g) => <DockGroup key={g.idx} group={g} view={view} onSelect={onSelect} progress={progress} />)}
      <div className="dock-group dock-blocked" data-occupied={blocked.length > 0}>
        <div className="dock-head">
          <span className="label" style={{ color: blocked.length ? 'var(--red)' : 'var(--faint)' }}>
            {blocked.length ? `⚑ Blocked · ${blocked.length}` : 'No blockers'}
          </span>
        </div>
        <div className="dock-cards">
          {blocked.map((i) => (
            <div key={i.key} className="dock-blocked-card">
              <Ticket
                issue={i}
                view={view}
                onSelect={onSelect}
                storyCaption={i.parentKey ? { name: i.parentName || i.parentKey, color: storyColor(i.parentKey) } : null}
              />
              <span className="dock-reason">{i.blockedReason || 'Flagged'}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DockGroup({ group, view, onSelect, progress }) {
  const { stories, other } = groupByStory(group.issues);
  return (
    <div className="dock-group" data-kind={group.kind}>
      <div className="dock-head">
        <span className="label">{group.name} · {group.issues.length}</span>
      </div>
      <div className="dock-cards">
        {stories.map((s) => {
          const p = progress.get(s.key);
          const pct = p && p.total ? (p.done / p.total) * 100 : 0;
          return (
            <div key={s.key} className="story-cluster">
              <div className="substory" style={{ '--barc': s.color, '--nmc': s.color }}>
                <span className="bar" />
                <span className="nm">{s.name}</span>
                <span className="ct">{s.issues.length}</span>
              </div>
              <div className="story-meter" style={{ '--barc': s.color }} title={p ? `${p.done}/${p.total} done` : undefined}>
                <span style={{ width: `${pct}%` }} />
              </div>
              <div className="subcards">
                {s.issues.map((i) => (
                  <Ticket key={i.key} issue={i} view={view} onSelect={onSelect} accent={s.color} />
                ))}
              </div>
            </div>
          );
        })}
        {other.length > 0 && (
          <div className="story-cluster">
            <div className="substory">
              <span className="bar" style={{ background: 'var(--steel-3)' }} />
              <span className="nm" style={{ color: 'var(--faint)' }}>Other</span>
              <span className="ct">{other.length}</span>
            </div>
            <div className="subcards">
              {other.map((i) => (
                <Ticket key={i.key} issue={i} view={view} onSelect={onSelect} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
