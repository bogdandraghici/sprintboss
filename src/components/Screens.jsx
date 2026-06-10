import BossFigure from './BossFigure';

export function BootScreen({ error }) {
  return (
    <div className="app items-center justify-center">
      <div className="panel pop-in flex flex-col items-center gap-4 px-10 py-8 max-w-[34rem] text-center">
        <div style={{ width: '9rem', opacity: error ? 0.45 : 1, filter: error ? 'grayscale(0.8)' : 'none' }}>
          <BossFigure hpFrac={1} />
        </div>
        {error ? (
          <>
            <div className="label" style={{ color: 'var(--red)' }}>Can't reach the floor</div>
            <p className="text-[0.85rem] m-0" style={{ color: 'var(--dim)' }}>{error}</p>
            <p className="text-[0.75rem] m-0 mono" style={{ color: 'var(--faint)' }}>
              Check .env (JIRA_BASE_URL, JIRA_EMAIL, JIRA_API_TOKEN, JIRA_BOARD_ID) — or run <b>npm run mock</b>.
            </p>
          </>
        ) : (
          <>
            <div className="label" style={{ color: 'var(--teal)' }}>Clocking in…</div>
            <p className="text-[0.85rem] m-0" style={{ color: 'var(--dim)' }}>Waking the boss, warming up the belt.</p>
          </>
        )}
      </div>
    </div>
  );
}

export function NoSprintScreen() {
  return (
    <div className="app items-center justify-center">
      <div className="panel pop-in flex flex-col items-center gap-4 px-10 py-8 max-w-[34rem] text-center">
        <div style={{ width: '9rem', opacity: 0.6, filter: 'saturate(0.4)' }}>
          <BossFigure hpFrac={0} />
        </div>
        <div className="label" style={{ color: 'var(--amber)' }}>No active sprint</div>
        <p className="text-[0.85rem] m-0" style={{ color: 'var(--dim)' }}>
          The boss is between shifts. Start a sprint on this board and the floor lights up on the next poll.
        </p>
      </div>
    </div>
  );
}
