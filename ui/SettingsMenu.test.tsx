// ui/SettingsMenu.test.tsx
// Plan 07 Task 1 — D-06 persistent sign-out affordance.
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the server action — we only want to assert the form references it.
// In jsdom, a Server Action reference is treated as a plain function reference.
vi.mock('@/app/auth/actions', () => ({
  signOut: Object.assign(vi.fn(async () => {}), { $$typeof: Symbol('ServerAction') }),
}));

import { SettingsMenu } from './SettingsMenu';

describe('<SettingsMenu /> — D-06', () => {
  beforeEach(() => cleanup());

  it('renders the settings button with aria-label', () => {
    render(<SettingsMenu />);
    expect(screen.getByLabelText('Settings')).toBeDefined();
  });

  it('does not show the menu initially', () => {
    render(<SettingsMenu />);
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('opens the menu on click', () => {
    render(<SettingsMenu />);
    fireEvent.click(screen.getByLabelText('Settings'));
    expect(screen.getByRole('menu')).toBeDefined();
    expect(screen.getByText('Sign out')).toBeDefined();
  });

  it('closes on Escape', () => {
    render(<SettingsMenu />);
    fireEvent.click(screen.getByLabelText('Settings'));
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('closes on click outside', () => {
    render(<SettingsMenu />);
    fireEvent.click(screen.getByLabelText('Settings'));
    expect(screen.getByRole('menu')).toBeDefined();
    // mousedown on document body (outside the menu)
    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('uses fixed positioning (persistent affordance per D-06)', () => {
    render(<SettingsMenu />);
    const wrapper = screen.getByLabelText('Settings').parentElement as HTMLElement;
    const style = wrapper.getAttribute('style') ?? '';
    expect(style).toMatch(/position:\s*fixed/);
    expect(style).toMatch(/top:\s*16px/);
    expect(style).toMatch(/right:\s*16px/);
  });

  it('Sign out lives inside a form with a submit button', () => {
    const { container } = render(<SettingsMenu />);
    fireEvent.click(screen.getByLabelText('Settings'));
    const form = container.querySelector('form');
    expect(form).not.toBeNull();
    const submitButton = form?.querySelector('button[type="submit"]');
    expect(submitButton?.textContent).toBe('Sign out');
  });
});
