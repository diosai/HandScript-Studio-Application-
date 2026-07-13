import { useEffect, useMemo, useRef, useState } from 'react';
import type { Command } from '../commands.js';
import { useStore } from '../state/store.js';

/** Fuzzy-ish command palette (Ctrl+K). */
export function CommandPalette({ commands }: { commands: Command[] }): JSX.Element {
  const setUi = useStore((s) => s.setUi);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => inputRef.current?.focus(), []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter((c) => c.title.toLowerCase().includes(q));
  }, [commands, query]);

  const close = (): void => setUi({ paletteOpen: false });

  const runCommand = (command: Command | undefined): void => {
    if (!command) return;
    close();
    void command.run();
  };

  const onKeyDown = (event: React.KeyboardEvent): void => {
    if (event.key === 'Escape') close();
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive((a) => Math.min(filtered.length - 1, a + 1));
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    }
    if (event.key === 'Enter') runCommand(filtered[active]);
  };

  return (
    <div className="palette-backdrop" onMouseDown={close}>
      <div
        className="palette"
        role="dialog"
        aria-label="Command palette"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <input
          ref={inputRef}
          value={query}
          placeholder="Type a command…"
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
          }}
          onKeyDown={onKeyDown}
          aria-label="Search commands"
        />
        <ul role="listbox">
          {filtered.map((command, index) => (
            <li
              key={command.id}
              role="option"
              aria-selected={index === active}
              className={index === active ? 'active' : ''}
              onMouseEnter={() => setActive(index)}
              onClick={() => runCommand(command)}
            >
              <span>{command.title}</span>
              {command.shortcut && <span className="hint">{command.shortcut}</span>}
            </li>
          ))}
          {filtered.length === 0 && <li aria-disabled="true">No matching commands</li>}
        </ul>
      </div>
    </div>
  );
}
