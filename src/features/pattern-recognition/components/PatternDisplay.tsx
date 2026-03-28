import React from "react";
import type { PatternElement, PatternType } from "../../../shared/types/pattern";
import { COLOR_TO_CSS, SIZE_TO_CSS } from "../../../shared/types/pattern";

interface PatternElementProps {
  element: PatternElement;
  size?: number;
  onClick?: () => void;
  disabled?: boolean;
  testId?: string;
  className?: string;
  index?: number;
}

const ShapeIcons: Record<string, React.FC<{ color: string; size: number }>> = {
  circle: ({ color, size }) => (
    <g>
      <defs>
        <linearGradient id={`grad-${color}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={color} stopOpacity={0.9} />
          <stop offset="100%" stopColor={color} />
        </linearGradient>
      </defs>
      <circle cx={size / 2} cy={size / 2} r={size / 2 - 2} fill={`url(#grad-${color})`} />
      <circle cx={size / 2 - size * 0.1} cy={size / 2 - size * 0.1} r={size * 0.15} fill="rgba(255,255,255,0.4)" />
    </g>
  ),
  square: ({ color, size }) => (
    <g>
      <defs>
        <linearGradient id={`grad-${color}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={color} stopOpacity={0.9} />
          <stop offset="100%" stopColor={color} />
        </linearGradient>
      </defs>
      <rect x={2} y={2} width={size - 4} height={size - 4} rx={6} fill={`url(#grad-${color})`} />
      <rect x={4} y={4} width={size * 0.3} height={size * 0.3} rx={3} fill="rgba(255,255,255,0.35)" />
    </g>
  ),
  triangle: ({ color, size }) => (
    <g>
      <defs>
        <linearGradient id={`grad-${color}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={color} stopOpacity={0.9} />
          <stop offset="100%" stopColor={color} />
        </linearGradient>
      </defs>
      <polygon points={`${size / 2},2 ${size - 2},${size - 2} 2,${size - 2}`} fill={`url(#grad-${color})`} />
      <polygon points={`${size / 2},${size * 0.2} ${size * 0.65},${size * 0.45} ${size * 0.35},${size * 0.45}`} fill="rgba(255,255,255,0.35)" />
    </g>
  ),
  diamond: ({ color, size }) => (
    <g>
      <defs>
        <linearGradient id={`grad-${color}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={color} stopOpacity={0.9} />
          <stop offset="100%" stopColor={color} />
        </linearGradient>
      </defs>
      <polygon points={`${size / 2},2 ${size - 2},${size / 2} ${size / 2},${size - 2} 2,${size / 2}`} fill={`url(#grad-${color})`} />
      <polygon points={`${size / 2},${size * 0.15} ${size * 0.6},${size / 2} ${size / 2},${size * 0.85} ${size * 0.4},${size / 2}`} fill="rgba(255,255,255,0.2)" />
    </g>
  ),
  star: ({ color, size }) => {
    const centerX = size / 2;
    const centerY = size / 2;
    const outerRadius = size / 2 - 2;
    const innerRadius = outerRadius * 0.4;
    const points: string[] = [];

    for (let index = 0; index < 10; index += 1) {
      const angle = (index * 36 - 90) * (Math.PI / 180);
      const radius = index % 2 === 0 ? outerRadius : innerRadius;
      points.push(`${centerX + radius * Math.cos(angle)},${centerY + radius * Math.sin(angle)}`);
    }

    return (
      <g>
        <defs>
          <linearGradient id={`grad-${color}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={color} stopOpacity={0.9} />
            <stop offset="100%" stopColor={color} />
          </linearGradient>
        </defs>
        <polygon points={points.join(" ")} fill={`url(#grad-${color})`} />
        <polygon points={points.map((p, i) => i % 2 === 0 ? p : `${centerX},${centerY}`).filter((_, i, arr) => i < 6).join(" ")} fill="rgba(255,255,255,0.3)" />
      </g>
    );
  }
};

export function PatternElementDisplay({
  element,
  size = 56,
  onClick,
  disabled = false,
  testId,
  className = "",
  index
}: PatternElementProps) {
  const color = COLOR_TO_CSS[element.color];
  const cssSize = SIZE_TO_CSS[element.size] || size;
  const actualSize = size || cssSize;
  const ShapeIcon = ShapeIcons[element.shape] || ShapeIcons.circle;
  const animationDelay = index !== undefined ? index * 0.05 : 0;

  return (
    <button
      type="button"
      className={`pattern-element-btn ${className}`.trim()}
      onClick={onClick}
      disabled={disabled}
      style={{
        width: actualSize,
        height: actualSize,
        cursor: disabled ? "default" : "pointer",
        animationDelay: `${animationDelay}s`
      }}
      data-testid={testId}
      aria-label={`Элемент: ${element.color}, ${element.shape}, ${element.size}`}
    >
      <svg width={actualSize} height={actualSize} viewBox={`0 0 ${actualSize} ${actualSize}`}>
        <ShapeIcon color={color} size={actualSize} />
      </svg>
    </button>
  );
}

interface PatternNumberProps {
  value: number;
  size?: number;
  onClick?: () => void;
  disabled?: boolean;
  testId?: string;
  className?: string;
  index?: number;
}

export function PatternNumber({
  value,
  size = 64,
  onClick,
  disabled = false,
  testId,
  className = "",
  index
}: PatternNumberProps) {
  const animationDelay = index !== undefined ? index * 0.05 : 0;

  return (
    <button
      type="button"
      className={`pattern-number-btn ${className}`.trim()}
      onClick={onClick}
      disabled={disabled}
      style={{
        width: size,
        height: size,
        fontSize: Math.floor(size * 0.5),
        cursor: disabled ? "default" : "pointer",
        animationDelay: `${animationDelay}s`
      }}
      data-testid={testId}
      aria-label={`Число ${value}`}
    >
      <span className="pattern-number-value">{value}</span>
    </button>
  );
}

function getCorrectIndices(correctIndex?: number | number[]): number[] {
  if (correctIndex === undefined) {
    return [];
  }
  return Array.isArray(correctIndex) ? correctIndex : [correctIndex];
}

function renderPatternValue(
  value: PatternElement | number,
  size: number,
  testId: string,
  className = "",
  onClick?: () => void,
  disabled = true,
  index?: number
) {
  if (typeof value === "number") {
    return (
      <PatternNumber
        value={value}
        size={size}
        onClick={onClick}
        disabled={disabled}
        testId={testId}
        className={className}
        index={index}
      />
    );
  }

  return (
    <PatternElementDisplay
      element={value}
      size={size}
      onClick={onClick}
      disabled={disabled}
      testId={testId}
      className={className}
      index={index}
    />
  );
}

interface PatternSequenceProps {
  sequence: PatternElement[] | number[];
  options?: PatternElement[] | number[];
  selectedAnswers?: number[];
  correctIndex?: number | number[];
  gaps?: number;
  elementSize?: number;
  patternType?: PatternType;
  showHint?: boolean;
  showResult?: boolean;
  onRemoveSelection?: (slotIndex: number) => void;
}

export function PatternSequence({
  sequence,
  options,
  selectedAnswers = [],
  correctIndex,
  gaps = 1,
  elementSize = 64,
  patternType,
  showHint = false,
  showResult = false,
  onRemoveSelection
}: PatternSequenceProps) {
  const correctIndices = getCorrectIndices(correctIndex);

  return (
    <div className="pattern-sequence" data-testid="pattern-sequence">
      {showHint && patternType && (
        <div className="pattern-type-hint" data-testid="pattern-type-hint">
          {getPatternTypeIcon(patternType)} {getPatternTypeLabel(patternType)}
        </div>
      )}

      <div className="pattern-sequence-items">
        {sequence.map((item, index) => (
          <React.Fragment key={`pattern-sequence-item-${index}`}>
            {renderPatternValue(
              item,
              elementSize,
              `pattern-element-${index}`,
              "",
              undefined,
              true,
              index
            )}
          </React.Fragment>
        ))}

        {Array.from({ length: gaps }, (_, slotIndex) => {
          const selectedOptionIndex = selectedAnswers[slotIndex];
          const selectedValue = selectedOptionIndex === undefined ? undefined : options?.[selectedOptionIndex];
          const expectedOptionIndex = correctIndices[slotIndex];
          const slotState =
            showResult && selectedOptionIndex !== undefined
              ? selectedOptionIndex === expectedOptionIndex
                ? "correct"
                : "wrong"
              : selectedOptionIndex !== undefined
                ? "filled"
                : "";
          const elementIndex = sequence.length + slotIndex;

          if (selectedValue !== undefined) {
            return (
              <div key={`gap-${slotIndex}`} className="pattern-gap-slot">
                {renderPatternValue(
                  selectedValue,
                  elementSize,
                  `pattern-gap-${slotIndex}`,
                  `pattern-answer-slot ${slotState}`.trim(),
                  onRemoveSelection && !showResult ? () => onRemoveSelection(slotIndex) : undefined,
                  showResult || !onRemoveSelection,
                  elementIndex
                )}
                <span className="pattern-gap-index">{slotIndex + 1}</span>
              </div>
            );
          }

          return (
            <div
              key={`gap-${slotIndex}`}
              className="pattern-question-mark"
              data-testid={`pattern-gap-${slotIndex}`}
              aria-label={`Пропуск ${slotIndex + 1}`}
              style={{ animationDelay: `${elementIndex * 0.05}s` }}
            >
              <span>?</span>
              <small>{slotIndex + 1}</small>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function getPatternTypeIcon(type: PatternType): string {
  const icons: Record<PatternType, string> = {
    ABAB: "ALT",
    AABB: "PAIR",
    PROGRESSION: "STEP",
    CYCLE: "LOOP",
    MIRROR: "SYNC",
    MATH_SEQUENCE: "NUM",
    MATH_ARITHMETIC: "ADD",
    MATH_ALTERNATING: "±",
    MATH_FIBONACCI: "FIB",
    MATH_GEOMETRIC: "×",
    MATH_PRIME: "PRM",
    MATH_SQUARES: "n²"
  };

  return icons[type] || "PAT";
}

function getPatternTypeLabel(type: PatternType): string {
  const labels: Record<PatternType, string> = {
    ABAB: "Чередование",
    AABB: "Пары",
    PROGRESSION: "Прогрессия",
    CYCLE: "Цикл",
    MIRROR: "Зеркало",
    MATH_SEQUENCE: "Последовательность",
    MATH_ARITHMETIC: "Арифметика",
    MATH_ALTERNATING: "Чередование",
    MATH_FIBONACCI: "Фибоначчи",
    MATH_GEOMETRIC: "Геометрия",
    MATH_PRIME: "Простые",
    MATH_SQUARES: "Квадраты"
  };

  return labels[type] || "";
}

interface PatternOptionsProps {
  options: PatternElement[] | number[];
  correctIndex: number | number[];
  onSelect: (index: number) => void;
  disabled?: boolean;
  selectedAnswers?: number[];
  showResult?: boolean;
  showHotkeys?: boolean;
}

export function PatternOptions({
  options,
  correctIndex,
  onSelect,
  disabled = false,
  selectedAnswers = [],
  showResult = false,
  showHotkeys = true
}: PatternOptionsProps) {
  const correctIndices = getCorrectIndices(correctIndex);

  const getSelectedCount = (index: number) =>
    selectedAnswers.filter((selectedIndex) => selectedIndex === index).length;

  const getCorrectCount = (index: number) =>
    correctIndices.filter((correctOptionIndex) => correctOptionIndex === index).length;

  return (
    <div className="pattern-options" data-testid="pattern-options">
      {options.map((option, index) => {
        const selectedCount = getSelectedCount(index);
        const correctCount = getCorrectCount(index);
        let stateClass = "";

        if (showResult) {
          if (correctCount > 0) {
            stateClass = "correct";
          } else if (selectedCount > 0) {
            stateClass = "wrong";
          }
        } else if (selectedCount > 0) {
          stateClass = "selected";
        }

        const hotkeyLabel = index < 9 ? String(index + 1) : "";
        const animationDelay = index * 0.05;

        return (
          <div
            key={index}
            className={`pattern-option-wrapper ${stateClass}`.trim()}
            data-testid={`pattern-option-wrapper-${index}`}
            style={{ animationDelay: `${animationDelay}s` }}
          >
            {renderPatternValue(
              option,
              56,
              `pattern-option-${index}`,
              "",
              () => {
                if (!disabled) {
                  onSelect(index);
                }
              },
              disabled || showResult
            )}
            {selectedCount > 0 && (
              <span className="pattern-option-count" data-testid={`pattern-option-count-${index}`}>
                x{selectedCount}
              </span>
            )}
            {showHotkeys && hotkeyLabel && !showResult && (
              <span className="pattern-option-hotkey" data-testid={`pattern-option-hotkey-${index}`}>
                {hotkeyLabel}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
