import { NavLink } from "react-router-dom";
import type { AppRole } from "../shared/types/domain";
import {
  canManageClasses,
  canViewProfiles
} from "../shared/lib/auth/permissions";

interface NavItem {
  id: string;
  to: string;
  label: string;
  visible: (role: AppRole) => boolean;
}

const navItems: NavItem[] = [
  { id: "home", to: "/", label: "Главная", visible: () => true },
  {
    id: "training",
    to: "/training",
    label: "Тренировки",
    visible: () => true
  },
  {
    id: "stats",
    to: "/stats",
    label: "Статистика",
    visible: () => true
  },
  { id: "classes", to: "/classes", label: "Классы", visible: canManageClasses },
  { id: "help", to: "/help", label: "Справка", visible: () => true },
  { id: "profiles", to: "/profiles", label: "Профили", visible: canViewProfiles },
  {
    id: "settings",
    to: "/settings",
    label: "Настройки",
    visible: () => true
  }
];

export function MainNav({ role = "teacher" }: { role?: AppRole }) {
  const visibleItems = navItems.filter((item) => item.visible(role));

  return (
    <nav className="main-nav" aria-label="Основная навигация">
      {visibleItems.map((item) => (
        <NavLink
          key={item.id}
          to={item.to}
          data-testid={`nav-link-${item.id}`}
          className={({ isActive }) =>
            isActive ? "nav-link nav-link-active" : "nav-link"
          }
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}
