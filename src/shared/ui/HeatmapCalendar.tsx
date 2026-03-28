import { useMemo, type CSSProperties } from "react";
import type { DailyTrainingHeatmapCell } from "../../shared/types/domain";

interface HeatmapCalendarProps {
  cells: DailyTrainingHeatmapCell[];
  dayLabels?: string[];
  onCellClick?: (cell: DailyTrainingHeatmapCell) => void;
}

interface HeatmapWeek {
  label: string;
  marker: string;
  cells: DailyTrainingHeatmapCell[];
}

const RU_MONTHS = [
  "Янв",
  "Фев",
  "Мар",
  "Апр",
  "Май",
  "Июн",
  "Июл",
  "Авг",
  "Сен",
  "Окт",
  "Ноя",
  "Дек"
];

const RU_DAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

const INTENSITY_CLASSES = [
  "heatmap-cell-empty",
  "heatmap-cell-low",
  "heatmap-cell-medium",
  "heatmap-cell-high",
  "heatmap-cell-max"
] as const;

const TOOLTIPS = [
  "Нет тренировок",
  "1 сессия",
  "2 сессии",
  "3-4 сессии",
  "5+ сессий"
];

function parseLocalDate(localDate: string): Date {
  const [year, month, day] = localDate.split("-").map((part) => Number.parseInt(part, 10));
  return new Date(year, (month || 1) - 1, day || 1);
}

function getEmptyCell(): DailyTrainingHeatmapCell {
  return {
    localDate: "",
    completed: false,
    sessionsCount: 0,
    intensity: 0
  };
}

function buildWeeks(cells: DailyTrainingHeatmapCell[]): HeatmapWeek[] {
  if (cells.length === 0) {
    return [];
  }

  const sortedCells = [...cells].sort((left, right) => left.localDate.localeCompare(right.localDate));
  const firstDate = parseLocalDate(sortedCells[0].localDate);
  const firstDay = firstDate.getDay();
  const startPadding = firstDay === 0 ? 6 : firstDay - 1;

  const paddedCells = [...Array.from({ length: startPadding }, getEmptyCell), ...sortedCells];
  const weeks: DailyTrainingHeatmapCell[][] = [];

  for (let index = 0; index < paddedCells.length; index += 7) {
    const week = paddedCells.slice(index, index + 7);
    while (week.length < 7) {
      week.push(getEmptyCell());
    }
    weeks.push(week);
  }

  let lastMonth = -1;
  const totalWeeks = weeks.length;
  return weeks.map((week, index) => {
    const firstRealCell = week.find((cell) => cell.localDate);
    if (!firstRealCell) {
      return { label: "", marker: "", cells: week };
    }

    const firstRealDate = parseLocalDate(firstRealCell.localDate);
    const month = firstRealDate.getMonth();
    const label = month !== lastMonth ? RU_MONTHS[month] : "";
    const showMarker = index === 0 || Boolean(label) || index === totalWeeks - 1;
    const marker = showMarker
      ? firstRealDate.toLocaleDateString("ru-RU", { day: "numeric", month: "short" })
      : "";
    lastMonth = month;
    return { label, marker, cells: week };
  });
}

function buildTooltip(cell: DailyTrainingHeatmapCell): string {
  if (!cell.localDate) {
    return "";
  }

  const dateLabel = parseLocalDate(cell.localDate).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
  const completedLabel = cell.completed ? " • цель дня закрыта" : "";
  return `${dateLabel}: ${cell.sessionsCount} сессий${completedLabel}`;
}

export function HeatmapCalendar({
  cells,
  dayLabels = RU_DAYS,
  onCellClick
}: HeatmapCalendarProps) {
  const weeks = useMemo(() => buildWeeks(cells), [cells]);
  const boardStyle = useMemo(
    () => ({ "--heatmap-weeks": weeks.length } as CSSProperties),
    [weeks.length]
  );

  if (cells.length === 0) {
    return (
      <div className="heatmap-calendar heatmap-empty" data-testid="heatmap-calendar">
        <p className="heatmap-empty-message">
          Пока нет данных о тренировках. Начните заниматься, чтобы увидеть ритм.
        </p>
      </div>
    );
  }

  return (
    <div className="heatmap-calendar" data-testid="heatmap-calendar">
      <div className="heatmap-scroll">
        <div className="heatmap-board" style={boardStyle}>
          <div className="heatmap-corner" aria-hidden="true" />

          <div className="heatmap-month-track" aria-hidden="true">
            {weeks.map((week, index) => (
              <div
                key={`${week.label || "month"}:${index}`}
                className={`heatmap-month-label ${week.label ? "" : "heatmap-month-label-hidden"}`}
              >
                {week.label}
              </div>
            ))}
          </div>

          <div className="heatmap-days" aria-hidden="true">
            {dayLabels.map((day) => (
              <div key={day} className="heatmap-day-label">
                {day}
              </div>
            ))}
          </div>

          <div className="heatmap-grid">
            {weeks.map((week, weekIndex) => (
              <div key={`week:${weekIndex}`} className="heatmap-week">
                {week.cells.map((cell, cellIndex) => {
                  const intensityClass = INTENSITY_CLASSES[cell.intensity];
                  const tooltip = buildTooltip(cell);
                  const interactive = Boolean(onCellClick && cell.localDate);

                  return (
                    <div
                      key={`${cell.localDate || "empty"}:${cellIndex}`}
                      aria-label={tooltip || undefined}
                      className={[
                        "heatmap-cell",
                        intensityClass,
                        interactive ? "heatmap-cell-clickable" : "",
                        cell.completed ? "heatmap-cell-complete" : "",
                        cell.localDate ? "" : "heatmap-cell-padding"
                      ].filter(Boolean).join(" ")}
                      onClick={() => {
                        if (interactive) {
                          onCellClick?.(cell);
                        }
                      }}
                      onKeyDown={(event) => {
                        if (interactive && (event.key === "Enter" || event.key === " ")) {
                          event.preventDefault();
                          onCellClick?.(cell);
                        }
                      }}
                      role={interactive ? "button" : undefined}
                      tabIndex={interactive ? 0 : -1}
                      title={tooltip}
                    />
                  );
                })}
              </div>
            ))}
          </div>

          <div className="heatmap-corner heatmap-corner-bottom" aria-hidden="true">
            Даты
          </div>

          <div className="heatmap-date-track" aria-hidden="true">
            {weeks.map((week, index) => (
              <div
                key={`marker:${week.marker || "week"}:${index}`}
                className={`heatmap-date-marker ${week.marker ? "" : "heatmap-date-marker-hidden"}`}
              >
                {week.marker}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="heatmap-guide" aria-hidden="true">
        <span>Столбец = неделя</span>
        <span>Строка = день недели</span>
        <span>Контуром отмечены закрытые дни</span>
      </div>

      <div className="heatmap-legend" aria-hidden="true">
        <span className="heatmap-legend-label">Меньше</span>
        {INTENSITY_CLASSES.map((className, index) => (
          <div
            key={className}
            className={`heatmap-legend-cell ${className}`}
            title={TOOLTIPS[index]}
          />
        ))}
        <span className="heatmap-legend-label">Больше</span>
      </div>
    </div>
  );
}
