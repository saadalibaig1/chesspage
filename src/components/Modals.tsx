import { useEffect, useState } from 'react';
import { Icon } from './Icon';
import { Sheet } from './Sheet';
import { ALL_COUNTRIES, countryName, flag } from '../lib/country';
import { ranked, simulatedRows, withPlayer, type Metric } from '../lib/leaderboard';
import { shareText, stats, type DayResult, type Mode } from '../lib/results';
import { msUntilMidnight } from '../lib/daily';
import type { Settings, Store } from '../lib/storage';

export function Countdown() {
  const [ms, setMs] = useState(msUntilMidnight());
  useEffect(() => {
    const t = setInterval(() => setMs(msUntilMidnight()), 1000);
    return () => clearInterval(t);
  }, []);
  const s = Math.floor(ms / 1000);
  const p = (n: number) => String(n).padStart(2, '0');
  return <span className="num">{`${p(Math.floor(s / 3600))}:${p(Math.floor((s % 3600) / 60))}:${p(s % 60)}`}</span>;
}

function Tile({ c, children }: { c?: string; children?: string }) {
  return <span className={`tile demo${c ? ` ${c}` : ''}`}>{children}</span>;
}

export function HelpModal({ onClose }: { onClose: () => void }) {
  return (
    <Sheet title="How To Play" onClose={onClose}>
      <div className="help">
        <h2 className="title">How To Play</h2>
        <p className="lead">Solve the puzzle in 6 tries.</p>
        <ul>
          <li>Find the best move. Drag or tap a piece to play it.</li>
          <li>Every wrong move uses a try. The opponent replies on their own.</li>
          <li>Some puzzles take two or three moves. The dots show where you are.</li>
        </ul>
        <h4>Examples</h4>
        <div className="demo-row"><Tile c="clean" /><Tile /><Tile /><Tile /><Tile /><Tile /></div>
        <p className="small">Solved on the first try: <b>1/6</b>.</p>
        <div className="demo-row"><Tile c="miss" /><Tile c="miss" /><Tile c="clean" /><Tile /><Tile /><Tile /></div>
        <p className="small">Two wrong moves, then solved: <b>3/6</b>.</p>
        <div className="demo-row"><Tile c="miss" /><Tile c="messy" /><Tile /><Tile /><Tile /><Tile /></div>
        <p className="small">Solved with a hint. Tap <b>Hint</b> once to see which piece moves, and again to see where it goes. Turn hints off with Hard Mode.</p>
        <hr />
        <p className="small muted">A new puzzle arrives every day at midnight. Everyone plays the same one.</p>
      </div>
    </Sheet>
  );
}

type StatsProps = {
  mode: Mode;
  store: Store;
  today: string;
  day: number;
  result: DayResult | null;
  test: boolean;
  onClose: () => void;
  onLeaderboard: () => void;
};

