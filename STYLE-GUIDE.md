# StellarProof Style Guide

This document describes the global styling system used across the StellarProof web app, including how light/dark mode works, where it’s implemented, and which theme tokens to use.

## Light/Dark Mode (Global)

### Source of truth
- Theme is applied on the root `<html>` element using:
  - `class="dark"` (Tailwind `dark:` variant)
  - `data-theme="dark" | "light"` (auxiliary indicator)
- Theme persistence key:
  - `localStorage["stellarproof-theme"]` = `"dark"` or `"light"`

### Files & directories

**Initialization (default theme + no flash on load)**
- `frontend/app/layout.tsx`
  - Sets default theme on `<html>` for first paint.
  - Runs an inline script in `<head>` that syncs `<html>` attributes with `localStorage`.

**Global theme state and toggle logic**
- `frontend/app/context/ThemeContext.tsx`
  - React context that exposes `{ theme, toggleTheme }`.
  - Reads/writes `localStorage["stellarproof-theme"]`.
  - Toggles the `.dark` class and `data-theme` attribute on `<html>`.

**Theme toggle UI**
- `frontend/components/ThemeToggle.tsx`
  - Calls `toggleTheme()` and displays the sun/moon icon.

**Global CSS + Tailwind v4 dark variant**
- `frontend/app/globals.css`
  - Tailwind v4 entrypoint: `@import "tailwindcss";`
  - Defines the project’s dark-mode selector:
    - `@custom-variant dark (&:where(.dark, .dark *));`
  - Defines global theme tokens in `@theme inline`.
  - Defines `:root` (light) and `.dark` (dark) CSS variable overrides.

**Tailwind config (colors and shadows used by utilities)**
- `frontend/tailwind.config.ts`
- `frontend/tailwind.config.js`

> NOTE: Don’t remove the `@custom-variant dark (...)` line from `frontend/app/globals.css`. If it’s removed, Tailwind’s `dark:` styles will stop working.

## Usage (Contributor Rules)

### 1) Styling components for both themes
Use Tailwind’s `dark:` variant for anything that must switch between light and dark:

```tsx
<div className="bg-white text-gray-900 dark:bg-darkblue dark:text-white">
  ...
</div>
```

### 2) Access theme in a client component

```tsx
"use client";

import { useTheme } from "@/app/context/ThemeContext";

export function ExampleThemeButton() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button onClick={toggleTheme}>
      Current theme: {theme}
    </button>
  );
}
```

## Global Theme Tokens (StellarProof)

These tokens are globally available via Tailwind v4’s `@theme inline` in `frontend/app/globals.css`.

### Colors
- `primary`: `#256af4`
- `primary-foreground`: `#ffffff`
- `primary-light`: `#60a5fa`
- `primary-dark`: `#012254`
- `secondary`: `#ff7ce9`
- `secondary-foreground`: `#000000`
- `secondary-light`: `#ffb7f3`
- `accent`: `#60a5fa`
- `accent-foreground`: `#000000`
- `darkblue`: `#012254`
- `darkblue-light`: `#256af4`
- `darkblue-dark`: `#000000`

### Shadows
- `shadow-glow`
- `shadow-header`
- `shadow-button-glow`
- `shadow-button-glow-secondary`

## Default Theme Behavior
- Default is **dark mode** for new users.
- If `localStorage["stellarproof-theme"] === "light"`, the app loads in light mode.

