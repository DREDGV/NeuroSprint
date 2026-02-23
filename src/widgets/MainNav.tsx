import { NavLink } from "react-router-dom";

const navItems = [
  { to: "/", label: "Главная" },
  { to: "/profiles", label: "Профили" },
  { to: "/play/schulte/classic", label: "Classic" },
  { to: "/play/schulte/timed", label: "Timed" },
  { to: "/stats", label: "Статистика" },
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

