import { useEffect } from 'react';
import type { Command } from '../commands.js';

/**
 * Global keyboard shortcuts, mapped from the command registry.
 * Cmd is treated as Ctrl on macOS. Shortcuts fire everywhere except that
 * plain editing keys inside inputs are left alone (all our combos include
 * a modifier, so typing is never intercepted).
 */
export function useShortcuts(commands: Command[]): void {
  useEffect(() => {
    const byCombo = new Map<string, Command>();
    for (const command of commands) {
      if (command.combo) byCombo.set(command.combo, command);
    }

    const handler = (event: KeyboardEvent): void => {
      if (!event.ctrlKey && !event.metaKey) return;
      const parts: string[] = ['ctrl'];
      if (event.shiftKey) parts.push('shift');
      if (event.altKey) parts.push('alt');
      parts.push(event.key.toLowerCase());
      const command = byCombo.get(parts.join('+'));
      if (command) {
        event.preventDefault();
        void command.run();
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [commands]);
}
