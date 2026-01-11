import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary';
}

export const Button: React.FC<ButtonProps> = ({ children, variant = 'primary', className = '', ...props }) => {
  const baseStyle = "px-6 py-3 rounded-full font-bold uppercase tracking-widest transition-all transform hover:scale-105 active:scale-95 shadow-lg border-2";
  const variants = {
    primary: "bg-pink-500 hover:bg-pink-400 text-white border-pink-300 shadow-pink-500/50",
    secondary: "bg-slate-800 hover:bg-slate-700 text-cyan-300 border-cyan-500 shadow-cyan-500/30"
  };

  return (
    <button className={`${baseStyle} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
};