import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useActiveUser } from "../app/ActiveUserContext";
import { useAuth } from "../app/useAuth";
import { useAppRole } from "../app/useAppRole";
import { useRoleAccess } from "../app/useRoleAccess";
import { groupRepository, type ClassGroupOwnerContext } from "../entities/group/groupRepository";
import { normalizeUserRole } from "../entities/user/userRole";
import { userRepository } from "../entities/user/userRepository";
import { canUseTeacherArea } from "../shared/lib/auth/siteAccess";
import { appRoleLabel } from "../shared/lib/settings/appRole";
import { ClassDashboardWidget } from "../widgets/ClassDashboardWidget";
import { LeaderboardWidget } from "../widgets/LeaderboardWidget";
import { useChallenges } from "../features/competitions/hooks/useChallenges";
import { ChallengeModal } from "../features/competitions/components/ChallengeModal";
import type { ClassGroup, User } from "../shared/types/domain";
import type { UserChallenge } from "../shared/types/classes";

const AVATAR_EMOJIS = ["👤", "👦", "👧", "👨", "👩", "🧑", "🎓", "👨‍🎓", "👩‍🎓"];

function getAvatarForUser(user: User): string {
  const hash = user.name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return AVATAR_EMOJIS[hash % AVATAR_EMOJIS.length];
}

