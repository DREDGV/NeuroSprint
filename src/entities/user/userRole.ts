import type { AppRole } from "../../shared/types/domain";

export const DEFAULT_USER_ROLE: AppRole = "student";
export type UserRoleGuardCode = "last_teacher_role_change" | "last_teacher_delete";

export class UserRoleGuardError extends Error {
  readonly code: UserRoleGuardCode;

  constructor(code: UserRoleGuardCode) {
    super(
      code === "last_teacher_delete"
        ? "Нельзя удалить последнего учителя."
        : "Нельзя изменить роль последнего учителя."
    );
    this.name = "UserRoleGuardError";
    this.code = code;
  }
}

export function isAppRole(value: unknown): value is AppRole {
  return value === "teacher" || value === "student" || value === "home" || value === "admin";
}

export function normalizeUserRole(value: unknown): AppRole {
  return isAppRole(value) ? value : DEFAULT_USER_ROLE;
}

export function isTeacherRole(role: AppRole): boolean {
  return role === "teacher";
}

export function canJoinClassAsStudent(role: AppRole): boolean {
  return role === "student";
}

export function isUserRoleGuardError(error: unknown): error is UserRoleGuardError {
  return (
    error instanceof UserRoleGuardError ||
    (typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (((error as { code?: unknown }).code as unknown) === "last_teacher_role_change" ||
        ((error as { code?: unknown }).code as unknown) === "last_teacher_delete"))
  );
}

export function userRoleGuardMessage(error: unknown): string {
  if (!isUserRoleGuardError(error)) {
    return "Операция с ролью недоступна.";
  }
  if (error.code === "last_teacher_delete") {
    return "Нельзя удалить последнего учителя. Сначала назначьте другого пользователя учителем.";
  }
  return "Нельзя изменить роль последнего учителя. Назначьте другого пользователя учителем.";
}
