'use client';

import { useSearchParams, usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { SuspenseWrapper } from '../common/SuspenseWrapper';

interface ManifestModalTriggerProps {
  className?: string;
  children?: React.ReactNode;
}

function ManifestModalTriggerContent({ className, children }: ManifestModalTriggerProps) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  const manifestId = searchParams.get('manifestId');
  const isModalOpen = searchParams.get('modal') === 'manifest';

  useEffect(() => {
    setIsOpen(isModalOpen);
  }, [isModalOpen]);

  const openModal = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('modal', 'manifest');
    router.push(`${pathname}?${params.toString()}`);
    setIsOpen(true);
  };

  const closeModal = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('modal');
    router.push(`${pathname}?${params.toString()}`);
    setIsOpen(false);
  };

  return (
    <>
      <button
        onClick={openModal}
        className={className || "px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"}
      >
        {children || 'Open Manifest'}
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Manifest Details
              </h2>
              <button
                onClick={closeModal}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Manifest ID
                </p>
                <p className="text-gray-900 dark:text-white font-mono break-all">
                  {manifestId || 'No manifest selected'}
                </p>
              </div>
            </div>

            <div className="mt-6">
              <button
                onClick={closeModal}
                className="w-full px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function ManifestModalTrigger(props: ManifestModalTriggerProps) {
  return (
    <SuspenseWrapper
      fallback={
        <div className="animate-pulse px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-md h-10 w-32" />
      }
    >
      <ManifestModalTriggerContent {...props} />
    </SuspenseWrapper>
  );
}

export default ManifestModalTrigger;
