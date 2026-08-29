export function HeroIllustration() {
  return (
    <svg
      viewBox="0 0 560 420"
      className="w-full max-w-xl"
      role="img"
      aria-label="A document with highlighted passages linking to an AI answer with a citation"
    >
      <defs>
        <filter id="soft-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="10" stdDeviation="14" floodColor="#0a0a1a" floodOpacity="0.35" />
        </filter>
      </defs>

      {/* Document card */}
      <g filter="url(#soft-shadow)">
        <rect x="24" y="24" width="270" height="360" rx="10" fill="#efeae0" />
      </g>
      <rect x="48" y="56" width="140" height="12" rx="3" fill="#201f1a" opacity="0.75" />
      {[92, 118, 144].map((y) => (
        <rect key={y} x="48" y={y} width="220" height="8" rx="2" fill="#201f1a" opacity="0.28" />
      ))}

      {/* Highlighted passage 1 */}
      <rect x="48" y="170" width="220" height="18" rx="3" fill="#ffc857" opacity="0.9">
        <animate attributeName="width" from="0" to="220" dur="0.9s" begin="0.2s" fill="freeze" />
      </rect>
      <rect x="48" y="170" width="220" height="18" rx="3" fill="none" />

      {[210, 236, 262].map((y) => (
        <rect key={y} x="48" y={y} width="200" height="8" rx="2" fill="#201f1a" opacity="0.28" />
      ))}

      {/* Highlighted passage 2 */}
      <rect x="48" y="288" width="160" height="18" rx="3" fill="#ffc857" opacity="0.9">
        <animate attributeName="width" from="0" to="160" dur="0.9s" begin="0.5s" fill="freeze" />
      </rect>

      {[330, 356].map((y) => (
        <rect key={y} x="48" y={y} width="180" height="8" rx="2" fill="#201f1a" opacity="0.28" />
      ))}

      {/* Dotted connector */}
      <path
        d="M300 200 C 340 200, 340 130, 380 130"
        stroke="#ffc857"
        strokeWidth="2"
        strokeDasharray="4 6"
        fill="none"
        opacity="0.7"
      />

      {/* Chat bubble with grounded answer */}
      <g filter="url(#soft-shadow)">
        <rect x="300" y="90" width="236" height="150" rx="16" fill="#1b1d3d" stroke="#2b2e57" />
      </g>
      <circle cx="324" cy="118" r="6" fill="#2fbfa3" />
      <rect x="340" y="112" width="70" height="10" rx="3" fill="#f5f3ec" opacity="0.85" />
      {[142, 162, 182].map((y, i) => (
        <rect
          key={y}
          x="320"
          y={y}
          width={i === 2 ? 120 : 196}
          height="9"
          rx="2"
          fill="#f5f3ec"
          opacity="0.5"
        />
      ))}

      {/* Citation tag */}
      <rect x="320" y="204" width="132" height="20" rx="10" fill="#12132a" stroke="#ffc857" strokeWidth="1.2" />
      <circle cx="333" cy="214" r="4" fill="#ffc857" />
      <rect x="344" y="210" width="96" height="8" rx="2" fill="#ffc857" opacity="0.85" />
    </svg>
  );
}
