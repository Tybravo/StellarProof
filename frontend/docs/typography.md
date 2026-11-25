
# Frontend Typography Guide

This document defines the typography foundations and usage guidelines for the StellarProof frontend.

It covers the font families, font configuration, type scale, font weights, line heights, and responsive typography practices.

The purpose is to maintain readable, consistent, and accessible text throughout the application.

## 1. Typography Architecture

StellarProof uses Next.js font optimization through `next/font/google`.

The root layout is responsible for loading the application's global font families.

Primary file:

`frontend/app/layout.tsx`

The currently configured font families are:

- Geist
- Geist Mono

They are imported from:

```tsx
import { Geist, Geist_Mono } from "next/font/google";
```

## 2. Font Families

### 2.1 Geist

Geist is the primary sans-serif font.

It is configured as:

```tsx
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});
```

The font is intended for general interface content, including:

- Headings
- Body text
- Navigation
- Buttons
- Form labels
- Descriptions
- General application content

### 2.2 Geist Mono

Geist Mono is the monospace font.

It is configured as:

```tsx
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});
```

Use monospace typography for content that benefits from fixed-width characters, such as:

- Code snippets
- Technical identifiers
- Hashes
- Transaction references
- Developer-oriented information

Do not use monospace as the default font for general interface content.

## 3. Global Font Configuration

Both font variables are attached to the root body element in:

`frontend/app/layout.tsx`

The existing implementation is:

```tsx
<body
  className={`${geistSans.variable} ${geistMono.variable} antialiased bg-white dark:bg-darkblue-dark text-gray-900 dark:text-gray-100 transition-colors duration-300`}
>
```

This makes the font variables available throughout the application.

The `antialiased` utility enables font smoothing.

### Important

The font variables are defined in the root layout. Their presence does not automatically mean that every component explicitly uses a particular font utility.

Use the existing global configuration and verify the rendered font when changing typography.

## 4. Typography Scale

Use Tailwind CSS text-size utilities to maintain consistent typography.

The following are common Tailwind default text sizes.

| Utility | Font Size | Default Line Height |
|---|---:|---:|
| `text-xs` | 12px | 16px |
| `text-sm` | 14px | 20px |
| `text-base` | 16px | 24px |
| `text-lg` | 18px | 28px |
| `text-xl` | 20px | 28px |
| `text-2xl` | 24px | 32px |
| `text-3xl` | 30px | 36px |
| `text-4xl` | 36px | 40px |
| `text-5xl` | 48px | 1 |
| `text-6xl` | 60px | 1 |

These are Tailwind defaults, not a separately implemented custom StellarProof typography scale.

### Recommended Usage

| Content Type | Suggested Utility |
|---|---|
| Small supporting text | `text-xs` |
| Metadata and captions | `text-sm` |
| General body content | `text-base` |
| Emphasized body content | `text-lg` |
| Small section headings | `text-xl` |
| Section headings | `text-2xl` or `text-3xl` |
| Main page headings | `text-3xl` or `text-4xl` |
| Prominent hero headings | `text-4xl` to `text-6xl` |

Choose sizes according to the content hierarchy and available space.

## 5. Font Weights

Use Tailwind's standard font-weight utilities.

| Utility | Weight | Intended Usage |
|---|---:|---|
| `font-normal` | 400 | General body text |
| `font-medium` | 500 | Labels and moderate emphasis |
| `font-semibold` | 600 | Section headings and important text |
| `font-bold` | 700 | Main headings and strong emphasis |
| `font-extrabold` | 800 | High-emphasis display text |

### Guidelines

- Use regular weight for long-form body content.
- Use medium weight for labels and supporting interface text.
- Use semibold for most section headings.
- Use bold for important headings and primary emphasis.
- Avoid using heavy font weights for large blocks of text.

## 6. Line Height and Readability

Line height should support readability and the visual hierarchy of the content.

Common Tailwind line-height utilities include:

| Utility | Line Height |
|---|---:|
| `leading-none` | 1 |
| `leading-tight` | 1.25 |
| `leading-snug` | 1.375 |
| `leading-normal` | 1.5 |
| `leading-relaxed` | 1.625 |
| `leading-loose` | 2 |

