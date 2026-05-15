'use client'

/**
 * A cute casual cat SVG logo for NPush.
 * The cat is sitting with perky ears, whiskers, and a small bell on its collar
 * — tying together the "notification" theme with the "NPush" cat mascot.
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
      {/* Left ear */}
      <path
        d="M6.5 9L4 3L8.5 7.5L6.5 9Z"
        fill="currentColor"
        opacity="0.9"
      />
      {/* Right ear */}
      <path
        d="M17.5 9L20 3L15.5 7.5L17.5 9Z"
        fill="currentColor"
        opacity="0.9"
      />
      {/* Inner left ear */}
      <path
        d="M6.8 8L5.5 4.5L8.2 7L6.8 8Z"
        fill="currentColor"
        opacity="0.4"
      />
      {/* Inner right ear */}
      <path
        d="M17.2 8L18.5 4.5L15.8 7L17.2 8Z"
        fill="currentColor"
        opacity="0.4"
      />
      {/* Head */}
      <ellipse
        cx="12"
        cy="12"
        rx="6.5"
        ry="5.5"
        fill="currentColor"
      />
      {/* Eyes */}
      <ellipse cx="9.5" cy="11.5" rx="1.2" ry="1.4" fill="currentColor" opacity="0.15" />
      <ellipse cx="14.5" cy="11.5" rx="1.2" ry="1.4" fill="currentColor" opacity="0.15" />
      {/* Pupils */}
      <ellipse cx="9.5" cy="11.5" rx="0.6" ry="0.9" fill="currentColor" />
      <ellipse cx="14.5" cy="11.5" rx="0.6" ry="0.9" fill="currentColor" />
      {/* Eye shine */}
      <circle cx="9.8" cy="11.1" r="0.25" fill="white" opacity="0.9" />
      <circle cx="14.8" cy="11.1" r="0.25" fill="white" opacity="0.9" />
      {/* Nose */}
      <path
        d="M11.5 13.2L12 13.6L12.5 13.2"
        stroke="currentColor"
        strokeWidth="0.5"
        opacity="0.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Mouth */}
      <path
        d="M12 13.6C12 13.6 11.2 14.2 10.8 14.1"
        stroke="currentColor"
        strokeWidth="0.4"
        opacity="0.4"
        strokeLinecap="round"
      />
      <path
        d="M12 13.6C12 13.6 12.8 14.2 13.2 14.1"
        stroke="currentColor"
        strokeWidth="0.4"
        opacity="0.4"
        strokeLinecap="round"
      />
      {/* Left whiskers */}
      <line x1="3" y1="11.5" x2="7.5" y2="12" stroke="currentColor" strokeWidth="0.4" opacity="0.5" strokeLinecap="round" />
      <line x1="3" y1="13" x2="7.5" y2="13" stroke="currentColor" strokeWidth="0.4" opacity="0.5" strokeLinecap="round" />
      <line x1="3.5" y1="14.5" x2="7.5" y2="13.8" stroke="currentColor" strokeWidth="0.4" opacity="0.4" strokeLinecap="round" />
      {/* Right whiskers */}
      <line x1="21" y1="11.5" x2="16.5" y2="12" stroke="currentColor" strokeWidth="0.4" opacity="0.5" strokeLinecap="round" />
      <line x1="21" y1="13" x2="16.5" y2="13" stroke="currentColor" strokeWidth="0.4" opacity="0.5" strokeLinecap="round" />
      <line x1="20.5" y1="14.5" x2="16.5" y2="13.8" stroke="currentColor" strokeWidth="0.4" opacity="0.4" strokeLinecap="round" />
      {/* Bell collar */}
      <path
        d="M8 15.5C8 15.5 10 16.5 12 16.5C14 16.5 16 15.5 16 15.5"
        stroke="currentColor"
        strokeWidth="0.8"
        opacity="0.6"
        strokeLinecap="round"
      />
      {/* Bell */}
      <circle cx="12" cy="16.8" r="1" fill="currentColor" opacity="0.3" />
      <circle cx="12" cy="16.8" r="0.4" fill="currentColor" opacity="0.5" />
      <line x1="12" y1="16.4" x2="12" y2="17.2" stroke="currentColor" strokeWidth="0.3" opacity="0.4" />
    </svg>
  )
}
