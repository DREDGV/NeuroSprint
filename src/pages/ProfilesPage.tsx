import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useActiveUser } from "../app/ActiveUserContext";
import { useAuth } from "../app/useAuth";
import { useRoleAccess } from "../app/useRoleAccess";
import { accountSyncService } from "../entities/account/accountSyncService";
import { userRepository } from "../entities/user/userRepository";
import {
  isTeacherRole,
  isUserRoleGuardError,
  normalizeUserRole,
  userRoleGuardMessage
} from "../entities/user/userRole";
import { guardAccess } from "../shared/lib/auth/permissions";
import {
  allowPrivilegedProfileRoles,
  getEditableSelfServiceRoles,
  getSelfServiceCreateRoles,
  getSelfServiceDefaultRole
} from "../shared/lib/auth/profileRolePolicy";
import {
  trackGuestStarted,
  trackProfileActivated,
  trackProfileCreated
} from "../shared/lib/analytics/siteAnalytics";
import { appRoleLabel, saveAppRole } from "../shared/lib/settings/appRole";
import {
  ACCOUNT_IMPORT_DISMISSED_KEY,
} from "../shared/constants/storage";
import { setAuthReturnPath } from "../shared/lib/auth/authReturnPath";
import type { AppRole, User } from "../shared/types/domain";
import { AvatarSelector } from "../shared/ui/AvatarSelector";
import { AVATAR_EMOJIS, ProfileCard } from "../shared/ui/ProfileCard";

function getAvatarStorageKey(userId: string): string {
  return `ns.avatar.${userId}`;
}

function getImportDismissedKey(accountId: string): string {
  return `${ACCOUNT_IMPORT_DISMISSED_KEY}:${accountId}`;
}

function getCreateRoleLabel(role: AppRole): string {
  if (role === "student") {
    return "Ученик";
  }
  if (role === "home") {
    return "Домашний";
  }
  if (role === "teacher") {
    return "Учитель";
  }
  return "Администратор";
}

type ProfilesRouteHint = "missing_profile" | "locked_profile" | null;

function ImportActions({
  importStatus,
  selectedImportIds,
  allImportProfilesSelected,
  onToggleSelectAll,
  onImport,
  onDismiss
}: {
  importStatus: "idle" | "importing";
  selectedImportIds: string[];
  allImportProfilesSelected: boolean;
  onToggleSelectAll: () => void;
  onImport: () => void;
  onDismiss: () => void;
}) {
  return (
    <div className="account-import-actions">
      <button
        type="button"
        className="btn-ghost"
        onClick={onToggleSelectAll}
      >
        {allImportProfilesSelected ? "Снять выделение" : "Выбрать все"}
      </button>
      <button
        type="button"
        className="btn-primary"
        onClick={onImport}
        disabled={importStatus === "importing" || selectedImportIds.length === 0}
      >
        {importStatus === "importing"
          ? "Сохраняем..."
          : `Сохранить выбранные (${selectedImportIds.length})`}
      </button>
      <button type="button" className="btn-ghost" onClick={onDismiss}>
        Позже
      </button>
    </div>
  );
}

