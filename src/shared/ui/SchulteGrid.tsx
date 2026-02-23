interface SchulteGridProps {
  values: number[];
  onCellClick: (value: number, index: number) => void;
  disabled?: boolean;
  highlightValue?: number | null;
}

export function SchulteGrid({
  values,
  onCellClick,
  disabled = false,
  highlightValue = null
}: SchulteGridProps) {
  return (
    <div className="schulte-grid" role="grid" aria-label="Таблица Шульте">
      {values.map((value, index) => (
        <button
          key={`${index}-${value}`}
          type="button"
          className={
            highlightValue !== null && value === highlightValue
              ? "grid-cell highlighted"
              : "grid-cell"
          }
          disabled={disabled}
          onClick={() => onCellClick(value, index)}
          data-testid={`cell-${index}`}
        >
          {value}
        </button>
      ))}
    </div>
  );
}
