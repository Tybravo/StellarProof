
# Frontend Styling & Theming Guide

This document explains how styling and theming work in the StellarProof frontend.

It covers the Tailwind CSS setup, global styles, CSS variables, light and dark themes, theme initialization, and guidelines for maintaining consistent styling across the application.

## 1. Styling Architecture

The StellarProof frontend uses:

- Next.js with the App Router.
- React and TypeScript.
- Tailwind CSS v4.
- Global CSS variables.
- Tailwind dark-mode utilities.
- A React-based theme context.
- Next.js font optimization through `next/font/google`.

The main styling files are:

| File | Responsibility |
|---|---|
| `frontend/app/globals.css` | Global styles, CSS variables, Tailwind theme definitions |
| `frontend/tailwind.config.ts` | TypeScript Tailwind configuration |
| `frontend/tailwind.config.js` | JavaScript Tailwind configuration |
| `frontend/app/layout.tsx` | Root application layout and global CSS import |
| `frontend/app/context/ThemeContext.tsx` | Theme context and switching functionality |
| `frontend/components/ThemeToggle.tsx` | Theme toggle UI |

## 2. Tailwind CSS Setup

The project uses Tailwind CSS v4.

The global stylesheet imports Tailwind using:

```css
@import "tailwindcss";
```

The project also defines a custom dark-mode variant:

```css
@custom-variant dark (&:where(.dark, .dark *));
```

This allows Tailwind's `dark:` utilities to respond to the `.dark` class applied to the root HTML element.

### Usage

```tsx
<div className="bg-white text-gray-900 dark:bg-darkblue dark:text-white">
  StellarProof content
</div>
```

The `dark:` prefix applies the corresponding style when the root element has the `dark` class.

### Tailwind Configuration

The repository contains:

- `frontend/tailwind.config.ts`
- `frontend/tailwind.config.js`

Both contain overlapping color, shadow, and content configuration.

Because this project uses Tailwind CSS v4, the active CSS-first theme definitions are maintained in `globals.css`.

Do not assume that the JavaScript or TypeScript configuration files are automatically loaded by Tailwind v4. If legacy configuration is required, verify its explicit loading and integration with the current CSS entrypoint before changing it.

Avoid maintaining conflicting token definitions across multiple sources.

## 3. Global CSS

The global stylesheet is located at:

`frontend/app/globals.css`

It is imported by the root layout:

```tsx
import "./globals.css";
```

The stylesheet is responsible for:

- Importing Tailwind CSS.
- Defining the custom dark-mode variant.
- Declaring global theme tokens.
- Defining light and dark theme variables.
- Applying global body and HTML styles.
- Setting global transitions.
- Preventing horizontal overflow.
- Providing responsive media behavior.
- Respecting reduced-motion preferences.
- Defining additional global utility classes.

### Global Theme Definitions

The stylesheet uses:

```css
@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
}
```

It also defines the StellarProof brand colors and custom shadows.

Use these definitions as the reference when working with global design tokens.

## 4. CSS Variables and Theme Foundations

The project uses CSS custom properties to support theme-dependent colors.

### Light Theme

The default light theme variables are defined in `:root`.

```css
:root {
  --background: #ffffff;
  --foreground: #171717;
}
```

### Dark Theme

The dark theme overrides these variables using the `.dark` selector.

```css
.dark {
  --background: #012254;
  --foreground: #f3f4f6;
}
```

### Usage

Use the CSS variables when an element should automatically respond to the active theme.

```css
.example-panel {
  background-color: var(--background);
  color: var(--foreground);
}
```

This avoids duplicating background and foreground definitions unnecessarily.

## 5. Dark and Light Mode

StellarProof supports two themes:

- Dark mode
- Light mode

The default theme for new visitors is dark mode.

The root HTML element uses:

- `class="dark"` to activate Tailwind dark-mode styles.
- `data-theme="dark"` or `data-theme="light"` as an auxiliary theme indicator.

### Theme Persistence

The documented theme persistence key is:

```text
stellarproof-theme
```

Its expected values are:

```text
dark
light
```

The root layout initializes the theme before the main page content is rendered.

The theme initialization script reads the saved preference and updates the root HTML element.

This helps prevent an incorrect theme from appearing during the initial page load.

### Important Implementation Note

The current `ThemeContext.tsx` implementation also contains a separate read from:

```text
localStorage["theme"]
```

However, theme updates are written using:

```text
localStorage["stellarproof-theme"]
```

The root layout also uses `stellarproof-theme`.

These are different storage keys. Contributors should be aware of this existing inconsistency when working on theme persistence.

Do not silently change storage behavior as part of documentation updates. Any correction should be handled in a separate implementation change and tested for hydration and theme regressions.

