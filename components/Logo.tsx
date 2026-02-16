import React from 'react';
import logoImg from './logo.png';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const Logo: React.FC<LogoProps> = ({ size = 'md', className = '' }) => {
  const sizes = {
    sm: 'h-6',
    md: 'h-8',
    lg: 'h-12'
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <img
        src={logoImg}
        alt="NexoFilm"
        className={`${sizes[size]} w-auto object-contain filter brightness-0 invert`}
      />
    </div>
  );
};

export default Logo;
