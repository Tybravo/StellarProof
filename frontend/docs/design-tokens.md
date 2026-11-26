
# Frontend Design Tokens & Color System

This document describes the design tokens used throughout the StellarProof frontend. It covers the brand color palette, spacing, border radii, shadows, and guidelines for applying these tokens consistently.

The goal is to maintain a consistent visual identity, improve UI maintainability, and make future design changes easier.

## 1. Design Token Sources

The primary design token definitions are maintained in:

- `frontend/app/globals.css` — Active global CSS variables and Tailwind CSS v4 theme definitions.
- `frontend/tailwind.config.ts` — TypeScript Tailwind configuration containing corresponding theme extensions.
- `frontend/tailwind.config.js` — JavaScript configuration containing overlapping theme extensions.

**Important:** The project uses Tailwind CSS v4. The `@theme inline` declaration in `globals.css` is the primary source for the CSS-based Tailwind theme. Do not assume that both configuration files are automatically loaded or synchronized.

When changing a design token, verify the active stylesheet and its generated utility behavior before modifying the implementation.

## 2. Color Palette

StellarProof uses a blue-based brand palette with pink and light-blue accents.

### 2.1 Primary Colors

| Token | Hex Value | Purpose |
|---|---|---|
| Primary | `#256AF4` | Primary buttons, links, and important actions |
| Primary Foreground | `#FFFFFF` | Text and icons on primary backgrounds |
| Primary Light | `#60A5FA` | Highlights and secondary blue accents |
| Primary Dark | `#012254` | Deep blue backgrounds and emphasis |

### 2.2 Secondary Colors

| Token | Hex Value | Purpose |
|---|---|---|
| Secondary | `#FF7CE9` | Secondary brand elements and highlights |
| Secondary Foreground | `#000000` | Foreground content on secondary backgrounds |
| Secondary Light | `#FFB7F3` | Softer pink accents |
| Secondary Dark | `#FF7CE9` | Dark secondary palette entry |

### 2.3 Accent Colors

| Token | Hex Value | Purpose |
|---|---|---|
| Accent | `#60A5FA` | Supporting highlights and interactive accents |
| Accent Foreground | `#000000` | Foreground content on accent backgrounds |

### 2.4 Dark Blue Colors

| Token | Hex Value | Purpose |
|---|---|---|
| Dark Blue | `#012254` | Main dark-blue brand color |
| Dark Blue Light | `#256AF4` | Lighter blue variation |
| Dark Blue Dark | `#000000` | Deep background variation |

### 2.5 Background and Foreground Variables

The global stylesheet defines the following theme-dependent CSS variables:

| CSS Variable | Light Theme | Dark Theme |
|---|---|---|
| `--background` | `#FFFFFF` | `#012254` |
| `--foreground` | `#171717` | `#F3F4F6` |

The variables are defined in `:root` and overridden by the `.dark` selector.

Use these variables for surfaces and text that should automatically respond to theme changes.

## 3. CSS Variable Usage

Example:

```css
.custom-panel {
  background-color: var(--background);
  color: var(--foreground);
}
```

The global stylesheet also exposes Tailwind-compatible color tokens through `@theme inline`.

Examples of existing utility classes include:

```tsx
<div className="bg-primary text-primary-foreground">
  Primary content
</div>

<div className="bg-darkblue text-white">
  Dark blue content
</div>

<div className="bg-secondary text-secondary-foreground">
  Secondary content
</div>
```

Prefer existing semantic utilities instead of introducing arbitrary color values.

## 4. Spacing Scale

The project uses Tailwind CSS spacing utilities.

There is no separately defined custom spacing scale in the current global stylesheet. Use Tailwind's default spacing scale unless a component has a documented requirement for a different value.

Common spacing values:

| Utility | Value |
|---|---:|
| `p-1`, `m-1`, `gap-1` | 4px |
| `p-2`, `m-2`, `gap-2` | 8px |
| `p-3`, `m-3`, `gap-3` | 12px |
| `p-4`, `m-4`, `gap-4` | 16px |
| `p-5`, `m-5`, `gap-5` | 20px |
| `p-6`, `m-6`, `gap-6` | 24px |
| `p-8`, `m-8`, `gap-8` | 32px |
| `p-10`, `m-10`, `gap-10` | 40px |
| `p-12`, `m-12`, `gap-12` | 48px |
| `p-16`, `m-16`, `gap-16` | 64px |

