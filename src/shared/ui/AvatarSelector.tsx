import { useState } from "react";
import { AVATAR_EMOJIS } from "./ProfileCard";

interface AvatarSelectorProps {
  selectedAvatar: string;
  onSelect: (avatar: string) => void;
}

export function AvatarSelector({ selectedAvatar, onSelect }: AvatarSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="avatar-selector">
      <button
        type="button"
        className="avatar-selector-btn"
        onClick={() => setIsOpen(!isOpen)}
        data-testid="avatar-selector-btn"
      >
        <span className="avatar-preview">{selectedAvatar}</span>
        <span className="avatar-arrow">{isOpen ? "✕" : "✎"}</span>
      </button>

      {isOpen && (
        <div className="avatar-selector-dropdown" data-testid="avatar-dropdown">
          <div className="avatar-grid">
            {AVATAR_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                className={`avatar-option${selectedAvatar === emoji ? " is-selected" : ""}`}
                onClick={() => {
                  onSelect(emoji);
                  setIsOpen(false);
                }}
                data-testid={`avatar-option-${emoji}`}
                title={emoji}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
