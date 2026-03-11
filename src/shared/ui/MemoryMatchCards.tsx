import type { CSSProperties } from "react";

interface MemoryCardVisualProps {
  id: string;
  className?: string;
}

function getGradientForId(id: string): string {
  const gradients: Record<string, string> = {
    apple: "linear-gradient(135deg, #ff6b6b 0%, #ee5a5a 50%, #c92a2a 100%)",
    bus: "linear-gradient(135deg, #fcc419 0%, #f59e0b 50%, #d97706 100%)",
    books: "linear-gradient(135deg, #845ef7 0%, #7048e8 50%, #5f3dc4 100%)",
    backpack: "linear-gradient(135deg, #339af0 0%, #228be6 50%, #1c7ed6 100%)",
    pencil: "linear-gradient(135deg, #ffa94d 0%, #ff922b 50%, #fd7e14 100%)",
    trophy: "linear-gradient(135deg, #ffd43b 0%, #fcc419 50%, #f59e0b 100%)",
    clock: "linear-gradient(135deg, #63e6be 0%, #38d9a9 50%, #20c997 100%)",
    flask: "linear-gradient(135deg, #51cf66 0%, #40c057 50%, #37b24d 100%)",
    board: "linear-gradient(135deg, #74c0fc 0%, #4dabf7 50%, #339af0 100%)",
    crayons: "linear-gradient(135deg, #ff8787 0%, #fa5252 33%, #f06543 66%, #e8590c 100%)",
    glue: "linear-gradient(135deg, #e599f7 0%, #da77f2 50%, #be4bdb 100%)",
    bell: "linear-gradient(135deg, #ffd43b 0%, #fab005 50%, #f59e0b 100%)",
    math: "linear-gradient(135deg, #69db7c 0%, #51cf66 50%, #40c057 100%)",
    paint: "linear-gradient(135deg, #ff6b6b 0%, #f06543 33%, #cc5de8 66%, #845ef7 100%)",
    notebook: "linear-gradient(135deg, #748ffc 0%, #5c7cfa 50%, #4263eb 100%)",
    hourglass: "linear-gradient(135deg, #15aabf 0%, #1098ad 50%, #0891b2 100%)",
    magnifier: "linear-gradient(135deg, #63e6be 0%, #38d9a9 50%, #20c997 100%)",
    folder: "linear-gradient(135deg, #ffd43b 0%, #fcc419 50%, #f59e0b 100%)"
  };
  return gradients[id] || gradients.apple;
}

