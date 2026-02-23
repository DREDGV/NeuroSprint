import {
  createContext,
  useContext,
  useMemo,
  useState,
  type PropsWithChildren
} from "react";
import { ACTIVE_USER_KEY } from "../shared/constants/storage";

interface ActiveUserContextValue {
  activeUserId: string | null;
  setActiveUserId: (userId: string | null) => void;
}

const ActiveUserContext = createContext<ActiveUserContextValue | undefined>(
  undefined
);

function readActiveUserId(): string | null {
  try {
    return localStorage.getItem(ACTIVE_USER_KEY);
  } catch {
    return null;
  }
}

export function ActiveUserProvider({ children }: PropsWithChildren) {
  const [activeUserId, setActiveUserIdState] = useState<string | null>(
    readActiveUserId
  );

  const setActiveUserId = (userId: string | null) => {
    setActiveUserIdState(userId);
    if (userId) {
      localStorage.setItem(ACTIVE_USER_KEY, userId);
    } else {
      localStorage.removeItem(ACTIVE_USER_KEY);
    }
  };

  const value = useMemo<ActiveUserContextValue>(
    () => ({
      activeUserId,
      setActiveUserId
    }),
    [activeUserId]
  );

  return (
    <ActiveUserContext.Provider value={value}>
      {children}
    </ActiveUserContext.Provider>
  );
}

export function useActiveUser() {
  const context = useContext(ActiveUserContext);
  if (!context) {
    throw new Error("useActiveUser must be used within ActiveUserProvider");
  }
  return context;
}

