'use client'

/**
 * A cute full-body sitting cat SVG logo for NPush.
 * Sitting pose with perky ears, whiskers, bell collar, curvy tail,
 * and little paws — a friendly notification cat mascot.
 */
export function CatLogo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="NPush cat logo"
    >
      {/* Tail */}
      <path
        d="M18 16.5C20 15.5 21.5 13 21 10.5C20.8 9.5 20 9 19.2 9.3"
        stroke="currentColor"
        strokeWidth="1.4"
        opacity="0.8"
        strokeLinecap="round"
      />
      {/* Tail tip curl */}
      <path
        d="M19.2 9.3C18.5 9.6 18.3 10.5 18.8 11"
        stroke="currentColor"
        strokeWidth="1.2"
        opacity="0.6"
        strokeLinecap="round"
      />

      {/* Body */}
      <ellipse
        cx="12"
        cy="17"
        rx="5.5"
        ry="4.5"
        fill="currentColor"
      />

      {/* Belly patch */}
      <ellipse
        cx="12"
        cy="17.5"
        rx="3.2"
        ry="3"
        fill="currentColor"
        opacity="0.15"
      />

      {/* Left paw */}
      <ellipse
        cx="8.5"
        cy="21"
        rx="1.5"
        ry="0.8"
        fill="currentColor"
      />
      {/* Right paw */}
      <ellipse
        cx="15.5"
        cy="21"
        rx="1.5"
        ry="0.8"
        fill="currentColor"
      />
      {/* Paw pads hint */}
      <circle cx="8" cy="21.1" r="0.3" fill="currentColor" opacity="0.3" />
      <circle cx="9" cy="21.1" r="0.3" fill="currentColor" opacity="0.3" />
      <circle cx="15" cy="21.1" r="0.3" fill="currentColor" opacity="0.3" />
      <circle cx="16" cy="21.1" r="0.3" fill="currentColor" opacity="0.3" />

      {/* Left ear */}
      <path
        d="M6.5 8L4 2L8.5 6.5L6.5 8Z"
        fill="currentColor"
        opacity="0.9"
      />
      {/* Right ear */}
      <path
        d="M17.5 8L20 2L15.5 6.5L17.5 8Z"
        fill="currentColor"
        opacity="0.9"
      />
      {/* Inner left ear */}
      <path
        d="M6.8 7.2L5.5 3.5L8.2 6L6.8 7.2Z"
        fill="currentColor"
        opacity="0.4"
      />
      {/* Inner right ear */}
      <path
        d="M17.2 7.2L18.5 3.5L15.8 6L17.2 7.2Z"
        fill="currentColor"
        opacity="0.4"
      />

      {/* Head */}
      <ellipse
        cx="12"
        cy="10"
        rx="6"
        ry="5"
        fill="currentColor"
      />

      {/* Eyes */}
      <ellipse cx="9.5" cy="9.5" rx="1.3" ry="1.5" fill="currentColor" opacity="0.15" />
      <ellipse cx="14.5" cy="9.5" rx="1.3" ry="1.5" fill="currentColor" opacity="0.15" />
      {/* Pupils */}
      <ellipse cx="9.5" cy="9.5" rx="0.6" ry="1" fill="currentColor" />
      <ellipse cx="14.5" cy="9.5" rx="0.6" ry="1" fill="currentColor" />
      {/* Eye shine */}
      <circle cx="9.8" cy="9.1" r="0.25" fill="white" opacity="0.9" />
      <circle cx="14.8" cy="9.1" r="0.25" fill="white" opacity="0.9" />

      {/* Nose */}
      <path
        d="M11.5 11.2L12 11.6L12.5 11.2"
        stroke="currentColor"
        strokeWidth="0.5"
        opacity="0.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Mouth */}
      <path
        d="M12 11.6C12 11.6 11.2 12.2 10.8 12.1"
        stroke="currentColor"
        strokeWidth="0.4"
        opacity="0.4"
        strokeLinecap="round"
      />
      <path
        d="M12 11.6C12 11.6 12.8 12.2 13.2 12.1"
        stroke="currentColor"
        strokeWidth="0.4"
        opacity="0.4"
        strokeLinecap="round"
      />

      {/* Left whiskers */}
      <line x1="3" y1="9.5" x2="7.2" y2="10" stroke="currentColor" strokeWidth="0.4" opacity="0.5" strokeLinecap="round" />
      <line x1="3" y1="11" x2="7.2" y2="11" stroke="currentColor" strokeWidth="0.4" opacity="0.5" strokeLinecap="round" />
      <line x1="3.3" y1="12.5" x2="7.2" y2="11.8" stroke="currentColor" strokeWidth="0.4" opacity="0.4" strokeLinecap="round" />
      {/* Right whiskers */}
      <line x1="21" y1="9.5" x2="16.8" y2="10" stroke="currentColor" strokeWidth="0.4" opacity="0.5" strokeLinecap="round" />
      <line x1="21" y1="11" x2="16.8" y2="11" stroke="currentColor" strokeWidth="0.4" opacity="0.5" strokeLinecap="round" />
      <line x1="20.7" y1="12.5" x2="16.8" y2="11.8" stroke="currentColor" strokeWidth="0.4" opacity="0.4" strokeLinecap="round" />

      {/* Bell collar */}
      <path
        d="M8 13.8C8 13.8 10 14.8 12 14.8C14 14.8 16 13.8 16 13.8"
        stroke="currentColor"
        strokeWidth="0.8"
        opacity="0.6"
        strokeLinecap="round"
      />
      {/* Bell */}
      <circle cx="12" cy="15.2" r="0.9" fill="currentColor" opacity="0.3" />
      <circle cx="12" cy="15.2" r="0.35" fill="currentColor" opacity="0.5" />
      <line x1="12" y1="14.8" x2="12" y2="15.6" stroke="currentColor" strokeWidth="0.25" opacity="0.4" />
    </svg>
  )
}
