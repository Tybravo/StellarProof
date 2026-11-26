
# Shared UI Component Library

This document describes the reusable UI components maintained in `frontend/components/ui/`.

The shared components provide common interaction patterns and visual building blocks for the StellarProof frontend. Prefer reusing these components over creating another implementation of an existing pattern.

## Directory Structure

```text
frontend/components/ui/
├── Accordion.tsx
├── Accordion.test.tsx
├── Button.tsx
├── EmptyStates/
│   ├── EmptyState.tsx
│   ├── EmptyVault.tsx
│   ├── SearchNoResults.tsx
│   ├── index.ts
│   └── __tests__/
├── Modal.tsx
├── ModalProvider.tsx
├── ScrollToTop.tsx
├── Skeleton.tsx
├── Stepper.tsx
└── __tests__/
```

## Component Catalog

| Component | Export | Purpose |
|---|---|---|
| Accordion | Default export | Expandable and collapsible content |
| Button | Default export | Reusable link or button element |
| Modal | Named exports | Accessible modal dialog and its sections |
| ModalProvider | Named exports | Application-level modal state and controls |
| ScrollToTop | Default export | Floating control for returning to the top |
| Skeleton | Named exports | Loading placeholders |
| Stepper | Named export | Multi-step progress indicator |
| EmptyState | Default export | General empty-content presentation |
| EmptyVault | Default export | Empty vault presentation |
| SearchNoResults | Default export | Empty search-result presentation |

---

## 1. Accordion

**File:** `frontend/components/ui/Accordion.tsx`

A controlled accordion that displays or hides content based on the `open` property.

### Props

| Prop | Type | Required | Description |
|---|---|---|---|
| `open` | `boolean` | Yes | Controls whether the content is displayed |
| `onToggle` | `() => void` | Yes | Callback invoked when the header button is clicked |
| `header` | `React.ReactNode` | Yes | Content displayed inside the toggle button |
| `children` | `React.ReactNode` | Yes | Expandable content |
| `className` | `string` | No | Additional CSS classes |
| `aria-label` | `string` | No | Accessible name for the toggle button |

### Usage

```tsx
import { useState } from "react";
import Accordion from "@/components/ui/Accordion";

export function ExampleAccordion() {
  const [open, setOpen] = useState(false);

  return (
    <Accordion
      open={open}
      onToggle={() => setOpen((previous) => !previous)}
      header={<span>Verification details</span>}
      className="mb-4"
    >
      <p>Additional verification information appears here.</p>
    </Accordion>
  );
}
```

### Behavior

- The parent component controls the open state.
- The header is rendered as a button.
- `aria-expanded` communicates the current state.
- `aria-controls` connects the button to its content panel.
- The content panel uses `role="region"`.
- Framer Motion provides the expand and collapse animation.
- The component scrolls its container into view when opened.

Use an accessible header label when the header content does not provide a suitable accessible name.

---

## 2. Button

**File:** `frontend/components/ui/Button.tsx`

A reusable component that renders either a native button or an anchor, depending on whether `href` is supplied.

### Props

The component accepts two mutually exclusive prop shapes.

**Native button**

| Prop | Type | Required | Description |
|---|---|---|---|
| `children` | `React.ReactNode` | Yes | Button content |
| `className` | `string` | No | Additional CSS classes |
| `href` | `undefined` | No | Must be omitted for a native button |
| Other button attributes | `React.ButtonHTMLAttributes<HTMLButtonElement>` | No | Native button properties such as `type`, `disabled`, and `onClick` |

**Anchor**

| Prop | Type | Required | Description |
|---|---|---|---|
| `children` | `React.ReactNode` | Yes | Link content |
| `href` | `string` | Yes | Destination URL |
| `className` | `string` | No | Additional CSS classes |
| Other anchor attributes | `React.AnchorHTMLAttributes<HTMLAnchorElement>` | No | Native anchor properties |

