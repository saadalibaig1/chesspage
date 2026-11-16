import { useEffect, useRef, useState } from 'react';
import { Icon } from './Icon';

/** The ? in the header opens a short menu, as on Wordle: How to play, Email us, Team. */
export function HelpMenu({ onHowTo }: { onHowTo: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => ref.current?.contains(e.target as Node) || setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', away);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('pointerdown', away);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);

  return (
    <div className="help-menu" ref={ref}>
      <button type="button" className={`icon${open ? ' on' : ''}`} onClick={() => setOpen((o) => !o)} aria-label="Help" aria-haspopup="menu" aria-expanded={open}>
        <Icon name="help" />
      </button>
      {open && (
        <div className="menu" role="menu">
          <button type="button" role="menuitem" onClick={() => (setOpen(false), onHowTo())}>How to play</button>
          <a role="menuitem" href="mailto:hello@chesspage.com" onClick={() => setOpen(false)}>
            Email us <Icon name="external" size={16} />
          </a>
          <a role="menuitem" href="/team" target="_blank" rel="noopener" onClick={() => setOpen(false)}>
            Team <Icon name="external" size={16} />
          </a>
        </div>
      )}
    </div>
  );
}
