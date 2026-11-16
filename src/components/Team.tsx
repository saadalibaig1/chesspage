import { Footer } from './Privacy';
import { Icon } from './Icon';

type Person = { name: string; title: string; about: string; linkedin: string; photo?: string };

// Placeholders until the real names, photos and links arrive. A photo goes in public/team/ and its path in `photo`.
const TEAM: Person[] = [
  { name: 'First Last', title: 'Co-Founder', about: 'A short line about this person: what they did before and what they do at ChessPage.', linkedin: 'https://www.linkedin.com/' },
  { name: 'First Last', title: 'Co-Founder', about: 'A short line about this person: what they did before and what they do at ChessPage.', linkedin: 'https://www.linkedin.com/' },
  { name: 'First Last', title: 'Engineering', about: 'A short line about this person: what they did before and what they do at ChessPage.', linkedin: 'https://www.linkedin.com/' },
];

/** A grey square with a simple head-and-shoulders shape, until a photo arrives. */
function Placeholder() {
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true">
      <rect width="100" height="100" fill="#d6d7d9" />
      <circle cx="50" cy="40" r="17" fill="#b5b7ba" />
      <path d="M18 100c2-20 16-32 32-32s30 12 32 32z" fill="#b5b7ba" />
    </svg>
  );
}

/** chesspage.com/team: the people behind ChessPage. */
export function Team() {
  return (
    <main className="doc team">
      <a className="doc-back" href="/">← ChessPage</a>
      <h1>The team</h1>
      <p className="muted">ChessPage is made by Boston Venture Studio and Arbisoft.</p>
      <ul className="people">
        {TEAM.map((p, i) => (
          <li key={i}>
            <div className="photo">{p.photo ? <img src={p.photo} alt="" /> : <Placeholder />}</div>
            <h2>{p.name}</h2>
            <p className="role">{p.title}</p>
            <p>{p.about}</p>
            <a href={p.linkedin} target="_blank" rel="noopener">LinkedIn <Icon name="external" size={14} /></a>
          </li>
        ))}
      </ul>
      <Footer />
    </main>
  );
}
