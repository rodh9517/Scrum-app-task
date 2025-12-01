
import React from 'react';

export const Logo: React.FC<{ className?: string }> = ({ className = '' }) => {
    return (
        <div className={`relative flex items-center select-none ${className}`} aria-label="Hermosillo Logo">
             <svg 
                viewBox="0 0 200 50" 
                className="h-full w-auto max-w-full overflow-visible" 
                preserveAspectRatio="xMidYMid meet"
                xmlns="http://www.w3.org/2000/svg"
            >
                <defs>
                     <style>{`
                        @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@900&display=swap');
                        .logo-text { font-family: 'Arial Black', 'Arial', sans-serif; font-weight: 900; }
                        .slogan-text { font-family: 'Arial', sans-serif; font-weight: 500; }
                    `}</style>
                </defs>
                
                {/* Icon Group - Shifted right to prevent clipping */}
                <g transform="translate(4, 8) scale(1.1)">
                     <path fill="#D85929" d="M0,0 V12 H10 V0 H22 V12 H38 L26,22 V33 H15 V22 H10 V33 H0 V0 Z" />
                </g>

                {/* Text Group - Shifted right to maintain spacing */}
                <g transform="translate(54, 0)">
                     {/* Main Text */}
                     <text x="0" y="24" className="logo-text" fontSize="22" fill="#254467" letterSpacing="-1">HERMOSILLO</text>
                     <text x="148" y="14" fontFamily="Arial, sans-serif" fontWeight="bold" fontSize="6" fill="#254467">®</text>
                     
                     {/* Slogan */}
                     <text x="0" y="39" className="slogan-text" fontSize="9.5" fill="#D85929" letterSpacing="0.5">Experience Matters</text>
                     <text x="92" y="34" fontFamily="Arial, sans-serif" fontWeight="bold" fontSize="4" fill="#D85929">®</text>
                </g>
            </svg>
        </div>
    );
};
