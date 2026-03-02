import React from 'react';
import type { PatternElement, PatternType } from '../../../shared/types/pattern';
import { COLOR_TO_CSS, SIZE_TO_CSS } from '../../../shared/types/pattern';

interface PatternElementProps {
  element: PatternElement;
  size?: number;
  onClick?: () => void;
  disabled?: boolean;
  testId?: string;
}

// SVG иконки для форм
const ShapeIcons: Record<string, React.FC<{ color: string; size: number }>> = {
  circle: ({ color, size }) => (
    <circle cx={size / 2} cy={size / 2} r={size / 2 - 2} fill={color} />
  ),
  square: ({ color, size }) => (
    <rect x={2} y={2} width={size - 4} height={size - 4} rx={4} fill={color} />
  ),
  triangle: ({ color, size }) => (
    <polygon 
      points={`${size / 2},2 ${size - 2},${size - 2} 2,${size - 2}`} 
      fill={color} 
    />
  ),
  diamond: ({ color, size }) => (
    <polygon 
      points={`${size / 2},2 ${size - 2},${size / 2} ${size / 2},${size - 2} 2,${size / 2}`} 
      fill={color} 
    />
  ),
  star: ({ color, size }) => {
    const cx = size / 2;
    const cy = size / 2;
    const outerR = size / 2 - 2;
    const innerR = outerR * 0.4;
    
    const points: string[] = [];
    for (let i = 0; i < 10; i++) {
      const angle = (i * 36 - 90) * (Math.PI / 180);
      const r = i % 2 === 0 ? outerR : innerR;
      points.push(`${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`);
    }
    
    return <polygon points={points.join(' ')} fill={color} />;
  }
};

export function PatternElementDisplay({ 
  element, 
  size = 56, 
  onClick, 
  disabled = false,
  testId 
}: PatternElementProps) {
  const color = COLOR_TO_CSS[element.color];
  const cssSize = SIZE_TO_CSS[element.size] || size;
  const actualSize = size || cssSize;
  
  const ShapeIcon = ShapeIcons[element.shape] || ShapeIcons.circle;
  
  return (
    <button
      type="button"
      className="pattern-element-btn"
      onClick={onClick}
      disabled={disabled}
      style={{ 
        width: actualSize, 
        height: actualSize,
        cursor: disabled ? 'default' : 'pointer'
      }}
      data-testid={testId}
      aria-label={`Элемент: ${element.color}, ${element.shape}, ${element.size}`}
    >
      <svg 
        width={actualSize} 
        height={actualSize} 
        viewBox={`0 0 ${actualSize} ${actualSize}`}
      >
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
}

export function PatternNumber({
  value,
  size = 64,
  onClick,
  disabled = false,
  testId
}: PatternNumberProps) {
  return (
    <button
      type="button"
      className="pattern-number-btn"
      onClick={onClick}
      disabled={disabled}
      style={{ 
        width: size, 
        height: size,
        fontSize: Math.floor(size * 0.5),
        cursor: disabled ? 'default' : 'pointer'
      }}
      data-testid={testId}
      aria-label={`Число ${value}`}
    >
      {value}
    </button>
  );
}

interface PatternSequenceProps {
  sequence: PatternElement[] | number[];
  elementSize?: number;
  patternType?: PatternType;
  showHint?: boolean;
}

export function PatternSequence({ 
  sequence, 
  elementSize = 64,
  patternType,
  showHint = false
}: PatternSequenceProps) {
  const isNumeric = typeof sequence[0] === 'number';
  
  return (
    <div className="pattern-sequence" data-testid="pattern-sequence">
      {showHint && patternType && (
        <div className="pattern-type-hint" data-testid="pattern-type-hint">
          {getPatternTypeIcon(patternType)} {getPatternTypeLabel(patternType)}
        </div>
      )}
      <div className="pattern-sequence-items">
        {sequence.map((item, index) => (
          isNumeric ? (
            <PatternNumber
              key={index}
              value={item as number}
              size={elementSize}
              disabled
              testId={`pattern-element-${index}`}
            />
          ) : (
            <PatternElementDisplay
              key={index}
              element={item as PatternElement}
              size={elementSize}
              disabled
              testId={`pattern-element-${index}`}
            />
          )
        ))}
        <div className="pattern-question-mark" data-testid="pattern-question">
          <span>?</span>
        </div>
      </div>
    </div>
  );
}

function getPatternTypeIcon(type: PatternType): string {
  const icons: Record<PatternType, string> = {
    ABAB: '🔀',
    AABB: '👯',
    PROGRESSION: '📈',
    CYCLE: '🔄',
    MIRROR: '🪞',
    MATH_SEQUENCE: '🔢',
    MATH_ARITHMETIC: '➕',
    MATH_ALTERNATING: '⚡'
  };
  return icons[type] || '❓';
}

function getPatternTypeLabel(type: PatternType): string {
  const labels: Record<PatternType, string> = {
    ABAB: 'Чередование',
    AABB: 'Пары',
    PROGRESSION: 'Прогрессия',
    CYCLE: 'Цикл',
    MIRROR: 'Зеркало',
    MATH_SEQUENCE: 'Последовательность',
    MATH_ARITHMETIC: 'Арифметика',
    MATH_ALTERNATING: 'Чередование'
  };
  return labels[type] || '';
}

interface PatternOptionsProps {
  options: PatternElement[] | number[];
  correctIndex: number | number[];
  onSelect: (index: number) => void;
  disabled?: boolean;
  selectedAnswer?: number | null;
  showResult?: boolean;
}

export function PatternOptions({ 
  options, 
  correctIndex, 
  onSelect, 
  disabled = false,
  selectedAnswer,
  showResult = false
}: PatternOptionsProps) {
  const isNumeric = typeof options[0] === 'number';
  const correctIndices = Array.isArray(correctIndex) ? correctIndex : [correctIndex];
  const isSelected = (index: number) => selectedAnswer === index;
  const isCorrect = (index: number) => correctIndices.includes(index);
  
  return (
    <div className="pattern-options" data-testid="pattern-options">
      {options.map((option, index) => {
        let stateClass = '';
        
        if (showResult && selectedAnswer !== null) {
          if (isCorrect(index)) {
            stateClass = 'correct';
          } else if (isSelected(index) && !isCorrect(index)) {
            stateClass = 'wrong';
          }
        } else if (isSelected(index)) {
          stateClass = 'selected';
        }
        
        return (
          <div key={index} className={`pattern-option-wrapper ${stateClass}`}>
            {isNumeric ? (
              <PatternNumber
                value={option as number}
                size={72}
                onClick={() => !disabled && onSelect(index)}
                disabled={disabled || (showResult && selectedAnswer !== null)}
                testId={`pattern-option-${index}`}
              />
            ) : (
              <PatternElementDisplay
                element={option as PatternElement}
                size={72}
                onClick={() => !disabled && onSelect(index)}
                disabled={disabled || (showResult && selectedAnswer !== null)}
                testId={`pattern-option-${index}`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
