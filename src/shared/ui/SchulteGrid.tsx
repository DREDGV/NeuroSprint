interface SchulteGridProps {
  values: number[];
  onCellClick: (value: number, index: number) => void;
  disabled?: boolean;
}

export function SchulteGrid({
  values,
  onCellClick,
  disabled = false
}: SchulteGridProps) {
  return (
    <div className="schulte-grid" role="grid" aria-label="Таблица Шульте">
      {values.map((value, index) => (
        <button
          key={`${index}-${value}`}
          type="button"
          className="grid-cell"
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

