
# Frontend Responsive Design Guidelines

## Overview

StellarProof is designed to provide a consistent user experience across desktop, tablet, and mobile devices.

Responsive design is an important part of frontend development because users interact with the application through different screen sizes, viewport dimensions, and input methods.

The frontend uses Tailwind CSS utilities, responsive layout patterns, and global CSS rules to support different devices.

This document describes the existing responsive styling approach and establishes guidelines for future frontend contributions.

## 1. Mobile-First Design

Contributors should follow a mobile-first development approach.

This means:

1. Design the initial layout for smaller screens.
2. Ensure the primary content and interactions work on mobile devices.
3. Introduce additional layout complexity as viewport width increases.
4. Verify the resulting experience on tablets and desktop screens.

Example:

```tsx
<div className="
  grid
  grid-cols-1
  sm:grid-cols-2
  lg:grid-cols-3
  gap-4
">
  {/* Responsive content */}
</div>
```

The example begins with one column and introduces additional columns at larger breakpoints.

## 2. Tailwind CSS Breakpoints

The frontend uses Tailwind CSS 4.

The standard Tailwind responsive breakpoint conventions are:

| Prefix | Minimum viewport width | Typical usage |
| --- | --- | --- |
| Default | Below 640px | Mobile-first base styles |
| `sm:` | 640px | Larger mobile screens |
| `md:` | 768px | Tablets and medium screens |
| `lg:` | 1024px | Laptops and desktop layouts |
| `xl:` | 1280px | Larger desktop screens |
| `2xl:` | 1536px | Extra-large screens |

These are Tailwind's default breakpoint values, not a claim that StellarProof has independently configured custom breakpoints.

The existing theme configurations do not define custom breakpoint overrides.

Always verify the installed Tailwind configuration before relying on customized responsive values.

## 3. Responsive Utility Classes

Tailwind responsive prefixes allow styles to change based on the viewport.

Example:

```tsx
<div className="
  flex
  flex-col
  md:flex-row
  gap-4
">
  {/* Content */}
</div>
```

In this example:

- Mobile screens use a vertical layout.
- Medium screens and larger use a horizontal layout.

Common responsive utilities include:

| Utility | Purpose |
| --- | --- |
| `w-full` | Full available width |
| `max-w-7xl` | Maximum content width |
| `px-4 sm:px-6 lg:px-8` | Responsive horizontal spacing |
| `grid-cols-1 md:grid-cols-2` | Responsive grid columns |
| `flex-col md:flex-row` | Responsive flex direction |
| `hidden lg:flex` | Hide content on smaller screens and display it on large screens |
| `overflow-x-auto` | Allow horizontal scrolling when required |

Prefer existing Tailwind utilities over adding custom media queries for simple layout adjustments.

## 4. Layout and Container Guidelines

Responsive layouts should:

- Avoid unnecessary fixed widths.
- Use flexible containers.
- Apply sensible maximum content widths.
- Maintain adequate spacing between elements.
- Prevent unintended horizontal overflow.
- Keep important content visible at smaller widths.

Example:

```tsx
<main className="w-full px-4 sm:px-6 lg:px-8">
  <section className="mx-auto w-full max-w-7xl">
    {/* Page content */}
  </section>
</main>
```

The homepage and navigation already use responsive container patterns.

Relevant implementation:

`frontend/components/Header.tsx`

## 5. Navigation Responsiveness

Navigation should remain usable at all supported viewport sizes.

The existing Header component provides separate desktop and mobile navigation patterns.

Relevant implementation:

`frontend/components/Header.tsx`

The desktop navigation uses:

```tsx
hidden lg:flex
```

This keeps the desktop navigation hidden below the large breakpoint.

Contributors modifying navigation should ensure:

- Mobile navigation remains keyboard accessible.
- Menu controls have accessible names.
- Dropdowns work with keyboard and touch interactions.
- Navigation does not overflow smaller screens.
- Menus close appropriately after navigation.
- Desktop and mobile navigation expose equivalent essential destinations.

