/** @vitest-environment jsdom */

import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts';

function TestHarness({
  onSave,
  onDiscard,
  enabled = true,
}: {
  onSave?: () => void;
  onDiscard?: () => void;
  enabled?: boolean;
}) {
  useKeyboardShortcuts({ onSave, onDiscard, enabled });
  return <div data-testid="keyboard-shortcuts-harness" />;
}

describe('useKeyboardShortcuts', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  it('triggers onSave for Ctrl+S and Cmd+S', () => {
    const onSave = vi.fn();

    act(() => {
      root.render(<TestHarness onSave={onSave} />);
    });

    document.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 's',
        ctrlKey: true,
        bubbles: true,
        cancelable: true,
      }),
    );

    document.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 's',
        metaKey: true,
        bubbles: true,
        cancelable: true,
      }),
    );

    expect(onSave).toHaveBeenCalledTimes(2);
  });

  it('triggers onDiscard for Escape', () => {
    const onDiscard = vi.fn();

    act(() => {
      root.render(<TestHarness onDiscard={onDiscard} />);
    });

    document.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'Escape',
        bubbles: true,
        cancelable: true,
      }),
    );

    expect(onDiscard).toHaveBeenCalledTimes(1);
  });

  it('does not trigger shortcuts when disabled', () => {
    const onSave = vi.fn();
    const onDiscard = vi.fn();

    act(() => {
      root.render(
        <TestHarness onSave={onSave} onDiscard={onDiscard} enabled={false} />,
      );
    });

    document.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 's',
        ctrlKey: true,
        bubbles: true,
        cancelable: true,
      }),
    );

    document.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'Escape',
        bubbles: true,
        cancelable: true,
      }),
    );

    expect(onSave).not.toHaveBeenCalled();
    expect(onDiscard).not.toHaveBeenCalled();
  });
});
