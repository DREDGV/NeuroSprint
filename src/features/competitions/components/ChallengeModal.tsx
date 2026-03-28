import { useState } from "react";
import type { User, TrainingModeId } from "../../../shared/types/domain";
import type { UserChallenge } from "../../../shared/types/classes";

interface ChallengeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (challenge: Partial<UserChallenge>) => void;
  challenger: User;
  students: User[];
}

const TRAINING_MODES: Array<{ id: TrainingModeId; title: string; icon: string }> = [
  { id: "pattern_classic", title: "Pattern Recognition", icon: "🧩" },
  { id: "classic_plus", title: "Таблица Шульте", icon: "🔢" },
  { id: "memory_grid_classic", title: "Memory Grid", icon: "🧠" },
  { id: "reaction_signal", title: "Reaction", icon: "⚡" },
  { id: "sprint_add_sub", title: "Sprint Math", icon: "➗" },
];

const DURATIONS = [
  { value: 5, label: "5 минут" },
  { value: 10, label: "10 минут" },
  { value: 15, label: "15 минут" },
];

export function ChallengeModal({
  isOpen,
  onClose,
  onSubmit,
  challenger,
  students
}: ChallengeModalProps) {
  const [challengedId, setChallengedId] = useState<string>("");
  const [modeId, setModeId] = useState<TrainingModeId>("pattern_classic");
  const [durationMinutes, setDurationMinutes] = useState<number>(5);

  if (!isOpen) {
    return null;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!challengedId) {
      alert("Выберите соперника");
      return;
    }

    onSubmit({
      challengerId: challenger.id,
      challengedId,
      modeId,
      durationMinutes,
      status: "pending",
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 часа
    });

    // Reset form
    setChallengedId("");
    setModeId("pattern_classic");
    setDurationMinutes(5);
    onClose();
  };

  return (
    <div className="modal-overlay challenge-modal-overlay" onClick={onClose}>
      <div className="modal challenge-modal" onClick={(e) => e.stopPropagation()} data-testid="challenge-modal">
        <div className="modal-header">
          <h3>⚔️ Вызов соперника</h3>
          <button type="button" className="modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {/* Выбор соперника */}
            <div className="form-group">
              <label htmlFor="challenged-student">
                🎯 Соперник
              </label>
              <select
                id="challenged-student"
                value={challengedId}
                onChange={(e) => setChallengedId(e.target.value)}
                required
              >
                <option value="">Выберите ученика...</option>
                {students
                  .filter((s) => s.id !== challenger.id)
                  .map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.name}
                    </option>
                  ))}
              </select>
            </div>

            {/* Выбор тренажёра */}
            <div className="form-group">
              <label>
                🎮 Тренажёр
              </label>
              <div className="mode-selector">
                {TRAINING_MODES.map((mode) => (
                  <button
                    key={mode.id}
                    type="button"
                    className={`mode-option ${modeId === mode.id ? "selected" : ""}`}
                    onClick={() => setModeId(mode.id)}
                  >
                    <span className="mode-icon">{mode.icon}</span>
                    <span className="mode-title">{mode.title}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Длительность */}
            <div className="form-group">
              <label htmlFor="challenge-duration">
                ⏱️ Длительность
              </label>
              <select
                id="challenge-duration"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
              >
                {DURATIONS.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Информация */}
            <div className="challenge-info">
              <p>
                📋 <strong>Правила:</strong> Оба игрока проходят тренажёр в течение 24 часов.
                Победитель определяется по количеству XP.
              </p>
              <p>
                🏆 <strong>Награда:</strong> Победитель получает +50 XP бонус.
              </p>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-ghost" onClick={onClose}>
              Отмена
            </button>
            <button type="submit" className="btn-primary">
              🚀 Отправить вызов
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