### Spacing Guidelines

- Use smaller spacing for closely related elements.
- Use consistent spacing between repeated cards and sections.
- Apply responsive spacing where necessary.
- Avoid unnecessary arbitrary pixel values.
- Prefer `gap-*` for spacing between flex and grid children.
- Use consistent horizontal padding across related page sections.

Example:

```tsx
<section className="px-4 py-8 md:px-8 lg:px-16">
  <div className="flex flex-col gap-6">
    {/* Section content */}
  </div>
</section>
```

## 5. Border Radius Scale

Use Tailwind's default border-radius utilities.

| Utility | Default Radius |
|---|---:|
| `rounded-none` | 0px |
| `rounded-sm` | 2px |
| `rounded` | 4px |
| `rounded-md` | 6px |
| `rounded-lg` | 8px |
| `rounded-xl` | 12px |
| `rounded-2xl` | 16px |
| `rounded-3xl` | 24px |
| `rounded-full` | 9999px |

### Radius Guidelines

- Use `rounded-lg` for standard interactive elements and controls.
- Use `rounded-xl` for cards and larger UI surfaces.
- Use `rounded-2xl` for prominent panels and visual containers where appropriate.
- Use `rounded-full` for circular avatars, pills, and fully rounded controls.
- Keep repeated components visually consistent.

These values describe Tailwind's default utilities, not additional custom radius tokens defined by StellarProof.

## 6. Shadows

The global stylesheet defines four custom shadow tokens.

| Token | Definition | Intended Usage |
|---|---|---|
| `shadow-glow` | `0 0 10px 2px rgba(37, 106, 244, 0.7)` | Blue glow effects |
| `shadow-header` | `0 4px 6px -1px rgba(1, 34, 84, 0.3)` | Header elevation |
| `shadow-button-glow` | `0 0 15px rgba(37, 106, 244, 0.5)` | Primary button glow |
| `shadow-button-glow-secondary` | `0 0 15px rgba(255, 124, 233, 0.5)` | Secondary button glow |

Example:

```tsx
<button className="bg-primary text-white shadow-button-glow">
  Verify Content
</button>
```

Use shadows carefully. They should communicate elevation, emphasis, or interaction rather than being applied to every element.

## 7. Color and Contrast Guidelines

- Use primary blue for important actions and brand emphasis.
- Use pink as a secondary accent rather than the dominant interface color.
- Maintain readable text contrast against both light and dark surfaces.
- Do not assume that a color suitable for a background is automatically suitable for text.
- Use semantic foreground colors where available.
- Avoid introducing new hardcoded brand colors without a clear design requirement.
- Verify focus indicators and hover states in both themes.

## 8. Responsive Design Guidelines

Design tokens should be applied consistently across mobile, tablet, and desktop layouts.

Use responsive Tailwind utilities when spacing or layout requirements change across screen sizes.

Example:

```tsx
<div className="p-4 md:p-6 lg:p-8 rounded-xl">
  Responsive content
</div>
```

Avoid introducing different token values for individual screen sizes when existing utilities can achieve the desired result.

## 9. Adding or Updating Design Tokens

Before introducing a new design token:

1. Check whether an equivalent token already exists.
2. Check `frontend/app/globals.css`.
3. Check the corresponding Tailwind theme configuration.
4. Confirm whether the token needs to work in both light and dark modes.
5. Use semantic naming.
6. Verify the generated utility and its visual result.
7. Ensure existing components are not unintentionally affected.

Do not modify the design system solely to accommodate a one-off component style.

## 10. Related Files

| File | Responsibility |
|---|---|
| `frontend/app/globals.css` | Global CSS variables, colors, shadows, and theme definitions |
| `frontend/tailwind.config.ts` | TypeScript Tailwind configuration |
| `frontend/tailwind.config.js` | JavaScript Tailwind configuration |
| `frontend/app/layout.tsx` | Root layout and global stylesheet import |
| `frontend/app/context/ThemeContext.tsx` | Theme state and switching logic |
| `frontend/components/ThemeToggle.tsx` | Theme toggle interface |

## 11. Maintenance

The design token documentation should be updated whenever the actual design system changes.

Keep documented values consistent with the active implementation. Do not document proposed tokens as existing project features until they have been implemented and verified.
