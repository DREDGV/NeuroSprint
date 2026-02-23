import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { useActiveUser } from "../app/ActiveUserContext";
import { sessionRepository } from "../entities/session/sessionRepository";
import { userRepository } from "../entities/user/userRepository";
import { formatSecondsFromMs } from "../shared/lib/date/date";
import { getSettings } from "../shared/lib/settings/settings";
import { StatCard } from "../shared/ui/StatCard";
import type { DailyProgressSummary, User } from "../shared/types/domain";

export function HomePage() {
  const { activeUserId } = useActiveUser();
  const settings = getSettings();
  const dailyGoalSessions = settings.dailyGoalSessions;
  const [users, setUsers] = useState<User[]>([]);
  const [dailySummary, setDailySummary] = useState<DailyProgressSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    void userRepository.list().then((items) => {
      if (isMounted) {
        setUsers(items);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!activeUserId) {
      setDailySummary(null);
      return;
    }

    let cancelled = false;
    setSummaryLoading(true);

    void sessionRepository
      .getDailyProgressSummary(activeUserId)
      .then((summary) => {
        if (!cancelled) {
          setDailySummary(summary);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setSummaryLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [activeUserId]);

  const activeUserName = useMemo(() => {
    if (!activeUserId) {
      return "Не выбран";
    }
    return users.find((item) => item.id === activeUserId)?.name ?? "Не найден";
  }, [activeUserId, users]);

  const progressValue = dailySummary?.sessionsTotal ?? 0;
  const progressPercent = Math.min(
    100,
    Math.round((progressValue / dailyGoalSessions) * 100)
  );

  return (
    <section className="panel" data-testid="home-page">
      <h2>Главный экран</h2>
      <p>
        NeuroSprint помогает развивать скорость обработки информации, внимание и
        точность.
      </p>
      <p>
        Активный пользователь: <strong>{activeUserName}</strong>
      </p>

      <section className="today-progress" data-testid="home-today-progress">
        <h3>Прогресс за сегодня</h3>
        <div className="progress-track" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progressPercent}>
          <div
            className="progress-fill"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <p className="status-line">
          {summaryLoading
            ? "Считаем статистику..."
            : `Сессии: ${progressValue} / ${dailyGoalSessions}`}
        </p>

        <div className="stats-grid compact">
          <StatCard
            title="Лучший Classic"
            value={
              dailySummary?.bestClassicDurationMs != null
                ? formatSecondsFromMs(dailySummary.bestClassicDurationMs)
                : "—"
            }
          />
          <StatCard
            title="Лучший Timed"
            value={
              dailySummary?.bestTimedScore != null
                ? dailySummary.bestTimedScore.toFixed(1)
                : "—"
            }
          />
          <StatCard
            title="Средняя точность"
            value={
              dailySummary?.avgAccuracy != null
                ? `${(dailySummary.avgAccuracy * 100).toFixed(1)}%`
                : "—"
            }
          />
          <StatCard
            title="Сессий сегодня"
            value={String(dailySummary?.sessionsTotal ?? 0)}
          />
        </div>
      </section>

      <div className="action-row">
        <Link className="btn-primary" to="/training/schulte/classic_plus">
          Начать Classic
        </Link>
        <Link className="btn-secondary" to="/training/schulte/timed_plus">
          Начать Timed
        </Link>
        <Link className="btn-ghost" to="/training/schulte/reverse">
          Начать Reverse
        </Link>
      </div>
    </section>
  );
}
