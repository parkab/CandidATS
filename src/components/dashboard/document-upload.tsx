'use client';

import { useRef, useState } from 'react';

type DocumentUploadProps = {
  onUploadSuccess?: () => void;
};

export default function DocumentUpload({ onUploadSuccess }: DocumentUploadProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    type: 'other' as 'resume' | 'cover_letter' | 'other',
    status: 'ready' as 'draft' | 'ready' | 'archived',
    tags: '' as string,
  });
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileSelect = (file: File | null) => {
    setSelectedFile(file);
    if (!file) return;
    if (!formData.title.trim()) {
      setFormData((prev) => ({
        ...prev,
        title: file.name.replace(/\.[^/.]+$/, ''), // Remove extension
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setError('Please select a file');
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('title', formData.title.trim() || selectedFile.name);
      formDataToSend.append('type', formData.type);
      formDataToSend.append('status', formData.status);
      formDataToSend.append('file', selectedFile);

      if (formData.tags.trim()) {
        formDataToSend.append('tags', formData.tags);
      }

      const response = await fetch('/api/documents', {
        method: 'POST',
        body: formDataToSend,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || 'Failed to upload document',
        );
      }

      setIsOpen(false);
      setFormData({
        title: '',
        type: 'other',
        status: 'ready',
        tags: '',
      });
      setSelectedFile(null);
      onUploadSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  if (!isOpen) {
    return (
      <div className="flex justify-center mb-6">
        <button
          onClick={() => setIsOpen(true)}
          className="rounded-md bg-(--foreground) px-6 py-3 text-sm font-semibold text-(--background) transition hover:bg-(--inverse-hover)"
        >
          + Upload Document
        </button>
      </div>
    );
  }

  return (
    <div className="mb-6 rounded-lg border border-(--surface-border) bg-(--background) p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-(--foreground)">
          Upload Document
        </h2>
        <button
          onClick={() => setIsOpen(false)}
          className="text-xl text-(--text-muted) hover:text-(--foreground)"
        >
          ✕
        </button>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-4">
        {/* File Upload */}
        <div className="grid gap-1.5">
          <label className="text-sm font-semibold text-(--foreground)">
            Document File
          </label>
          <div className="grid gap-2">
            <input
              ref={fileInputRef}
              type="file"
              onChange={(e) => handleFileSelect(e.currentTarget.files?.[0] ?? null)}
              accept=".pdf,.docx,.txt"
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="rounded-md border border-dashed border-(--surface-border) bg-(--surface) px-4 py-6 text-center transition hover:bg-(--surface-hover)"
            >
              <p className="text-sm font-medium text-(--foreground)">
                {selectedFile ? selectedFile.name : 'Click to select file'}
              </p>
              <p className="text-xs text-(--text-muted)">
                PDF, DOCX, or TXT files only
              </p>
            </button>
          </div>
        </div>

        {/* Title */}
        <div className="grid gap-1.5">
          <label className="text-sm font-semibold text-(--foreground)">
            Title
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, title: e.target.value }))
            }
            placeholder="Document title"
            className="rounded-md border border-(--surface-border) bg-(--background) px-3 py-2 text-(--foreground) placeholder:text-(--text-muted) focus:outline-none focus:ring-2 focus:ring-(--foreground)"
          />
        </div>

        {/* Type */}
        <div className="grid gap-1.5">
          <label className="text-sm font-semibold text-(--foreground)">
            Document Type
          </label>
          <select
            value={formData.type}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                type: e.target.value as 'resume' | 'cover_letter' | 'other',
              }))
            }
            className="rounded-md border border-(--surface-border) bg-(--background) px-3 py-2 text-(--foreground) focus:outline-none focus:ring-2 focus:ring-(--foreground)"
          >
            <option value="resume">Resume</option>
            <option value="cover_letter">Cover Letter</option>
            <option value="other">Other</option>
          </select>
        </div>

        {/* Status */}
        <div className="grid gap-1.5">
          <label className="text-sm font-semibold text-(--foreground)">
            Status
          </label>
          <select
            value={formData.status}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                status: e.target.value as 'draft' | 'ready' | 'archived',
              }))
            }
            className="rounded-md border border-(--surface-border) bg-(--background) px-3 py-2 text-(--foreground) focus:outline-none focus:ring-2 focus:ring-(--foreground)"
          >
            <option value="draft">Draft</option>
            <option value="ready">Ready</option>
            <option value="archived">Archived</option>
          </select>
        </div>

        {/* Tags */}
        <div className="grid gap-1.5">
          <label className="text-sm font-semibold text-(--foreground)">
            Tags (comma-separated)
          </label>
          <input
            type="text"
            value={formData.tags}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, tags: e.target.value }))
            }
            placeholder="e.g., tech, senior, 2024"
            className="rounded-md border border-(--surface-border) bg-(--background) px-3 py-2 text-(--foreground) placeholder:text-(--text-muted) focus:outline-none focus:ring-2 focus:ring-(--foreground)"
          />
        </div>

        {/* Error */}
        {error && <p className="text-sm text-(--danger-text)">{error}</p>}

        {/* Buttons */}
        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            disabled={isUploading}
            className="rounded-md border border-(--action-border) px-4 py-2 text-sm font-semibold text-(--foreground) transition hover:bg-(--action-bg) disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isUploading || !selectedFile}
            className="rounded-md bg-(--foreground) px-4 py-2 text-sm font-semibold text-(--background) transition hover:bg-(--inverse-hover) disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUploading ? 'Uploading...' : 'Upload Document'}
          </button>
        </div>
      </form>
    </div>
  );
}
