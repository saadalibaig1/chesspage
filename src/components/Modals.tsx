import { useEffect, useState } from 'react';
import { Icon } from './Icon';
import { Sheet } from './Sheet';
import { ALL_COUNTRIES, countryName, flag } from '../lib/country';
import { ranked, simulatedRows, withPlayer, type Metric } from '../lib/leaderboard';
import { ladderStats, shareText, TRIES, type DayResult } from '../lib/results';
import { LADDER_SIZE, LEVELS, msUntilMidnight, TIMER_LEVEL } from '../lib/daily';
import { shareOrCopy } from '../lib/share';
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
        <p className="lead">Today’s ladder: {LADDER_SIZE} levels, {LEVELS[0]} to {LEVELS[LADDER_SIZE - 1]}.</p>
        <ul>
          <li>Tap any level to play it. Do one, a few, or all six, in any order.</li>
          <li>Find the best move. Drag or tap a piece to play it.</li>
          <li>You get {TRIES} tries on each level. A wrong move uses a try. The same wrong move again is free.</li>
          <li>Out of tries? That level ends and its solution plays. The other levels stay open.</li>
        </ul>
        <h4>Example</h4>
        <div className="demo-row">
          {LEVELS.slice(0, LADDER_SIZE).map((r, i) => <Tile key={r} c={['solved', 'solved', 'failed', '', 'solved', ''][i] || undefined}>{String(r)}</Tile>)}
        </div>
        <p className="small">Played four levels and solved three: <b>3/4</b>.</p>
        <p className="small">Tap <b>Hint</b> once to see which piece moves, and again to see where it goes. Turn hints off with Hard Mode.</p>
        <hr />
        <p className="small"><b>Timer:</b> one {LEVELS[TIMER_LEVEL]} puzzle a day, the same for everyone. Solve it in under a minute.</p>
        <hr />
        <p className="small muted">New levels arrive every day at midnight. Everyone gets the same ones.</p>
      </div>
    </Sheet>
  );
}

type StatsProps = {
  store: Store;
  today: string;
  day: number;
  result: DayResult | null;
  test: boolean;
  onClose: () => void;
  onLeaderboard: () => void;
};

export function StatsModal({ store, today, day, result, test, onClose, onLeaderboard }: StatsProps) {
  const s = ladderStats(store.ladder.history, today);
  const shown = result ?? store.ladder.history[today] ?? null;
  const top = Math.max(1, ...s.dist);
  const [copied, setCopied] = useState(false);

  async function share() {
    await shareOrCopy(shareText(day, shown!, test));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <Sheet title="Statistics" onClose={onClose}>
      <div className="stats">
        <h3 className="caps">Statistics</h3>
        <div className="numbers">
          <div><b className="num">{s.played}</b><span>Played</span></div>
          <div><b className="num">{s.avg}</b><span>Average</span></div>
          <div><b className="num">{s.current}</b><span>Current Streak</span></div>
          <div><b className="num">{s.max}</b><span>Max Streak</span></div>
        </div>
        <h3 className="caps">Puzzles Solved</h3>
        {s.played === 0 ? (
          <p className="center muted small">No data yet. Play a level today!</p>
        ) : (
          <ol className="dist">
            {s.dist.map((count, i) => (
              <li key={i}>
                <span className="num">{i}</span>
                <span className={`bar${s.today === i ? ' today' : ''}`} style={{ width: `${Math.max(7, (count / top) * 100)}%` }}>
                  <b className="num">{count}</b>
                </span>
              </li>
            ))}
          </ol>
        )}
        {shown && (
          <div className="post">
            <div className="next">
              <h3 className="caps">Next ladder</h3>
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

type BoardProps = { date: string; country: string; store: Store; onCountry: (iso: string) => void; onClose: () => void };

export function LeaderboardModal({ date, country, store, onCountry, onClose }: BoardProps) {
  const [metric, setMetric] = useState<Metric>('avg');
  const today = store.ladder.history[date] ?? null;
  const streak = ladderStats(store.ladder.history, date).current;
  const rows = ranked(withPlayer(simulatedRows(date), country, today, streak), metric);
  const value = (r: (typeof rows)[number]) =>
    metric === 'avg' ? (r.avg ? r.avg.toFixed(1) : '—') : metric === 'full' ? `${r.fullPct}%` : `${r.longestStreak}`;
  const tabs: [Metric, string][] = [['avg', 'Avg solved'], ['full', 'All six'], ['streak', 'Streak']];
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
      <p className="muted small">Prototype: simulated data. {today ? 'Your result is counted in your country.' : 'Play a level today to add your result.'}</p>
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
    ['testMode', 'Test Mode', 'Daily: unlimited random ladders, not counted'],
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
