import React from 'react';
import { User } from '../types';

interface UserAvatarProps {
  user: User;
  size?: 'small' | 'medium' | 'large';
  isSelected?: boolean;
  onClick?: () => void;
}

export const UserAvatar: React.FC<UserAvatarProps> = ({ user, size = 'medium', isSelected, onClick }) => {
  const sizeClasses = {
    small: 'w-6 h-6 text-xs',
    medium: 'w-8 h-8 text-sm',
    large: 'w-10 h-10 text-base',
  };

  const wrapperClasses = [
    'rounded-full',
    'flex',
    'items-center',
    'justify-center',
    'font-bold',
    'flex-shrink-0',
    'transition-all',
    'duration-200',
    'bg-cover',
    'bg-center',
    sizeClasses[size],
    isSelected ? 'ring-2 ring-offset-2 ring-[#254467]' : (onClick ? 'ring-2 ring-transparent' : ''),
    onClick ? 'cursor-pointer hover:scale-110' : ''
  ].join(' ');

  if (user.picture) {
    return (
      <img
        src={user.picture}
        alt={user.name}
        title={user.name}
        className={wrapperClasses}
        onClick={onClick}
        referrerPolicy="no-referrer"
      />
    );
  }

  return (
    <div 
      className={`${wrapperClasses} text-white`}
      style={{ backgroundColor: user.avatarColor }}
      title={user.name}
      onClick={onClick}
    >
      {user.name.charAt(0).toUpperCase()}
    </div>
  );
};
