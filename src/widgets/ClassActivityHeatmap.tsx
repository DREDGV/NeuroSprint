import { useMemo } from "react";
import type { Session } from "../shared/types/domain";

interface ClassActivityHeatmapProps {
  sessions: Session[];
  className?: string;
}

interface DayData {
  date: string;
  dateShort: string;
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
}

/**
 * Тепловая карта активности класса (как на GitHub)
 * Показывает количество сессий за последние 90 дней
 */
export function ClassActivityHeatmap({ sessions, className = "" }: ClassActivityHeatmapProps) {
  // Генерируем данные за последние 90 дней
  const heatmapData = useMemo(() => {
    const days: DayData[] = [];
    const today = new Date();
    const ninetyDaysAgo = new Date(today);
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 89);

    // Группируем сессии по дням
    const sessionsByDay = new Map<string, number>();
    for (const session of sessions) {
      const date = session.localDate; // YYYY-MM-DD
      sessionsByDay.set(date, (sessionsByDay.get(date) || 0) + 1);
    }

    // Создаём массив дней
    for (let i = 0; i < 90; i++) {
      const date = new Date(ninetyDaysAgo);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split("T")[0];
      const count = sessionsByDay.get(dateStr) || 0;

      // Определяем уровень активности (0-4)
      let level: 0 | 1 | 2 | 3 | 4 = 0;
      if (count >= 1) level = 1;
      if (count >= 3) level = 2;
      if (count >= 5) level = 3;
      if (count >= 8) level = 4;

      days.push({
        date: dateStr,
        dateShort: date.toLocaleDateString("ru-RU", { day: "numeric", month: "short" }),
        count,
        level
      });
    }

    return days;
  }, [sessions]);

  // Группируем по неделям (для отображения по столбцам)
  const weeks = useMemo(() => {
    const result: DayData[][] = [];
    let currentWeek: DayData[] = [];

    // Начинаем с понедельника
    const startDate = new Date(heatmapData[0]?.date || Date.now());
    const startDayOfWeek = startDate.getDay() || 7; // 1-7 (пн-вс)

    // Добавляем пустые ячейки до первого понедельника
    for (let i = 1; i < startDayOfWeek; i++) {
      currentWeek.push(null as any);
    }

    for (const day of heatmapData) {
      currentWeek.push(day);
      if (currentWeek.length === 7) {
        result.push(currentWeek);
        currentWeek = [];
      }
    }

    // Добавляем последнюю неделю
    if (currentWeek.length > 0) {
      result.push(currentWeek);
    }

    return result;
  }, [heatmapData]);

  // Считаем totals
  const totalSessions = useMemo(() => 
    heatmapData.reduce((sum, day) => sum + day.count, 0),
    [heatmapData]
  );

  const activeDays = useMemo(() => 
    heatmapData.filter(day => day.count > 0).length,
    [heatmapData]
  );

  const maxStreak = useMemo(() => {
    let max = 0;
    let current = 0;
    for (const day of heatmapData) {
      if (day.count > 0) {
        current++;
        max = Math.max(max, current);
      } else {
        current = 0;
      }
    }
    return max;
  }, [heatmapData]);

  return (
    <div className={`class-activity-heatmap ${className}`} data-testid="class-heatmap">
      <div className="heatmap-header">
        <h4>📅 Активность за 90 дней</h4>
        <div className="heatmap-stats">
          <span className="heatmap-stat">
            <strong>{totalSessions}</strong> сессий
          </span>
          <span className="heatmap-stat">
            <strong>{activeDays}</strong> активных дней
          </span>
          <span className="heatmap-stat">
            <strong>🔥 {maxStreak}</strong> дней подряд
          </span>
        </div>
      </div>

      <div className="heatmap-container">
        {/* Дни недели */}
        <div className="heatmap-weekdays">
          <div className="weekday-cell" title="Понедельник">Пн</div>
          <div className="weekday-cell" title="Вторник">Вт</div>
          <div className="weekday-cell" title="Среда">Ср</div>
          <div className="weekday-cell" title="Четверг">Чт</div>
          <div className="weekday-cell" title="Пятница">Пт</div>
          <div className="weekday-cell" title="Суббота">Сб</div>
          <div className="weekday-cell" title="Воскресенье">Вс</div>
        </div>

        {/* Ячейки */}
        <div className="heatmap-grid">
          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="heatmap-week">
              {week.map((day, dayIndex) => {
                if (!day) {
                  return <div key={dayIndex} className="heatmap-cell heatmap-cell-empty" />;
                }
                return (
                  <div
                    key={day.date}
                    className={`heatmap-cell heatmap-level-${day.level}`}
                    title={`${day.dateShort}: ${day.count} сессий`}
                    data-date={day.date}
                    data-count={day.count}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Легенда */}
      <div className="heatmap-legend">
        <span>Меньше</span>
        <div className="legend-cells">
          <div className="legend-cell heatmap-level-0" />
          <div className="legend-cell heatmap-level-1" />
          <div className="legend-cell heatmap-level-2" />
          <div className="legend-cell heatmap-level-3" />
          <div className="legend-cell heatmap-level-4" />
        </div>
        <span>Больше</span>
      </div>
    </div>
  );
}
