import { useEffect, useMemo, useState } from "react";
import { userRepository } from "../entities/user/userRepository";
import { normalizeUserRole } from "../entities/user/userRole";
import { useActiveUser } from "./ActiveUserContext";
import { useAuth } from "./useAuth";
import type { AppRole, User } from "../shared/types/domain";

export function useActiveUserDisplayName(): {
  activeUserId: string | null;
  activeUserName: string;
  activeUserRole: AppRole | null;
  activeUserLocked: boolean;
} {
  const { activeUserId } = useActiveUser();
  const auth = useAuth();
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    let cancelled = false;
    void userRepository.list().then((items) => {
      if (!cancelled) {
        setUsers(items);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [activeUserId, auth.account?.id]);

  const activeUser = useMemo(
    () => users.find((user) => user.id === activeUserId) ?? null,
    [activeUserId, users]
  );

  const activeUserLocked = useMemo(
    () => Boolean(activeUser && userRepository.isLocked(activeUser, auth.account?.id)),
    [activeUser, auth.account?.id]
  );

  const activeUserName = useMemo(() => {
    if (!activeUserId) {
      return "Не выбран";
    }
    if (!activeUser) {
      return "Пользователь не найден";
    }
    if (activeUserLocked) {
      return `${activeUser.name} (нужен вход)`;
    }
    return activeUser.name;
  }, [activeUser, activeUserId, activeUserLocked]);

  const activeUserRole = useMemo(() => {
    if (!activeUser || activeUserLocked) {
      return null;
    }
    return normalizeUserRole(activeUser.role);
  }, [activeUser, activeUserLocked]);

  return { activeUserId, activeUserName, activeUserRole, activeUserLocked };
}
