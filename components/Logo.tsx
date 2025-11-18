import React from 'react';

// This new logo component reflects the stacked version provided in the image.
export const Logo: React.FC<{ className?: string }> = ({ className = '' }) => (
    <svg 
        viewBox="0 0 210 75" 
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        preserveAspectRatio="xMinYMid meet"
        aria-label="Hermosillo Logo"
    >
        {/* H Icon - Centered Horizontally */}
        <g transform="translate(81, 0)"> 
          <path 
              fillRule="evenodd" 
              clipRule="evenodd" 
              d="M0 0H16V16H0V0ZM0 24V40H16V24H0ZM16 16H32V24H16V16ZM32 0V40H48V0H32ZM16 40L32 24V40H16Z" 
              fill="#D85929"
          />
        </g>
        
        {/* Text - Centered Horizontally below Icon */}
        <text 
            x="105" // Center of 210 viewBox width
            y="68"  // Positioned below the 40px high icon with padding
            fontFamily="sans-serif"
            fontSize="24"
            fontWeight="bold"
            fill="#254467"
            textAnchor="middle" // Horizontally center the text
        >
            HERMOSILLO
            <tspan 
                fontSize="10" 
                dy="-12" // Adjust superscript positioning
            >
                ®
            </tspan>
        </text>
    </svg>
);
