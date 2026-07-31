'use client';

import * as React from 'react';

type TooltipContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
};

const TooltipContext = React.createContext<TooltipContextValue | null>(null);

function useTooltipContext() {
  const context = React.useContext(TooltipContext);
  if (!context) {
    throw new Error('Tooltip components must be used within <Tooltip>.');
  }
  return context;
}

export function TooltipProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function Tooltip({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);

  return (
    <TooltipContext.Provider value={{ open, setOpen }}>
      <span className="relative inline-flex">{children}</span>
    </TooltipContext.Provider>
  );
}

export function TooltipTrigger({
  asChild,
  children,
}: {
  asChild?: boolean;
  children: React.ReactElement;
}) {
  const { setOpen } = useTooltipContext();
  const child = children as React.ReactElement<Record<string, unknown>>;
  const childProps = child.props as {
    onMouseEnter?: (event: React.MouseEvent<HTMLElement>) => void;
    onMouseLeave?: (event: React.MouseEvent<HTMLElement>) => void;
    onFocus?: (event: React.FocusEvent<HTMLElement>) => void;
    onBlur?: (event: React.FocusEvent<HTMLElement>) => void;
  };

  return React.cloneElement(child, {
    onMouseEnter: (event: React.MouseEvent<HTMLElement>) => {
      childProps.onMouseEnter?.(event);
      setOpen(true);
    },
    onMouseLeave: (event: React.MouseEvent<HTMLElement>) => {
      childProps.onMouseLeave?.(event);
      setOpen(false);
    },
    onFocus: (event: React.FocusEvent<HTMLElement>) => {
      childProps.onFocus?.(event);
      setOpen(true);
    },
    onBlur: (event: React.FocusEvent<HTMLElement>) => {
      childProps.onBlur?.(event);
      setOpen(false);
    },
    ...(asChild ? {} : { type: 'button' }),
  });
}

export function TooltipContent({
  className = '',
  children,
}: {
  className?: string;
  children: React.ReactNode;
  side?: 'top' | 'bottom' | 'left' | 'right';
  sideOffset?: number;
}) {
  const { open } = useTooltipContext();

  if (!open) return null;

  return (
    <span
      role="tooltip"
      className={[
        'absolute bottom-full left-1/2 z-50 mb-2 w-max max-w-xs -translate-x-1/2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs leading-relaxed text-gray-700 shadow-lg',
        'dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200',
        className,
      ].join(' ')}
    >
      {children}
    </span>
  );
}