## 6. Theme Context

The React theme context is located at:

`frontend/app/context/ThemeContext.tsx`

It exposes:

```tsx
interface ThemeContextType {
  theme: "light" | "dark";
  toggleTheme: () => void;
}
```

The provider is responsible for:

- Providing the current theme.
- Updating the theme state.
- Applying the `.dark` class to the root HTML element.
- Updating the `data-theme` attribute.
- Persisting theme changes in local storage.

### Using the Theme Context

Theme-aware components can access the context through `useTheme()`.

Example:

```tsx
"use client";

import { useTheme } from "@/app/context/ThemeContext";

export function ThemeExample() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button type="button" onClick={toggleTheme}>
      Current theme: {theme}
    </button>
  );
}
```

Components using React hooks or browser APIs must be client components.

## 7. Theme Toggle Component

The theme toggle interface is located at:

`frontend/components/ThemeToggle.tsx`

It uses:

- `useTheme()` to access theme state.
- `toggleTheme()` to switch between themes.
- Sun and Moon icons from `lucide-react`.

Example:

```tsx
import { Sun, Moon } from "lucide-react";
```

The component also provides accessible labels describing the theme-switching action.

When implementing another theme control, reuse the existing theme context instead of creating a separate theme state.

## 8. Styling Guidelines

### 8.1 Prefer Tailwind Utilities

Use existing Tailwind utilities for common styling requirements.

```tsx
<div className="flex items-center gap-4 rounded-xl p-6">
  Content
</div>
```

### 8.2 Use Dark Mode Utilities

For elements that require different appearances across themes, use the `dark:` prefix.

```tsx
<div className="bg-white text-gray-900 dark:bg-darkblue dark:text-white">
  Theme-aware content
</div>
```

### 8.3 Use Existing Brand Tokens

Prefer existing brand utilities:

```tsx
<button className="bg-primary text-primary-foreground shadow-button-glow">
  Continue
</button>
```

Avoid unnecessary hardcoded colors.

### 8.4 Avoid Unnecessary Inline Styles

Use Tailwind classes and shared CSS tokens for static styling.

Inline styles should be reserved for cases where values genuinely need to be dynamic or cannot reasonably be represented using existing utilities.

### 8.5 Keep Styling Consistent

- Reuse established spacing and color tokens.
- Keep interactive states consistent.
- Maintain visible keyboard focus indicators.
- Ensure text remains readable in both themes.
- Avoid unnecessary global selectors.
- Avoid overriding global styles from individual components without a clear reason.

## 9. Global Accessibility and Responsive Behavior

The global stylesheet includes several accessibility and usability foundations.

These include:

- Minimum 44px touch targets for applicable interactive elements on coarse pointers.
- Reduced-motion support.
- Smooth scrolling.
- Horizontal overflow prevention.
- Improved mobile text rendering.

Contributors should preserve these foundations when updating global styles.

Use responsive utilities for layout changes.

Example:

```tsx
<div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
  {/* Responsive content */}
</div>
```

## 10. Adding New Theme Tokens

Before adding a new theme token:

1. Inspect `frontend/app/globals.css`.
2. Check whether an equivalent color or shadow already exists.
3. Decide whether the token must change between light and dark modes.
4. Use a descriptive semantic name.
5. Add the token to the active theme definition.
6. Verify the resulting Tailwind utility.
7. Test the appearance in both themes.

Do not introduce duplicate tokens for colors that already exist.

## 11. Styling Change Checklist

Before submitting a styling-related pull request, verify:

- [ ] Existing Tailwind utilities are reused where possible.
- [ ] Both light and dark themes are considered.
- [ ] Existing CSS variables are not unintentionally overwritten.
- [ ] Responsive layouts work on mobile, tablet, and desktop.
- [ ] Keyboard focus indicators remain visible.
- [ ] Reduced-motion preferences are respected.
- [ ] No unnecessary inline styles are introduced.
- [ ] Existing components retain their expected appearance.

## 12. Related Files

| File | Responsibility |
|---|---|
| `frontend/app/globals.css` | Global styling and theme tokens |
| `frontend/app/layout.tsx` | Root layout and theme initialization |
| `frontend/app/context/ThemeContext.tsx` | Theme state management |
| `frontend/components/ThemeToggle.tsx` | Theme switching interface |
| `frontend/tailwind.config.ts` | TypeScript Tailwind configuration |
| `frontend/tailwind.config.js` | JavaScript Tailwind configuration |

## 13. Maintenance

Update this document whenever the styling architecture or theme implementation changes.

Documentation should describe the actual application behavior, not an assumed or proposed implementation.
