import { HTMLAttributes,forwardRef } from 'react';
import { cn } from '../../utils/helpers';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'gray' | 'primary';
}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'gray', children, ...props }, ref) => {
    const variantClasses = {
      success: 'bg-success-50 text-success-600',
      warning: 'bg-warning-50 text-warning-600',
      danger: 'bg-danger-50 text-danger-600',
      info: 'bg-accent-50 text-accent-600',
      gray: 'bg-gray-100 text-gray-600',
      primary: 'bg-primary-50 text-primary-600',
    };

    return (
      <span
        ref={ref}
        className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium', variantClasses[variant], className)}
        {...props}
      >
        {children}
      </span>
    );
  }
);

Badge.displayName = 'Badge';