export function ProfilesPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const auth = useAuth();
  const access = useRoleAccess();
  const { activeUserId, setActiveUserId } = useActiveUser();

  const [users, setUsers] = useState<User[]>([]);
  const [name, setName] = useState("");
  const [newRole, setNewRole] = useState<AppRole>(getSelfServiceDefaultRole());
  const [newAvatar, setNewAvatar] = useState(AVATAR_EMOJIS[0] ?? "👤");
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<AppRole | "all">("all");
  const [sortOrder, setSortOrder] = useState<"name" | "date" | "activity">("date");
  const [syncing, setSyncing] = useState(false);
  const [importPromptDismissed, setImportPromptDismissed] = useState(false);
  const [selectedImportIds, setSelectedImportIds] = useState<string[]>([]);
  const [routeHint, setRouteHint] = useState<ProfilesRouteHint>(null);
  const [editingDisplayName, setEditingDisplayName] = useState(false);
  const [displayNameInput, setDisplayNameInput] = useState("");
  const [updatingName, setUpdatingName] = useState(false);
  const [editingEmail, setEditingEmail] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [updatingEmail, setUpdatingEmail] = useState(false);
  const [pendingEmailChange, setPendingEmailChange] = useState<string | null>(null);
  const [passwordResetSending, setPasswordResetSending] = useState(false);
  const [importStatus, setImportStatus] = useState<"idle" | "importing" | "success" | "error">("idle");
  const [importResult, setImportResult] = useState<{ imported: number; errors: number } | null>(null);

  const allowPrivilegedRoles = allowPrivilegedProfileRoles();
  const createRoleOptions = getSelfServiceCreateRoles();

  const guestProfilesToImport = useMemo(
    () =>
      auth.account?.id
        ? users.filter((user) => user.ownershipKind === "guest" && !user.accountId)
        : [],
    [auth.account?.id, users]
  );

  const getUserAvatar = useCallback((user: User) => {
    if (user.avatarEmoji) {
      return user.avatarEmoji;
    }

    try {
      return localStorage.getItem(getAvatarStorageKey(user.id)) || "👤";
    } catch {
      return "👤";
    }
  }, []);

  const loadUsers = useCallback(async () => {
    const items = await userRepository.list();
    setUsers(items);

    if (activeUserId && !items.some((item) => item.id === activeUserId)) {
      setActiveUserId(null);
    }
  }, [activeUserId, setActiveUserId]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    const nextHint =
      location.state && typeof location.state === "object" && "redirectReason" in location.state
        ? (location.state.redirectReason as ProfilesRouteHint)
        : null;

    if (nextHint === "missing_profile" || nextHint === "locked_profile") {
      setRouteHint(nextHint);
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location.pathname, location.state, navigate]);

  useEffect(() => {
    if (auth.isLoading || auth.syncInProgress) {
      return;
    }

    void loadUsers();
  }, [auth.account?.id, auth.isAuthenticated, auth.isLoading, auth.syncInProgress, loadUsers]);

  useEffect(() => {
    if (!auth.account?.id) {
      setImportPromptDismissed(false);
      return;
    }

    try {
      setImportPromptDismissed(
        localStorage.getItem(getImportDismissedKey(auth.account.id)) === "true"
      );
    } catch {
      setImportPromptDismissed(false);
    }
  }, [auth.account?.id]);

  useEffect(() => {
    if (!pendingEmailChange || !auth.account?.email) {
      return;
    }

    if (auth.account.email.trim().toLowerCase() === pendingEmailChange.trim().toLowerCase()) {
      setPendingEmailChange(null);
    }
  }, [auth.account?.email, pendingEmailChange]);

  useEffect(() => {
    setSelectedImportIds((current) => {
      const availableIds = guestProfilesToImport.map((profile) => profile.id);
      if (availableIds.length === 0) {
        return [];
      }

      const next = current.filter((id) => availableIds.includes(id));
      return next.length > 0 ? next : availableIds;
    });
  }, [guestProfilesToImport]);

  const hasProfiles = users.length > 0;
  const canCreate = name.trim().length >= 2;
  const teachersCount = useMemo(
    () => users.filter((user) => isTeacherRole(normalizeUserRole(user.role))).length,
    [users]
  );
  const recoveryMode = teachersCount === 0;
  const isFirstProfile = users.length === 0;
  const canAssignRoleOnCreate =
    allowPrivilegedRoles && (access.profiles.updateRole || recoveryMode || isFirstProfile);
  const canUpdateProfileRoles =
    allowPrivilegedRoles && (access.profiles.updateRole || recoveryMode || isFirstProfile);

  const activeUser = useMemo(
    () => users.find((item) => item.id === activeUserId) ?? null,
    [activeUserId, users]
  );

  const guestProfiles = useMemo(
    () => users.filter((user) => user.ownershipKind === "guest"),
    [users]
  );

  const linkedProfiles = useMemo(
    () => users.filter((user) => user.ownershipKind === "linked"),
    [users]
  );

  const selectedImportProfiles = useMemo(
    () => guestProfilesToImport.filter((profile) => selectedImportIds.includes(profile.id)),
    [guestProfilesToImport, selectedImportIds]
  );

  const syncCounts = useMemo(
    () => ({
      pending: linkedProfiles.filter((user) => user.syncState === "pending").length,
      synced: linkedProfiles.filter((user) => user.syncState === "synced").length,
      error: linkedProfiles.filter((user) => user.syncState === "error").length
    }),
    [linkedProfiles]
  );

  const lockedLinkedProfilesCount = useMemo(
    () => users.filter((user) => userRepository.isLocked(user, auth.account?.id)).length,
    [auth.account?.id, users]
  );

  const allImportProfilesSelected =
    guestProfilesToImport.length > 0 &&
    selectedImportIds.length === guestProfilesToImport.length;

  const filteredUsers = useMemo(() => {
    let result = [...users];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (user) =>
          user.name.toLowerCase().includes(query) ||
          appRoleLabel(normalizeUserRole(user.role)).toLowerCase().includes(query)
      );
    }

    if (roleFilter !== "all") {
      result = result.filter((user) => normalizeUserRole(user.role) === roleFilter);
    }

    result.sort((a, b) => {
      if (sortOrder === "name") {
        return a.name.localeCompare(b.name, "ru-RU");
      }
      if (sortOrder === "activity") {
        return (b.lastActivity ?? b.createdAt).localeCompare(a.lastActivity ?? a.createdAt);
      }
      return b.createdAt.localeCompare(a.createdAt);
    });

    return result;
  }, [roleFilter, searchQuery, sortOrder, users]);

  const filteredLockedProfilesCount = useMemo(
    () => filteredUsers.filter((user) => userRepository.isLocked(user, auth.account?.id)).length,
    [auth.account?.id, filteredUsers]
  );

  const canEditUser = useCallback(
    (user: User) => {
      if (userRepository.isLocked(user, auth.account?.id)) {
        return false;
      }
      if (access.profiles.edit) {
        return true;
      }
      return access.profiles.activate && user.id === activeUserId;
    },
    [access.profiles.activate, access.profiles.edit, activeUserId, auth.account?.id]
  );

  const isProtectedLastTeacher = useCallback(
    (user: User) => isTeacherRole(normalizeUserRole(user.role)) && teachersCount === 1,
    [teachersCount]
  );

  const accountStatusLabel = useMemo(() => {
    if (!auth.isConfigured) {
      return "Регистрация скоро будет доступна";
    }
    if (auth.isAuthenticated) {
      return "Вход выполнен";
    }
    return "Без регистрации";
  }, [auth.isAuthenticated, auth.isConfigured]);

  const accountNextStepHint = useMemo(() => {
    if (!auth.isConfigured) {
      return "Пока можно спокойно пользоваться локальными профилями на этом устройстве.";
    }

    if (!auth.isAuthenticated) {
      if (guestProfiles.length > 0) {
        return "Сейчас вы работаете локально. Профили и прогресс доступны на этом устройстве, но не будут видны на другом, пока вы не создадите аккаунт.";
      }

      return "Можно начать без регистрации и создать локальный профиль, либо сразу войти в аккаунт и хранить прогресс на всех устройствах.";
    }

    if (guestProfilesToImport.length > 0) {
      return `На устройстве найдено ${guestProfilesToImport.length} локальных профилей. Перенесите их в аккаунт, чтобы сохранить историю и продолжить работу на других устройствах.`;
    }

    if (linkedProfiles.length === 0) {
      return "Аккаунт готов. Следующий шаг — создать первый профиль или перенести локальный профиль с этого устройства.";
    }

    if (!activeUserId) {
      return "Выберите активный профиль, чтобы перейти к тренировкам и аналитике.";
    }

    if (activeUser && userRepository.isLocked(activeUser, auth.account?.id)) {
      return "Этот профиль сохранён в аккаунте. Войдите снова, чтобы открыть его на этом устройстве.";
    }

    if (syncCounts.error > 0) {
      return "Часть профилей не удалось сохранить. Проверьте подключение и попробуйте ещё раз.";
    }

    if (syncCounts.pending > 0) {
      return "Изменения сохранены на этом устройстве и ждут обновления. Можно продолжать тренировки.";
    }

    return "Всё сохранено и работает стабильно. Можно продолжать тренировки.";
  }, [
    activeUser,
    activeUserId,
    auth.account?.id,
    auth.isAuthenticated,
    auth.isConfigured,
    guestProfiles.length,
    guestProfilesToImport.length,
    linkedProfiles.length,
    syncCounts.error,
    syncCounts.pending
  ]);

  const routeHintCopy = useMemo(() => {
    if (!routeHint) {
      return null;
    }

    if (routeHint === "locked_profile") {
      return {
        title: "Профиль сохранён в аккаунте",
        description: auth.isAuthenticated
          ? "Профиль уже сохранён в вашем аккаунте. Данные обновляются — скоро можно вернуться к тренировке."
          : auth.isConfigured
            ? "Этот профиль сохранён в аккаунте. Войдите, чтобы снова открыть его и продолжить с того места, где остановились."
            : "Этот профиль сохранён в аккаунте. Пока регистрация ещё не доступна, можно продолжить с локальным профилем на этом устройстве."
      };
    }

    if (users.length === 0) {
      return {
        title: "Сначала нужен тренировочный профиль",
        description: auth.isAuthenticated
          ? "Аккаунт готов. Создайте первый профиль или перенесите локальные профили, чтобы открыть тренировки и статистику."
          : auth.isConfigured
            ? "Для перехода к тренировкам сначала создайте локальный профиль или войдите в аккаунт и подтяните сохранённые профили."
            : "Для перехода к тренировкам сначала создайте локальный профиль на этом устройстве."
      };
    }

    return {
      title: "Выберите активный профиль",
      description: auth.isAuthenticated
        ? "На устройстве уже есть профили. Выберите один из них ниже, и приложение вернёт вас к тренировкам."
        : auth.isConfigured
          ? "На устройстве уже есть локальные профили. Выберите один из них ниже или войдите в аккаунт, если нужен сохранённый профиль."
          : "На устройстве уже есть локальные профили. Выберите один из них ниже и продолжайте работать локально."
    };
  }, [auth.isAuthenticated, auth.isConfigured, routeHint, users.length]);

  async function handleCreate(event: FormEvent) {
    event.preventDefault();

    if (
      !guardAccess(
        access.profiles.create,
        setError,
        "В текущей роли создание новых профилей недоступно."
      )
    ) {
      return;
    }

    if (!canCreate) {
      setError("Введите имя профиля не короче двух символов.");
      return;
    }

    setLoading(true);
    setError(null);
    setStatus(null);

    try {
      const roleForCreate = canAssignRoleOnCreate ? newRole : getSelfServiceDefaultRole();
      const created = await userRepository.create(name.trim(), roleForCreate, {
        accountId: auth.account?.id,
        ownershipKind: auth.account?.id ? "linked" : "guest",
        syncState: auth.account?.id ? "pending" : "local",
        avatarEmoji: newAvatar
      });

      localStorage.setItem(getAvatarStorageKey(created.id), newAvatar);

      if (auth.account?.id) {
        await accountSyncService.syncLinkedProfile(created.id, auth.account.id);
      } else {
        trackGuestStarted();
      }

      setActiveUserId(created.id);
      saveAppRole(normalizeUserRole(created.role));
      trackProfileCreated(normalizeUserRole(created.role));
      setName("");
      setNewAvatar(AVATAR_EMOJIS[0] ?? "👤");
      setNewRole(getSelfServiceDefaultRole());
      await loadUsers();

      setStatus(
        auth.account?.id
          ? `Профиль «${created.name}» создан и сохранён в аккаунте.`
          : `Локальный профиль «${created.name}» создан на этом устройстве.`
      );
    } catch (caught) {
      console.error("profile create failed", caught);
      setError("Не удалось создать профиль.");
    } finally {
      setLoading(false);
    }
  }

  async function handleRename(user: User) {
    const nextName = window.prompt("Новое имя профиля", user.name);
    if (!nextName || nextName.trim().length < 2) {
      return;
    }

    try {
      await userRepository.rename(user.id, nextName.trim());
      if (user.accountId && auth.account?.id === user.accountId) {
        await accountSyncService.syncLinkedProfile(user.id, user.accountId);
      }
      await loadUsers();
      setStatus("Имя профиля обновлено.");
    } catch (caught) {
      console.error("profile rename failed", caught);
      setError("Не удалось переименовать профиль.");
    }
  }

  async function handleDelete(user: User) {
    if (isProtectedLastTeacher(user)) {
      setError("Нельзя удалить последнего учителя. Сначала назначьте другого.");
      return;
    }

    const approved = window.confirm(
      user.ownershipKind === "linked"
        ? `Удалить профиль «${user.name}» только с этого устройства? Профиль останется в аккаунте и сможет восстановиться после следующей синхронизации.`
        : `Удалить профиль «${user.name}»?`
    );

    if (!approved) {
      return;
    }

    try {
      await userRepository.remove(user.id);
      if (activeUserId === user.id) {
        setActiveUserId(null);
      }
      await loadUsers();
      setStatus(`Профиль «${user.name}» удалён.`);
    } catch (caught) {
      console.error("profile delete failed", caught);
      setError(
        isUserRoleGuardError(caught)
          ? userRoleGuardMessage(caught)
          : "Не удалось удалить профиль."
      );
    }
  }

  function handleSetActive(user: User) {
    const locked = userRepository.isLocked(user, auth.account?.id);
    if (locked) {
      if (!auth.isConfigured) {
        setRouteHint("locked_profile");
        setStatus("Этот профиль сохранён в аккаунте. Выберите локальный профиль или создайте новый.");
        return;
      }
      setAuthReturnPath("/profiles", { preserveIfPresent: true });
      navigate("/auth/login");
      return;
    }

    setRouteHint(null);
    setActiveUserId(user.id);
    saveAppRole(normalizeUserRole(user.role));
    trackProfileActivated(normalizeUserRole(user.role));
    setStatus(`Активный профиль: ${user.name} (${appRoleLabel(normalizeUserRole(user.role))}).`);
  }

  function handleUnlockProfile(): void {
    if (!auth.isConfigured) {
      setRouteHint("locked_profile");
      setStatus("Профиль сохранён в аккаунте и станет доступен после подключения. Пока можно работать с локальным профилем.");
      return;
    }
    setAuthReturnPath("/profiles", { preserveIfPresent: true });
    navigate("/auth/login");
  }

  async function handleLogout() {
    setError(null);
    setStatus(null);

    try {
      const currentActiveProfile = activeUser;
      const fallbackGuestProfile =
        guestProfiles.find((profile) => profile.id !== currentActiveProfile?.id) ??
        guestProfiles[0] ??
        null;

      await auth.logout();

      if (currentActiveProfile?.ownershipKind === "linked") {
        if (fallbackGuestProfile) {
          setActiveUserId(fallbackGuestProfile.id);
          saveAppRole(normalizeUserRole(fallbackGuestProfile.role));
          setStatus(
            `Вы вышли из аккаунта. Активным стал локальный профиль «${fallbackGuestProfile.name}».`
          );
        } else {
          setActiveUserId(null);
          setStatus("Вы вышли из аккаунта. Сохранённые профили снова откроются после входа.");
        }
      } else {
        setStatus("Вы вышли из аккаунта.");
      }
    } catch (caught) {
      console.error("logout failed", caught);
      setError(caught instanceof Error ? caught.message : "Не удалось выйти из аккаунта.");
    }
  }

  function handleTrain(user: User) {
    if (userRepository.isLocked(user, auth.account?.id)) {
      handleUnlockProfile();
      return;
    }
    if (user.id !== activeUserId) {
      handleSetActive(user);
    }
    navigate("/training");
  }

  async function handleSaveRole(user: User, nextRole: AppRole) {
    if (!canUpdateProfileRoles) {
      setError("В публичной версии смена ролей «Учитель» и «Администратор» ограничена.");
      return;
    }

    try {
      await userRepository.updateRole(user.id, nextRole);
      if (user.accountId && auth.account?.id === user.accountId) {
        await accountSyncService.syncLinkedProfile(user.id, user.accountId);
      }
      await loadUsers();

      if (activeUserId === user.id) {
        saveAppRole(nextRole);
      }

      setStatus(`Роль профиля «${user.name}» обновлена.`);
    } catch (caught) {
      console.error("profile role update failed", caught);
      setError(
        isUserRoleGuardError(caught)
          ? userRoleGuardMessage(caught)
          : "Не удалось обновить роль профиля."
      );
    }
  }

  async function handleUpdateDisplayName(event: FormEvent) {
    event.preventDefault();
    if (!displayNameInput.trim()) {
      setError("Имя не может быть пустым.");
      return;
    }

    setUpdatingName(true);
    setError(null);

    try {
      await auth.updateAccountProfile({ displayName: displayNameInput.trim() });
      setStatus("Имя обновлено.");
      setEditingDisplayName(false);
    } catch (caught) {
      console.error("display name update failed", caught);
      setError(caught instanceof Error ? caught.message : "Не удалось обновить имя.");
    } finally {
      setUpdatingName(false);
    }
  }

  function startEditingDisplayName() {
    setDisplayNameInput(auth.account?.displayName ?? "");
    setEditingDisplayName(true);
  }

  function cancelEditingDisplayName() {
    setEditingDisplayName(false);
    setDisplayNameInput("");
  }

  function startEditingEmail() {
    setEmailInput(auth.account?.email ?? "");
    setEditingEmail(true);
  }

  function cancelEditingEmail() {
    setEditingEmail(false);
    setEmailInput("");
  }

  async function handleUpdateEmail(event: FormEvent) {
    event.preventDefault();
    const nextEmail = emailInput.trim().toLowerCase();

    if (!nextEmail) {
      setError("Email не может быть пустым.");
      return;
    }

    setUpdatingEmail(true);
    setError(null);
    setStatus(null);

    try {
      await auth.updateAccountProfile({ email: nextEmail });
      setPendingEmailChange(nextEmail);
      setStatus("Письмо для подтверждения нового адреса отправлено.");
      setEditingEmail(false);
    } catch (caught) {
      console.error("email update failed", caught);
      setError(caught instanceof Error ? caught.message : "Не удалось изменить email.");
    } finally {
      setUpdatingEmail(false);
    }
  }

  async function handleRequestPasswordReset() {
    if (!auth.account?.email) {
      setError("Сначала добавьте email аккаунта.");
      return;
    }

    setPasswordResetSending(true);
    setError(null);
    setStatus(null);

    try {
      await auth.requestPasswordReset(auth.account.email);
      setStatus(`Письмо для смены пароля отправлено на ${auth.account.email}.`);
    } catch (caught) {
      console.error("password reset request failed", caught);
      setError(caught instanceof Error ? caught.message : "Не удалось отправить письмо для смены пароля.");
    } finally {
      setPasswordResetSending(false);
    }
  }

  async function handleSyncNow() {
    if (!auth.isAuthenticated) {
      setError("Сначала войдите в аккаунт, чтобы обновить данные профилей.");
      return;
    }

    setSyncing(true);
    setError(null);
    setStatus(null);

    try {
      await auth.syncAccountData();
      await loadUsers();
      setStatus("Данные профилей обновлены.");
    } catch (caught) {
      console.error("manual sync failed", caught);
      setError(caught instanceof Error ? caught.message : "Не удалось обновить данные.");
    } finally {
      setSyncing(false);
    }
  }

  async function handleImportSelected() {
    if (!auth.account?.id || selectedImportIds.length === 0) {
      setError("Выберите хотя бы один локальный профиль для сохранения.");
      return;
    }

    setImportStatus("importing");
    setImportResult(null);
    setError(null);
    setStatus(null);

    try {
      const result = await accountSyncService.importLocalGuestProfiles(
        auth.account.id,
        selectedImportIds
      );

      await auth.syncAccountData();
      await loadUsers();

      const importedActiveProfile = result.imported.find((profile) => profile.id === activeUserId);
      const firstImportedProfile = result.imported[0] ?? null;

      if (!importedActiveProfile && firstImportedProfile && !activeUserId) {
        setActiveUserId(firstImportedProfile.id);
        saveAppRole(normalizeUserRole(firstImportedProfile.role));
      }

      setRouteHint(null);
      setImportResult({ imported: result.imported.length, errors: result.errors.length });
      setImportStatus(result.imported.length > 0 ? "success" : "error");

      if (result.imported.length > 0 && result.errors.length === 0) {
        setStatus(`Готово: ${result.imported.length} профилей сохранено в аккаунте.`);
      } else if (result.imported.length > 0) {
        setStatus(`Сохранено ${result.imported.length} профилей. ${result.errors.length} не удалось.`);
      } else {
        setError("Не удалось сохранить профили. Попробуйте ещё раз.");
      }
    } catch (caught) {
      console.error("profile import failed", caught);
      setImportStatus("error");
      setError(
        caught instanceof Error
          ? caught.message
          : "Не удалось сохранить локальные профили."
      );
    }
  }

  function resetImportWizard() {
    setImportStatus("idle");
    setImportResult(null);
    setSelectedImportIds(guestProfilesToImport.map((p) => p.id));
  }

  async function handleSyncProfile(user: User) {
    if (!auth.isAuthenticated) {
      setError("Сначала войдите в аккаунт.");
      return;
    }
    if (!user.accountId) {
      setError("Профиль не сохранён в аккаунте.");
      return;
    }

    setError(null);
    setStatus(null);

    try {
      await accountSyncService.syncLinkedProfile(user.id, user.accountId);
      await loadUsers();
      setStatus(`Профиль «${user.name}» сохранён в аккаунте.`);
    } catch (caught) {
      console.error("profile sync retry failed", caught);
      setError(caught instanceof Error ? caught.message : "Не удалось сохранить профиль.");
    }
  }

  function dismissImportPrompt() {
    if (auth.account?.id) {
      try {
        localStorage.setItem(getImportDismissedKey(auth.account.id), "true");
      } catch {
        // Ignore storage failures in private mode.
      }
    }
    setImportPromptDismissed(true);
  }

  function toggleImportSelection(profileId: string) {
    setSelectedImportIds((current) =>
      current.includes(profileId)
        ? current.filter((id) => id !== profileId)
        : [...current, profileId]
    );
  }

  function toggleSelectAllImportProfiles() {
    setSelectedImportIds(
      allImportProfilesSelected ? [] : guestProfilesToImport.map((profile) => profile.id)
    );
  }

  return (
    <section className="panel profiles-page">
      <div className="profiles-page-head">
        <div>
          <h2>Профили и аккаунт</h2>
          <p>Создавайте тренировочные профили, сохраняйте прогресс и переключайтесь между устройствами.</p>
        </div>
      </div>

      {routeHintCopy ? (
        <section
          className={`profiles-route-hint${routeHint === "locked_profile" ? " is-warning" : ""}`}
          data-testid="profiles-route-hint"
        >
          <div>
            <p className="account-status-kicker">Возврат к тренировке</p>
            <h3>{routeHintCopy.title}</h3>
            <p>{routeHintCopy.description}</p>
          </div>
          <div className="account-status-actions">
            {!auth.isConfigured ? (
              <a className="btn-primary" href="#profile-create-section">
                Создать локальный профиль
              </a>
            ) : !auth.isAuthenticated ? (
              <>
                <Link
                  className="btn-primary"
                  to="/auth/login"
                  onClick={() => setAuthReturnPath("/profiles", { preserveIfPresent: true })}
                >
                  Войти и продолжить
                </Link>
                <Link
                  className="btn-ghost"
                  to="/auth/register"
                  onClick={() => setAuthReturnPath("/profiles", { preserveIfPresent: true })}
                >
                  Создать аккаунт
                </Link>
              </>
            ) : guestProfilesToImport.length > 0 ? (
              <button
                type="button"
                className="btn-primary"
                onClick={() => {
                  setImportPromptDismissed(false);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              >
                Импортировать локальные профили
              </button>
            ) : (
              <button
                type="button"
                className="btn-primary"
                onClick={() => {
                  setRouteHint(null);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              >
                Выбрать профиль ниже
              </button>
            )}
            <button type="button" className="btn-ghost" onClick={() => setRouteHint(null)}>
              Скрыть
            </button>
          </div>
        </section>
      ) : null}

      <section className="account-status-card" data-testid="account-status-card">
        <div className="account-status-card-head">
          <div>
            <p className="account-status-kicker">Аккаунт</p>
            <h3>{auth.account?.displayName || auth.account?.email || accountStatusLabel}</h3>
            <p>{accountNextStepHint}</p>
          </div>
          <span className={`account-status-chip${auth.isAuthenticated ? " is-online" : ""}`}>
            {accountStatusLabel}
          </span>
        </div>

        <div className="account-status-grid">
          {auth.isAuthenticated ? (
            <>
              {editingDisplayName ? (
                <div className="account-status-metric account-status-metric-wide">
                  <form className="inline-edit-form" onSubmit={handleUpdateDisplayName}>
                    <input
                      type="text"
                      value={displayNameInput}
                      onChange={(e) => setDisplayNameInput(e.target.value)}
                      placeholder="Ваше имя"
                      maxLength={64}
                      autoFocus
                      data-testid="display-name-input"
                    />
                    <div className="inline-edit-actions">
                      <button
                        type="submit"
                        className="btn-tiny-primary"
                        disabled={updatingName || !displayNameInput.trim()}
                      >
                        {updatingName ? "..." : "Сохранить"}
                      </button>
                      <button
                        type="button"
                        className="btn-tiny-ghost"
                        onClick={cancelEditingDisplayName}
                      >
                        Отмена
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                <div className="account-status-metric">
                  <span className="account-status-metric-label">Имя</span>
                  <strong>{auth.account?.displayName ?? "Не задано"}</strong>
                  <button
                    type="button"
                    className="btn-inline-edit"
                    onClick={startEditingDisplayName}
                    title="Изменить имя"
                    data-testid="edit-display-name-btn"
                  >
                    Изменить
                  </button>
                </div>
              )}
              {editingEmail ? (
                <div className="account-status-metric account-status-metric-wide">
                  <form className="inline-edit-form" onSubmit={handleUpdateEmail}>
                    <input
                      type="email"
                      value={emailInput}
                      onChange={(event) => setEmailInput(event.target.value)}
                      placeholder="name@example.com"
                      maxLength={160}
                      autoFocus
                      data-testid="email-input"
                    />
                    <div className="inline-edit-actions">
                      <button
                        type="submit"
                        className="btn-tiny-primary"
                        disabled={updatingEmail || !emailInput.trim()}
                      >
                        {updatingEmail ? "..." : "Сменить почту"}
                      </button>
                      <button
                        type="button"
                        className="btn-tiny-ghost"
                        onClick={cancelEditingEmail}
                      >
                        Отмена
                      </button>
                    </div>
                  </form>
                  <p className="inline-edit-hint">
                    Мы отправим подтверждение на новый адрес. Смена почты завершится после перехода по письму.
                  </p>
                </div>
              ) : (
                <div className="account-status-metric">
                  <span className="account-status-metric-label">Email</span>
                  <strong>{auth.account?.email ?? "—"}</strong>
                  <button
                    type="button"
                    className="btn-inline-edit"
                    onClick={startEditingEmail}
                    title="Изменить email"
                    data-testid="edit-email-btn"
                  >
                    Изменить
                  </button>
                </div>
              )}
              <div className="account-status-metric">
                <span className="account-status-metric-label">Профили в аккаунте</span>
                <strong>{linkedProfiles.length}</strong>
              </div>
            </>
          ) : (
            <>
              <div className="account-status-metric">
                <span className="account-status-metric-label">Локальные профили</span>
                <strong>{guestProfiles.length}</strong>
              </div>
            </>
          )}
          <div className="account-status-metric">
            <span className="account-status-metric-label">Ждут сохранения</span>
            <strong>{syncCounts.pending}</strong>
          </div>
        </div>

        <div className="account-status-actions">
          {!auth.isConfigured ? (
            <a className="btn-primary" href="#profile-create-section">
              Создать локальный профиль
            </a>
          ) : auth.isAuthenticated ? (
            <>
              <button
                type="button"
                className="btn-primary"
                onClick={() => void handleSyncNow()}
                disabled={syncing || auth.isLoading}
              >
                {syncing || auth.syncInProgress ? "Обновляем..." : "Обновить данные"}
              </button>
              <button
                type="button"
                className="btn-ghost"
                onClick={() => void handleRequestPasswordReset()}
                disabled={passwordResetSending || !auth.account?.email}
              >
                {passwordResetSending ? "Отправляем письмо..." : "Сменить пароль"}
              </button>
              <button type="button" className="btn-ghost" onClick={() => void handleLogout()}>
                Выйти
              </button>
            </>
          ) : (
            <>
              <Link
                className="btn-primary"
                to="/auth/register"
                onClick={() => setAuthReturnPath("/profiles", { preserveIfPresent: true })}
              >
                Создать аккаунт
              </Link>
              <Link
                className="btn-ghost"
                to="/auth/login"
                onClick={() => setAuthReturnPath("/profiles", { preserveIfPresent: true })}
              >
                Войти
              </Link>
            </>
          )}
        </div>

        {auth.syncError ? (
          <p className="status-line error">{auth.syncError}</p>
        ) : null}

        {pendingEmailChange ? (
          <p className="status-line">
            Новый адрес <strong>{pendingEmailChange}</strong> ждёт подтверждения. Проверьте почту и завершите смену email.
          </p>
        ) : null}

        {lockedLinkedProfilesCount > 0 && !auth.isAuthenticated ? (
          <p className="status-line">
            На этом устройстве найдено {lockedLinkedProfilesCount} профилей, сохранённых в аккаунте.
            Они снова станут доступны после входа.
          </p>
        ) : null}
      </section>

      {auth.isAuthenticated && guestProfilesToImport.length > 0 && !importPromptDismissed ? (
        <section className="account-import-banner account-import-wizard" data-testid="account-import-banner">
          {importStatus === "idle" && (
            <>
              <div className="account-import-wizard-head">
                <div>
                  <p className="account-status-kicker">Шаг после входа</p>
                  <h3>Перенести локальные профили в аккаунт</h3>
                  <p>
                    На этом устройстве найдены локальные профили. Выберите, какие из них
                    нужно сохранить в аккаунте.
                  </p>
                </div>
                <span className="account-status-chip is-online">
                  Выбрано: {selectedImportProfiles.length}
                </span>
              </div>

              <div className="account-import-steps">
                <article className="account-import-step">
                  <strong>1. Что найдём</strong>
                  <p>{guestProfilesToImport.length} локальных профилей на этом устройстве.</p>
                </article>
                <article className="account-import-step">
                  <strong>2. Что перенесём</strong>
                  <p>Профили, историю тренировок, уровни, достижения и ежедневный прогресс.</p>
                </article>
                <article className="account-import-step">
                  <strong>3. Что останется</strong>
                  <p>Локальные данные не удаляются. После переноса они станут профилями аккаунта.</p>
                </article>
              </div>

              <div className="account-import-list" data-testid="account-import-list">
                {guestProfilesToImport.map((profile) => {
                  const isSelected = selectedImportIds.includes(profile.id);
                  return (
                    <button
                      key={profile.id}
                      type="button"
                      className={`account-import-item${isSelected ? " is-selected" : ""}`}
                      onClick={() => toggleImportSelection(profile.id)}
                    >
                      <span className="account-import-item-avatar">{getUserAvatar(profile)}</span>
                      <span className="account-import-item-copy">
                        <strong>{profile.name}</strong>
                        <span>
                          {appRoleLabel(normalizeUserRole(profile.role))} · {profile.totalSessions ?? 0} сессий
                        </span>
                      </span>
                      <span className="account-import-item-check">
                        {isSelected ? "Выбрано" : "Выбрать"}
                      </span>
                    </button>
                  );
                })}
              </div>

              <ImportActions
                importStatus={importStatus as "idle" | "importing"}
                selectedImportIds={selectedImportIds}
                allImportProfilesSelected={allImportProfilesSelected}
                onToggleSelectAll={toggleSelectAllImportProfiles}
                onImport={() => void handleImportSelected()}
                onDismiss={dismissImportPrompt}
              />
            </>
          )}

          {importStatus === "success" && importResult && (
            <div className="account-import-result">
              <div className="account-import-result-head">
                <h3>✅ Готово</h3>
                <p>
                  {importResult.imported} профилей сохранено в аккаунте.
                  {importResult.errors > 0 && ` ${importResult.errors} не удалось.`}
                </p>
              </div>
              <div className="account-import-actions">
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => {
                    dismissImportPrompt();
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                >
                  Продолжить
                </button>
              </div>
            </div>
          )}

          {importStatus === "error" && (
            <div className="account-import-result account-import-error">
              <div className="account-import-result-head">
                <h3>Не удалось сохранить профили</h3>
                <p>Проверьте подключение к интернету и попробуйте ещё раз.</p>
              </div>
              <div className="account-import-actions">
                <button
                  type="button"
                  className="btn-primary"
                  onClick={resetImportWizard}
                >
                  Попробовать ещё раз
                </button>
                <button type="button" className="btn-ghost" onClick={dismissImportPrompt}>
                  Пропустить
                </button>
              </div>
            </div>
          )}
        </section>
      ) : null}

      {recoveryMode && allowPrivilegedRoles ? (
        <p className="status-line" data-testid="profiles-recovery-mode-note">
          В системе нет активного профиля с ролью «Учитель». Назначьте хотя бы одного
          пользователя учителем, чтобы вернуть полный набор учебных прав.
        </p>
      ) : null}

      {/* Разделитель: конец блока аккаунта, начало тренировочных профилей */}
      <section className="profiles-section-divider" id="training-profiles-section">
        <h3>Тренировочные профили</h3>
        <p>
          Каждый профиль — это отдельный набор прогресса, настроек и истории тренировок.
          Можно создать несколько профилей для разных целей или членов семьи.
        </p>
      </section>

      <section className="profiles-section" id="profile-create-section">
        <div className="profiles-section-head">
          <div>
            <p className="account-status-kicker">Новый профиль</p>
            <h3>Создать тренировочный профиль</h3>
            <p>
              {auth.isAuthenticated
                ? "Новый профиль сразу появится в аккаунте и будет доступен на всех устройствах."
                : "Пока это будет локальный профиль на этом устройстве. Его можно сохранить в аккаунте позже."}
            </p>
          </div>
        </div>

        <form className="inline-form" onSubmit={handleCreate}>
          <label htmlFor="profile-name">Имя профиля</label>
          <input
            id="profile-name"
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Например, Миша"
            maxLength={32}
            data-testid="profile-name-input"
          />

          <label htmlFor="profile-avatar">Аватар</label>
          <AvatarSelector selectedAvatar={newAvatar} onSelect={setNewAvatar} />

          {canAssignRoleOnCreate ? (
            <>
              <label htmlFor="profile-role">Роль профиля</label>
              <select
                id="profile-role"
                value={newRole}
                onChange={(event) => setNewRole(event.target.value as AppRole)}
                data-testid="profile-role-select"
              >
                {createRoleOptions.map((role) => (
                  <option key={role} value={role}>
                    {getCreateRoleLabel(role)}
                  </option>
                ))}
              </select>
            </>
          ) : (
            <p className="status-line">
              В публичной версии новые профили создаются как «Домашний» или «Ученик».
              Учебные роли скрыты и не доступны в self-service режиме.
            </p>
          )}

          <button
            type="submit"
            className="btn-primary"
            disabled={loading || !canCreate}
            data-testid="create-profile-btn"
          >
            {auth.isAuthenticated ? "Создать профиль в аккаунте" : "Создать локальный профиль"}
          </button>
        </form>
      </section>

      {activeUser ? (
        <div className="active-profile-banner" data-testid="active-profile-banner">
          <span className="banner-icon">
            {userRepository.isLocked(activeUser, auth.account?.id) ? "🔒" : "✅"}
          </span>
          <span data-testid="active-profile-status">
            Активный профиль: <strong>{activeUser.name}</strong>{" "}
            ({appRoleLabel(normalizeUserRole(activeUser.role))})
            {userRepository.isLocked(activeUser, auth.account?.id)
              ? " — нужен вход в аккаунт"
              : ""}
          </span>
        </div>
      ) : (
        <p className="status-line" data-testid="active-profile-status">
          Активный профиль пока не выбран.
        </p>
      )}

      <section className="profiles-control-panel">
        <div className="profiles-search-row">
          <input
            type="text"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Поиск по имени или роли..."
            className="profiles-search-input"
            data-testid="profile-search-input"
          />
        </div>

        <div className="profiles-filters-row">
          <span className="filter-label">Фильтр:</span>
          <div className="profiles-role-filters" data-testid="role-filter">
            <button
              type="button"
              className={`filter-chip${roleFilter === "all" ? " is-active" : ""}`}
              onClick={() => setRoleFilter("all")}
              title="Все профили"
            >
              Все <span className="chip-count">{users.length}</span>
            </button>
            <button
              type="button"
              className={`filter-chip${roleFilter === "admin" ? " is-active" : ""}`}
              onClick={() => setRoleFilter("admin")}
              title="Администраторы"
            >
              👑 <span className="chip-count">{users.filter((u) => normalizeUserRole(u.role) === "admin").length}</span>
            </button>
            <button
              type="button"
              className={`filter-chip${roleFilter === "teacher" ? " is-active" : ""}`}
              onClick={() => setRoleFilter("teacher")}
              title="Учителя"
            >
              🍎 <span className="chip-count">{users.filter((u) => normalizeUserRole(u.role) === "teacher").length}</span>
            </button>
            <button
              type="button"
              className={`filter-chip${roleFilter === "student" ? " is-active" : ""}`}
              onClick={() => setRoleFilter("student")}
              title="Ученики"
            >
              🎓 <span className="chip-count">{users.filter((u) => normalizeUserRole(u.role) === "student").length}</span>
            </button>
            <button
              type="button"
              className={`filter-chip${roleFilter === "home" ? " is-active" : ""}`}
              onClick={() => setRoleFilter("home")}
              title="Домашние"
            >
              🏠 <span className="chip-count">{users.filter((u) => normalizeUserRole(u.role) === "home").length}</span>
            </button>
          </div>
        </div>

        <div className="profiles-sort-row">
          <span className="filter-label">Сортировка:</span>
          <div className="profiles-sort-buttons" data-testid="sort-order">
            <button
              type="button"
              className={`sort-btn${sortOrder === "name" ? " is-active" : ""}`}
              onClick={() => setSortOrder("name")}
            >
              🔤 Имя
            </button>
            <button
              type="button"
              className={`sort-btn${sortOrder === "date" ? " is-active" : ""}`}
              onClick={() => setSortOrder("date")}
            >
              📅 Дата
            </button>
            <button
              type="button"
              className={`sort-btn${sortOrder === "activity" ? " is-active" : ""}`}
              onClick={() => setSortOrder("activity")}
            >
              ⏰ Активность
            </button>
          </div>
        </div>
      </section>

      <div className="profiles-grid" data-testid="profiles-list">
        {filteredUsers.map((user) => {
          const isLocked = userRepository.isLocked(user, auth.account?.id);
          const role = normalizeUserRole(user.role);

          return (
            <ProfileCard
              key={user.id}
              user={user}
              isActive={user.id === activeUserId}
              isLocked={isLocked}
              canEdit={canEditUser(user)}
              canDelete={canEditUser(user) && !isProtectedLastTeacher(user)}
              canUpdateRole={canUpdateProfileRoles}
              lockTeacherRole={isProtectedLastTeacher(user)}
              canActivate={access.profiles.activate}
              onActivate={handleSetActive}
              onRename={handleRename}
              onDelete={handleDelete}
              onTrain={handleTrain}
              onUnlock={handleUnlockProfile}
              onUpdateRole={handleSaveRole}
              onSyncRetry={handleSyncProfile}
              avatar={getUserAvatar(user)}
              ownershipKind={user.ownershipKind}
              syncState={user.syncState}
              editableRoles={getEditableSelfServiceRoles(role)}
            />
          );
        })}
      </div>

      {filteredUsers.length === 0 ? (
        <section className="profiles-empty-state" data-testid="profiles-empty-state">
          <strong>
            {users.length === 0
              ? "Пока нет ни одного профиля."
              : "Под текущий фильтр профили не найдены."}
          </strong>
          <p>
            {users.length === 0
              ? auth.isAuthenticated
                ? "Создайте первый профиль в аккаунте или перенесите локальные профили с этого устройства."
                : auth.isConfigured
                  ? "Создайте локальный профиль выше или войдите в аккаунт, чтобы загрузить сохранённые профили."
                  : "Создайте локальный профиль выше и начните работать на этом устройстве."
              : searchQuery.trim()
                ? "Попробуйте очистить поисковый запрос или выбрать другой фильтр."
                : "Смените фильтр или сортировку, чтобы увидеть другие профили."}
          </p>
        </section>
      ) : null}

      {filteredUsers.length > 0 &&
      filteredLockedProfilesCount === filteredUsers.length &&
      !auth.isAuthenticated ? (
        <section className="profiles-empty-state profiles-empty-state-warning">
          <strong>Все найденные профили сохранены в аккаунте.</strong>
          <p>
            {auth.isConfigured
              ? "Войдите в аккаунт, чтобы открыть эти профили на устройстве, или создайте отдельный локальный профиль для быстрого старта без входа."
              : "Пока регистрация ещё не доступна, создайте отдельный локальный профиль для быстрого старта без входа."}
          </p>
          <div className="account-status-actions">
            {auth.isConfigured ? (
              <Link
                className="btn-primary"
                to="/auth/login"
                onClick={() => setAuthReturnPath("/profiles", { preserveIfPresent: true })}
              >
                Войти в аккаунт
              </Link>
            ) : null}
            <button
              type="button"
              className="btn-ghost"
              onClick={() => {
                setName("Новый локальный профиль");
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            >
              Создать локальный профиль
            </button>
          </div>
        </section>
      ) : null}

      {hasProfiles ? (
        <div className="action-row">
          <button
            type="button"
            className="btn-primary"
            onClick={() => navigate("/training")}
            disabled={!activeUserId || (activeUser ? userRepository.isLocked(activeUser, auth.account?.id) : false)}
          >
            Перейти к тренировкам
          </button>
        </div>
      ) : (
        <p>
          {auth.isConfigured
            ? "Создайте первый профиль выше или войдите в аккаунт, чтобы подтянуть уже сохранённые профили аккаунта."
            : "Создайте первый локальный профиль выше и начните пользоваться приложением на этом устройстве."}
        </p>
      )}

      {!auth.isAuthenticated ? (
        <div className="profiles-auth-hint">
          <p>
            {auth.isConfigured
              ? "Локальные профили работают без регистрации, но не сохраняются на других устройствах. Аккаунт нужен для сохранения прогресса и восстановления доступа."
              : "Сейчас доступен локальный режим. Регистрация и сохранение прогресса включатся после подключения сервиса аккаунтов."}
          </p>
          {auth.isConfigured ? (
            <div className="account-status-actions">
              <Link
                className="btn-primary"
                to="/auth/register"
                onClick={() => setAuthReturnPath("/profiles", { preserveIfPresent: true })}
              >
                Создать аккаунт
              </Link>
              <Link
                className="btn-ghost"
                to="/auth/login"
                onClick={() => setAuthReturnPath("/profiles", { preserveIfPresent: true })}
              >
                Уже есть аккаунт
              </Link>
            </div>
          ) : null}
        </div>
      ) : null}

      {status ? <p className="status-line success">{status}</p> : null}
      {error ? <p className="status-line error">{error}</p> : null}
    </section>
  );
}
