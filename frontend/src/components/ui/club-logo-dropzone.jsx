import React from 'react';
import { Button } from './button';
import { cn } from '../../lib/utils';

// Avatar-preview drag/drop box shared by club setup and club profile: a
// circular preview on the left, upload button + filename + hint on the right.
export function ClubLogoDropzone({
  dragActive,
  onDragEnter,
  onDragOver,
  onDragLeave,
  onDrop,
  inputRef,
  onSelectFile,
  previewSrc,
  fileName,
  title = 'Club Profile Picture',
  description = 'If no custom image is set, your Google profile picture will be used automatically.',
  buttonLabel = 'Upload from device',
  emptyLabel = 'No file selected',
  extraButton,
  onPreviewClick,
}) {
  const avatar = previewSrc ? (
    <img src={previewSrc} alt="Club logo preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
  ) : (
    <span className="material-symbols-outlined text-[40px] text-text-secondary/50">photo_camera</span>
  );

  return (
    <div
      className={cn(
        'rounded-xl border border-dashed p-5 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center gap-5 sm:gap-8 transition-colors',
        dragActive ? 'border-primary bg-primary/5' : 'border-border-subtle dark:border-border-strong',
      )}
      onDragEnter={onDragEnter}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {onPreviewClick ? (
        <button
          type="button"
          onClick={onPreviewClick}
          className="w-28 h-28 rounded-full border-2 border-dashed border-text-secondary/30 flex items-center justify-center shrink-0 bg-surface-muted dark:bg-border-strong overflow-hidden cursor-pointer hover:scale-[1.02] transition-transform"
          aria-label="Choose club logo"
        >
          {avatar}
        </button>
      ) : (
        <div className="w-28 h-28 rounded-full border-2 border-dashed border-text-secondary/30 flex items-center justify-center shrink-0 bg-surface-muted dark:bg-border-strong overflow-hidden">
          {avatar}
        </div>
      )}
      <div className="flex-1">
        <h3 className="text-xl font-semibold mb-1">{title}</h3>
        <p className="type-body text-text-secondary dark:text-text-dark-secondary mb-3">{description}</p>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(event) => {
            const selectedFile = event.target.files?.[0] || null;
            onSelectFile(selectedFile);
          }}
          className="hidden"
        />
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" onClick={() => inputRef.current?.click()} variant="secondary" size="sm" className="border border-border-subtle">
            <span className="material-symbols-outlined text-[18px]">upload</span>
            {buttonLabel}
          </Button>
          {extraButton}
          <span className="text-xs text-text-secondary dark:text-text-dark-secondary truncate max-w-64">{fileName || emptyLabel}</span>
        </div>
        <p className="text-xs text-text-secondary dark:text-text-dark-secondary mt-2">or drag and drop an image here</p>
      </div>
    </div>
  );
}
