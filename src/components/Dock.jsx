// src/components/Dock.jsx
// The data half of the command deck: real tickets, grouped by board column and,
// within each column, sub-grouped by story (the Jira parent). Stories with 2+
// tickets get a colored sub-header; singletons + parentless tickets fold into a
// quiet "Other" cluster (folded singletons keep their story name inline).
import Ticket from './Ticket';
import { deriveDock, groupByStory, storyColor } from '../raid/raidState';

export default function Dock({ view, onSelect, focus = null }) {
  const { groups, blocked } = deriveDock(view, focus);
  return (
    <div className="dock">
      {groups.map((g) => <DockGroup key={g.idx} group={g} view={view} onSelect={onSelect} />)}
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

function DockGroup({ group, view, onSelect }) {
  const { stories, other } = groupByStory(group.issues);
  return (
    <div className="dock-group" data-kind={group.kind}>
      <div className="dock-head">
        <span className="label">{group.name} · {group.issues.length}</span>
      </div>
      <div className="dock-cards">
        {stories.map((s) => (
          <div key={s.key} className="story-cluster">
            <div className="substory" style={{ '--barc': s.color, '--nmc': s.color }}>
              <span className="bar" />
              <span className="nm">{s.name}</span>
              <span className="ct">{s.issues.length}</span>
            </div>
            <div className="subcards">
              {s.issues.map((i) => (
                <Ticket key={i.key} issue={i} view={view} onSelect={onSelect} accent={s.color} />
              ))}
            </div>
          </div>
        ))}
        {other.length > 0 && (
          <div className="story-cluster">
            {stories.length > 0 && (
              <div className="substory">
                <span className="bar" style={{ background: 'var(--steel-3)' }} />
                <span className="nm" style={{ color: 'var(--faint)' }}>Other</span>
                <span className="ct">{other.length}</span>
              </div>
            )}
            <div className="subcards">
              {other.map((i) => (
                <Ticket
                  key={i.key}
                  issue={i}
                  view={view}
                  onSelect={onSelect}
                  storyCaption={i.parentKey ? { name: i.parentName || i.parentKey, color: storyColor(i.parentKey) } : null}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