### Usage: Button action

```tsx
import Button from "@/components/ui/Button";

export function SaveButton() {
  return (
    <Button
      type="button"
      onClick={() => console.log("Save action triggered")}
      className="bg-blue-600 text-white"
    >
      Save changes
    </Button>
  );
}
```

### Usage: Navigation link

```tsx
import Button from "@/components/ui/Button";

export function DashboardLink() {
  return (
    <Button href="/dashboard">
      Open dashboard
    </Button>
  );
}
```

### Behavior

- Without `href`, the component renders a native `<button>`.
- With `href`, it renders an `<a>` element.
- It provides a shared base style, focus-visible styling, and a minimum target size.
- Native button and anchor attributes are forwarded to the rendered element.

Use `type="button"` for buttons that should not submit a surrounding form. Use `type="submit"` when form submission is intended.

---

## 3. Modal

**File:** `frontend/components/ui/Modal.tsx`

The modal implementation provides a dialog rendered through a React portal.

### Exports

```tsx
import {
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@/components/ui/Modal";
```

### Modal Props

| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `open` | `boolean` | Yes | — | Controls modal visibility |
| `onClose` | `() => void` | Yes | — | Callback used to close the modal |
| `children` | `React.ReactNode` | Yes | — | Modal content |
| `size` | `"sm" \| "md" \| "lg" \| "full"` | No | `"md"` | Controls the maximum width |

### Modal section props

`ModalHeader`, `ModalBody`, and `ModalFooter` accept:

| Prop | Type | Required | Description |
|---|---|---|---|
| `children` | `React.ReactNode` | Yes | Section content |
| `className` | `string` | No | Additional CSS classes |

### Usage

```tsx
"use client";

import { useState } from "react";
import {
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@/components/ui/Modal";

export function ConfirmationModal() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Open confirmation
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        size="md"
      >
        <ModalHeader>
          <h2>Confirm action</h2>
        </ModalHeader>

        <ModalBody>
          <p>Are you sure you want to continue?</p>
        </ModalBody>

        <ModalFooter>
          <button type="button" onClick={() => setOpen(false)}>
            Cancel
          </button>

          <button type="button" onClick={() => setOpen(false)}>
            Confirm
          </button>
        </ModalFooter>
      </Modal>
    </>
  );
}
```

### Behavior

- Renders into `document.body` using `createPortal`.
- Does not render the dialog when `open` is false.
- Provides `role="dialog"` and `aria-modal="true"`.
- Associates the dialog with its header and body through generated IDs.
- Closes when Escape is pressed.
- Closes when the overlay itself is clicked.
- Does not close when the dialog panel is clicked.
- Moves focus into the dialog when opened.
- Traps keyboard focus inside the dialog.
- Restores focus to the previously active element when closed.
- Locks body scrolling while the dialog is open.
- Respects reduced-motion preferences.

Use `ModalHeader`, `ModalBody`, and `ModalFooter` inside `Modal`. These section components depend on the modal context and should not be rendered independently.

---

## 4. ModalProvider and useModal

**File:** `frontend/components/ui/ModalProvider.tsx`

Provides a shared modal controller so descendant components can open and close dialogs without managing individual modal state.

### Exports

```tsx
import {
  ModalProvider,
  useModal,
} from "@/components/ui/ModalProvider";
```

### OpenModalOptions

```tsx
export interface OpenModalOptions {
  size?: "sm" | "md" | "lg" | "full";
  onClose?: () => void;
}
```

| Option | Type | Default | Description |
|---|---|---|---|
| `size` | `"sm" \| "md" \| "lg" \| "full"` | `"md"` | Modal width |
| `onClose` | `() => void` | `undefined` | Callback invoked when the modal closes through the modal's close handler |

### useModal return value

