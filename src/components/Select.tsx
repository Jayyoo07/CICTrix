import React, { useId } from 'react';
import '../styles/components.css';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
}

export const Select: React.FC<SelectProps> = ({
  label,
  error,
  options,
  className = '',
  id,
  ...props
}) => {
  // Label and error are tied to the control for screen readers (§13).
  const autoId = useId();
  const selectId = id ?? autoId;
  const errorId = `${selectId}-msg`;

  return (
    <div className="select-wrapper">
      {label && (
        <label className="select-label" htmlFor={selectId}>
          {label}
          {props.required && <span className="input-required" aria-hidden="true"> *</span>}
        </label>
      )}
      <select
        className={`select ${error ? 'select-error' : ''} ${className}`}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        id={selectId}
        {...props}
      >
        <option value="">Select an option...</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && <span id={errorId} className="select-error-text" role="alert">{error}</span>}
    </div>
  );
};
