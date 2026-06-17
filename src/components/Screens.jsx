import BossFigure from './BossFigure';

export function BootScreen({ error }) {
  return (
    <div className="boot">
      <div className="boot-inner">
        <div className="boot-title">SPRINT BOSS</div>
        {error ? (
          <>
            <div className="boot-bar boot-bar--err"><span /></div>
            <div className="boot-status boot-status--err">Can't reach the floor</div>
            <p className="boot-sub">{error}</p>
            <p className="boot-hint">
              Check .env (JIRA_BASE_URL, JIRA_EMAIL, JIRA_API_TOKEN, JIRA_BOARD_ID) — or run <b>npm run mock</b>.
            </p>
          </>
        ) : (
          <>
            <div className="boot-bar"><span /></div>
            <div className="boot-status">Clocking in…</div>
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
