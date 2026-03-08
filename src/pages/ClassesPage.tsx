import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useRoleAccess } from "../app/useRoleAccess";
import { groupRepository } from "../entities/group/groupRepository";
import { normalizeUserRole } from "../entities/user/userRole";
import { userRepository } from "../entities/user/userRepository";
import { appRoleLabel } from "../shared/lib/settings/appRole";
import type { ClassGroup, User } from "../shared/types/domain";

const AVATAR_EMOJIS = ["👤", "👦", "👧", "👨", "👩", "🧑", "🎓", "👨‍🎓", "👩‍🎓"];

function getAvatarForUser(user: User): string {
  const hash = user.name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return AVATAR_EMOJIS[hash % AVATAR_EMOJIS.length];
}

export function ClassesPage() {
  const access = useRoleAccess();
  const canManageClassesAccess = access.classes.manage;
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
  
  // Массовые операции
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());

  async function refreshBase(targetClassId?: string): Promise<void> {
    const [loadedGroups, loadedUsers] = await Promise.all([
      groupRepository.listGroups(),
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
      return;
    }

    const loadedStudents = await groupRepository.listStudents(resolvedClassId);
    setStudents(loadedStudents);
  }

  useEffect(() => {
    if (!canManageClassesAccess) {
      setGroups([]);
      setStudents([]);
      setAllUsers([]);
      setSelectedClassId("");
      return;
    }
    void refreshBase(classId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canManageClassesAccess, classId]);

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
    if (newClassName.trim().length < 2) {
      setError("Название класса должно быть не короче 2 символов.");
      return;
    }

    const created = await groupRepository.createGroup(newClassName.trim());
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
    await groupRepository.renameGroup(selectedClass.id, nextName.trim());
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
    await groupRepository.removeGroup(selectedClass.id);
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
        <h2>📚 Классы</h2>
        <p className="classes-subtitle">Управление классами и учениками</p>
      </header>

      {/* Создание класса */}
      <section className="classes-section">
        <h3>➕ Новый класс</h3>
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
        {groups.length === 0 ? (
          <p className="status-line">Пока нет классов. Создайте первый класс выше.</p>
        ) : (
          <div className="classes-grid" data-testid="classes-list">
            {groups.map((group) => {
              const studentCount = students.filter((s) => 
                group.id === selectedClassId ? true : false
              ).length;
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
                      Создан: {new Date(group.createdAt).toLocaleDateString("ru-RU")}
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

      {status && <p className="status-line success">{status}</p>}
      {error && <p className="status-line error">{error}</p>}
    </section>
  );
}