export function ClassesPage() {
  const { activeUserId } = useActiveUser();
  const auth = useAuth();
  const appRole = useAppRole();
  const access = useRoleAccess();
  const canManageClassesAccess = access.classes.manage || canUseTeacherArea(appRole, auth.siteRole);
  const navigate = useNavigate();
  const { classId } = useParams<{ classId?: string }>();

  const [groups, setGroups] = useState<ClassGroup[]>([]);
  const [students, setStudents] = useState<User[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [newClassName, setNewClassName] = useState("");
  const [studentName, setStudentName] = useState("");
  const [bulkNames, setBulkNames] = useState("");
  const [existingUserId, setExistingUserId] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [groupStudentCounts, setGroupStudentCounts] = useState<Record<string, number>>({});
  
  // Массовые операции
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());

  // Вызовы и соревнования
  const [showChallengeModal, setShowChallengeModal] = useState(false);
  const ownerContext = useMemo<ClassGroupOwnerContext | null>(
    () =>
      activeUserId
        ? {
            profileId: activeUserId,
            accountId: auth.account?.id ?? undefined
          }
        : null,
    [activeUserId, auth.account?.id]
  );

  // Хук для вызовов
  const { challenges, incoming, sendChallenge, respondToChallenge } = useChallenges(activeUserId);

  async function refreshBase(targetClassId?: string): Promise<void> {
    if (!ownerContext) {
      setGroups([]);
      setStudents([]);
      setAllUsers([]);
      setGroupStudentCounts({});
      setSelectedClassId("");
      return;
    }

    const [loadedGroups, loadedUsers] = await Promise.all([
      groupRepository.listOwnedGroups(ownerContext),
      userRepository.list()
    ]);
    setGroups(loadedGroups);
    setAllUsers(loadedUsers);

    const resolvedClassId =
      targetClassId && loadedGroups.some((group) => group.id === targetClassId)
        ? targetClassId
        : loadedGroups[0]?.id ?? "";
    setSelectedClassId(resolvedClassId);

    if (!resolvedClassId) {
      setStudents([]);
      setGroupStudentCounts({});
      return;
    }

    const loadedStudents = await groupRepository.listStudents(resolvedClassId);
    setStudents(loadedStudents);

    const countEntries = await Promise.all(
      loadedGroups.map(async (group) => {
        if (group.id === resolvedClassId) {
          return [group.id, loadedStudents.length] as const;
        }
        const members = await groupRepository.listStudents(group.id);
        return [group.id, members.length] as const;
      })
    );
    setGroupStudentCounts(Object.fromEntries(countEntries));
  }

  useEffect(() => {
    if (!canManageClassesAccess || !ownerContext) {
      setGroups([]);
      setStudents([]);
      setAllUsers([]);
      setGroupStudentCounts({});
      setSelectedClassId("");
      return;
    }
    void refreshBase(classId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canManageClassesAccess, classId, ownerContext]);

  const selectedClass = useMemo(
    () => groups.find((group) => group.id === selectedClassId) ?? null,
    [groups, selectedClassId]
  );

  const usersAvailableToAssign = useMemo(() => {
    const memberSet = new Set(students.map((student) => student.id));
    return allUsers.filter(
      (user) => normalizeUserRole(user.role) === "student" && !memberSet.has(user.id)
    );
  }, [allUsers, students]);

  async function handleCreateClass(event: FormEvent): Promise<void> {
    event.preventDefault();
    if (!ownerContext) {
      setError("Сначала выберите активный профиль.");
      return;
    }
    if (newClassName.trim().length < 2) {
      setError("Название класса должно быть не короче 2 символов.");
      return;
    }

    const created = await groupRepository.createGroup(newClassName.trim(), ownerContext);
    setNewClassName("");
    setStatus(`Класс "${created.name}" создан.`);
    setError(null);
    navigate(`/classes/${created.id}`);
    await refreshBase(created.id);
  }

  async function handleRenameClass(): Promise<void> {
    if (!selectedClass) {
      return;
    }
    const nextName = window.prompt("Новое название класса", selectedClass.name);
    if (!nextName || nextName.trim().length < 2) {
      return;
    }
    await groupRepository.renameGroup(selectedClass.id, nextName.trim(), ownerContext ?? undefined);
    setStatus("Название класса обновлено.");
    await refreshBase(selectedClass.id);
  }

  async function handleDeleteClass(): Promise<void> {
    if (!selectedClass) {
      return;
    }
    const approved = window.confirm(
      `Удалить класс "${selectedClass.name}"?\nУченики не удаляются, удаляется только группа.`
    );
    if (!approved) {
      return;
    }
    await groupRepository.removeGroup(selectedClass.id, ownerContext ?? undefined);
    setStatus(`Класс "${selectedClass.name}" удален.`);
    setError(null);
    await refreshBase();
  }

  async function handleCreateStudent(event: FormEvent): Promise<void> {
    event.preventDefault();
    if (!selectedClassId) {
      return;
    }
    if (studentName.trim().length < 2) {
      setError("Имя ученика должно быть не короче 2 символов.");
      return;
    }

    await groupRepository.createStudent(selectedClassId, studentName.trim());
    setStudentName("");
    setStatus("Ученик добавлен в класс.");
    setError(null);
    await refreshBase(selectedClassId);
  }

  async function handleBulkCreate(): Promise<void> {
    if (!selectedClassId) {
      return;
    }
    const names = bulkNames
      .split(/\r?\n/)
      .map((entry) => entry.trim())
      .filter((entry) => entry.length >= 2);

    if (names.length === 0) {
      setError("Добавьте хотя бы одно имя (каждое с новой строки).");
      return;
    }

    for (const name of names) {
      await groupRepository.createStudent(selectedClassId, name);
    }

    setBulkNames("");
    setShowBulkModal(false);
    setStatus(`Добавлено учеников: ${names.length}.`);
    setError(null);
    await refreshBase(selectedClassId);
  }

  async function handleAssignExistingStudent(): Promise<void> {
    if (!selectedClassId || !existingUserId) {
      return;
    }

    const existingGroups = await groupRepository.listGroupsForUser(existingUserId);
    const previousGroup = existingGroups.find((group) => group.id !== selectedClassId) ?? null;
    if (previousGroup) {
      const approved = window.confirm(
        `Ученик уже в классе "${previousGroup.name}". Перенести в текущий класс?`
      );
      if (!approved) {
        return;
      }
    }

    await groupRepository.assignStudent(selectedClassId, existingUserId);
    setExistingUserId("");
    setShowAssignModal(false);
    setStatus("Ученик назначен в класс.");
    setError(null);
    await refreshBase(selectedClassId);
  }

  async function handleRemoveStudent(userId: string): Promise<void> {
    if (!selectedClassId) {
      return;
    }
    await groupRepository.removeMember(selectedClassId, userId);
    setStatus("Ученик убран из класса.");
    setSelectedStudentIds(prev => {
      const next = new Set(prev);
      next.delete(userId);
      return next;
    });
    await refreshBase(selectedClassId);
  }

  // Массовые операции
  function toggleStudentSelection(userId: string): void {
    setSelectedStudentIds(prev => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  }

  function selectAllStudents(): void {
    setSelectedStudentIds(new Set(students.map(s => s.id)));
  }

  function clearSelection(): void {
    setSelectedStudentIds(new Set());
  }

  async function handleBulkRemove(): Promise<void> {
    if (!selectedClassId || selectedStudentIds.size === 0) {
      return;
    }
    const approved = window.confirm(
      `Исключить ${selectedStudentIds.size} ученик(а/ов) из класса?`
    );
    if (!approved) {
      return;
    }
    for (const userId of selectedStudentIds) {
      await groupRepository.removeMember(selectedClassId, userId);
    }
    setStatus(`Исключено учеников: ${selectedStudentIds.size}.`);
    clearSelection();
    await refreshBase(selectedClassId);
  }

  // Статистика класса
  const classStats = useMemo(() => {
    if (!students.length) {
      return null;
    }
    
    // Реальная статистика на основе данных учеников
    return {
      totalStudents: students.length,
      avgNameLength: Math.round(students.reduce((acc, s) => acc + s.name.length, 0) / students.length),
      roles: students.reduce((acc, s) => {
        const role = normalizeUserRole(s.role);
        acc[role] = (acc[role] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    };
  }, [students]);

  const totalStudentsAcrossClasses = useMemo(
    () => groups.reduce((sum, group) => sum + (groupStudentCounts[group.id] ?? 0), 0),
    [groupStudentCounts, groups]
  );

  const selectedClassStudentCount = selectedClass ? groupStudentCounts[selectedClass.id] ?? students.length : 0;

  if (!canManageClassesAccess) {
    return (
      <section className="panel" data-testid="classes-page">
        <h2>📚 Классы</h2>
        <p className="status-line">Раздел доступен только для роли «Учитель».</p>
        <div className="action-row">
          <Link className="btn-secondary" to="/settings">
            Выбрать роль
          </Link>
          <Link className="btn-ghost" to="/training">
            К тренировкам
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="panel classes-page" data-testid="classes-page">
      <header className="classes-header">
        <p className="stats-section-kicker">Alpha workspace</p>
        <h2>📚 Классы</h2>
        <p className="classes-subtitle">Управление учебными группами, составом класса и быстрыми вызовами внутри группы.</p>
      </header>

      <section className="alpha-page-hero alpha-page-hero-classes">
        <div className="alpha-page-hero-copy">
          <p className="alpha-page-kicker">Скрыто от обычных пользователей</p>
          <h3>Раздел для учителя и внутреннего тестирования</h3>
          <p>
            Здесь уже можно создавать классы, собирать состав, назначать существующих учеников и тестировать быстрые
            вызовы внутри учебной группы. Для production этот контур пока остаётся скрытым alpha-разделом.
          </p>
        </div>
        <div className="alpha-summary-grid" aria-hidden="true">
          <article className="alpha-summary-card">
            <span className="alpha-summary-label">Классов</span>
            <strong className="alpha-summary-value">{groups.length}</strong>
            <span className="alpha-summary-hint">Всего групп в текущем контуре</span>
          </article>
          <article className="alpha-summary-card">
            <span className="alpha-summary-label">Ученики</span>
            <strong className="alpha-summary-value">{totalStudentsAcrossClasses}</strong>
            <span className="alpha-summary-hint">Во всех доступных классах</span>
          </article>
          <article className="alpha-summary-card">
            <span className="alpha-summary-label">Текущий класс</span>
            <strong className="alpha-summary-value">{selectedClass ? selectedClass.name : "Не выбран"}</strong>
            <span className="alpha-summary-hint">
              {selectedClass ? `${selectedClassStudentCount} учеников в составе` : "Откройте класс, чтобы увидеть состав и дашборд"}
            </span>
          </article>
          <article className="alpha-summary-card">
            <span className="alpha-summary-label">Входящие вызовы</span>
            <strong className="alpha-summary-value">{incoming.length}</strong>
            <span className="alpha-summary-hint">Столько вызовов ждут ответа прямо сейчас</span>
          </article>
        </div>
      </section>

      <section className="alpha-guide-grid">
        <article className="alpha-guide-card">
          <span className="alpha-guide-step">Что уже можно</span>
          <strong>Создавать и наполнять классы</strong>
          <p>Рабочий минимум уже есть: новый класс, быстрый набор учеников, массовое добавление и назначение существующих профилей.</p>
        </article>
        <article className="alpha-guide-card">
          <span className="alpha-guide-step">Что важно проверить</span>
          <strong>Удобен ли сценарий учителя</strong>
          <p>Сейчас полезно проверять, насколько легко открыть класс, увидеть его состав, выполнить массовые действия и запустить вызов.</p>
        </article>
        <article className="alpha-guide-card">
          <span className="alpha-guide-step">Почему скрыто</span>
          <strong>Групповой контур ещё доводится</strong>
          <p>Пока мы не доведём до конца классы, соревнования и групповую статистику, обычный пользователь не должен видеть эти разделы.</p>
        </article>
      </section>

      <section className="alpha-workflow-strip" data-testid="classes-alpha-workflow">
        <article className="alpha-workflow-card is-primary">
          <span className="alpha-workflow-label">Следующий шаг</span>
          <strong>
            {selectedClass
              ? `После класса «${selectedClass.name}» можно переходить к online-сценарию`
              : "Сначала откройте класс, затем переходите к соревнованиям"}
          </strong>
          <p>
            {selectedClass
              ? `В выбранном классе сейчас ${selectedClassStudentCount} учеников. Когда состав готов, учителю проще проверить вызовы и затем перейти к live-событию.`
              : "Выбор класса делает сценарий линейным: открыть группу, проверить состав, затем перейти к alpha-разделу соревнований."}
          </p>
          <div className="alpha-workflow-actions">
            <Link className="btn-primary" to="/competitions">
              К соревнованиям
            </Link>
            <span className="alpha-workflow-hint">
              {selectedClass
                ? "Текущий класс уже под рукой"
                : "Сначала полезно выбрать группу ниже"}
            </span>
          </div>
        </article>

        <article className="alpha-workflow-card">
          <span className="alpha-workflow-label">Проверка alpha</span>
          <strong>Минимальный сценарий учителя</strong>
          <p>
            1. Открыть класс. 2. Проверить состав и дашборд. 3. Запустить быстрый вызов или
            перейти в online-соревнования без лишнего поиска по интерфейсу.
          </p>
        </article>
      </section>

      {status || error ? (
        <div className="classes-status-stack">
          {status ? <p className="status-line success">{status}</p> : null}
          {error ? <p className="status-line error">{error}</p> : null}
        </div>
      ) : null}

      {/* Создание класса */}
      <section className="classes-section">
        <h3>➕ Новый класс</h3>
        <p className="classes-section-subtitle">Создайте новую учебную группу, чтобы ниже сразу открыть состав, дашборд и массовые действия.</p>
        <form className="classes-form" onSubmit={handleCreateClass}>
          <input
            type="text"
            value={newClassName}
            onChange={(event) => setNewClassName(event.target.value)}
            placeholder="Например, 4Б или 10А"
            className="classes-input"
            data-testid="class-name-input"
          />
          <button type="submit" className="btn-primary" data-testid="create-class-btn">
            Создать
          </button>
        </form>
      </section>

      {/* Список классов */}
      <section className="classes-section">
        <h3>📋 Мои классы</h3>
        <p className="classes-section-subtitle">Сначала выберите класс. После этого ниже откроются его дашборд, состав и соревновательные действия.</p>
        {groups.length === 0 ? (
          <p className="status-line">Пока нет классов. Создайте первый класс выше.</p>
        ) : (
          <div className="classes-grid" data-testid="classes-list">
            {groups.map((group) => {
              const studentCount = groupStudentCounts[group.id] ?? 0;
              return (
                <article
                  key={group.id}
                  className={`class-card${group.id === selectedClassId ? " is-selected" : ""}`}
                  onClick={() => {
                    setSelectedClassId(group.id);
                    navigate(`/classes/${group.id}`);
                    refreshBase(group.id);
                  }}
                  data-testid={`class-card-${group.id}`}
                >
                  <div className="class-card-icon">🏫</div>
                  <div className="class-card-info">
                    <h4 className="class-card-name">{group.name}</h4>
                    <p className="class-card-meta">
                      {studentCount} ученик(ов) • создан {new Date(group.createdAt).toLocaleDateString("ru-RU")}
                    </p>
                    <p className="class-card-caption">
                      {group.id === selectedClassId ? "Сейчас открыт ниже" : "Нажмите, чтобы открыть состав и дашборд"}
                    </p>
                  </div>
                  <div className="class-card-actions">
                    <button
                      type="button"
                      className="btn-icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedClassId(group.id);
                        handleRenameClass();
                      }}
                      title="Переименовать"
                    >
                      ✏️
                    </button>
                    <button
                      type="button"
                      className="btn-icon btn-danger"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedClassId(group.id);
                        handleDeleteClass();
                      }}
                      title="Удалить"
                    >
                      🗑️
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Выбранный класс */}
      {selectedClass && (
        <>
          {/* Дашборд класса */}
          <ClassDashboardWidget
            classGroup={selectedClass}
            students={students}
          />

          {/* Статистика класса */}
          {classStats && (
            <section className="classes-section">
              <h3>📊 Информация о классе</h3>
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-card-icon">👥</div>
                  <div className="stat-card-content">
                    <div className="stat-card-value">{classStats.totalStudents}</div>
                    <div className="stat-card-label">Учеников в классе</div>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-card-icon">📝</div>
                  <div className="stat-card-content">
                    <div className="stat-card-value">{Object.entries(classStats.roles).map(([role, count]) => (
                      <div key={role}>{appRoleLabel(role as any)}: {count}</div>
                    ))}</div>
                    <div className="stat-card-label">Распределение по ролям</div>
                  </div>
                </div>
              </div>
            </section>
          )}

          <section className="classes-section">
            <div className="class-header">
              <h3>👥 Ученики класса "{selectedClass.name}"</h3>
              <div className="class-actions">
                {selectedStudentIds.size > 0 && (
                  <button
                    type="button"
                    className="btn-danger"
                    onClick={handleBulkRemove}
                  >
                    ✕ Исключить выбранные ({selectedStudentIds.size})
                  </button>
                )}
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={selectAllStudents}
                >
                  ✓ Выбрать все
                </button>
                {selectedStudentIds.size > 0 && (
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={clearSelection}
                  >
                    ✕ Снять выделение
                  </button>
                )}
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowBulkModal(true)}
                >
                  ➕ Массовое добавление
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowAssignModal(true)}
                >
                  👤 Добавить существующего
                </button>
              </div>
            </div>

            {/* Быстрое добавление */}
            <form className="classes-form" onSubmit={handleCreateStudent}>
              <input
                type="text"
                value={studentName}
                onChange={(event) => setStudentName(event.target.value)}
                placeholder="Имя ученика"
                className="classes-input"
                data-testid="student-name-input"
              />
              <button type="submit" className="btn-primary" data-testid="create-student-btn">
                Добавить
              </button>
            </form>

            {/* Список учеников с чекбоксами */}
            {students.length === 0 ? (
              <p className="status-line">В классе пока нет учеников.</p>
            ) : (
              <div className="students-grid" data-testid="students-list">
                {students.map((student) => {
                  const isSelected = selectedStudentIds.has(student.id);
                  return (
                    <article
                      key={student.id}
                      className={`student-card${isSelected ? " is-selected" : ""}`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleStudentSelection(student.id)}
                        className="student-checkbox"
                        data-testid={`student-checkbox-${student.id}`}
                      />
                      <div className="student-avatar">
                        {getAvatarForUser(student)}
                      </div>
                      <div className="student-info">
                        <h4 className="student-name">{student.name}</h4>
                        <p className="student-meta">
                          {normalizeUserRole(student.role) === "student" ? "Ученик" : appRoleLabel(normalizeUserRole(student.role))}
                        </p>
                      </div>
                      <button
                        type="button"
                        className="btn-icon btn-danger"
                        onClick={() => handleRemoveStudent(student.id)}
                        title="Исключить из класса"
                      >
                        ✕
                      </button>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          {/* Секция соревнований и вызовов */}
          {activeUserId && students.length > 1 && (
            <section className="classes-section">
              <div className="class-header">
                <h3>⚔️ Соревнования и вызовы</h3>
                <div className="class-actions">
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={() => setShowChallengeModal(true)}
                  >
                    🎯 Создать вызов
                  </button>
                </div>
              </div>

              {/* Входящие вызовы */}
              {incoming.length > 0 && (
                <div className="challenges-list">
                  <h4>📥 Входящие вызовы ({incoming.length})</h4>
                  {incoming.map((challenge) => {
                    const challenger = allUsers.find(u => u.id === challenge.challengerId);
                    return (
                      <div key={challenge.id} className="challenge-card">
                        <div className="challenge-info">
                          <span className="challenge-from">
                            От: {challenger?.name || "Неизвестный"}
                          </span>
                          <span className="challenge-mode">
                            🎮 {challenge.modeId}
                          </span>
                          <span className="challenge-duration">
                            ⏱️ {challenge.durationMinutes} мин
                          </span>
                        </div>
                        <div className="challenge-actions">
                          <button
                            type="button"
                            className="btn-primary"
                            onClick={() => respondToChallenge(challenge.id, true)}
                          >
                            ✓ Принять
                          </button>
                          <button
                            type="button"
                            className="btn-ghost"
                            onClick={() => respondToChallenge(challenge.id, false)}
                          >
                            ✕ Отклонить
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Лидерборд класса */}
              <LeaderboardWidget
                entries={students.map((student, index) => ({
                  rank: index + 1,
                  userId: student.id,
                  name: student.name,
                  score: (student as any).userLevel?.totalXP || 0,
                  xpEarned: (student as any).userLevel?.totalXP || 0
                })).sort((a, b) => b.score - a.score)}
                period="week"
                isLoading={false}
              />
            </section>
          )}
        </>
      )}

      {/* Модальное окно массового добавления */}
      {showBulkModal && (
        <div className="modal-overlay" onClick={() => setShowBulkModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>➕ Массовое добавление учеников</h3>
            <p className="status-line">Введите имена, каждое с новой строки:</p>
            <textarea
              value={bulkNames}
              onChange={(event) => setBulkNames(event.target.value)}
              placeholder="Иванов Иван&#10;Петров Пётр&#10;Сидоров Сидор"
              className="bulk-textarea"
              rows={8}
            />
            <div className="modal-actions">
              <button type="button" className="btn-ghost" onClick={() => setShowBulkModal(false)}>
                Отмена
              </button>
              <button type="button" className="btn-primary" onClick={handleBulkCreate}>
                Добавить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно назначения существующего */}
      {showAssignModal && (
        <div className="modal-overlay" onClick={() => setShowAssignModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>👤 Добавить существующего ученика</h3>
            <select
              value={existingUserId}
              onChange={(event) => setExistingUserId(event.target.value)}
              className="classes-select"
            >
              <option value="">Выберите ученика</option>
              {usersAvailableToAssign.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </select>
            <div className="modal-actions">
              <button type="button" className="btn-ghost" onClick={() => setShowAssignModal(false)}>
                Отмена
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={handleAssignExistingStudent}
                disabled={!existingUserId}
              >
                Добавить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно вызова */}
      {showChallengeModal && activeUserId && (
        <ChallengeModal
          isOpen={showChallengeModal}
          onClose={() => setShowChallengeModal(false)}
          onSubmit={async (challenge: Partial<UserChallenge>) => {
            if (challenge.challengedId && challenge.modeId && challenge.durationMinutes) {
              await sendChallenge(
                challenge.challengedId,
                challenge.modeId,
                challenge.durationMinutes
              );
              setShowChallengeModal(false);
              setStatus("Вызов отправлен!");
            }
          }}
          challenger={allUsers.find(u => u.id === activeUserId) || { id: activeUserId, name: "Вы", role: "student" } as User}
          students={students.filter(s => s.id !== activeUserId)}
        />
      )}
    </section>
  );
}
