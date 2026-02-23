import { Navigate } from "react-router-dom";
import { useActiveUser } from "./ActiveUserContext";
import type { PropsWithChildren } from "react";

export function RequireActiveUser({ children }: PropsWithChildren) {
  const { activeUserId } = useActiveUser();

  if (!activeUserId) {
    return <Navigate to="/profiles" replace />;
  }

  return children;
}

