import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  getExperimentalModuleCurrentMilestone,
  getExperimentalModuleMeta,
  getExperimentalModuleProgress
} from "../shared/lib/training/experimentalModules";
import {
  BLOCK_PATTERN_DIFFICULTIES,
  BLOCK_PATTERN_GRID,
  type BlockPatternDifficulty,
  type BlockPatternMode,
  createRound,
  evaluateAttempt,
  getPreviewRound,
  toggleSelection
} from "../shared/lib/training/blockPatternGame";

type PatternPhase =
  | "setup"
  | "preview"
  | "memorize"
  | "transform"
  | "recall"
  | "result";

const CELL_SIZE = 72;

const MODE_LABELS: Record<BlockPatternMode, { name: string; icon: string; hint: string }> = {
  classic: { name: "Классика", icon: "🎯", hint: "Повторите фигуру без изменений" },
  rotation: { name: "Поворот", icon: "🔄", hint: "Мысленно поверните фигуру" },
  mirror: { name: "Зеркало", icon: "↔️", hint: "Мысленно отразите фигуру" }
};

function PatternGrid({
  activeCells = [],
  cellStates,
  onCellClick,
  interactive = false,
  label,
  highlightColor = "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
  cellOpacity = 1
}: {
  activeCells?: number[];
  cellStates?: Record<number, "correct" | "wrong" | "missed">;
  onCellClick?: (index: number) => void;
  interactive?: boolean;
  label?: string;
  highlightColor?: string;
  cellOpacity?: number;
}) {
  const totalCells = BLOCK_PATTERN_GRID * BLOCK_PATTERN_GRID;

  return (
    <div style={{ textAlign: "center" }}>
      {label ? (
        <div
          style={{
            marginBottom: "8px",
            color: "#6b7280",
            fontSize: "12px",
            fontWeight: 600,
            letterSpacing: "0.03em",
            textTransform: "uppercase"
          }}
        >
          {label}
        </div>
      ) : null}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${BLOCK_PATTERN_GRID}, ${CELL_SIZE}px)`,
          gap: "4px",
          width: "fit-content",
          margin: "0 auto",
          padding: "12px",
          background: "#f9fafb",
          border: "2px solid #e5e7eb",
          borderRadius: "12px"
        }}
      >
        {Array.from({ length: totalCells }, (_, index) => {
          const isActive = activeCells.includes(index);
          const cellState = cellStates?.[index];
          const isSelected = interactive && isActive;

          let background = "#e5e7eb";
          let boxShadow = "none";

          if (!cellStates && isActive) {
            background = highlightColor;
            boxShadow = "0 2px 8px rgba(59, 130, 246, 0.28)";
          }

          if (cellState === "correct") {
            background = "linear-gradient(135deg, #10b981 0%, #059669 100%)";
            boxShadow = "0 2px 8px rgba(16, 185, 129, 0.28)";
          }

          if (cellState === "wrong") {
            background = "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)";
            boxShadow = "0 2px 8px rgba(239, 68, 68, 0.25)";
          }

          if (cellState === "missed") {
            background = "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)";
            boxShadow = "0 2px 8px rgba(245, 158, 11, 0.25)";
          }

          if (interactive) {
            return (
              <button
                key={index}
                type="button"
                onClick={() => onCellClick?.(index)}
                aria-pressed={isSelected}
                style={{
                  width: `${CELL_SIZE}px`,
                  height: `${CELL_SIZE}px`,
                  borderRadius: "8px",
                  border: isSelected ? "2px solid #059669" : "2px solid #d1d5db",
                  background: isSelected
                    ? "linear-gradient(135deg, #10b981 0%, #059669 100%)"
                    : "#fff",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                  boxShadow: isSelected ? "0 2px 8px rgba(5, 150, 105, 0.25)" : "none"
                }}
              />
            );
          }

          return (
            <div
              key={index}
              style={{
                width: `${CELL_SIZE}px`,
                height: `${CELL_SIZE}px`,
                borderRadius: "8px",
                background,
                opacity: !cellStates && isActive ? cellOpacity : 1,
                transition: "all 0.2s ease",
                boxShadow
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

export function BlockPatternRecallPage() {
  const experimentalMeta = getExperimentalModuleMeta("block_pattern");
  const [difficulty, setDifficulty] = useState<BlockPatternDifficulty>("easy");
  const [mode, setMode] = useState<BlockPatternMode>("classic");
  const [phase, setPhase] = useState<PatternPhase>("setup");
  const [basePattern, setBasePattern] = useState<number[]>([]);
  const [expectedPattern, setExpectedPattern] = useState<number[]>([]);
  const [rotationAngle, setRotationAngle] = useState<90 | 180 | 270>(90);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [countdown, setCountdown] = useState(0);
  const [memorizeFade, setMemorizeFade] = useState(1);
  const [transformProgress, setTransformProgress] = useState(0);
  const [selectionHint, setSelectionHint] = useState<string | null>(null);
  const [combo, setCombo] = useState(0);
  const [bestCombo, setBestCombo] = useState(0);
  const [totalScore, setTotalScore] = useState(0);
  const [roundsPlayed, setRoundsPlayed] = useState(0);
  const animationFrameRef = useRef<number | null>(null);
  const previousPhaseRef = useRef<PatternPhase>("setup");

  const config = BLOCK_PATTERN_DIFFICULTIES[difficulty];
  const previewRound = useMemo(() => getPreviewRound(mode), [mode]);
  const selectedCells = useMemo(
    () => Array.from(selected).sort((left, right) => left - right),
    [selected]
  );
  const roundResult = useMemo(
    () => evaluateAttempt(expectedPattern, selectedCells),
    [expectedPattern, selectedCells]
  );
  const progress = experimentalMeta ? getExperimentalModuleProgress(experimentalMeta) : 0;
  const currentMilestone = experimentalMeta
    ? getExperimentalModuleCurrentMilestone(experimentalMeta)
    : null;

  const stopTransformAnimation = useCallback(() => {
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, []);

  const resetSessionStats = useCallback(() => {
    setCombo(0);
    setBestCombo(0);
    setTotalScore(0);
    setRoundsPlayed(0);
  }, []);

  const clearRoundState = useCallback(() => {
    setBasePattern([]);
    setExpectedPattern([]);
    setSelected(new Set());
    setCountdown(0);
    setMemorizeFade(1);
    setTransformProgress(0);
    setSelectionHint(null);
  }, []);

  const resetToSetup = useCallback(() => {
    stopTransformAnimation();
    clearRoundState();
    resetSessionStats();
    setPhase("setup");
  }, [clearRoundState, resetSessionStats, stopTransformAnimation]);

  const startRound = useCallback(() => {
    stopTransformAnimation();
    clearRoundState();

    const round = createRound(config.blocks, mode);
    setBasePattern(round.basePattern);
    setExpectedPattern(round.expectedPattern);
    setRotationAngle(round.rotationAngle);
    setPhase("memorize");
  }, [clearRoundState, config.blocks, mode, stopTransformAnimation]);

  const startPreview = useCallback(() => {
    stopTransformAnimation();
    clearRoundState();
    setRotationAngle(previewRound.rotationAngle);
    setPhase("preview");
  }, [clearRoundState, previewRound.rotationAngle, stopTransformAnimation]);

  const animateTransform = useCallback(() => {
    const startTime = performance.now();
    const durationMs = 1600;

    const step = (now: number) => {
      const progressValue = Math.min((now - startTime) / durationMs, 1);
      const easedProgress = 1 - Math.pow(1 - progressValue, 3);
      setTransformProgress(easedProgress);

      if (progressValue < 1) {
        animationFrameRef.current = requestAnimationFrame(step);
        return;
      }

      animationFrameRef.current = null;
      setPhase("recall");
    };

    animationFrameRef.current = requestAnimationFrame(step);
  }, []);

  useEffect(() => stopTransformAnimation, [stopTransformAnimation]);

  useEffect(() => {
    if (phase !== "memorize") {
      return undefined;
    }

    setCountdown(config.memorizeSec);
    setMemorizeFade(1);
    setTransformProgress(0);

    const timerId = window.setInterval(() => {
      setCountdown((value) => {
        if (value <= 1) {
          window.clearInterval(timerId);
          if (mode === "classic") {
            setPhase("recall");
          } else {
            setPhase("transform");
            animateTransform();
          }
          return 0;
        }

        return value - 1;
      });
    }, 1000);

    if (difficulty === "easy" || difficulty === "medium") {
      const fadeDelayRatio = difficulty === "easy" ? 0.62 : 0.48;
      const targetOpacity = difficulty === "easy" ? 0.18 : 0.06;
      const fadeDurationMs = config.memorizeSec * 1000;
      const fadeIntervalMs = 50;
      let elapsed = 0;

      const fadeTimerId = window.setInterval(() => {
        elapsed += fadeIntervalMs;
        if (elapsed <= fadeDurationMs * fadeDelayRatio) {
          return;
        }

        const localProgress =
          (elapsed - fadeDurationMs * fadeDelayRatio) /
          (fadeDurationMs * (1 - fadeDelayRatio));
        setMemorizeFade(Math.max(targetOpacity, 1 - localProgress));
      }, fadeIntervalMs);

      return () => {
        window.clearInterval(timerId);
        window.clearInterval(fadeTimerId);
      };
    }

    return () => {
      window.clearInterval(timerId);
    };
  }, [animateTransform, config.memorizeSec, difficulty, mode, phase]);

  useEffect(() => {
    const previousPhase = previousPhaseRef.current;
    previousPhaseRef.current = phase;

    if (phase !== "result" || previousPhase !== "recall") {
      return;
    }

    setRoundsPlayed((current) => current + 1);
    setTotalScore((current) => current + roundResult.score);
    setCombo((current) => {
      const nextCombo = roundResult.comboEligible ? current + 1 : 0;
      setBestCombo((best) => Math.max(best, nextCombo));
      return nextCombo;
    });
  }, [phase, roundResult.comboEligible, roundResult.score]);

  const toggleCell = useCallback(
    (index: number) => {
      if (phase !== "recall") {
        return;
      }

      setSelected((current) => {
        const { next, limitReached } = toggleSelection(current, index, expectedPattern.length);
        setSelectionHint(
          limitReached
            ? `Можно выбрать не больше ${expectedPattern.length} клеток.`
            : null
        );
        return next;
      });
    },
    [expectedPattern.length, phase]
  );

  const finishRecall = useCallback(() => {
    if (phase !== "recall") {
      return;
    }

    setPhase("result");
  }, [phase]);

  const renderTransformIndicator = () => {
    if (mode === "rotation") {
      return (
        <>
          <div
            style={{
              fontSize: "36px",
              color: "#8b5cf6",
              transform: `rotate(${rotationAngle * transformProgress}deg)`,
              transition: "transform 0.08s linear"
            }}
          >
            ↻
          </div>
          <div style={{ color: "#6b7280", fontSize: "12px", fontWeight: 600 }}>
            {rotationAngle}°
          </div>
        </>
      );
    }

    return (
      <>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "4px",
            color: "#8b5cf6",
            fontSize: "30px"
          }}
        >
          <span>→</span>
          <span
            style={{
              width: "2px",
              height: "26px",
              background: "#8b5cf6",
              display: "inline-block",
              opacity: 0.25 + transformProgress * 0.75
            }}
          />
          <span>←</span>
        </div>
        <div style={{ color: "#6b7280", fontSize: "12px", fontWeight: 600 }}>Зеркало</div>
      </>
    );
  };

  const previewInstruction =
    mode === "rotation"
      ? "Запомните фигуру слева, мысленно поверните её по часовой стрелке и воспроизведите справа."
      : mode === "mirror"
        ? "Запомните фигуру слева, отразите её горизонтально и воспроизведите справа."
        : "Запомните фигуру и повторите её без изменений.";

  const isRoundActive =
    phase === "memorize" || phase === "transform" || phase === "recall";
  const boardCells =
    phase === "memorize" ? basePattern : phase === "recall" ? selectedCells : [];
  const boardInteractive = phase === "recall";
  const boardOpacity = phase === "memorize" ? memorizeFade : 1;
  const boardHighlight =
    phase === "memorize"
      ? "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)"
      : "linear-gradient(135deg, #10b981 0%, #059669 100%)";
  const runtimeInstruction =
    phase === "memorize"
      ? `Запомните фигуру (${countdown} сек)`
      : phase === "transform"
        ? mode === "rotation"
          ? `Мысленно поверните на ${rotationAngle}°`
          : "Мысленно отразите фигуру"
        : "Воспроизведите фигуру";
  const runtimeCaption =
    phase === "memorize"
      ? "Поле остаётся на месте. Запоминайте фигуру без смены сцены."
      : phase === "transform"
        ? "Фигура уже скрыта, но поле не меняется. Держите в голове правило трансформации."
        : mode === "rotation"
          ? `Поверните фигуру мысленно на ${rotationAngle}° по часовой стрелке и отметьте результат.`
          : mode === "mirror"
            ? "Отразите фигуру горизонтально и отметьте получившийся образ."
            : "Повторите фигуру по памяти.";
  const runtimeBadgeColors =
    phase === "memorize"
      ? { background: "#fef3c7", color: "#92400e" }
      : phase === "transform"
        ? { background: "#ede9fe", color: "#6d28d9" }
        : { background: "#ecfdf5", color: "#065f46" };

  return (
    <section className="panel" data-testid="block-pattern-page">
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
        <span style={{ fontSize: "32px" }}>🧩</span>
        <h2 style={{ margin: 0 }}>Мысленный поворот</h2>
      </div>
      <p style={{ margin: "0 0 16px", color: "#6b7280", fontSize: "15px", lineHeight: 1.5 }}>
        Запомните фигуру и воспроизведите её после трансформации. Тренажёр проверяет,
        насколько точно вы удерживаете образ и применяете правило поворота или зеркала.
      </p>

      {experimentalMeta ? (
        <div
          style={{
            padding: "12px 16px",
            marginBottom: "20px",
            borderRadius: "10px",
            border: "1px solid #86efac",
            background: "#f0fdf4",
            display: "flex",
            alignItems: "center",
            gap: "12px"
          }}
        >
          <span style={{ fontSize: "20px" }}>🧪</span>
          <div>
            <strong style={{ color: "#166534", fontSize: "13px" }}>
              Альфа-версия • {experimentalMeta.stageLabel}
            </strong>
            <p style={{ margin: "2px 0 0", color: "#15803d", fontSize: "12px" }}>
              Прогресс: {progress}% • {currentMilestone?.label ?? "Готово"}
            </p>
          </div>
        </div>
      ) : null}

      {phase !== "setup" && roundsPlayed > 0 ? (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "12px",
            padding: "10px 16px",
            marginBottom: "16px",
            borderRadius: "10px",
            border: "1px solid #fbbf24",
            background: "linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "20px" }}>🔥</span>
            <strong style={{ color: "#92400e", fontSize: "14px" }}>Серия: {combo}</strong>
          </div>
          <div style={{ color: "#92400e", fontSize: "13px" }}>
            Лучшая: {bestCombo} • Суммарный score: {totalScore}
          </div>
        </div>
      ) : null}

      {phase === "setup" ? (
        <>
          <div style={{ marginBottom: "20px" }}>
            <h3 style={{ margin: "0 0 12px", fontSize: "16px", fontWeight: 600 }}>
              🎮 Режим игры
            </h3>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                gap: "10px"
              }}
            >
              {(["classic", "rotation", "mirror"] as const).map((nextMode) => (
                <button
                  key={nextMode}
                  type="button"
                  className={mode === nextMode ? "btn-secondary is-active" : "btn-secondary"}
                  onClick={() => setMode(nextMode)}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "6px",
                    padding: "14px 10px",
                    textAlign: "center"
                  }}
                >
                  <span style={{ fontSize: "24px" }}>{MODE_LABELS[nextMode].icon}</span>
                  <span style={{ fontWeight: 600, fontSize: "15px" }}>
                    {MODE_LABELS[nextMode].name}
                  </span>
                  <span style={{ color: "#6b7280", fontSize: "12px", lineHeight: 1.3 }}>
                    {MODE_LABELS[nextMode].hint}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: "20px" }}>
            <h3 style={{ margin: "0 0 12px", fontSize: "16px", fontWeight: 600 }}>
              ⚡ Сложность
            </h3>
            <div className="segmented-row">
              {(["easy", "medium", "hard"] as const).map((level) => (
                <button
                  key={level}
                  type="button"
                  className={difficulty === level ? "btn-secondary is-active" : "btn-secondary"}
                  onClick={() => setDifficulty(level)}
                >
                  {BLOCK_PATTERN_DIFFICULTIES[level].label}
                </button>
              ))}
            </div>
          </div>

          <div
            style={{
              padding: "16px",
              marginBottom: "20px",
              borderRadius: "10px",
              border: "1px solid #e5e7eb",
              background: "#f9fafb"
            }}
          >
            <h4 style={{ margin: "0 0 8px", fontSize: "14px", fontWeight: 600 }}>📋 Параметры</h4>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "8px",
                color: "#6b7280",
                fontSize: "13px"
              }}
            >
              <span>Сетка:</span>
              <strong>4×4</strong>
              <span>Блоков:</span>
              <strong>{config.blocks}</strong>
              <span>Режим:</span>
              <strong>{MODE_LABELS[mode].name}</strong>
              <span>Время показа:</span>
              <strong>{config.memorizeSec} сек</strong>
            </div>
          </div>

          <div
            style={{
              padding: "16px",
              marginBottom: "20px",
              borderRadius: "10px",
              border: "1px solid #93c5fd",
              background: "#eff6ff"
            }}
          >
            <h4 style={{ margin: "0 0 8px", fontSize: "14px", fontWeight: 600, color: "#1e40af" }}>
              💡 Как играть
            </h4>
            <ol
              style={{
                margin: "0 0 0 16px",
                color: "#1e40af",
                fontSize: "13px",
                lineHeight: 1.6
              }}
            >
              <li>На экране появится фигура из нескольких клеток.</li>
              <li>Запомните её как можно точнее.</li>
              <li>
                Во время ответа можно выбрать не больше {config.blocks} клеток, чтобы нельзя
                было угадать простым заполнением всей доски.
              </li>
              <li>
                {mode === "rotation"
                  ? `Потом мысленно поверните фигуру на ${rotationAngle}° и отметьте результат.`
                  : mode === "mirror"
                    ? "Потом мысленно отразите фигуру по горизонтали и отметьте результат."
                    : "Потом повторите фигуру по памяти без изменений."}
              </li>
            </ol>
          </div>

          <div className="action-row" style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <button type="button" className="btn-primary" onClick={startRound}>
              ▶️ Начать
            </button>
            <button type="button" className="btn-secondary" onClick={startPreview}>
              👀 Показать пример
            </button>
            <Link className="btn-ghost" to="/training">
              ← К тренировкам
            </Link>
          </div>
        </>
      ) : null}

      {phase === "preview" ? (
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              display: "inline-block",
              marginBottom: "24px",
              padding: "10px 18px",
              borderRadius: "20px",
              background: "#dbeafe",
              color: "#1e40af",
              fontSize: "14px",
              fontWeight: 600
            }}
          >
            👀 Пример режима: {MODE_LABELS[mode].name}
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "20px",
              flexWrap: "wrap",
              marginBottom: "16px"
            }}
          >
            <PatternGrid
              activeCells={previewRound.basePattern}
              label="Запомните"
              highlightColor="linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)"
            />
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
              {mode === "classic" ? (
                <span style={{ color: "#9ca3af", fontSize: "24px" }}>↓</span>
              ) : (
                renderTransformIndicator()
              )}
            </div>
            <PatternGrid
              activeCells={previewRound.expectedPattern}
              label="Правильный ответ"
              highlightColor="linear-gradient(135deg, #10b981 0%, #059669 100%)"
            />
          </div>

          <div
            style={{
              marginBottom: "24px",
              padding: "10px 16px",
              borderRadius: "8px",
              border: "1px solid #fbbf24",
              background: "#fef3c7",
              color: "#92400e",
              fontSize: "13px"
            }}
          >
            {previewInstruction}
          </div>

          <button type="button" className="btn-primary" onClick={resetToSetup}>
            ← Назад к настройкам
          </button>
        </div>
      ) : null}

      {isRoundActive ? (
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              display: "inline-block",
              marginBottom: "16px",
              padding: "10px 18px",
              borderRadius: "20px",
              background: runtimeBadgeColors.background,
              color: runtimeBadgeColors.color,
              fontSize: "15px",
              fontWeight: 600
            }}
          >
            {runtimeInstruction}
          </div>

          <p style={{ margin: "0 0 12px", color: "#6b7280", fontSize: "15px" }}>
            {runtimeCaption}
          </p>

          {phase === "transform" ? (
            <div style={{ marginBottom: "12px", display: "flex", justifyContent: "center" }}>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "8px",
                  color: "#8b5cf6"
                }}
              >
                {renderTransformIndicator()}
              </div>
            </div>
          ) : (
            <div style={{ height: "44px", marginBottom: "12px" }} />
          )}

          {phase === "recall" ? (
            <p
              style={{
                margin: "0 0 16px",
                color: "#374151",
                fontSize: "13px",
                fontWeight: 600
              }}
            >
              Выбрано: {selectedCells.length} из {expectedPattern.length}
            </p>
          ) : (
            <div style={{ height: "18px", marginBottom: "16px" }} />
          )}

          {selectionHint && phase === "recall" ? (
            <div
              style={{
                marginBottom: "16px",
                padding: "10px 14px",
                borderRadius: "10px",
                border: "1px solid #fbbf24",
                background: "#fef3c7",
                color: "#92400e",
                fontSize: "13px"
              }}
            >
              {selectionHint}
            </div>
          ) : null}

          <div style={{ marginBottom: "24px" }}>
            <PatternGrid
              activeCells={boardCells}
              onCellClick={boardInteractive ? toggleCell : undefined}
              interactive={boardInteractive}
              label={phase === "recall" && mode !== "classic" ? "Ваш ответ" : undefined}
              highlightColor={boardHighlight}
              cellOpacity={boardOpacity}
            />
          </div>

          {phase === "recall" ? (
            <div className="action-row" style={{ display: "flex", gap: "12px", flexWrap: "wrap", justifyContent: "center" }}>
              <button
                type="button"
                className="btn-primary"
                onClick={finishRecall}
                disabled={selectedCells.length === 0}
              >
                ✅ Проверить ответ
              </button>
              <button type="button" className="btn-ghost" onClick={resetToSetup}>
                ↩️ Назад
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      {phase === "result" ? (
        <>
          <h3 style={{ margin: "0 0 16px", textAlign: "center", fontSize: "20px", fontWeight: 700 }}>
            {roundResult.isPerfect
              ? "🎉 Идеально"
              : roundResult.accuracyPercent >= 70
                ? "👍 Хороший ответ"
                : "💪 Можно точнее"}
          </h3>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))",
              gap: "12px",
              marginBottom: "20px"
            }}
          >
            {[
              { label: "Точность", value: `${roundResult.accuracyPercent}%`, icon: "🎯" },
              { label: "Верно", value: `${roundResult.hits}/${expectedPattern.length}`, icon: "✅" },
              { label: "Пропуски", value: String(roundResult.misses), icon: "⚠️" },
              { label: "Лишние", value: String(roundResult.falseHits), icon: "❌" },
              { label: "Score", value: String(roundResult.score), icon: "🏆" },
              { label: "Серия", value: String(combo), icon: "🔥" }
            ].map((metric) => (
              <div
                key={metric.label}
                style={{
                  padding: "12px",
                  borderRadius: "10px",
                  border: "1px solid #e5e7eb",
                  background: "#f9fafb",
                  textAlign: "center"
                }}
              >
                <div style={{ marginBottom: "4px", fontSize: "20px" }}>{metric.icon}</div>
                <div style={{ color: "#111827", fontSize: "18px", fontWeight: 700 }}>
                  {metric.value}
                </div>
                <div style={{ color: "#6b7280", fontSize: "12px" }}>{metric.label}</div>
              </div>
            ))}
          </div>

          <div style={{ marginBottom: "20px", textAlign: "center" }}>
            <PatternGrid
              activeCells={selectedCells}
              cellStates={roundResult.cellStates}
              label="Разбор ответа: зелёный — верно, жёлтый — пропуск, красный — лишняя клетка"
            />
          </div>

          <div className="action-row" style={{ display: "flex", gap: "12px", flexWrap: "wrap", justifyContent: "center" }}>
            <button type="button" className="btn-primary" onClick={startRound}>
              🔄 Ещё раунд
            </button>
            <button type="button" className="btn-secondary" onClick={resetToSetup}>
              ⚙️ Настройки
            </button>
            <Link className="btn-ghost" to="/training">
              ← К тренировкам
            </Link>
          </div>
        </>
      ) : null}
    </section>
  );
}
