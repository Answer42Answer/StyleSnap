import React from 'react';
import { Loader2 } from 'lucide-react';
import { twMerge } from 'tailwind-merge';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'glass';
  isLoading?: boolean;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  isLoading, 
  icon,
  className, 
  disabled,
  ...props 
}) => {
  const baseStyles = "inline-flex items-center justify-center rounded-xl px-6 py-3.5 text-sm font-bold tracking-wide transition-all duration-300 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:transform-none active:scale-[0.98]";
  
  const variants = {
    // Solid Gold, Black Text
    primary: "bg-gold-400 text-black hover:bg-gold-300 shadow-[0_0_20px_rgba(251,191,36,0.3)] hover:shadow-[0_0_30px_rgba(251,191,36,0.5)] border border-transparent",
    
    // Dark Glass
    secondary: "bg-white/10 backdrop-blur-md text-white border border-white/10 hover:bg-white/20 hover:border-gold-400/30",
    
    // Gold Outline
    outline: "border border-gold-400/50 text-gold-400 hover:bg-gold-400/10 hover:border-gold-400",
    
    // Minimalist
    ghost: "text-neutral-400 hover:text-white hover:bg-white/5",
    
    // Darker Glass
    glass: "bg-black/40 backdrop-blur-md border border-white/10 text-white hover:bg-black/60 shadow-lg",
  };

  return (
    <button 
      className={twMerge(baseStyles, variants[variant], className)}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {!isLoading && icon && <span className="mr-2">{icon}</span>}
      {children}
    </button>
  );
};