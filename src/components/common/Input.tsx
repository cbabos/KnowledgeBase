import React, { forwardRef } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import styles from './Input.module.css';

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  size?: 'sm' | 'base' | 'lg';
  variant?: 'default' | 'error';
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  showPasswordToggle?: boolean;
  className?: string;
  label?: string;
  helpText?: string;
  errorText?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      size = 'base',
      variant = 'default',
      leftIcon,
      rightIcon,
      showPasswordToggle = false,
      className = '',
      label,
      helpText,
      errorText,
      type = 'text',
      disabled,
      ...props
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = React.useState(false);
    const [isFocused, setIsFocused] = React.useState(false);

    const inputType =
      showPasswordToggle && type === 'password'
        ? showPassword
          ? 'text'
          : 'password'
        : type;

    const hasError = variant === 'error' || !!errorText;
    const effectiveVariant = hasError ? 'error' : variant;

    const inputClasses = [
      styles.input,
      styles[`input-${size}`],
      styles[`input-${effectiveVariant}`],
      isFocused && styles.inputFocused,
      disabled && styles.inputDisabled,
      leftIcon && styles.inputWithLeftIcon,
      (rightIcon || showPasswordToggle) && styles.inputWithRightIcon,
      className,
    ]
      .filter(Boolean)
      .join(' ');

    const containerClasses = [styles.container, className]
      .filter(Boolean)
      .join(' ');

    const handlePasswordToggle = () => {
      setShowPassword(!showPassword);
    };

    return (
      <div className={containerClasses}>
        {label && <label className={styles.label}>{label}</label>}

        <div className={styles.inputWrapper}>
          {leftIcon && <div className={styles.leftIcon}>{leftIcon}</div>}

          <input
            ref={ref}
            type={inputType}
            disabled={disabled}
            className={inputClasses}
            onFocus={e => {
              setIsFocused(true);
              props.onFocus?.(e);
            }}
            onBlur={e => {
              setIsFocused(false);
              props.onBlur?.(e);
            }}
            {...props}
          />

          {showPasswordToggle && (
            <button
              type='button'
              className={styles.passwordToggle}
              onClick={handlePasswordToggle}
              disabled={disabled}
              tabIndex={-1}
            >
              {showPassword ? (
                <EyeOff className={styles.passwordToggleIcon} />
              ) : (
                <Eye className={styles.passwordToggleIcon} />
              )}
            </button>
          )}

          {rightIcon && !showPasswordToggle && (
            <div className={styles.rightIcon}>{rightIcon}</div>
          )}
        </div>

        {(helpText || errorText) && (
          <div className={styles.helpText}>
            {errorText ? (
              <span className={styles.errorText}>{errorText}</span>
            ) : (
              <span className={styles.helpTextContent}>{helpText}</span>
            )}
          </div>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
