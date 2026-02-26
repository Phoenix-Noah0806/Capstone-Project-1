const HAIR_PATHS = [
  // Style 1: Mohawk
  "M50 8 L55 2 L60 10 L65 3 L70 12 L68 18 L52 18 Z",
  // Style 2: Slicked back
  "M35 22 Q50 0 75 22 L72 18 Q50 5 38 18 Z",
  // Style 3: Cyber-spikes
  "M38 20 L42 4 L46 16 L50 1 L54 16 L58 4 L62 20 Z",
  // Style 4: Side shave
  "M35 22 Q40 8 55 5 L60 8 L58 22 Q48 12 35 22 Z",
  // Style 5: Long flow
  "M35 22 Q45 2 65 5 Q80 10 78 30 L75 28 Q75 12 62 10 Q48 8 38 22 Z",
  // Style 6: Flat top
  "M38 18 L38 8 L62 8 L62 18 Z"
];

const EMBLEM_PATHS = [
  // 1: Star
  "M0 -8 L2 -2 L8 -2 L3 2 L5 8 L0 4 L-5 8 L-3 2 L-8 -2 L-2 -2 Z",
  // 2: Diamond
  "M0 -8 L6 0 L0 8 L-6 0 Z",
  // 3: Bolt
  "M-2 -8 L4 -1 L0 -1 L2 8 L-4 1 L0 1 Z",
  // 4: Cross
  "M-2 -8 L2 -8 L2 -2 L8 -2 L8 2 L2 2 L2 8 L-2 8 L-2 2 L-8 2 L-8 -2 L-2 -2 Z",
  // 5: Triangle
  "M0 -8 L7 6 L-7 6 Z",
  // 6: Circle ring
  "M0 -7 A7 7 0 1 1 0 7 A7 7 0 1 1 0 -7 Z M0 -4 A4 4 0 1 0 0 4 A4 4 0 1 0 0 -4 Z",
  // 7: Hex
  "M0 -8 L7 -4 L7 4 L0 8 L-7 4 L-7 -4 Z",
  // 8: Skull
  "M-5 -3 Q-5 -8 0 -8 Q5 -8 5 -3 L5 2 L3 4 L1 2 L-1 2 L-3 4 L-5 2 Z"
];

const CyberpunkAvatar = ({
  avatar = {},
  size = 48,
  showGlow = true,
  className = ""
}) => {
  const {
    hairStyle = 1,
    visorColor = "#00f0ff",
    armorColor = "#1a1a2e",
    emblem = 1,
    glowColor = "#00f0ff"
  } = avatar;

  const hairIndex = Math.max(0, Math.min(5, (hairStyle || 1) - 1));
  const emblemIndex = Math.max(0, Math.min(7, (emblem || 1) - 1));
  const id = `avatar-${Math.random().toString(36).slice(2, 8)}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={`cyberpunk-avatar ${className}`}
      style={{ display: "block" }}
    >
      <defs>
        <radialGradient id={`${id}-glow`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={glowColor} stopOpacity="0.4" />
          <stop offset="100%" stopColor={glowColor} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${id}-visor`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={visorColor} stopOpacity="0.9" />
          <stop offset="50%" stopColor={visorColor} stopOpacity="1" />
          <stop offset="100%" stopColor={visorColor} stopOpacity="0.7" />
        </linearGradient>
        <linearGradient id={`${id}-armor`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={armorColor} />
          <stop offset="100%" stopColor="#0a0a14" />
        </linearGradient>
        <filter id={`${id}-neon`}>
          <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Outer glow ring */}
      {showGlow && (
        <circle cx="50" cy="50" r="48" fill={`url(#${id}-glow)`} opacity="0.6" />
      )}

      {/* Border ring */}
      <circle
        cx="50" cy="50" r="44"
        fill="none"
        stroke={glowColor}
        strokeWidth="1.5"
        opacity="0.5"
      />

      {/* Head/helmet base */}
      <ellipse cx="50" cy="48" rx="26" ry="30"
        fill={`url(#${id}-armor)`}
        stroke={glowColor}
        strokeWidth="0.8"
        opacity="0.9"
      />

      {/* Helmet panel lines */}
      <path d="M30 35 Q50 30 70 35" fill="none" stroke={glowColor} strokeWidth="0.5" opacity="0.3" />
      <path d="M32 55 Q50 58 68 55" fill="none" stroke={glowColor} strokeWidth="0.5" opacity="0.2" />

      {/* Visor */}
      <path
        d="M32 38 Q50 34 68 38 Q68 48 50 50 Q32 48 32 38 Z"
        fill={`url(#${id}-visor)`}
        filter={`url(#${id}-neon)`}
        opacity="0.9"
      />

      {/* Visor glint */}
      <path
        d="M36 39 Q48 36 60 39"
        fill="none"
        stroke="white"
        strokeWidth="1"
        opacity="0.5"
      />

      {/* Eye slits */}
      <line x1="40" y1="42" x2="46" y2="42" stroke="#fff" strokeWidth="1.5" opacity="0.9" />
      <line x1="54" y1="42" x2="60" y2="42" stroke="#fff" strokeWidth="1.5" opacity="0.9" />

      {/* Mouth guard / respirator */}
      <path
        d="M40 54 L42 58 L50 60 L58 58 L60 54"
        fill="none"
        stroke={glowColor}
        strokeWidth="1"
        opacity="0.5"
      />
      <line x1="44" y1="56" x2="44" y2="59" stroke={glowColor} strokeWidth="0.5" opacity="0.3" />
      <line x1="50" y1="56" x2="50" y2="61" stroke={glowColor} strokeWidth="0.5" opacity="0.3" />
      <line x1="56" y1="56" x2="56" y2="59" stroke={glowColor} strokeWidth="0.5" opacity="0.3" />

      {/* Hair */}
      <path
        d={HAIR_PATHS[hairIndex]}
        fill={visorColor}
        opacity="0.8"
        filter={`url(#${id}-neon)`}
      />

      {/* Emblem on forehead */}
      <g transform="translate(50, 32) scale(0.7)" opacity="0.6">
        <path
          d={EMBLEM_PATHS[emblemIndex]}
          fill={glowColor}
          filter={`url(#${id}-neon)`}
        />
      </g>

      {/* Shoulder/neck armor hint */}
      <path
        d="M28 70 Q50 65 72 70 L75 80 Q50 75 25 80 Z"
        fill={armorColor}
        stroke={glowColor}
        strokeWidth="0.5"
        opacity="0.7"
      />

      {/* Tech lines on armor */}
      <line x1="35" y1="73" x2="45" y2="73" stroke={glowColor} strokeWidth="0.5" opacity="0.3" />
      <line x1="55" y1="73" x2="65" y2="73" stroke={glowColor} strokeWidth="0.5" opacity="0.3" />
    </svg>
  );
};

export default CyberpunkAvatar;
