import React from 'react';

export const Logo: React.FC<{ className?: string }> = ({ className = '' }) => {
    return (
        <img 
            src="https://i.imgur.com/aPiqHxa.png"
            alt="Logo"
            className={`object-contain select-none ${className}`}
            crossOrigin="anonymous"
        />
    );
};