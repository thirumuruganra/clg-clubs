import React from 'react';
import { Button } from './button';
import { cn } from '../../lib/utils';

// Dashed drag-and-drop box + hidden file input + trigger button. Shared by
// every image-upload flow (club logo, event poster, payment QR) that used to
// hand-roll this same markup with its own drag handlers.
export function FileDropzone({
  dragActive = false,
  onDragEnter,
  onDragOver,
  onDragLeave,
  onDrop,
  inputRef,
  accept = 'image/jpeg,image/png,image/webp',
  onSelectFile,
  fileName,
  buttonLabel = 'Choose file',
  buttonIcon = 'upload',
  hint = 'or drag and drop an image here',
  emptyLabel = 'No file selected',
  className,
}) {
  return (
    <div
      className={cn(
        'rounded-xl border-2 border-dashed p-4 transition-colors',
        dragActive
          ? 'border-primary bg-primary/5'
          : 'border-border-subtle bg-surface-muted dark:border-border-strong dark:bg-surface-canvas/60',
        className,
      )}
      onDragEnter={onDragEnter}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={(event) => {
          const selectedFile = event.target.files?.[0] || null;
          onSelectFile(selectedFile);
          event.target.value = '';
        }}
        className="hidden"
      />
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" variant="secondary" onClick={() => inputRef.current?.click()}>
          <span className="material-symbols-outlined text-[18px]">{buttonIcon}</span>
          {buttonLabel}
        </Button>
        <span className="max-w-64 truncate text-xs text-text-secondary dark:text-text-dark-secondary">{fileName || emptyLabel}</span>
      </div>
      <p className="mt-2 text-xs text-text-secondary dark:text-text-dark-secondary">{hint}</p>
    </div>
  );
}
