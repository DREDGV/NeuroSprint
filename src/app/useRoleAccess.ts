import { useMemo } from "react";
import { buildRoleAccess } from "../shared/lib/auth/permissions";
import { useAppRole } from "./useAppRole";

export function useRoleAccess() {
  const role = useAppRole();
  return useMemo(() => buildRoleAccess(role), [role]);
}
