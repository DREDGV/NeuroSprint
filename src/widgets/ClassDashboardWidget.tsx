import { useMemo } from "react";
import type { ClassGroup, User, Session } from "../shared/types/domain";
import type { ClassStats } from "../shared/types/classes";
import { ClassActivityHeatmap } from "./ClassActivityHeatmap";
import { ClassTopStudents } from "./ClassTopStudents";
import { ClassSkillRadar } from "./ClassSkillRadar";

interface ClassDashboardWidgetProps {
  classGroup: ClassGroup;
  students: User[];
  stats?: ClassStats;
  sessions?: Session[];
}

export function ClassDashboardWidget({ classGroup, students, stats, sessions }: ClassDashboardWidgetProps) {
  // Вычисляем статистику на лету (потом будет кэшироваться)
  const computedStats = useMemo(() => {
    const totalMembers = students.length;
    const activeMembers = students.filter((s) => s.lastActivity && Date.now() - new Date(s.lastActivity).getTime() < 7 * 24 * 60 * 60 * 1000).length;
    const avgLevel = students.length > 0 ? Math.round(students.reduce((sum, s) => sum + ((s as any).userLevel?.level || 1), 0) / students.length) : 1;
    const totalXP = students.reduce((sum, s) => sum + ((s as any).userLevel?.totalXP || 0), 0);

    return {
      totalMembers,
      activeMembers,
      avgLevel,
      totalXP,
      activityRate: totalMembers > 0 ? Math.round((activeMembers / totalMembers) * 100) : 0
    };
  }, [students]);

  return (
    <div className="class-dashboard-widget" data-testid="class-dashboard">
      <div className="class-dashboard-header">
        <h3>{classGroup.name}</h3>
        <p className="class-dashboard-subtitle">
          👥 {computedStats.totalMembers} учеников | 📈 {computedStats.activityRate}% активны
        </p>
      </div>

      <div className="class-dashboard-stats">
        <div className="class-stat-card">
          <span className="class-stat-icon">⭐</span>
          <div>
            <strong>Уровень {computedStats.avgLevel}</strong>
            <span>средний по классу</span>
          </div>
        </div>

        <div className="class-stat-card">
          <span className="class-stat-icon">🏆</span>
          <div>
            <strong>{computedStats.totalXP} XP</strong>
            <span>всего заработано</span>
          </div>
        </div>

        <div className="class-stat-card">
          <span className="class-stat-icon">🔥</span>
          <div>
            <strong>{computedStats.activeMembers}/{computedStats.totalMembers}</strong>
            <span>активных за неделю</span>
          </div>
        </div>
      </div>

      {/* Тепловая карта активности */}
      {stats && stats.sessions && stats.sessions.length > 0 && (
        <ClassActivityHeatmap sessions={stats.sessions} />
      )}

      {/* Топ учеников */}
      {students.length > 0 && (
        <ClassTopStudents students={students} />
      )}

      {/* Радар навыков */}
      {students.length > 0 && sessions && sessions.length > 0 && (
        <ClassSkillRadar students={students} sessions={sessions} />
      )}
    </div>
  );
}
