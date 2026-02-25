import { useEffect, useMemo, useState } from "react";
import { userRepository } from "../entities/user/userRepository";
import { normalizeUserRole } from "../entities/user/userRole";
import { useActiveUser } from "./ActiveUserContext";
import type { AppRole, User } from "../shared/types/domain";

export function useActiveUserDisplayName(): {
  activeUserId: string | null;
  activeUserName: string;
  activeUserRole: AppRole | null;
} {
  const { activeUserId } = useActiveUser();
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
  }, [activeUserId]);

  const activeUserName = useMemo(() => {
    if (!activeUserId) {
      return "Не выбран";
    }
    return users.find((user) => user.id === activeUserId)?.name ?? "Пользователь не найден";
  }, [activeUserId, users]);

  const activeUserRole = useMemo(() => {
    if (!activeUserId) {
      return null;
    }
    const user = users.find((entry) => entry.id === activeUserId);
    if (!user) {
      return null;
    }
    return normalizeUserRole(user.role);
  }, [activeUserId, users]);

  return { activeUserId, activeUserName, activeUserRole };
}
