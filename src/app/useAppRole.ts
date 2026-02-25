import { useEffect, useState } from "react";
import { getAppRole, subscribeAppRole } from "../shared/lib/settings/appRole";
import type { AppRole } from "../shared/types/domain";

export function useAppRole(): AppRole {
  const [role, setRole] = useState<AppRole>(() => getAppRole());

  useEffect(() => subscribeAppRole(setRole), []);

  return role;
}
