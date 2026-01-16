import { forwardRef } from 'react';
import type { InputHTMLAttributes } from 'react';
import { Input } from '../../atoms/Input';

interface FormFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  helperText?: string;
}

export const FormField = forwardRef<HTMLInputElement, FormFieldProps>(
  ({ label, error, helperText, ...props }, ref) => {
    return (
      <div className="space-y-1">
        <Input ref={ref} label={label} error={error} {...props} />
        {helperText && !error && (
          <p className="text-sm text-gray-500">{helperText}</p>
        )}
      </div>
    );
  }
);

FormField.displayName = 'FormField';
