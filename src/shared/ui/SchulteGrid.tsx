import type { CSSProperties } from "react";
import type { SchulteThemeConfig } from "../types/domain";

interface SchulteGridProps {
  values: number[];
  onCellClick: (value: number, index: number) => void;
  disabled?: boolean;
  highlightValue?: number | null;
  theme?: SchulteThemeConfig;
  themeId?: string;
  gridSize?: number;
  flash?: { index: number; type: "correct" | "error" } | null;
}

export function SchulteGrid({
  values,
  onCellClick,
  disabled = false,
  highlightValue = null,
  theme,
  themeId,
  gridSize,
  flash = null
}: SchulteGridProps) {
  const resolvedGridSize =
    gridSize && Number.isFinite(gridSize)
      ? gridSize
      : Math.max(1, Math.round(Math.sqrt(values.length)));

  const style = {
    "--grid-size": String(resolvedGridSize),
    "--schulte-board-bg": theme?.boardBg,
    "--schulte-cell-bg": theme?.cellBg,
    "--schulte-number-color": theme?.numberColor,
    "--schulte-highlight-color": theme?.highlightColor,
    "--schulte-success-color": theme?.successColor,
    "--schulte-error-color": theme?.errorColor
  } as CSSProperties;

  return (
    <div
      className="schulte-grid"
      role="grid"
      aria-label="Таблица Шульте"
      style={style}
      data-testid="schulte-grid"
      data-theme-id={themeId}
    >
      {values.map((value, index) => {
        const isEmpty = value <= 0;
        const classNames = ["grid-cell"];
        if (!isEmpty && highlightValue !== null && value === highlightValue) {
          classNames.push("highlighted");
        }
        if (isEmpty) {
          classNames.push("is-empty");
        }
        if (flash && flash.index === index) {
          classNames.push(flash.type === "correct" ? "flash-correct" : "flash-error");
        }

        return (
          <button
            key={`${index}-${value}`}
            type="button"
            className={classNames.join(" ")}
            disabled={disabled || isEmpty}
            onClick={() => {
              if (!isEmpty) {
                onCellClick(value, index);
              }
            }}
            data-testid={`cell-${index}`}
          >
            {isEmpty ? "" : value}
          </button>
        );
      })}
    </div>
  );
}
