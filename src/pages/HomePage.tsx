import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { useActiveUser } from "../app/ActiveUserContext";
import { userRepository } from "../entities/user/userRepository";
import type { User } from "../shared/types/domain";

export function HomePage() {
  const { activeUserId } = useActiveUser();
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    let isMounted = true;
    void userRepository.list().then((items) => {
      if (isMounted) {
        setUsers(items);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const activeUserName = useMemo(() => {
    if (!activeUserId) {
      return "Не выбран";
    }
    return users.find((item) => item.id === activeUserId)?.name ?? "Не найден";
  }, [activeUserId, users]);

  return (
    <section className="panel" data-testid="home-page">
      <h2>Главный экран</h2>
      <p>
        NeuroSprint помогает развивать скорость обработки информации, внимание и
        точность.
      </p>
      <p>
        Активный пользователь: <strong>{activeUserName}</strong>
      </p>
      <div className="action-row">
        <Link className="btn-primary" to="/play/schulte/classic">
          Начать Classic
        </Link>
        <Link className="btn-secondary" to="/play/schulte/timed">
          Начать Timed
        </Link>
      </div>
    </section>
  );
}

