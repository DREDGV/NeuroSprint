import type { PropsWithChildren } from "react";
import { Link } from "react-router-dom";
import { appRoleLabel } from "../shared/lib/settings/appRole";
import {
  hasPermission,
  rolesWithPermission,
  type AppPermission
} from "../shared/lib/auth/permissions";
import { useAppRole } from "./useAppRole";

interface RequirePermissionProps extends PropsWithChildren {
  permission: AppPermission;
  sectionTitle: string;
  testId?: string;
}

export function RequirePermission({
  permission,
  sectionTitle,
  testId = "permission-denied-panel",
  children
}: RequirePermissionProps) {
  const appRole = useAppRole();
  const hasAccess = hasPermission(appRole, permission);

  if (hasAccess) {
    return <>{children}</>;
  }

  const allowedRoles = rolesWithPermission(permission)
    .map((role) => appRoleLabel(role))
    .join(", ");

  return (
    <section className="panel" data-testid={testId}>
      <h2>{sectionTitle}</h2>
      <p className="status-line">
        Раздел недоступен для текущей роли: <strong>{appRoleLabel(appRole)}</strong>.
      </p>
      <p className="status-line">
        Чтобы открыть раздел, выберите роль: <strong>{allowedRoles}</strong>.
      </p>
      <div className="action-row">
        <Link to="/profiles" className="btn-secondary">
          Профили
        </Link>
        <Link to="/settings" className="btn-ghost">
          Настройки роли
        </Link>
      </div>
    </section>
  );
}
