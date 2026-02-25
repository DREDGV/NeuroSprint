import { useEffect, useMemo, useState } from "react";
import { userRepository } from "../entities/user/userRepository";
import { useActiveUser } from "./ActiveUserContext";
import type { User } from "../shared/types/domain";

export function useActiveUserDisplayName(): {
  activeUserId: string | null;
  activeUserName: string;
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

  return { activeUserId, activeUserName };
}
