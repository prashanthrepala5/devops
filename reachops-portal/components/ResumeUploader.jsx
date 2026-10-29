'use client';

import { useState, useRef, useCallback } from 'react';

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
const ALLOWED_EXTENSIONS = ['.pdf', '.docx'];

function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

function getFileExtension(filename) {
  if (!filename) return '';
  const lastDot = filename.lastIndexOf('.');
  return lastDot !== -1 ? filename.slice(lastDot).toLowerCase() : '';
}

export default function ResumeUploader({ onFileSelect, selectedFile }) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const fileInputRef = useRef(null);

  const validateFile = useCallback((file) => {
    if (!file) return 'No file selected.';

    const ext = getFileExtension(file.name);
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return 'Invalid file type. Please upload a .pdf or .docx document.';
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return `File size (${formatFileSize(file.size)}) exceeds the maximum allowed limit of 10MB.`;
    }

    return null;
  }, []);

  const handleFile = useCallback(
    (file) => {
      if (!file) return;
      const error = validateFile(file);
      if (error) {
        setErrorMessage(error);
        return;
      }
      setErrorMessage('');
      if (onFileSelect) {
        onFileSelect(file);
      }
    },
    [validateFile, onFileSelect]
  );

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragOver) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    // Only turn off if leaving the drop container itself
    if (e.currentTarget.contains(e.relatedTarget)) return;
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleInputChange = (e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleZoneClick = () => {
    if (!selectedFile && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleRemove = (e) => {
    e.stopPropagation();
    setErrorMessage('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (onFileSelect) {
      onFileSelect(null);
    }
  };

  const handleKeyDown = (e) => {
    if ((e.key === 'Enter' || e.key === ' ') && !selectedFile) {
      e.preventDefault();
      fileInputRef.current?.click();
    }
  };

  const zoneClasses = [
    'upload-zone',
    isDragOver ? 'dragover' : '',
    selectedFile ? 'has-file' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="resume-uploader-wrapper">
      <div
        className={zoneClasses}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleZoneClick}
        onKeyDown={handleKeyDown}
        role="region"
        tabIndex={selectedFile ? -1 : 0}
        aria-label="Resume file upload drop zone"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          onChange={handleInputChange}
          style={{ display: 'none' }}
          aria-hidden="true"
        />

        {!selectedFile ? (
          <div className="upload-placeholder">
            {/* Cloud upload SVG icon */}
            <div className="upload-icon-wrapper" aria-hidden="true">
              <svg
                className="upload-icon"
                viewBox="0 0 48 48"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M14 36C10.6863 36 8 33.3137 8 30C8 27.0544 10.1251 24.6074 12.9377 24.1039C13.208 17.3826 18.7497 12 25.5 12C32.1953 12 37.7001 17.2796 38.0558 23.9056C41.4019 24.3725 44 27.2435 44 30.7143C44 34.462 40.9634 37.5 37.2157 37.5H35"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M24 22V36M24 22L19 27M24 22L29 27"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div className="upload-text-group">
              <p className="upload-title">
                <span className="upload-accent">Click to upload</span> or drag and drop
              </p>
              <p className="upload-subtitle">Supported formats: PDF or DOCX (Max size: 10MB)</p>
            </div>
            <button
              type="button"
              className="upload-action-btn"
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
              aria-label="Browse files on computer"
            >
              Browse Files
            </button>
          </div>
        ) : (
          <div className="uploaded-file-details">
            <div className="file-meta-icon" aria-hidden="true">
              <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M8 4H20L26 10V28H8V4Z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinejoin="round"
                />
                <path d="M20 4V10H26" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                <path d="M12 16H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <path d="M12 21H18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
            <div className="file-info-text">
              <span className="file-name" title={selectedFile.name}>
                {selectedFile.name}
              </span>
              <div className="file-specs">
                <span className="file-badge">
                  {getFileExtension(selectedFile.name).toUpperCase().replace('.', '') || 'FILE'}
                </span>
                <span className="file-size">{formatFileSize(selectedFile.size)}</span>
              </div>
            </div>
            <button
              type="button"
              className="file-remove-btn"
              onClick={handleRemove}
              aria-label={`Remove file ${selectedFile.name}`}
              title="Remove file"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <line x1="18" y1="6" x2="6" y2="18" strokeLinecap="round" />
                <line x1="6" y1="6" x2="18" y2="18" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {errorMessage && (
        <div className="upload-error-msg" role="alert" aria-live="polite">
          <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
}
