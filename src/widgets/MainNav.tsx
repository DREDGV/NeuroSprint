import { NavLink } from "react-router-dom";

const navItems = [
  { to: "/", label: "Главная" },
  { to: "/training", label: "Тренировки" },
  { to: "/stats", label: "Статистика" },
  { to: "/classes", label: "Классы" },
  { to: "/help", label: "Справка" },
  { to: "/profiles", label: "Профили" },
  { to: "/settings", label: "Настройки" }
];

export function MainNav() {
  return (
    <nav className="main-nav" aria-label="Основная навигация">
      {navItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
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