| Property | Type | Description |
|---|---|---|
| `openModal` | `(content: React.ReactNode, options?: OpenModalOptions) => void` | Opens a modal with the supplied content |
| `closeModal` | `() => void` | Closes the currently open modal |
| `isOpen` | `boolean` | Indicates whether a modal is open |

### Setup

Mount the provider once near the application root, for example in `frontend/app/layout.tsx`, alongside the application's other providers.

```tsx
import { ModalProvider } from "@/components/ui/ModalProvider";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <ModalProvider>
          {children}
        </ModalProvider>
      </body>
    </html>
  );
}
```

If the application already has a root provider composition, add `ModalProvider` to that existing composition rather than creating another root layout.

### Usage

```tsx
"use client";

import { useModal } from "@/components/ui/ModalProvider";
import {
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@/components/ui/Modal";

export function OpenModalButton() {
  const { openModal, closeModal, isOpen } = useModal();

  return (
    <div>
      <button
        type="button"
        onClick={() =>
          openModal(
            <>
              <ModalHeader>
                <h2>Delete certificate?</h2>
              </ModalHeader>

              <ModalBody>
                <p>This action requires confirmation.</p>
              </ModalBody>

              <ModalFooter>
                <button type="button" onClick={closeModal}>
                  Cancel
                </button>
              </ModalFooter>
            </>,
            { size: "md" }
          )
        }
      >
        Open modal
      </button>

      <p>Modal status: {isOpen ? "Open" : "Closed"}</p>
    </div>
  );
}
```

### Important

- `useModal()` must be called inside a component rendered under `ModalProvider`.
- The provider delegates dialog rendering to the shared `Modal` component.
- `closeModal()` closes the modal directly. The optional `onClose` callback is invoked through the modal's close handler, such as Escape or overlay dismissal.
- Opening another modal replaces the currently displayed modal content.

---

## 5. ScrollToTop

**File:** `frontend/components/ui/ScrollToTop.tsx`

A floating button that appears after the user scrolls beyond the component's configured threshold.

### Props

This component does not expose custom props.

### Usage

```tsx
import ScrollToTop from "@/components/ui/ScrollToTop";

export function PageLayout() {
  return (
    <>
      <main>
        {/* Page content */}
      </main>

      <ScrollToTop />
    </>
  );
}
```

### Behavior

- Uses an internal scroll threshold of 400 pixels.
- Listens to the window scroll event.
- Appears when `window.scrollY` exceeds the threshold.
- Uses a passive scroll listener.
- Removes the listener when the component unmounts.
- Scrolls to the top using smooth scrolling.
- Provides the accessible label `Scroll to top`.

---

## 6. Skeleton Components

**File:** `frontend/components/ui/Skeleton.tsx`

Provides loading placeholders for content that has not finished loading.

### Exports

```tsx
import {
  Skeleton,
  TextSkeleton,
  CardSkeleton,
  TableSkeleton,
  WizardSkeleton,
  DashboardAssetGridSkeleton,
  DashboardHistorySkeleton,
} from "@/components/ui/Skeleton";
```

### Skeleton

| Prop | Type | Description |
|---|---|---|
| `className` | `string` | Additional CSS classes |
| Other props | `React.HTMLAttributes<HTMLDivElement>` | Native div attributes |

Usage:

```tsx
<Skeleton className="h-10 w-full" />
```

### TextSkeleton

| Prop | Type | Default | Description |
|---|---|---|---|
| `lines` | `number` | `1` | Number of placeholder lines |
| `className` | `string` | — | Additional CSS classes |

Usage:

```tsx
<TextSkeleton lines={3} />
```

### CardSkeleton

| Prop | Type | Description |
|---|---|---|
| `className` | `string` | Additional CSS classes |

Usage:

```tsx
<CardSkeleton />
```

### TableSkeleton

| Prop | Type | Default | Description |
|---|---|---|---|
| `rows` | `number` | `5` | Number of placeholder rows |
| `className` | `string` | — | Additional CSS classes |

Usage:

