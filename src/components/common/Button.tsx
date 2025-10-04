import React from 'react';
import { LucideIcon } from 'lucide-react';
import styles from './Button.module.css';

export interface ButtonProps {
  /** Button content */
  children?: React.ReactNode;
  /** Button variant */
  variant?: 'primary' | 'secondary' | 'danger' | 'warning' | 'ghost';
  /** Button size */
  size?: 'sm' | 'md' | 'lg';
  /** Button type */
  type?: 'button' | 'submit' | 'reset';
  /** Whether button is disabled */
  disabled?: boolean;
  /** Whether button is in loading state */
  loading?: boolean;
  /** Icon to display on the left */
  leftIcon?: LucideIcon;
  /** Icon to display on the right */
  rightIcon?: LucideIcon;
  /** Whether button should take full width */
  fullWidth?: boolean;
  /** Click handler */
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  /** Additional CSS classes */
  className?: string;
  /** HTML button attributes */
  [key: string]: any;
}

const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  type = 'button',
  disabled = false,
  loading = false,
  leftIcon: LeftIcon,
  rightIcon: RightIcon,
  fullWidth = false,
  onClick,
  className = '',
  ...props
}) => {
  const buttonClasses = [
    styles.button,
    styles[`button${variant.charAt(0).toUpperCase() + variant.slice(1)}`],
    styles[`button${size.charAt(0).toUpperCase() + size.slice(1)}`],
    fullWidth && styles.buttonFullWidth,
    loading && styles.buttonLoading,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled || loading) {
      event.preventDefault();
      return;
    }
    onClick?.(event);
  };

  return (
    <button
      type={type}
      className={buttonClasses}
      disabled={disabled || loading}
      onClick={handleClick}
      {...props}
    >
      {loading && <div className={styles.buttonSpinner}></div>}
      {!loading && LeftIcon && <LeftIcon className={styles.buttonIcon} />}
      {children && <span className={styles.buttonText}>{children}</span>}
      {!loading && RightIcon && <RightIcon className={styles.buttonIcon} />}
    </button>
  );
};

export default Button;
