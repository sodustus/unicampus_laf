import React, { useState, useEffect } from 'react';
import { IconAlert, IconCheck, IconClose } from './Icons';

export default function ActionDialogModal({
  isOpen,
  title = 'Confirmation Required',
  message = '',
  needsInput = false,
  inputLabel = '',
  inputPlaceholder = '',
  defaultValue = '',
  confirmLabel = 'Confirm',
  confirmVariant = 'primary',
  cancelLabel = 'Cancel',
  onConfirm,
  onClose,
}) {
  const [inputValue, setInputValue] = useState(defaultValue);

  useEffect(() => {
    if (isOpen) {
      setInputValue(defaultValue || '');
    }
  }, [isOpen, defaultValue]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    if (needsInput && !inputValue.trim()) {
      return;
    }
    onConfirm(needsInput ? inputValue.trim() : true);
  };

  const getConfirmClass = () => {
    switch (confirmVariant) {
      case 'danger':
        return 'btn btn-danger';
      case 'success':
        return 'btn btn-success';
      case 'warning':
        return 'btn btn-warning';
      default:
        return 'btn btn-primary';
    }
  };

  return (
    <div className="action-dialog-backdrop" onClick={onClose}>
      <div
        className="action-dialog-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="action-dialog-header">
          <div className="action-dialog-title-wrap">
            <span className={`action-dialog-icon ${confirmVariant}`}>
              {confirmVariant === 'danger' || confirmVariant === 'warning' ? (
                <IconAlert size={20} />
              ) : (
                <IconCheck size={20} />
              )}
            </span>
            <h3 className="action-dialog-title">{title}</h3>
          </div>
          <button
            type="button"
            className="action-dialog-close-btn"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <IconClose size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {message && <p className="action-dialog-message">{message}</p>}

          {needsInput && (
            <div className="action-dialog-input-group">
              {inputLabel && (
                <label className="action-dialog-input-label">{inputLabel}</label>
              )}
              <input
                type="text"
                className="form-input action-dialog-input"
                placeholder={inputPlaceholder}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                autoFocus
                required
              />
            </div>
          )}

          <div className="action-dialog-actions">
            <button
              type="button"
              className="btn btn-secondary action-dialog-btn"
              onClick={onClose}
            >
              {cancelLabel}
            </button>
            <button
              type="submit"
              className={`${getConfirmClass()} action-dialog-btn`}
              disabled={needsInput && !inputValue.trim()}
            >
              {confirmLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
