import { useCallback, useEffect, useState } from 'react';
import { useSnapshot, usePulses } from './useSnapshot';
import { stateAt } from './timeMachine';
import Header from './components/Header';
import FactoryLine from './components/FactoryLine';
import BossPanel from './components/BossPanel';
import TicketModal from './components/TicketModal';
import { StandupOverlay, RetroBar } from './components/Modes';
import { BootScreen, NoSprintScreen } from './components/Screens';
import RaidView from './raid/RaidView';

function useTheme() {
  const [theme, setTheme] = useState(() => localStorage.getItem('sb-theme') || 'dark');
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('sb-theme', theme);
  }, [theme]);
  return [theme, setTheme];
}

// 'arena' (raid scene) or 'factory' (the original line + boss panel).
function useLayout() {
  const [layout, setLayout] = useState(() => localStorage.getItem('sb-view') || 'arena');
  useEffect(() => {
    localStorage.setItem('sb-view', layout);
  }, [layout]);
  return [layout, setLayout];
}

export default function App() {
  const [pulses, fire] = usePulses();
  const { snap, error, refetch } = useSnapshot(fire);
  const [theme, setTheme] = useTheme();
  const [layout, setLayout] = useLayout();
  const [mode, setMode] = useState('ambient');
  const [selected, setSelected] = useState(null);
  const [retroT, setRetroT] = useState(null);

  const exitToAmbient = useCallback(() => {
    setMode('ambient');
    setRetroT(null);
  }, []);

  // Entering retro starts the scrubber at "now".
  useEffect(() => {
    if (mode === 'retro' && snap && retroT == null) {
      setRetroT(Math.min(snap.now, snap.sprint?.end ?? snap.now));
    }
    if (mode !== 'retro' && retroT != null) setRetroT(null);
  }, [mode, snap, retroT]);

  if (!snap || !snap.sprint) {
    if (!snap) return <BootScreen error={error} />;
    return <NoSprintScreen />;
  }

  const view = mode === 'retro' && retroT != null ? stateAt(snap, retroT) : snap;

  return (
    <div className="app" data-enraged={view.stats.enraged}>
      <Header view={view} mode={mode} setMode={setMode} layout={layout} setLayout={setLayout} theme={theme} setTheme={setTheme} refetch={refetch} />
      <main className="flex-1 grid gap-3 min-h-0" style={{ gridTemplateColumns: layout === 'arena' ? '1fr' : '3fr 2fr' }}>
        {layout === 'arena' ? (
          <RaidView view={view} pulses={mode === 'retro' ? [] : pulses} onSelect={setSelected} />
        ) : (
          <>
            <FactoryLine view={view} onSelect={setSelected} />
            <BossPanel view={view} pulses={mode === 'retro' ? [] : pulses} onSelect={setSelected} />
          </>
        )}
      </main>
      {mode === 'standup' && <StandupOverlay snap={snap} onExit={exitToAmbient} onSelect={setSelected} />}
      {mode === 'retro' && retroT != null && (
        <RetroBar snap={snap} t={retroT} setT={setRetroT} onExit={exitToAmbient} />
      )}
      {selected && <TicketModal issue={selected} view={view} onClose={() => setSelected(null)} />}
    </div>
  );
}
