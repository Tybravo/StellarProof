'use client';

import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/ui/Modal';

export function SignPromptModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} size="sm">
      <ModalHeader>Sign transaction in Freighter</ModalHeader>
      <ModalBody>
        <p>Open the Freighter extension and review the transaction details and XLM fee.</p>
        <p className="mt-3">Approve to continue, or reject the request in Freighter to return and try again.</p>
      </ModalBody>
      <ModalFooter>
        <button type="button" onClick={onClose} className="rounded-lg bg-blue-600 px-4 py-2 text-white">
          Hide instructions
        </button>
      </ModalFooter>
    </Modal>
  );
}
