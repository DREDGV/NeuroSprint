import { Navigate, useLocation } from "react-router-dom";
import { useEffect, useState, type PropsWithChildren } from "react";
import { useActiveUser } from "./ActiveUserContext";
import { useAuth } from "./useAuth";
import { userRepository } from "../entities/user/userRepository";
import { setAuthReturnPath } from "../shared/lib/auth/authReturnPath";

type GuardState = "checking" | "allowed" | "redirect";
type RedirectReason = "missing_profile" | "locked_profile";

export function RequireActiveUser({ children }: PropsWithChildren) {
  const { activeUserId } = useActiveUser();
  const auth = useAuth();
  const location = useLocation();
  const [guardState, setGuardState] = useState<GuardState>("checking");
  const [redirectReason, setRedirectReason] = useState<RedirectReason>("missing_profile");

  useEffect(() => {
    let cancelled = false;

    async function validate(): Promise<void> {
      if (!activeUserId) {
        if (!cancelled) {
          setRedirectReason("missing_profile");
          setGuardState("redirect");
        }
        return;
      }

      const user = await userRepository.getById(activeUserId);
      if (!user) {
        if (!cancelled) {
          setRedirectReason("missing_profile");
          setGuardState("redirect");
        }
        return;
      }

      const isLocked = userRepository.isLocked(user, auth.account?.id);
      if (!cancelled) {
        setRedirectReason(isLocked ? "locked_profile" : "missing_profile");
        setGuardState(isLocked ? "redirect" : "allowed");
      }
    }

    if (auth.isLoading) {
      setGuardState("checking");
      return () => {
        cancelled = true;
      };
    }

    void validate();

    return () => {
      cancelled = true;
    };
  }, [activeUserId, auth.account?.id, auth.isLoading]);

  if (auth.isLoading || guardState === "checking") {
    return <p className="status-line">Проверяем доступ к профилю...</p>;
  }

  if (guardState === "redirect") {
    const nextPath = `${location.pathname}${location.search}${location.hash}`;
    setAuthReturnPath(nextPath);
    return (
      <Navigate
        to="/profiles"
        replace
        state={{ redirectReason }}
      />
    );
  }

  return children;
}
