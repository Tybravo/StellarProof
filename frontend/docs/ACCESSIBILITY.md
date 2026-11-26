
# Frontend Accessibility Guidelines

## Overview

StellarProof aims to provide an accessible and inclusive experience across desktop, tablet, and mobile devices.

Accessibility (a11y) should be considered throughout the development process, including component design, implementation, testing, and maintenance.

The frontend should follow WCAG 2.2 Level AA as its accessibility target, while preserving existing application behavior and design conventions.

## Accessibility Principles

The frontend should follow these four principles:

- **Perceivable:** Information and interface elements must be presented in ways users can perceive.
- **Operable:** All interactive functionality must be usable with a keyboard or another suitable input method.
- **Understandable:** Content, navigation, and interactions should behave consistently and predictably.
- **Robust:** Components should work with supported browsers, assistive technologies, and semantic HTML.

## 1. Semantic HTML

Use native HTML elements according to their intended purpose.

Recommended elements:

| Element | Purpose |
| --- | --- |
| `<header>` | Introductory content or site header |
| `<nav>` | Navigation links |
| `<main>` | Primary page content |
| `<section>` | Thematic content grouping |
| `<article>` | Independent content |
| `<footer>` | Footer content |
| `<button>` | Actions and interactive controls |
| `<a>` | Navigation to another resource |

Guidelines:

- Use one primary `<main>` landmark per page.
- Use headings in a logical hierarchy (`h1` through `h6`).
- Do not use headings solely to achieve a particular visual appearance.
- Use buttons for actions and links for navigation.
- Associate form controls with meaningful labels.
- Use lists for groups of related navigation items.

Avoid using generic `<div>` or `<span>` elements when a semantic HTML element is more appropriate.

## 2. Keyboard Accessibility

Every interactive element must be usable without a mouse.

Supported keyboard behavior should include:

| Key | Expected behavior |
| --- | --- |
| Tab | Move focus to the next interactive element |
| Shift + Tab | Move focus to the previous interactive element |
| Enter | Activate links and appropriate controls |
| Space | Activate buttons and toggle appropriate controls |
| Escape | Close dismissible dialogs and overlays |
| Arrow keys | Navigate composite widgets when appropriate |

Requirements:

- Preserve a logical tab order.
- Never remove keyboard accessibility from interactive elements.
- Avoid positive `tabIndex` values.
- Do not use `tabIndex="-1"` on elements that users must reach through normal keyboard navigation.
- Ensure dropdowns, menus, dialogs, and other custom controls support keyboard interaction.
- Ensure hidden or inactive controls cannot receive unintended focus.

## 3. Focus Management

Keyboard focus must remain visible and predictable.

### Focus indicators

Interactive components should provide a visible focus indicator using `:focus-visible` where appropriate.

Example:

```tsx
<button
  type="button"
  className="
    focus-visible:outline-none
    focus-visible:ring-2
    focus-visible:ring-primary
    focus-visible:ring-offset-2
  "
>
  Continue
</button>
```

StellarProof already uses focus-visible styling in its shared Button component and navigation elements.

### Modal focus management

The shared modal implementation is located at:

`frontend/components/ui/Modal.tsx`

It currently provides:

- Initial focus when a modal opens.
- Keyboard focus trapping.
- Escape-key dismissal.
- Restoration of focus to the previously active element.
- Background scrolling prevention while open.
- Dialog semantics through `role="dialog"` and `aria-modal="true"`.

When creating or modifying dialogs:

1. Move focus into the dialog when it opens.
2. Keep keyboard focus within the active dialog.
3. Provide an accessible name.
4. Return focus to the triggering element when the dialog closes.
5. Ensure dismissal controls are keyboard accessible.

### Skip navigation

The application root layout includes a skip link:

`frontend/app/layout.tsx`

The link allows keyboard users to bypass repeated navigation and move directly to the main content.

New page layouts should preserve the `main-content` destination or provide an equivalent correctly associated main landmark.

## 4. ARIA Usage

Accessible Rich Internet Applications (ARIA) attributes provide additional information to assistive technologies.

Prefer semantic HTML before introducing ARIA attributes.

Common attributes:

| Attribute | Purpose |
| --- | --- |
| `aria-label` | Provides an accessible name |
| `aria-labelledby` | References an element that provides the accessible name |
| `aria-describedby` | References additional descriptive information |
| `aria-expanded` | Indicates whether a disclosure or expandable control is open |
| `aria-controls` | Identifies the element controlled by an interactive element |
| `aria-hidden` | Hides non-essential content from the accessibility tree |
| `aria-live` | Announces dynamically updated content |
| `aria-modal` | Identifies a modal dialog |
| `aria-current` | Identifies the current item in a related set |

