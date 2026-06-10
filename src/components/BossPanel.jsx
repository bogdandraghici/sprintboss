import BossFigure from './BossFigure';
import { EnrageTimer, HpBar, ScarTimeline, DamageLog } from './hud';

export default function BossPanel({ view, pulses, onSelect }) {
  const { stats } = view;
  const enraged = stats.enraged;
  const hit = pulses.find((p) => p.type === 'done');
  const heal = pulses.find((p) => p.type === 'scope-added');
  const state = hit ? 'hit' : heal ? 'heal' : 'idle';
  const hpFrac = stats.total ? stats.remaining / stats.total : 0;

  return (
    <section className="panel bosspanel" data-enraged={enraged}>
      <EnrageTimer view={view} />
      <div className="boss-stage">
        <div className="boss-wrap" data-state={state} data-enraged={enraged} key={hit?.id || heal?.id || 'idle'}>
          <BossFigure hpFrac={hpFrac} />
          {pulses
            .filter((p) => p.type === 'done' || p.type === 'scope-added')
            .map((p, i) => (
              <span
                key={p.id}
                className="floatnum"
                data-kind={p.type === 'done' ? 'hit' : 'heal'}
                style={{ left: `${42 + ((i * 17) % 22)}%` }}
              >
                {p.type === 'done' ? `−${p.points}` : `+${p.points}`}
              </span>
            ))}
        </div>
      </div>
      <HpBar view={view} onSelect={onSelect} />
      <ScarTimeline view={view} />
      <DamageLog view={view} />
    </section>
  );
}

