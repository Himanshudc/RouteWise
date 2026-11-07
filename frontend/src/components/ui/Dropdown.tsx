import { Check,ChevronDown } from 'lucide-react';
import { ReactNode,useEffect,useRef,useState } from 'react';
import { cn } from '../../utils/helpers';
import { Button } from './Button';

interface DropdownOption {
  value: string;
  label: string;
  icon?: ReactNode;
}

interface DropdownProps {
  options: DropdownOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function Dropdown({ options, value, onChange, placeholder, className, disabled }: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const selectedOption = options.find((o) => o.value === value);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={dropdownRef} className={cn('relative w-full', className)}>
      <Button
        variant="secondary"
        className="w-full justify-between"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="truncate">{selectedOption?.label || placeholder || 'Select...'}</span>
        <ChevronDown className={cn('w-4 h-4 flex-shrink-0', isOpen && 'rotate-180')} />
      </Button>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-white rounded-md shadow-lg border border-gray-200 py-1 max-h-60 overflow-auto">
          {options.map((option) => (
            <button
              key={option.value}
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
              className={cn(
                'w-full px-4 py-2 text-left text-sm flex items-center gap-2 transition-colors',
                value === option.value ? 'bg-primary-50 text-primary-900' : 'text-gray-700 hover:bg-gray-100'
              )}
              role="option"
              aria-selected={value === option.value}
            >
              {option.icon && <span>{option.icon}</span>}
              <span>{option.label}</span>
              {value === option.value && <Check className="w-4 h-4 ml-auto text-primary-600" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

interface SelectProps {
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  error?: boolean;
}

export function Select({ options, value, onChange, placeholder, className, error }: SelectProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        'w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-0 transition-colors bg-white appearance-none',
        error
          ? 'border-danger-500 focus:ring-danger-500 focus:border-danger-500'
          : 'border-gray-300 focus:ring-accent-500 focus:border-accent-500',
        className
      )}
    >
      {placeholder && <option value="" disabled>{placeholder}</option>}
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}