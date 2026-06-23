import React from 'react';

export default function CustomDialogModal({ config }) {
  const [inputValue, setInputValue] = React.useState(config.defaultValue || '');

  const handleConfirm = (e) => {
    e.preventDefault();
    if (config.type === 'prompt') {
      config.onConfirm(inputValue);
    } else {
      config.onConfirm(true);
    }
  };

  const handleCancel = () => {
    config.onCancel();
  };

  // Auto focus and select input text
  const inputRef = React.useRef(null);
  React.useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
      if (config.type === 'prompt' && config.inputType !== 'number') {
        inputRef.current.select();
      }
    }
  }, []);

  return (
    <div className="dialog-overlay" onClick={handleCancel}>
      <div className="dialog-box" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-header">
          <h4 className="dialog-title">
            {config.type === 'alert' && <i className="fa-solid fa-circle-exclamation dialog-header-icon alert"></i>}
            {config.type === 'confirm' && <i className="fa-solid fa-circle-question dialog-header-icon confirm"></i>}
            {config.type === 'prompt' && <i className="fa-solid fa-pen-to-square dialog-header-icon prompt"></i>}
            {config.title}
          </h4>
        </div>
        <form onSubmit={handleConfirm}>
          <div className="dialog-body">
            <p className="dialog-message">{config.message}</p>
            {config.type === 'prompt' && (
              <div className="dialog-input-wrapper">
                <input
                  ref={inputRef}
                  type={config.inputType || 'text'}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder={config.placeholder}
                  className="dialog-input"
                  step={config.inputType === 'number' ? '0.01' : undefined}
                  min={config.inputType === 'number' ? '0.01' : undefined}
                  autoComplete="off"
                />
              </div>
            )}
          </div>
          <div className="dialog-footer">
            {config.type !== 'alert' && (
              <button type="button" onClick={handleCancel} className="dialog-btn dialog-btn-cancel">
                Cancelar
              </button>
            )}
            <button type="submit" className="dialog-btn dialog-btn-confirm">
              Confirmar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