export function StatsModal({ mode, store, today, day, result, test, onClose, onLeaderboard }: StatsProps) {
  const s = stats(mode, store[mode].history, today);
  const shown = result ?? store[mode].history[today] ?? null;
  const top = Math.max(1, ...s.dist);
  const [copied, setCopied] = useState(false);

  async function share() {
    const text = shareText(mode, day, shown!, test);
    try {
      if (navigator.share && matchMedia('(pointer: coarse)').matches) await navigator.share({ text });
      else await navigator.clipboard.writeText(text);
    } catch {
      const t = document.createElement('textarea');
      t.value = text;
      document.body.append(t);
      t.select();
      document.execCommand('copy');
      t.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <Sheet title="Statistics" onClose={onClose}>
      <div className="stats">
        <h3 className="caps">Statistics</h3>
        <div className="numbers">
          <div><b className="num">{s.played}</b><span>Played</span></div>
          <div><b className="num">{s.winPct}</b><span>Win %</span></div>
          <div><b className="num">{s.current}</b><span>Current Streak</span></div>
          <div><b className="num">{s.max}</b><span>Max Streak</span></div>
        </div>
        <h3 className="caps">{mode === 'solo' ? 'Guess Distribution' : 'Puzzles Solved'}</h3>
        {s.played === 0 ? (
          <p className="center muted small">No data yet. Play today’s puzzle!</p>
        ) : (
          <ol className="dist">
            {s.labels.map((label, i) => (
              <li key={label}>
                <span className="num">{label}</span>
                <span className={`bar${s.today === Number(label) ? ' today' : ''}`} style={{ width: `${Math.max(7, (s.dist[i] / top) * 100)}%` }}>
                  <b className="num">{s.dist[i]}</b>
                </span>
              </li>
            ))}
          </ol>
        )}
        {shown && (
          <div className="post">
            <div className="next">
              <h3 className="caps">Next puzzle</h3>
              <span className="clock"><Countdown /></span>
            </div>
            <div className="divider" />
            <button type="button" className="share" onClick={share} data-autofocus>
              {copied ? 'Copied' : 'Share'} <Icon name={copied ? 'check' : 'share'} size={22} />
            </button>
          </div>
        )}
        {test && shown && <p className="center muted small">Test run, not counted in your stats.</p>}
        <button type="button" className="link" onClick={onLeaderboard}>See today’s country leaderboard</button>
      </div>
    </Sheet>
  );
}

type BoardProps = { mode: Mode; date: string; country: string; store: Store; onCountry: (iso: string) => void; onClose: () => void };

export function LeaderboardModal({ mode, date, country, store, onCountry, onClose }: BoardProps) {
  const [metric, setMetric] = useState<Metric>('win');
  const today = store[mode].history[date] ?? null;
  const streak = stats(mode, store[mode].history, date).current;
  const rows = ranked(withPlayer(simulatedRows(date, mode), country, today, streak), metric, mode);
  const value = (r: (typeof rows)[number]) =>
    metric === 'win' ? `${r.winPct}%` : metric === 'avg' ? (r.avg ? r.avg.toFixed(1) : '—') : `${r.longestStreak}`;
  const tabs: [Metric, string][] = [['win', 'Win %'], ['avg', mode === 'solo' ? 'Avg tries' : 'Avg solved'], ['streak', 'Streak']];
  const mine = rows.findIndex((r) => r.you) + 1;

  return (
    <Sheet title="Leaderboard" onClose={onClose}>
      <h3 className="caps">Today by country</h3>
      <div className="seg" role="tablist">
        {tabs.map(([m, label]) => (
          <button key={m} type="button" role="tab" aria-selected={metric === m} className={metric === m ? 'on' : ''} onClick={() => setMetric(m)}>
            {label}
          </button>
        ))}
      </div>
      <p className="lb-me">
        <span aria-hidden="true">{flag(country)}</span> {countryName(country)} is <b className="num">#{mine}</b> of {rows.length}
      </p>
      <ol className="lb">
        {rows.map((r, i) => (
          <li key={r.iso} className={r.you ? 'you' : ''}>
            <span className="pos num">{i + 1}</span>
            <span className="flag" aria-hidden="true">{flag(r.iso)}</span>
            <span className="name">{countryName(r.iso)}</span>
            <span className="players num">{r.players.toLocaleString('en-US')}</span>
            <span className="val num">{value(r)}</span>
          </li>
        ))}
      </ol>
      <label className="field">
        <span>Your country</span>
        <select value={country} onChange={(e) => onCountry(e.target.value)}>
          {[...new Set([country, ...ALL_COUNTRIES, 'WW'])].map((iso) => (
            <option key={iso} value={iso}>{flag(iso)} {countryName(iso)}</option>
          ))}
        </select>
      </label>
      <p className="muted small">Prototype: simulated data. {today ? 'Your result is counted in your country.' : 'Finish today’s puzzle to add your result.'}</p>
    </Sheet>
  );
}

type SettingsProps = { settings: Settings; onSetting: (k: keyof Settings, v: boolean) => void; onClose: () => void };

export function SettingsModal({ settings, onSetting, onClose }: SettingsProps) {
  const rows: [keyof Settings, string, string][] = [
    ['hard', 'Hard Mode', 'No hints'],
    ['contrast', 'High Contrast Mode', 'For improved color vision'],
    ['sound', 'Sound', 'Move and result sounds'],
    ['coords', 'Coordinates', 'Files and ranks on the board'],
    ['testMode', 'Test Mode', 'Unlimited random puzzles, not counted'],
  ];
  return (
    <Sheet title="Settings" onClose={onClose}>
      <h3 className="caps">Settings</h3>
      <ul className="settings">
        {rows.map(([k, label, hint]) => (
          <li key={k}>
            <label>
              <span><b>{label}</b><small>{hint}</small></span>
              <input type="checkbox" role="switch" aria-label={label} checked={settings[k]} onChange={(e) => onSetting(k, e.target.checked)} />
            </label>
          </li>
        ))}
      </ul>
      <p className="credits">
        Puzzles from the <a href="https://database.lichess.org/#puzzles" target="_blank" rel="noreferrer">Lichess database</a> (CC0).
        Pieces: cburnett (CC BY-SA 3.0).
      </p>
    </Sheet>
  );
}
