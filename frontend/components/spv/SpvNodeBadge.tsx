import { Server } from 'lucide-react';

export interface SpvNodeBadgeProps {
  spvId: string;
}

export default function SpvNodeBadge({ spvId }: SpvNodeBadgeProps) {
  return (
    <span className="inline-flex h-8 max-w-full items-center gap-2 rounded-md border border-blue-200 bg-blue-50 px-2.5 text-xs font-semibold text-blue-800 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300">
      <Server className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span className="truncate font-mono">{spvId}</span>
    </span>
  );
}
