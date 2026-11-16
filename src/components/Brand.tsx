/** The ChessPage icon: a two-by-two board with a disc, as in the app icon. */
export function Logo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" aria-hidden="true">
      <rect width="64" height="64" rx="14" fill="#769656" />
      <rect x="32" width="32" height="32" fill="#eeeed2" />
      <rect y="32" width="32" height="32" fill="#eeeed2" />
      <circle cx="32" cy="32" r="13" fill="#fff" stroke="#262421" strokeWidth="4" />
    </svg>
  );
}

/** The top bar of the standalone pages (team, privacy): the icon and name, linking back to the game. */
export function PageHeader() {
  return (
    <header className="page-head">
      <a href="/" aria-label="ChessPage: back to the game">
        <Logo className="page-logo" />
        <span className="brand">ChessPage</span>
      </a>
    </header>
  );
}
