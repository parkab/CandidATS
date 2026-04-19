'use client';

import { useRef, useEffect } from 'react';

type DeleteJobDialogProps = {
  jobId: string;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  jobTitle?: string;
  companyName?: string;
};

export default function DeleteJobDialog({
  jobId,
  isOpen,
  onClose,
  onConfirm,
  jobTitle = 'this job',
  companyName,
}: DeleteJobDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }

    if (isOpen) {
      dialog.showModal();
    } else if (dialog.close) {
      dialog.close();
    }
  }, [isOpen]);

  async function handleConfirm() {
    try {
      await onConfirm();
      onClose();
    } catch (error) {
      // Error handling is done in the parent component
    }
  }

  const displayName = companyName ? `${jobTitle} at ${companyName}` : jobTitle;

  return (
    <dialog
      ref={dialogRef}
      className="fixed inset-0 m-auto w-96 overflow-hidden rounded-lg border border-(--surface-divider) bg-(--background) shadow-xl backdrop:bg-black/50"
      onClick={(e) => {
        if (e.target === dialogRef.current) {
          onClose();
        }
      }}
    >
      <div className="w-96 p-6">
        <h2 className="text-lg font-semibold text-(--foreground)">
          Delete Job Application?
        </h2>
        <p className="mt-3 text-sm text-(--text-muted)">
          Are you sure you want to delete <span className="font-medium">{displayName}</span>? This action cannot be undone.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-(--action-border) px-4 py-2 text-sm font-semibold text-(--foreground) transition hover:bg-(--action-bg) disabled:cursor-not-allowed disabled:opacity-70"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="rounded-md bg-(--danger-bg) px-4 py-2 text-sm font-semibold text-(--danger-text) transition hover:bg-(--danger-text) hover:text-(--background) disabled:cursor-not-allowed disabled:opacity-70"
          >
            Delete
          </button>
        </div>
      </div>
    </dialog>
  );
}