Do not rely exclusively on hover interactions for mobile navigation.

## 6. Responsive Forms and Interactive Components

Forms, modals, tables, and interactive controls must adapt to smaller screens.

Guidelines:

- Keep form controls within their available containers.
- Avoid fixed widths that exceed the viewport.
- Use flexible button groups.
- Allow long content to wrap where appropriate.
- Ensure dialogs fit within the available viewport.
- Provide sufficient touch spacing.
- Preserve readable labels and validation messages.

Example:

```tsx
<div className="
  flex
  flex-col
  sm:flex-row
  gap-3
  w-full
">
  <button className="w-full sm:w-auto">
    Cancel
  </button>

  <button className="w-full sm:w-auto">
    Continue
  </button>
</div>
```

## 7. Images and Media

Media should remain within its parent container.

The global stylesheet already includes:

```css
img,
video,
svg {
  max-width: 100%;
  height: auto;
}
```

This helps prevent images and media from exceeding their container width.

Contributors should also:

- Use responsive image sizing.
- Avoid unnecessary fixed image dimensions.
- Preserve appropriate aspect ratios.
- Prevent media from introducing horizontal overflow.
- Provide meaningful alternative text for informative images.

## 8. Global Responsive Styling

Global frontend styles are maintained in:

`frontend/app/globals.css`

The stylesheet includes:

- Tailwind CSS imports.
- Light and dark theme variables.
- Global media sizing.
- Horizontal overflow prevention.
- Touch-target sizing for selected interactive elements.
- Reduced-motion preferences.
- Global transition behavior.

The existing coarse-pointer media query provides a minimum 44 × 44 CSS pixel touch target for selected controls.

Do not introduce duplicate global rules without checking whether equivalent behavior already exists.

## 9. Responsive Testing

Responsive changes should be tested at multiple viewport sizes.

Recommended viewport test cases:

| Device category | Suggested viewport |
| --- | --- |
| Small mobile | 320 × 568 |
| Standard mobile | 375 × 812 |
| Large mobile | 430 × 932 |
| Tablet | 768 × 1024 |
| Small desktop | 1024 × 768 |
| Desktop | 1440 × 900 |
| Large desktop | 1920 × 1080 |

These are testing examples, not enforced application breakpoints.

Verify the following:

- No unintended horizontal scrolling.
- Text remains readable.
- Navigation remains usable.
- Buttons and controls remain accessible.
- Forms fit the viewport.
- Dialogs remain within the visible screen.
- Tables and complex content remain usable.
- Images maintain appropriate proportions.
- Both light and dark themes remain consistent.

Use browser developer tools to test responsive layouts and different viewport dimensions.

## 10. Responsive Design Best Practices

Contributors should:

- Start with mobile layouts.
- Use the existing Tailwind responsive utilities.
- Prefer flexible layouts over rigid dimensions.
- Keep content readable at all supported widths.
- Avoid unnecessary breakpoint-specific overrides.
- Test navigation and interactions on touch devices.
- Prevent content overflow.
- Reuse existing design patterns.
- Keep responsive changes consistent across related components.

## 11. Contributor Checklist

Before submitting responsive frontend changes:

- [ ] Mobile layout works correctly.
- [ ] Tablet layout works correctly.
- [ ] Desktop layout works correctly.
- [ ] Navigation remains usable.
- [ ] Forms and controls fit smaller screens.
- [ ] Images and media remain within their containers.
- [ ] No unintended horizontal scrolling is introduced.
- [ ] Touch interactions remain usable.
- [ ] Light and dark themes remain consistent.
- [ ] Existing application behavior is preserved.

## Related Implementation Files

- `frontend/app/globals.css`
- `frontend/app/layout.tsx`
- `frontend/components/Header.tsx`
- `frontend/components/ui/Button.tsx`
- `frontend/components/ui/Modal.tsx`
- `frontend/tailwind.config.ts`
- `frontend/tailwind.config.js`