### Guidelines

- Use tighter line heights for large headings.
- Use normal or relaxed line heights for paragraphs.
- Avoid excessively compressed body text.
- Ensure long descriptions remain readable on mobile devices.

Example:

```tsx
<h1 className="text-3xl font-bold leading-tight md:text-5xl">
  Verify Digital Content with Confidence
</h1>

<p className="text-base leading-relaxed text-gray-600 dark:text-gray-300">
  StellarProof provides verifiable digital authenticity
  through cryptographic verification.
</p>
```

## 7. Responsive Typography

Typography should adapt to available screen space.

Use Tailwind responsive prefixes to adjust font sizes when necessary.

Example:

```tsx
<h1 className="text-2xl font-bold leading-tight sm:text-3xl md:text-4xl lg:text-5xl">
  StellarProof
</h1>
```

### Tailwind Default Breakpoints

| Prefix | Minimum Width |
|---|---:|
| `sm` | 640px |
| `md` | 768px |
| `lg` | 1024px |
| `xl` | 1280px |
| `2xl` | 1536px |

These are Tailwind's default breakpoints, not custom StellarProof breakpoints.

### Responsive Guidelines

- Start with a readable mobile font size.
- Increase heading sizes at larger breakpoints where appropriate.
- Avoid oversized headings that overflow smaller screens.
- Maintain readable paragraph widths.
- Use responsive line heights where necessary.
- Ensure buttons and form labels remain legible.
- Test typography at narrow and wide viewport sizes.

## 8. Text Color and Theme Compatibility

Typography must remain readable in both light and dark modes.

Use existing color utilities and theme-aware styles.

Example:

```tsx
<p className="text-gray-900 dark:text-gray-100">
  Primary text
</p>

<p className="text-gray-600 dark:text-gray-300">
  Supporting text
</p>
```

Prefer existing semantic color tokens when suitable.

Avoid introducing hardcoded colors unnecessarily.

## 9. Typography for Technical Content

StellarProof handles technical information such as transaction references, cryptographic identifiers, and verification details.

Use monospace typography when fixed-width characters improve readability.

Example:

```tsx
<code className="font-mono text-sm break-all">
  ABCDEFG123456789
</code>
```

For long hashes and identifiers:

- Allow text wrapping where appropriate.
- Prevent content from overflowing containers.
- Preserve the readability of technical values.
- Use truncation only when the complete value remains accessible through an appropriate interaction.

## 10. Accessibility Guidelines

- Maintain sufficient text/background contrast.
- Avoid excessively small text for important information.
- Do not communicate meaning through font weight alone.
- Preserve logical heading hierarchy.
- Avoid using headings solely to achieve a particular visual size.
- Ensure text remains readable when users zoom their browsers.
- Use semantic HTML elements for headings and paragraphs.

Recommended heading hierarchy:

```tsx
<h1>Page Title</h1>

<section>
  <h2>Section Title</h2>

  <h3>Subsection Title</h3>

  <p>Supporting content.</p>
</section>
```

## 11. Typography Checklist

Before submitting typography changes:

- [ ] Existing Geist and Geist Mono configuration is preserved.
- [ ] Font sizes follow a consistent hierarchy.
- [ ] Font weights are used appropriately.
- [ ] Line heights support readability.
- [ ] Responsive typography works across screen sizes.
- [ ] Text colors work in both themes.
- [ ] Technical identifiers remain readable.
- [ ] No horizontal overflow is introduced.
- [ ] Accessibility and heading hierarchy are preserved.

## 12. Related Files

| File | Responsibility |
|---|---|
| `frontend/app/layout.tsx` | Font loading and global font variables |
| `frontend/app/globals.css` | Global typography-related CSS |
| `frontend/app/page.tsx` | Example of page-level typography usage |
| `frontend/components/Footer.tsx` | Example of component-level typography usage |
| `frontend/components/ThemeToggle.tsx` | Example of accessible interactive UI text |

## 13. Maintenance

Update this guide whenever font families, global font configuration, or typography conventions change.

Document only fonts and font weights that are actually available in the project.
