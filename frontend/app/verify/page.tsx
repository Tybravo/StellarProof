'use client';

import WizardPageShell from '../../features/verification/components/WizardPageShell';
import { WalletGuard } from '@/components/auth/WalletGuard';

export default function Page() {
  return (
    <WalletGuard>
      <WizardPageShell />
    </WalletGuard>
  );
}
