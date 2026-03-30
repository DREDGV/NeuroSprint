import { NavLink } from "react-router-dom";
import { useRoleAccess } from "../app/useRoleAccess";
import type { RoleAccess } from "../shared/lib/auth/permissions";
import { useFeatureFlags } from "../shared/lib/online/featureFlags";

interface NavItem {
  id: string;
  to: string;
  label: string;
  visible: (access: RoleAccess) => boolean;
}

const navItems: NavItem[] = [
  { id: "home", to: "/", label: "Главная", visible: () => true },
  { id: "training", to: "/training", label: "Тренажёры", visible: () => true },
  { id: "stats", to: "/stats", label: "Статистика", visible: () => true },
  { id: "classes", to: "/classes", label: "Классы", visible: (access) => access.classes.manage },
  {
    id: "competitions",
    to: "/competitions",
    label: "Соревнования",
    visible: (access) => access.classes.manage
  },
  { id: "help", to: "/help", label: "Справка", visible: () => true },
  { id: "profiles", to: "/profiles", label: "Профили", visible: (access) => access.profiles.view },
  { id: "settings", to: "/settings", label: "Настройки", visible: () => true }
];

export function MainNav() {
  const access = useRoleAccess();
  const flags = useFeatureFlags();

  const visibleItems = navItems.filter((item) => {
    if (item.id === "classes" && !flags.classes_ui) {
      return false;
    }
    if (item.id === "competitions" && !flags.competitions_ui) {
      return false;
    }
    return item.visible(access);
  });

  return (
    <nav className="main-nav" aria-label="Основная навигация">
      {visibleItems.map((item) => (
        <NavLink
          key={item.id}
          to={item.to}
          data-testid={`nav-link-${item.id}`}
          className={({ isActive }) => (isActive ? "nav-link nav-link-active" : "nav-link")}
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}