```tsx
<TableSkeleton rows={6} />
```

### WizardSkeleton

| Prop | Type | Description |
|---|---|---|
| `className` | `string` | Additional CSS classes |

Usage:

```tsx
<WizardSkeleton />
```

### DashboardAssetGridSkeleton

| Prop | Type | Default | Description |
|---|---|---|---|
| `count` | `number` | `6` | Number of asset placeholder cards |
| `className` | `string` | — | Additional CSS classes |

Usage:

```tsx
<DashboardAssetGridSkeleton count={8} />
```

### DashboardHistorySkeleton

| Prop | Type | Default | Description |
|---|---|---|---|
| `rows` | `number` | `5` | Number of placeholder rows |
| `className` | `string` | — | Additional CSS classes |

Usage:

```tsx
<DashboardHistorySkeleton rows={4} />
```

### Behavior

- Uses the shared `cn` utility to combine CSS classes.
- Provides reusable loading placeholders for text, cards, tables, wizards, dashboard assets, and dashboard history.
- The dashboard variants expose test IDs for automated tests.

Use skeletons while content is loading. Replace them with the actual content when the relevant request or operation completes.

---

## 7. Stepper

**File:** `frontend/components/ui/Stepper.tsx`

Displays progress through a sequence of steps.

### Export

```tsx
import { Stepper } from "@/components/ui/Stepper";
```

### Step type

```tsx
interface Step {
  label: string;
}
```

### Props

| Prop | Type | Required | Description |
|---|---|---|---|
| `steps` | `Step[]` | Yes | Ordered list of steps |
| `currentStep` | `number` | Yes | Zero-based index of the active step |
| `completedSteps` | `number[]` | Yes | Zero-based indices of completed steps |
| `onStepClick` | `(stepIndex: number) => void` | No | Callback when a completed step is clicked |
| `className` | `string` | No | Additional CSS classes |

### Usage

```tsx
import { Stepper } from "@/components/ui/Stepper";

const steps = [
  { label: "Upload" },
  { label: "Verification" },
  { label: "Certificate" },
];

export function VerificationProgress() {
  return (
    <Stepper
      steps={steps}
      currentStep={1}
      completedSteps={[0]}
      onStepClick={(stepIndex) => {
        console.log("Return to step:", stepIndex);
      }}
    />
  );
}
```

### Behavior

- Step indexes are zero-based.
- Completed steps display a check icon.
- The active step displays its step number with active styling.
- Pending steps are disabled.
- Completed steps can be clicked when `onStepClick` is provided.
- The layout changes from vertical alignment on smaller screens to horizontal alignment at the medium breakpoint.

---

## 8. EmptyState

**File:** `frontend/components/ui/EmptyStates/EmptyState.tsx`

A reusable empty-state section for situations where a list, collection, or other content area has no data to display.

### Exports

```tsx
import EmptyState, {
  noResultsActions,
  uploadFirstAssetAction,
} from "@/components/ui/EmptyStates";
```

The `EmptyStates/index.ts` barrel file also exports the `EmptyStateAction` type.

### EmptyStateAction type

```tsx
export interface EmptyStateAction {
  label: string;
  onClick?: () => void;
  href?: string;
  variant?: "primary" | "secondary";
  icon?: React.ReactNode;
}
```

### Props

| Prop | Type | Required | Default | Description |
|---|---|---|---|---|
| `title` | `string` | Yes | — | Empty-state heading |
| `description` | `string` | Yes | — | Explanatory text |
| `icon` | `React.ReactNode` | No | Upload icon | Custom icon |
| `actions` | `EmptyStateAction[]` | No | `[]` | Available user actions |

### Usage

```tsx
import EmptyState from "@/components/ui/EmptyStates";

export function EmptyCertificates() {
  return (
    <EmptyState
      title="No certificates yet"
      description="Your verified certificates will appear here."
      actions={[
        {
          label: "Start verification",
          href: "/launch",
          variant: "primary",
        },
      ]}
    />
  );
}
```

