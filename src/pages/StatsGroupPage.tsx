import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { groupRepository } from "../entities/group/groupRepository";
import { userRepository } from "../entities/user/userRepository";
import { SCHULTE_MODES } from "../shared/lib/training/presets";
import { StatCard } from "../shared/ui/StatCard";
import type {
  ClassGroup,
  GroupMetric,
  GroupStatsPoint,
  GroupStatsSummary,
  TrainingModeId,
  User
} from "../shared/types/domain";

export function StatsGroupPage() {
  const [groups, setGroups] = useState<ClassGroup[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [groupId, setGroupId] = useState<string>("");
  const [newGroupName, setNewGroupName] = useState("");
  const [memberToAdd, setMemberToAdd] = useState("");
  const [modeId, setModeId] = useState<TrainingModeId>("classic_plus");
  const [metric, setMetric] = useState<GroupMetric>("score");
  const [period, setPeriod] = useState<number | "all">(30);
  const [summary, setSummary] = useState<GroupStatsSummary | null>(null);
  const [trend, setTrend] = useState<GroupStatsPoint[]>([]);
  const [members, setMembers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [percentile, setPercentile] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadBase() {
    const [loadedGroups, loadedUsers] = await Promise.all([
      groupRepository.listGroups(),
      userRepository.list()
    ]);
    setGroups(loadedGroups);
    setUsers(loadedUsers);

    if (!groupId && loadedGroups.length > 0) {
      setGroupId(loadedGroups[0].id);
    }
  }

  useEffect(() => {
    void loadBase();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!groupId) {
      setMembers([]);
      return;
    }

    let cancelled = false;
    void (async () => {
      const membersRows = await groupRepository.listMembers(groupId);
      if (cancelled) {
        return;
      }
      const memberSet = new Set(membersRows.map((entry) => entry.userId));
      const mapped = users.filter((entry) => memberSet.has(entry.id));
      setMembers(mapped);
      if (!selectedUserId && mapped.length > 0) {
        setSelectedUserId(mapped[0].id);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [groupId, selectedUserId, users]);

  useEffect(() => {
    if (!groupId) {
      setSummary(null);
      setTrend([]);
      setPercentile(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    void (async () => {
      try {
        const [stats, percentileResult] = await Promise.all([
          groupRepository.aggregateGroupStats(groupId, modeId, period, metric),
          selectedUserId
            ? groupRepository.getUserPercentileInGroup(
                groupId,
                selectedUserId,
                metric,
                period
              )
            : Promise.resolve(null)
        ]);
        if (cancelled) {
          return;
        }

        setSummary(stats.summary);
        setTrend(stats.trend);
        setPercentile(percentileResult?.percentile ?? null);
      } catch {
        if (!cancelled) {
          setError("Не удалось загрузить групповую статистику.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [groupId, metric, modeId, period, selectedUserId]);

  const usersOutsideGroup = useMemo(() => {
    const memberSet = new Set(members.map((entry) => entry.id));
    return users.filter((entry) => !memberSet.has(entry.id));
  }, [members, users]);

  async function handleCreateGroup(event: FormEvent) {
    event.preventDefault();
    if (newGroupName.trim().length < 2) {
      return;
    }
    await groupRepository.createGroup(newGroupName.trim());
    setNewGroupName("");
    await loadBase();
  }

  async function handleAddMember() {
    if (!groupId || !memberToAdd) {
      return;
    }
    await groupRepository.addMember(groupId, memberToAdd);
    setMemberToAdd("");
    const membersRows = await groupRepository.listMembers(groupId);
    const memberSet = new Set(membersRows.map((entry) => entry.userId));
    setMembers(users.filter((entry) => memberSet.has(entry.id)));
  }

  async function handleRemoveMember(userId: string) {
    if (!groupId) {
      return;
    }
    await groupRepository.removeMember(groupId, userId);
    const membersRows = await groupRepository.listMembers(groupId);
    const memberSet = new Set(membersRows.map((entry) => entry.userId));
    setMembers(users.filter((entry) => memberSet.has(entry.id)));
  }

  return (
    <section className="panel" data-testid="stats-group-page">
      <h2>Групповая статистика</h2>
      <p>Локальная аналитика класса: лучший, средний, худший и перцентиль.</p>

      <div className="segmented-row">
        <Link className="btn-secondary" to="/stats/individual">
          Индивидуальная
        </Link>
        <Link className="btn-secondary is-active" to="/stats/group">
          Группа
        </Link>
      </div>

      <form className="inline-form" onSubmit={handleCreateGroup}>
        <label htmlFor="group-name">Новая группа</label>
        <input
          id="group-name"
          value={newGroupName}
          onChange={(event) => setNewGroupName(event.target.value)}
          placeholder="Например, 3А"
        />
        <button type="submit" className="btn-primary">
          Создать группу
        </button>
      </form>

      <div className="settings-form">
        <label htmlFor="group-select">Группа</label>
        <select
          id="group-select"
          value={groupId}
          onChange={(event) => setGroupId(event.target.value)}
        >
          <option value="">Выберите группу</option>
          {groups.map((group) => (
            <option key={group.id} value={group.id}>
              {group.name}
            </option>
          ))}
        </select>

        <label htmlFor="mode-select">Режим</label>
        <select
          id="mode-select"
          value={modeId}
          onChange={(event) => setModeId(event.target.value as TrainingModeId)}
        >
          {SCHULTE_MODES.map((mode) => (
            <option key={mode.id} value={mode.id}>
              {mode.title}
            </option>
          ))}
        </select>

        <label htmlFor="metric-select">Метрика</label>
        <select
          id="metric-select"
          value={metric}
          onChange={(event) => setMetric(event.target.value as GroupMetric)}
        >
          <option value="score">Score</option>
          <option value="accuracy">Accuracy</option>
          <option value="speed">Speed</option>
        </select>

        <label htmlFor="period-select">Период</label>
        <select
          id="period-select"
          value={String(period)}
          onChange={(event) =>
            setPeriod(event.target.value === "all" ? "all" : Number(event.target.value))
          }
        >
          <option value={7}>7 дней</option>
          <option value={30}>30 дней</option>
          <option value="all">Все время</option>
        </select>
      </div>

      {groupId ? (
        <section className="setup-block">
          <h3>Состав группы</h3>
          <div className="action-row">
            <select
              value={memberToAdd}
              onChange={(event) => setMemberToAdd(event.target.value)}
            >
              <option value="">Добавить ученика</option>
              {usersOutsideGroup.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </select>
            <button type="button" className="btn-secondary" onClick={() => void handleAddMember()}>
              Добавить в группу
            </button>
          </div>

          <ul className="profiles-list">
            {members.map((member) => (
              <li key={member.id} className="profile-item">
                <div>
                  <p className="profile-name">{member.name}</p>
                </div>
                <button
                  type="button"
                  className="btn-danger"
                  onClick={() => void handleRemoveMember(member.id)}
                >
                  Убрать
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="stats-grid compact">
        <StatCard title="Лучший" value={summary?.best != null ? summary.best.toFixed(2) : "—"} />
        <StatCard title="Средний" value={summary?.avg != null ? summary.avg.toFixed(2) : "—"} />
        <StatCard title="Худший" value={summary?.worst != null ? summary.worst.toFixed(2) : "—"} />
        <StatCard title="Сессий" value={String(summary?.sessionsTotal ?? 0)} />
      </div>

      <section className="setup-block">
        <h3>Перцентиль ученика</h3>
        <div className="action-row">
          <select
            value={selectedUserId}
            onChange={(event) => setSelectedUserId(event.target.value)}
          >
            <option value="">Выберите ученика</option>
            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </select>
          <p className="status-line">
            {percentile != null ? `Перцентиль: ${percentile.toFixed(1)}%` : "Перцентиль: —"}
          </p>
        </div>
      </section>

      {loading ? <p>Загрузка групповой статистики...</p> : null}
      {error ? <p className="error-text">{error}</p> : null}

      <div className="chart-box">
        <h3>Динамика среднего по группе</h3>
        {trend.length === 0 ? (
          <p>Пока нет данных для выбранных фильтров.</p>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={trend}>
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="avg"
                name="Средний"
                stroke="#1e7f71"
                strokeWidth={3}
                dot={{ r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="best"
                name="Лучший"
                stroke="#2e62c9"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="worst"
                name="Худший"
                stroke="#c9583a"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </section>
  );
}