Example:

```tsx
<button
  type="button"
  aria-expanded={isOpen}
  aria-controls="navigation-menu"
  onClick={() => setIsOpen((previous) => !previous)}
>
  Menu
</button>

<nav
  id="navigation-menu"
  aria-label="Main navigation"
>
  {/* Navigation links */}
</nav>
```

ARIA guidelines:

- Do not add ARIA attributes when native HTML already provides the required semantics.
- Ensure every `aria-labelledby` and `aria-describedby` reference points to an existing element.
- Keep `aria-expanded` synchronized with the actual expanded state.
- Use `aria-live` for important asynchronous updates that should be announced.
- Use `aria-hidden="true"` only for content that should genuinely be excluded from the accessibility tree.
- Never apply `aria-hidden="true"` to a focusable element or an ancestor containing active focus.

## 5. Forms and Validation

Forms should remain understandable and usable with assistive technologies.

Requirements:

- Provide visible labels for form controls.
- Associate validation errors with their respective inputs.
- Clearly identify required fields.
- Do not communicate errors using color alone.
- Provide meaningful error messages.
- Announce important asynchronous validation results where appropriate.

Example:

```tsx
<label htmlFor="email">
  Email address
</label>

<input
  id="email"
  name="email"
  type="email"
  aria-invalid={Boolean(error)}
  aria-describedby={error ? "email-error" : undefined}
/>

{error && (
  <p id="email-error" role="alert">
    {error}
  </p>
)}
```

## 6. Color, Contrast, and Visual Presentation

The StellarProof interface uses primary blue, secondary pink, and dark blue theme colors.

Accessibility requirements:

- Maintain a minimum contrast ratio of 4.5:1 for normal text.
- Maintain a minimum contrast ratio of 3:1 for large text.
- Ensure meaningful interface components and visual states have sufficient contrast.
- Never use color as the only indicator of status or meaning.
- Preserve readable text when switching between light and dark themes.
- Ensure focus indicators remain visible in both themes.

Check both themes when implementing or modifying shared components.

## 7. Motion and Animation

Respect the user's motion preferences.

The application already includes a `prefers-reduced-motion` media query in:

`frontend/app/globals.css`

Components using Framer Motion should also consider its `useReducedMotion` hook.

Avoid:

- Unnecessary continuous animations.
- Flashing content.
- Motion that prevents users from completing an interaction.
- Animations that ignore reduced-motion preferences.

## 8. Touch Accessibility

Interactive controls should be comfortable to operate on touch devices.

The global stylesheet includes a minimum 44 × 44 CSS pixel touch target rule for selected interactive elements under `@media (pointer: coarse)`.

Maintain adequate spacing between adjacent controls and ensure touch interactions do not depend on hover alone.

## 9. Accessibility Testing

Accessibility should be checked during component development and before significant frontend releases.

Recommended checks:

- Navigate the interface using only a keyboard.
- Verify visible focus indicators.
- Test dialogs, dropdowns, and navigation using keyboard controls.
- Inspect accessible names and roles.
- Check form labels and validation announcements.
- Test light and dark themes.
- Test reduced-motion behavior.
- Check text and component contrast.
- Verify responsive layouts at different viewport sizes.

Recommended tools:

- axe DevTools
- Lighthouse accessibility audits
- Chrome or Firefox accessibility inspectors
- NVDA
- VoiceOver

Automated accessibility tools help identify problems but do not replace manual keyboard and screen-reader testing.

## 10. Contributor Checklist

Before submitting frontend changes, verify:

- [ ] Semantic HTML is used appropriately.
- [ ] Interactive elements are keyboard accessible.
- [ ] Focus indicators are visible.
- [ ] Forms have accessible labels and error messages.
- [ ] ARIA attributes are appropriate and correctly synchronized.
- [ ] Dialogs manage and restore focus correctly.
- [ ] Text and interface elements have sufficient contrast.
- [ ] Reduced-motion preferences are respected.
- [ ] Mobile touch interactions remain accessible.
- [ ] Accessibility checks have been performed where applicable.

## Related Implementation Files

- `frontend/app/layout.tsx`
- `frontend/app/globals.css`
- `frontend/components/ui/Button.tsx`
- `frontend/components/ui/Modal.tsx`
- `frontend/components/Header.tsx`
- `frontend/components/ui/ScrollToTop.tsx`
