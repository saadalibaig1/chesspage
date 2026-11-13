/** chesspage.com/privacy: the privacy policy, as its own plain page. */
export function Privacy() {
  return (
    <main className="doc">
      <a className="doc-back" href="/">← ChessPage</a>
      <h1>Privacy Policy</h1>
      <p className="muted">Last updated: November 13, 2026</p>
      <p>ChessPage (chesspage.com) is a daily chess puzzle game. Contact: <a href="mailto:hello@chesspage.com">hello@chesspage.com</a>.</p>

      <h2>If you play without signing in</h2>
      <ul>
        <li>Your results, streak and settings stay in your browser (local storage). We don’t receive them.</li>
        <li>We don’t use ads, tracking or analytics, and we don’t set cookies for them.</li>
        <li>Our host, Vercel, keeps standard server logs (such as IP address and browser type) for a short time, for security.</li>
      </ul>

      <h2>If you sign in with Google</h2>
      <p>We receive and store:</p>
      <ul>
        <li>Your Google account ID, name and email address, from Google.</li>
        <li>The username and country you choose.</li>
        <li>Your puzzle results: moves played, tries used, hints, times and dates.</li>
      </ul>
      <p>We use this data only to keep your stats and streak across devices, and to show your username, country and results on the leaderboards.</p>
      <p>Other players can see your <b>username, country and results</b>. They can’t see your name or email.</p>
      <p>Your browser keeps you signed in with Google’s sign-in service (Firebase). We don’t sell your data or share it for advertising.</p>

      <h2>Who processes the data</h2>
      <ul>
        <li><b>Google (Firebase Authentication):</b> sign-in.</li>
        <li><b>Vercel:</b> hosting and server.</li>
        <li><b>Neon:</b> database.</li>
      </ul>
      <p>These services may store data outside your country.</p>

      <h2>Your choices</h2>
      <ul>
        <li>You can change your username and country at any time in Settings.</li>
        <li>To delete your account and all its data, email <a href="mailto:hello@chesspage.com">hello@chesspage.com</a> from the address you signed in with. We delete it within 30 days.</li>
        <li>You can always play without signing in.</li>
      </ul>

      <h2>Children</h2>
      <p>Children under 13 (under 16 in the EU) shouldn’t sign in. They can play without an account.</p>

      <h2>Changes</h2>
      <p>If this policy changes, we update the date at the top of this page.</p>
    </main>
  );
}

/** The small line at the bottom of the page, as on Wordle. */
export function Footer() {
  return (
    <footer className="legal">
      <span>© {new Date().getFullYear()} ChessPage</span>
      <a href="/privacy">Privacy Policy</a>
    </footer>
  );
}
