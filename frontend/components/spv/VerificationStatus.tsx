import { CheckCircle2, XCircle } from 'lucide-react';

export interface VerificationStatusProps {
  verified: boolean;
  label?: string;
}

export default function VerificationStatus({ verified, label }: VerificationStatusProps) {
  return (
    <div
      role="status"
      className={`inline-flex min-h-10 items-center gap-2 border-l-4 px-3 py-2 text-sm font-semibold ${
        verified
          ? 'border-emerald-600 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300'
          : 'border-red-600 bg-red-50 text-red-800 dark:bg-red-950/30 dark:text-red-300'
      }`}
    >
      {verified ? (
        <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
      ) : (
        <XCircle className="h-5 w-5" aria-hidden="true" />
      )}
      {label ?? (verified ? 'SPV verified' : 'SPV verification failed')}
    </div>
  );
}
