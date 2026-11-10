import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { Icon } from './Icon';
import { COUNTRIES, countryName, flag, searchCountries } from '../lib/countries';

type Props = { value: string; onChange: (code: string) => void; label: string };

/** A country dropdown you can type into: letters filter the list, arrows move, Enter picks, Escape closes. */
export function CountryPicker({ value, onChange, label }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const refocus = useRef(false);
  const matches = useMemo(() => searchCountries(query), [query]);

  function show(seed = '') {
    setQuery(seed);
    setActive(seed ? 0 : Math.max(0, COUNTRIES.indexOf(value)));
    setOpen(true);
  }

  function close(focusButton: boolean) {
    refocus.current = focusButton;
    setOpen(false);
  }

  function choose(code: string) {
    onChange(code);
    close(true);
  }

  useEffect(() => {
    if (open) input.current?.focus();
    else if (refocus.current) button.current?.focus();
    refocus.current = false;
  }, [open]);

  // Keep the highlighted country in view.
  useEffect(() => {
    if (open) list.current?.querySelector<HTMLElement>(`[data-i="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [open, active, matches]);

  // A tap or click outside closes the list.
  useEffect(() => {
    if (!open) return;
    const outside = (e: PointerEvent) => !root.current?.contains(e.target as Node) && close(false);
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [open]);

  function onButtonKey(e: KeyboardEvent) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (/^\p{L}$/u.test(e.key)) {
      e.preventDefault();
      show(e.key);
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      show();
    }
  }

  function onInputKey(e: KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, matches.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (matches[active]) choose(matches[active]);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation(); // close the list, not the sheet
      close(true);
    } else if (e.key === 'Tab') {
      close(false);
    }
  }

  if (!open) {
    return (
      <div className="picker" ref={root}>
        <button ref={button} type="button" className="picker-button" aria-haspopup="listbox" aria-expanded={false}
          aria-label={`${label}: ${countryName(value)}`} onClick={() => show()} onKeyDown={onButtonKey}>
          <span className="flag" aria-hidden="true">{flag(value)}</span>
          <span className="name">{countryName(value)}</span>
          <Icon name="chevron" size={18} />
        </button>
      </div>
    );
  }

  return (
    <div className="picker open" ref={root}>
      <div className="picker-search">
        <Icon name="search" size={18} />
        <input ref={input} role="combobox" aria-expanded aria-controls={`${id}-list`} aria-autocomplete="list" aria-label={label}
          aria-activedescendant={matches[active] ? `${id}-${matches[active]}` : undefined}
          placeholder="Type a country" value={query} autoComplete="off" autoCapitalize="words" spellCheck={false}
          onChange={(e) => (setQuery(e.target.value), setActive(0))} onKeyDown={onInputKey} />
      </div>
      <ul ref={list} id={`${id}-list`} role="listbox" aria-label={label} className="picker-list">
        {matches.map((c, i) => (
          <li key={c} id={`${id}-${c}`} data-i={i} role="option" aria-selected={c === value} className={i === active ? 'active' : undefined}
            onPointerDown={(e) => e.preventDefault()} onPointerMove={() => i !== active && setActive(i)} onClick={() => choose(c)}>
            <span className="flag" aria-hidden="true">{flag(c)}</span>
            <span className="name">{countryName(c)}</span>
            {c === value && <Icon name="check" size={16} />}
          </li>
        ))}
        {matches.length === 0 && <li className="none">No country matches “{query}”</li>}
      </ul>
    </div>
  );
}
