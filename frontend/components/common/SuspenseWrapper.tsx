'use client';

import { Suspense, ComponentType, ReactNode } from 'react';

interface SuspenseWrapperProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export function SuspenseWrapper({ children, fallback }: SuspenseWrapperProps) {
  const defaultFallback = (
    <div className="flex items-center justify-center p-4">
      <div className="animate-pulse text-gray-500">Loading...</div>
    </div>
  );

  return <Suspense fallback={fallback || defaultFallback}>{children}</Suspense>;
}

export function withSuspense<P extends object>(
  Component: ComponentType<P>,
  fallback?: ReactNode
): ComponentType<P> {
  return function WithSuspenseWrapper(props: P) {
    return (
      <SuspenseWrapper fallback={fallback}>
        <Component {...props} />
      </SuspenseWrapper>
    );
  };
}