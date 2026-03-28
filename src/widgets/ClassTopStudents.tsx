import { useMemo } from "react";
import type { User } from "../shared/types/domain";

interface ClassTopStudentsProps {
  students: User[];
  limit?: number;
}

/**
 * Топ-3 учеников класса по XP
 */
export function ClassTopStudents({ students, limit = 3 }: ClassTopStudentsProps) {
  // Сортируем по XP и берём топ-N
  const topStudents = useMemo(() => {
    return [...students]
      .sort((a, b) => {
        const xpA = (a as any).userLevel?.totalXP || 0;
        const xpB = (b as any).userLevel?.totalXP || 0;
        return xpB - xpA;
      })
      .slice(0, limit);
  }, [students, limit]);

  const medals = ["🥇", "🥈", "🥉"];

  return (
    <div className="class-top-students" data-testid="class-top-students">
      <h4>🏆 Топ учеников</h4>
      <div className="top-students-list">
        {topStudents.map((student, index) => {
          const xp = (student as any).userLevel?.totalXP || 0;
          const level = (student as any).userLevel?.level || 1;
          const avatar = student.name.charAt(0).toUpperCase();

          return (
            <div key={student.id} className={`top-student-item top-student-${index + 1}`}>
              <div className="top-student-rank">
                <span className="medal">{medals[index] || `#${index + 1}`}</span>
              </div>
              <div className="top-student-avatar">
                {avatar}
              </div>
              <div className="top-student-info">
                <div className="top-student-name">{student.name}</div>
                <div className="top-student-stats">
                  <span className="stat-level">⭐ Ур. {level}</span>
                  <span className="stat-xp">🏆 {xp} XP</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {students.length > limit && (
        <p className="top-students-more">
          + ещё {students.length - limit} учеников
        </p>
      )}
    </div>
  );
}