### Helper functions

**`noResultsActions(onClearFilters)`**

Creates a secondary action for clearing filters.

```tsx
import {
  noResultsActions,
} from "@/components/ui/EmptyStates";

const actions = noResultsActions(() => {
  console.log("Clear filters");
});
```

**`uploadFirstAssetAction(href?)`**

Creates an action linking to the upload flow.

The default destination is `/launch`.

```tsx
import {
  uploadFirstAssetAction,
} from "@/components/ui/EmptyStates";

const action = uploadFirstAssetAction("/launch");
```

### Behavior

- Displays a default upload icon when no custom icon is provided.
- Supports primary and secondary action styles.
- Uses a Next.js `Link` when an action has an `href`.
- Otherwise, renders a button and invokes its `onClick` callback.
- Uses `role="status"` for the empty-state section.

---

## 9. EmptyVault

**File:** `frontend/components/ui/EmptyStates/EmptyVault.tsx`

Displays an empty-state message for the user's vault.

### Props

| Prop | Type | Default | Description |
|---|---|---|---|
| `ctaHref` | `string` | `"/register"` | Destination of the call-to-action link |
| `ctaLabel` | `string` | `"Secure your first file"` | Call-to-action text |
| `className` | `string` | — | Additional CSS classes |

### Usage

```tsx
import EmptyVault from "@/components/ui/EmptyStates/EmptyVault";

export function VaultContent() {
  return (
    <EmptyVault
      ctaHref="/launch"
      ctaLabel="Upload your first file"
    />
  );
}
```

### Behavior

- Displays a lock icon.
- Explains that secured files appear in the vault.
- Displays a call-to-action link when `ctaHref` is truthy.
- Uses `role="status"` and the `empty-vault` test ID.

Import this component directly from its file. It is not exported by the current `EmptyStates/index.ts` barrel.

---

## 10. SearchNoResults

**File:** `frontend/components/ui/EmptyStates/SearchNoResults.tsx`

Displays a search empty state when a query produces no results.

### Props

| Prop | Type | Description |
|---|---|---|
| `query` | `string` | Optional search term displayed in the message |
| `className` | `string` | Additional CSS classes |

### Usage

```tsx
import SearchNoResults from "@/components/ui/EmptyStates/SearchNoResults";

export function SearchResults({ query }: { query: string }) {
  return <SearchNoResults query={query} />;
}
```

### Behavior

- Displays a search icon.
- Shows a generic message when no query is supplied.
- Includes the query in the message when provided.
- Uses `role="status"` and the `search-no-results` test ID.

Import this component directly from its file. It is not exported by the current `EmptyStates/index.ts` barrel.

---

## Component Development Guidelines

When using or extending the shared UI library:

1. Prefer an existing shared component when it already satisfies the requirement.
2. Keep component props explicitly typed with TypeScript.
3. Preserve existing accessibility attributes and keyboard behavior.
4. Use the existing `cn` utility where the component already uses it.
5. Keep components reusable and avoid coupling them to a single page.
6. Add or update tests when changing component behavior.
7. Avoid changing public prop contracts without checking existing call sites.
8. Keep animations compatible with reduced-motion preferences where applicable.

## Related Tests

| Component | Test location |
|---|---|
| Accordion | `frontend/components/ui/Accordion.test.tsx` |
| Modal | `frontend/components/ui/__tests__/shared-ui.test.tsx` |
| ModalProvider | `frontend/components/ui/__tests__/ModalProvider.test.tsx` |
| EmptyVault and SearchNoResults | `frontend/components/ui/EmptyStates/__tests__/emptystates.test.tsx` |
| Other shared UI behavior | `frontend/components/ui/__tests__/shared-ui.test.tsx` |

Run the frontend test suite from the repository root:

```bash
pnpm --filter web run test
```
