import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md';
  children: ReactNode;
  icon?: ReactNode;
}

const variants = {
  primary: 'bg-blue-600 hover:bg-blue-500 text-white',
  secondary: 'bg-[#252830] hover:bg-[#2e3139] text-gray-300 border border-[#353840]',
  danger: 'bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-600/30',
  ghost: 'hover:bg-[#252830] text-gray-400',
};

const sizes = {
  sm: 'px-2.5 py-1.5 text-xs',
  md: 'px-3.5 py-2 text-sm',
};

export function Button({ variant = 'primary', size = 'md', children, icon, className = '', ...props }: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center gap-1.5 rounded font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
}
