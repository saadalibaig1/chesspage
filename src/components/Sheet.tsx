import { useEffect, useRef, type ReactNode } from 'react';
import { Icon } from './Icon';

type Props = { title: string; onClose: () => void; children: ReactNode };

/** Wordle-style modal: a centered white card over a light scrim. */
export function Sheet({ title, onClose, children }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    const panel = ref.current!;
    (panel.querySelector<HTMLElement>('[data-autofocus]') ?? panel).focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') return onClose();
      if (e.key !== 'Tab') return;
      const f = panel.querySelectorAll<HTMLElement>('button, [href], select, input, [tabindex]:not([tabindex="-1"])');
      const first = f[0];
      const last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) (e.preventDefault(), last.focus());
      else if (!e.shiftKey && document.activeElement === last) (e.preventDefault(), first.focus());
    }
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      prev?.focus();
    };
  }, [onClose]);

  return (
    <div className="scrim" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={ref} className="card" role="dialog" aria-modal="true" aria-label={title} tabIndex={-1}>
        <button type="button" className="close" onClick={onClose} aria-label="Close">
          <Icon name="close" size={22} />
        </button>
        {children}
      </div>
    </div>
  );
}
