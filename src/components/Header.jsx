export default function Header({ view, mode, setMode, theme, setTheme, refetch }) {
  const demo = async (action) => {
    await fetch(`/api/demo/${action}`, { method: 'POST' });
    refetch();
  };

  return (
    <header className="flex items-center gap-4 flex-none">
      <div className="flex items-baseline gap-3 min-w-0">
        <span className="label" style={{ color: 'var(--teal)' }}>⚙ Sprint Boss</span>
        <h1 className="text-[0.95rem] font-semibold tracking-wide truncate m-0">{view.sprint.name}</h1>
        {view.closedFallback && <span className="chip" style={{ color: 'var(--amber)' }}>CLOSED SPRINT</span>}
        {view.timeTravel && <span className="chip" style={{ color: 'var(--amber)' }}>⏪ TIME TRAVEL</span>}
        {view.stale && <span className="chip" style={{ color: 'var(--red)' }} data-tip={view.staleError}>STALE DATA</span>}
      </div>

      <div className="ml-auto flex items-center gap-3 flex-none">
        {view.source === 'mock' && (
          <span className="flex items-center gap-1.5" style={{ opacity: 0.65 }}>
            <span className="chip" style={{ color: 'var(--amber)' }}>MOCK</span>
            <button className="chip" onClick={() => demo('hit')} data-tip="Complete a ticket (demo)">hit</button>
            <button className="chip" onClick={() => demo('heal')} data-tip="Add scope (demo)">heal</button>
            <button className="chip" onClick={() => demo('block')} data-tip="Block a ticket (demo)">block</button>
          </span>
        )}
        <div className="seg-ctl">
          {['ambient', 'standup', 'retro'].map((m) => (
            <button key={m} data-on={mode === m} onClick={() => setMode(m)}>
              {m}
            </button>
          ))}
        </div>
        <button
          className="iconbtn"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          data-tip="Toggle theme"
        >
          {theme === 'dark' ? '☀' : '☾'}
        </button>
      </div>
    </header>
  );
}