function getIconForId(id: string): JSX.Element {
  const icons: Record<string, JSX.Element> = {
    apple: (
      <svg viewBox="0 0 64 64" fill="none">
        <ellipse cx="32" cy="38" rx="22" ry="20" fill="#c92a2a"/>
        <ellipse cx="32" cy="38" rx="18" ry="16" fill="#ff6b6b"/>
        <path d="M32 18 Q36 10 44 10" stroke="#40c057" strokeWidth="3" fill="none"/>
        <ellipse cx="46" cy="10" rx="7" ry="4" fill="#51cf66"/>
        <circle cx="26" cy="32" r="4" fill="white" opacity="0.3"/>
      </svg>
    ),
    bus: (
      <svg viewBox="0 0 64 64" fill="none">
        <rect x="10" y="16" width="44" height="32" rx="6" fill="#f59e0b"/>
        <rect x="14" y="22" width="16" height="12" rx="2" fill="#fff"/>
        <rect x="34" y="22" width="16" height="12" rx="2" fill="#fff"/>
        <circle cx="18" cy="52" r="5" fill="#333"/>
        <circle cx="46" cy="52" r="5" fill="#333"/>
        <rect x="12" y="40" width="40" height="3" fill="white" opacity="0.4"/>
      </svg>
    ),
    books: (
      <svg viewBox="0 0 64 64" fill="none">
        <rect x="12" y="18" width="18" height="32" rx="3" fill="#7048e8"/>
        <rect x="34" y="16" width="20" height="34" rx="3" fill="#845ef7"/>
        <line x1="21" y1="22" x2="21" y2="46" stroke="white" strokeWidth="2" opacity="0.5"/>
        <line x1="44" y1="20" x2="44" y2="46" stroke="white" strokeWidth="2" opacity="0.5"/>
      </svg>
    ),
    backpack: (
      <svg viewBox="0 0 64 64" fill="none">
        <rect x="14" y="16" width="36" height="40" rx="8" fill="#228be6"/>
        <rect x="20" y="24" width="24" height="20" rx="4" fill="white" opacity="0.25"/>
        <path d="M22 16 L22 10 A10 10 0 0 1 42 10 L42 16" stroke="#1c7ed6" strokeWidth="5" fill="none" strokeLinecap="round"/>
        <circle cx="32" cy="34" r="5" fill="white" opacity="0.3"/>
      </svg>
    ),
    pencil: (
      <svg viewBox="0 0 64 64" fill="none">
        <polygon points="32,8 38,16 38,44 32,58 26,44 26,16" fill="#ff922b"/>
        <rect x="28" y="12" width="8" height="18" fill="#ffd43b"/>
        <polygon points="32,46 26,58 38,58" fill="#333"/>
        <circle cx="32" cy="12" r="4" fill="#ff6b6b"/>
      </svg>
    ),
    trophy: (
      <svg viewBox="0 0 64 64" fill="none">
        <path d="M18 14 L18 28 A14 14 0 0 0 46 28 L46 14" fill="#fcc419"/>
        <rect x="24" y="40" width="16" height="10" fill="#ffd43b"/>
        <rect x="18" y="50" width="28" height="6" rx="2" fill="#f59e0b"/>
        <path d="M14 18 L18 18 L18 26 A8 8 0 0 1 14 18" fill="#ffd43b"/>
        <path d="M50 18 L46 18 L46 26 A8 8 0 0 0 50 18" fill="#ffd43b"/>
        <polygon points="32,22 34,28 40,28 35,32 37,38 32,34 27,38 29,32 24,28 30,28" fill="white" opacity="0.7"/>
      </svg>
    ),
    clock: (
      <svg viewBox="0 0 64 64" fill="none">
        <circle cx="32" cy="32" r="26" fill="#38d9a9"/>
        <circle cx="32" cy="32" r="22" fill="white"/>
        <line x1="32" y1="32" x2="32" y2="18" stroke="#20c997" strokeWidth="4" strokeLinecap="round"/>
        <line x1="32" y1="32" x2="44" y2="36" stroke="#20c997" strokeWidth="4" strokeLinecap="round"/>
        <circle cx="32" cy="32" r="4" fill="#20c997"/>
      </svg>
    ),
    flask: (
      <svg viewBox="0 0 64 64" fill="none">
        <path d="M26 10 L38 10 L38 22 L48 50 A6 6 0 0 1 16 50 L26 22 Z" fill="#40c057"/>
        <ellipse cx="32" cy="46" rx="12" ry="8" fill="#51cf66" opacity="0.6"/>
        <circle cx="27" cy="42" r="3" fill="white" opacity="0.5"/>
        <circle cx="35" cy="40" r="2" fill="white" opacity="0.4"/>
        <rect x="28" y="8" width="8" height="4" rx="2" fill="#40c057" opacity="0.6"/>
      </svg>
    ),
    board: (
      <svg viewBox="0 0 64 64" fill="none">
        <rect x="10" y="14" width="44" height="36" rx="4" fill="#4dabf7"/>
        <line x1="32" y1="14" x2="32" y2="50" stroke="white" strokeWidth="2" opacity="0.5"/>
        <line x1="10" y1="32" x2="54" y2="32" stroke="white" strokeWidth="2" opacity="0.5"/>
        <circle cx="22" cy="23" r="4" fill="white" opacity="0.8"/>
        <circle cx="42" cy="41" r="4" fill="white" opacity="0.8"/>
      </svg>
    ),
    crayons: (
      <svg viewBox="0 0 64 64" fill="none">
        <rect x="12" y="18" width="12" height="34" rx="2" fill="#ff6b6b"/>
        <rect x="26" y="16" width="12" height="34" rx="2" fill="#fcc419"/>
        <rect x="40" y="20" width="12" height="34" rx="2" fill="#74c0fc"/>
        <polygon points="12,18 18,18 15,24" fill="#ff8787"/>
        <polygon points="26,16 32,16 29,22" fill="#ffd43b"/>
        <polygon points="40,20 46,20 43,26" fill="#90bff9"/>
      </svg>
    ),
    glue: (
      <svg viewBox="0 0 64 64" fill="none">
        <rect x="20" y="14" width="24" height="40" rx="5" fill="#da77f2"/>
        <rect x="24" y="20" width="16" height="22" rx="3" fill="white" opacity="0.3"/>
        <ellipse cx="32" cy="12" rx="10" ry="5" fill="#be4bdb"/>
        <circle cx="27" cy="30" r="4" fill="white" opacity="0.4"/>
        <circle cx="37" cy="34" r="3" fill="white" opacity="0.3"/>
      </svg>
    ),
    bell: (
      <svg viewBox="0 0 64 64" fill="none">
        <path d="M32 12 C22 12 16 24 16 36 L16 44 L12 50 L52 50 L48 44 L48 36 C48 24 42 12 32 12" fill="#fab005"/>
        <circle cx="32" cy="54" r="5" fill="#ffd43b"/>
        <ellipse cx="32" cy="34" rx="10" ry="12" fill="white" opacity="0.2"/>
      </svg>
    ),
    math: (
      <svg viewBox="0 0 64 64" fill="none">
        <circle cx="32" cy="32" r="28" fill="#51cf66"/>
        <line x1="20" y1="32" x2="44" y2="32" stroke="white" strokeWidth="6" strokeLinecap="round"/>
        <line x1="32" y1="20" x2="32" y2="44" stroke="white" strokeWidth="6" strokeLinecap="round"/>
        <circle cx="22" cy="22" r="4" fill="white" opacity="0.7"/>
        <circle cx="42" cy="42" r="4" fill="white" opacity="0.7"/>
      </svg>
    ),
    paint: (
      <svg viewBox="0 0 64 64" fill="none">
        <circle cx="22" cy="26" r="11" fill="#ff6b6b"/>
        <circle cx="42" cy="26" r="11" fill="#cc5de8"/>
        <circle cx="32" cy="42" r="11" fill="#845ef7"/>
        <circle cx="22" cy="26" r="6" fill="white" opacity="0.3"/>
        <circle cx="42" cy="26" r="6" fill="white" opacity="0.3"/>
        <circle cx="32" cy="42" r="6" fill="white" opacity="0.3"/>
        <line x1="46" y1="14" x2="56" y2="6" stroke="#845ef7" strokeWidth="5" strokeLinecap="round"/>
      </svg>
    ),
    notebook: (
      <svg viewBox="0 0 64 64" fill="none">
        <rect x="14" y="12" width="36" height="40" rx="4" fill="#5c7cfa"/>
        <line x1="22" y1="12" x2="22" y2="52" stroke="white" opacity="0.4"/>
        <line x1="28" y1="24" x2="44" y2="24" stroke="white" strokeWidth="2" opacity="0.7"/>
        <line x1="28" y1="32" x2="44" y2="32" stroke="white" strokeWidth="2" opacity="0.7"/>
        <line x1="28" y1="40" x2="44" y2="40" stroke="white" strokeWidth="2" opacity="0.7"/>
        <circle cx="19" cy="20" r="2" fill="white" opacity="0.5"/>
        <circle cx="19" cy="32" r="2" fill="white" opacity="0.5"/>
        <circle cx="19" cy="44" r="2" fill="white" opacity="0.5"/>
      </svg>
    ),
    hourglass: (
      <svg viewBox="0 0 64 64" fill="none">
        <rect x="18" y="10" width="28" height="18" rx="3" fill="#1098ad"/>
        <rect x="18" y="36" width="28" height="18" rx="3" fill="#1098ad"/>
        <polygon points="32,28 26,36 38,36" fill="#0891b2"/>
        <circle cx="26" cy="19" r="2" fill="white" opacity="0.4"/>
        <circle cx="36" cy="21" r="1.5" fill="white" opacity="0.3"/>
      </svg>
    ),
    magnifier: (
      <svg viewBox="0 0 64 64" fill="none">
        <circle cx="28" cy="28" r="20" fill="#38d9a9"/>
        <circle cx="28" cy="28" r="16" fill="white" opacity="0.25"/>
        <rect x="40" y="40" width="18" height="10" rx="5" fill="#20c997"/>
        <circle cx="28" cy="28" r="10" stroke="white" strokeWidth="3" fill="none" opacity="0.5"/>
      </svg>
    ),
    folder: (
      <svg viewBox="0 0 64 64" fill="none">
        <rect x="10" y="18" width="44" height="36" rx="4" fill="#fcc419"/>
        <rect x="10" y="18" width="22" height="12" rx="3" fill="#ffd43b"/>
        <rect x="18" y="28" width="28" height="18" rx="3" fill="white" opacity="0.3"/>
        <circle cx="46" cy="42" r="4" fill="white" opacity="0.5"/>
      </svg>
    )
  };
  return icons[id] || icons.apple;
}

export function MemoryCardVisual({ id, className }: MemoryCardVisualProps) {
  const gradient = getGradientForId(id);
  const icon = getIconForId(id);

  return (
    <div
      className={["memory-card-visual", className].filter(Boolean).join(" ")}
      style={{ "--card-gradient": gradient } as CSSProperties}
    >
      <div className="memory-card-visual-bg" />
      <div className="memory-card-visual-icon">{icon}</div>
    </div>
  );
}
