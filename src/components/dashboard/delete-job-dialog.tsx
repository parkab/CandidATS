'use client';

import { useRef, useEffect, useState } from 'react';

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
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }

    if (isOpen) {
      dialog.showModal();
    } else if (dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  function handleEscape(e: React.KeyboardEvent<HTMLDialogElement>) {
    if (e.key === 'Escape') {
      onClose();
    }
  }

  async function handleConfirm() {
    setError(null);
    setIsDeleting(true);

    try {
      await onConfirm();
      setIsDeleting(false);
      onClose();
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'An unexpected error occurred.';
      setError(errorMessage);
      setIsDeleting(false);
    }
  }

  const displayName = companyName ? `${jobTitle} at ${companyName}` : jobTitle;

  return (
    <dialog
      ref={dialogRef}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="delete-dialog-title"
      className="fixed inset-0 m-auto w-96 overflow-hidden rounded-lg border border-(--surface-divider) bg-(--background) shadow-xl backdrop:bg-black/50"
      onKeyDown={handleEscape}
      onClick={(e) => {
        if (e.target === dialogRef.current) {
          onClose();
        }
      }}
    >
      <div className="w-96 p-6">
        <h2
          id="delete-dialog-title"
          className="text-lg font-semibold text-(--foreground)"
        >
          Delete Job Application?
        </h2>
        <p className="mt-3 text-sm text-(--text-muted)">
          Are you sure you want to delete{' '}
          <span className="font-medium">{displayName}</span>? This action cannot
          be undone.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="rounded-md border border-(--action-border) px-4 py-2 text-sm font-semibold text-(--foreground) transition hover:bg-(--action-bg) disabled:cursor-not-allowed disabled:opacity-70"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isDeleting}
            className="rounded-md bg-(--danger-bg) px-4 py-2 text-sm font-semibold text-(--danger-text) transition hover:bg-(--danger-text) hover:text-(--background) disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
        {error && (
          <p
            className="mt-4 text-sm font-medium text-(--danger-text)"
            role="alert"
          >
            {error}
          </p>
        )}
      </div>
    </dialog>
  );
}
