import { useEffect, useRef, useState } from 'react';

const DEFAULT_ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const DEFAULT_MAX_SIZE_BYTES = 2 * 1024 * 1024;

// Shared drag/drop + validate + preview + upload logic for a single club
// logo picker. `onError` receives validation messages so callers can render
// them alongside their own form errors.
export function useLogoUpload({
  onError,
  allowedTypes = DEFAULT_ALLOWED_TYPES,
  maxSizeBytes = DEFAULT_MAX_SIZE_BYTES,
} = {}) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef(null);
  const dragCounterRef = useRef(0);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const setSelectedFile = (selectedFile) => {
    if (!selectedFile) {
      setFile(null);
      setPreview((previous) => {
        if (previous) URL.revokeObjectURL(previous);
        return '';
      });
      return true;
    }

    if (!allowedTypes.includes(selectedFile.type)) {
      onError?.('Logo must be JPEG, PNG, or WebP.');
      return false;
    }

    if (selectedFile.size > maxSizeBytes) {
      onError?.(`Logo must be ${Math.round(maxSizeBytes / (1024 * 1024))} MB or smaller.`);
      return false;
    }

    onError?.('');
    setFile(selectedFile);
    setPreview((previous) => {
      if (previous) URL.revokeObjectURL(previous);
      return URL.createObjectURL(selectedFile);
    });
    return true;
  };

  const reset = () => {
    setFile(null);
    if (inputRef.current) inputRef.current.value = '';
    setPreview((previous) => {
      if (previous) URL.revokeObjectURL(previous);
      return '';
    });
  };

  const handleDragEnter = (event) => {
    event.preventDefault();
    dragCounterRef.current += 1;
    setDragActive(true);
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  };

  const handleDragLeave = (event) => {
    event.preventDefault();
    dragCounterRef.current = Math.max(0, dragCounterRef.current - 1);
    if (dragCounterRef.current === 0) setDragActive(false);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    dragCounterRef.current = 0;
    setDragActive(false);
    setSelectedFile(event.dataTransfer.files?.[0] || null);
  };

  const upload = async (clubId) => {
    const data = new FormData();
    data.append('file', file, file.name || 'club-logo');

    const res = await fetch(`/api/clubs/${clubId}/logo`, { method: 'POST', body: data });
    if (!res.ok) {
      const payload = await res.json().catch(() => ({}));
      throw new Error(payload.detail || 'Logo upload failed.');
    }
    return res.json();
  };

  return {
    file,
    preview,
    dragActive,
    inputRef,
    setSelectedFile,
    reset,
    openFilePicker: () => inputRef.current?.click(),
    handleDragEnter,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    upload,
  };
}
