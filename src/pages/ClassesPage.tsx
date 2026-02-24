import { FormEvent, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { groupRepository } from "../entities/group/groupRepository";
import { userRepository } from "../entities/user/userRepository";
import type { ClassGroup, User } from "../shared/types/domain";

export function ClassesPage() {
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
    void refreshBase(classId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId]);

  const selectedClass = useMemo(
    () => groups.find((group) => group.id === selectedClassId) ?? null,
    [groups, selectedClassId]
  );

  const usersAvailableToAssign = useMemo(() => {
    const memberSet = new Set(students.map((student) => student.id));
    return allUsers.filter((user) => !memberSet.has(user.id));
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
    await refreshBase(selectedClassId);
  }

  return (
    <section className="panel" data-testid="classes-page">
      <h2>Классы</h2>
      <p>Ручное управление классами и составом учеников.</p>

      <form className="inline-form" onSubmit={handleCreateClass}>
        <label htmlFor="new-class-name">Новый класс</label>
        <input
          id="new-class-name"
          value={newClassName}
          onChange={(event) => setNewClassName(event.target.value)}
          placeholder="Например, 4Б"
          data-testid="class-name-input"
        />
        <button type="submit" className="btn-primary" data-testid="create-class-btn">
          Создать класс
        </button>
      </form>

      <div className="settings-form">
        <label htmlFor="class-select">Выбранный класс</label>
        <select
          id="class-select"
          value={selectedClassId}
          onChange={(event) => {
            const nextClassId = event.target.value;
            navigate(nextClassId ? `/classes/${nextClassId}` : "/classes");
            setSelectedClassId(nextClassId);
          }}
          data-testid="class-select"
        >
          <option value="">Выберите класс</option>
          {groups.map((group) => (
            <option key={group.id} value={group.id}>
              {group.name}
            </option>
          ))}
        </select>
      </div>

      {selectedClass ? (
        <div className="action-row">
          <button type="button" className="btn-secondary" onClick={() => void handleRenameClass()}>
            Переименовать класс
          </button>
          <button type="button" className="btn-danger" onClick={() => void handleDeleteClass()}>
            Удалить класс
          </button>
        </div>
      ) : null}

      {selectedClass ? (
        <section className="setup-block">
          <h3>Добавить ученика в {selectedClass.name}</h3>

          <form className="inline-form" onSubmit={handleCreateStudent}>
            <label htmlFor="student-name">Имя ученика</label>
            <input
              id="student-name"
              value={studentName}
              onChange={(event) => setStudentName(event.target.value)}
              placeholder="Например, Лёва"
              data-testid="student-name-input"
            />
            <button type="submit" className="btn-primary" data-testid="create-student-btn">
              Создать ученика
            </button>
          </form>

          <div className="settings-form">
            <label htmlFor="existing-user-select">Добавить существующего ученика</label>
            <select
              id="existing-user-select"
              value={existingUserId}
              onChange={(event) => setExistingUserId(event.target.value)}
            >
              <option value="">Выберите ученика</option>
              {usersAvailableToAssign.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => void handleAssignExistingStudent()}
              data-testid="assign-existing-student-btn"
            >
              Добавить в класс
            </button>
          </div>

          <div className="settings-form">
            <label htmlFor="bulk-students">Массовое добавление (по строкам)</label>
            <textarea
              id="bulk-students"
              className="bulk-textarea"
              rows={5}
              value={bulkNames}
              onChange={(event) => setBulkNames(event.target.value)}
              placeholder={"Иван\nМария\nЕгор"}
            />
            <button
              type="button"
              className="btn-ghost"
              onClick={() => void handleBulkCreate()}
              data-testid="bulk-add-students-btn"
            >
              Добавить списком
            </button>
          </div>

          <h3>Состав класса</h3>
          <ul className="profiles-list scrollable" data-testid="class-students-list">
            {students.map((student) => (
              <li key={student.id} className="profile-item">
                <p className="profile-name">{student.name}</p>
                <button
                  type="button"
                  className="btn-danger"
                  onClick={() => void handleRemoveStudent(student.id)}
                >
                  Убрать из класса
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <p className="status-line">Создайте класс, чтобы управлять составом учеников.</p>
      )}

      {status ? <p className="status-line">{status}</p> : null}
      {error ? <p className="error-text">{error}</p> : null}
    </section>
  );
}
