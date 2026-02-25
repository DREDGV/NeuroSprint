import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAppRole } from "../app/useAppRole";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { groupRepository } from "../entities/group/groupRepository";
import { sessionRepository } from "../entities/session/sessionRepository";
import {
  canJoinClassAsStudent,
  normalizeUserRole
} from "../entities/user/userRole";
import { userRepository } from "../entities/user/userRepository";
import { canViewGroupStats } from "../shared/lib/auth/permissions";
import { appRoleLabel } from "../shared/lib/settings/appRole";
import {
  SCHULTE_MODES,
  SPRINT_MATH_MODES
} from "../shared/lib/training/presets";
import { StatCard } from "../shared/ui/StatCard";
import type {
  ClassGroup,
  GroupLevelBucket,
  GroupMetric,
  GroupStatsPoint,
  GroupStatsSummary,
  TrainingModuleId,
  TrainingModeId,
  User
} from "../shared/types/domain";

const GROUP_MODULES: Array<{ id: TrainingModuleId; title: string }> = [
  { id: "schulte", title: "Таблица Шульте" },
  { id: "sprint_math", title: "Sprint Math" }
];

function metricTitle(metric: GroupMetric): string {
  if (metric === "accuracy") {
    return "Точность (%)";
  }
  if (metric === "speed") {
    return "Скорость";
  }
  return "Score";
}

function formatMetric(value: number | null | undefined, metric: GroupMetric): string {
  if (value == null) {
    return "—";
  }
  if (metric === "accuracy") {
    return `${value.toFixed(1)}%`;
  }
  return value.toFixed(2);
}

export function StatsGroupPage() {
  const appRole = useAppRole();
  const canViewGroupStatsAccess = canViewGroupStats(appRole);
  const [groups, setGroups] = useState<ClassGroup[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [groupId, setGroupId] = useState<string>("");
  const [newGroupName, setNewGroupName] = useState("");
  const [memberToAdd, setMemberToAdd] = useState("");
  const [moduleId, setModuleId] = useState<TrainingModuleId>("schulte");
  const [modeId, setModeId] = useState<TrainingModeId>("classic_plus");
  const [metric, setMetric] = useState<GroupMetric>("score");
  const [period, setPeriod] = useState<number | "all">(30);
  const [compareGroupId, setCompareGroupId] = useState<string>("");
  const [summary, setSummary] = useState<GroupStatsSummary | null>(null);
  const [globalAverage, setGlobalAverage] = useState<number | null>(null);
  const [compareGroupAverage, setCompareGroupAverage] = useState<number | null>(null);
  const [trend, setTrend] = useState<GroupStatsPoint[]>([]);
  const [levelDistribution, setLevelDistribution] = useState<GroupLevelBucket[]>([]);
  const [members, setMembers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [percentile, setPercentile] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const availableModes = useMemo(
    () => (moduleId === "sprint_math" ? SPRINT_MATH_MODES : SCHULTE_MODES),
    [moduleId]
  );

  const selectedModeTitle = useMemo(
    () => availableModes.find((entry) => entry.id === modeId)?.title ?? modeId,
    [availableModes, modeId]
  );

  async function loadBase(): Promise<void> {
    const [loadedGroups, loadedUsers] = await Promise.all([
      groupRepository.listGroups(),
      userRepository.list()
    ]);
    setGroups(loadedGroups);
    setUsers(loadedUsers);

    if (!groupId && loadedGroups.length > 0) {
      setGroupId(loadedGroups[0].id);
    }
    if (!compareGroupId && loadedGroups.length > 1) {
      setCompareGroupId(loadedGroups[1].id);
    }
  }

  useEffect(() => {
    if (!canViewGroupStatsAccess) {
      setGroups([]);
      setUsers([]);
      setGroupId("");
      setCompareGroupId("");
      return;
    }
    void loadBase();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canViewGroupStatsAccess]);

  async function reloadMembers(targetGroupId: string): Promise<User[]> {
    const membersRows = await groupRepository.listMembers(targetGroupId);
    const memberSet = new Set(membersRows.map((entry) => entry.userId));
    const mapped = users.filter((entry) => memberSet.has(entry.id));
    setMembers(mapped);

    if (mapped.length === 0) {
      setSelectedUserId("");
    } else if (!mapped.some((entry) => entry.id === selectedUserId)) {
      setSelectedUserId(mapped[0].id);
    }

    return mapped;
  }

  useEffect(() => {
    if (!groupId) {
      setMembers([]);
      setSelectedUserId("");
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

      if (mapped.length === 0) {
        setSelectedUserId("");
      } else if (!mapped.some((entry) => entry.id === selectedUserId)) {
        setSelectedUserId(mapped[0].id);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [groupId, selectedUserId, users]);

  useEffect(() => {
    if (compareGroupId && compareGroupId === groupId) {
      const fallback = groups.find((entry) => entry.id !== groupId)?.id ?? "";
      setCompareGroupId(fallback);
    }
  }, [compareGroupId, groupId, groups]);

  useEffect(() => {
    if (availableModes.some((entry) => entry.id === modeId)) {
      return;
    }
    const fallbackMode = availableModes[0]?.id ?? "classic_plus";
    setModeId(fallbackMode);
  }, [availableModes, modeId]);

  useEffect(() => {
    if (!groupId) {
      setSummary(null);
      setTrend([]);
      setLevelDistribution([]);
      setPercentile(null);
      setGlobalAverage(null);
      setCompareGroupAverage(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    void (async () => {
      try {
        const [stats, percentileResult, globalStats, compareStats] = await Promise.all([
          groupRepository.aggregateGroupStats(groupId, modeId, period, metric),
          selectedUserId
            ? groupRepository.getUserPercentileInGroup(
                groupId,
                selectedUserId,
                modeId,
                metric,
                period
              )
            : Promise.resolve(null),
          sessionRepository.getModeMetricSnapshot(modeId, metric, period),
          compareGroupId
            ? groupRepository.aggregateGroupStats(compareGroupId, modeId, period, metric)
            : Promise.resolve(null)
        ]);

        if (cancelled) {
          return;
        }

        setSummary(stats.summary);
        setTrend(stats.trend);
        setLevelDistribution(stats.levelDistribution);
        setPercentile(percentileResult?.percentile ?? null);
        setGlobalAverage(globalStats.summary.avg);
        setCompareGroupAverage(compareStats?.summary.avg ?? null);
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
  }, [compareGroupId, groupId, metric, modeId, period, selectedUserId]);

  const usersOutsideGroup = useMemo(() => {
    const memberSet = new Set(members.map((entry) => entry.id));
    return users.filter(
      (entry) => canJoinClassAsStudent(normalizeUserRole(entry.role)) && !memberSet.has(entry.id)
    );
  }, [members, users]);

  async function handleCreateGroup(event: FormEvent): Promise<void> {
    event.preventDefault();
    if (newGroupName.trim().length < 2) {
      return;
    }
    await groupRepository.createGroup(newGroupName.trim());
    setNewGroupName("");
    await loadBase();
  }

  async function handleAddMember(): Promise<void> {
    if (!groupId || !memberToAdd) {
      return;
    }
    await groupRepository.addMember(groupId, memberToAdd);
    setMemberToAdd("");
    await reloadMembers(groupId);
  }

  async function handleRemoveMember(userId: string): Promise<void> {
    if (!groupId) {
      return;
    }
    await groupRepository.removeMember(groupId, userId);
    await reloadMembers(groupId);
  }

  const hasGroup = Boolean(groupId);

  if (!canViewGroupStatsAccess) {
    return (
      <section className="panel" data-testid="stats-group-page">
        <h2>Групповая статистика</h2>
        <p className="status-line">
          Раздел доступен только для роли «Учитель».
        </p>
        <div className="action-row">
          <Link className="btn-secondary" to="/settings">
            Выбрать роль
          </Link>
          <Link className="btn-ghost" to="/stats">
            Перейти к простой статистике
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="panel" data-testid="stats-group-page">
      <h2>Групповая статистика</h2>
      <p>
        Локальная аналитика класса: лучший, средний, худший результат,
        перцентиль ученика и распределение по уровням.
      </p>

      <div className="segmented-row">
        <Link className="btn-secondary" to="/stats/individual">
          Индивидуальная
        </Link>
        <Link className="btn-secondary is-active" to="/stats/group">
          Группа
        </Link>
        <Link className="btn-secondary" to="/classes">
          Классы
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
        <label htmlFor="module-select">Модуль</label>
        <select
          id="module-select"
          data-testid="stats-group-module-select"
          value={moduleId}
          onChange={(event) => setModuleId(event.target.value as TrainingModuleId)}
        >
          {GROUP_MODULES.map((module) => (
            <option key={module.id} value={module.id}>
              {module.title}
            </option>
          ))}
        </select>

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
          data-testid="stats-group-mode-select"
          value={modeId}
          onChange={(event) => setModeId(event.target.value as TrainingModeId)}
        >
          {availableModes.map((mode) => (
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
          <option value={14}>14 дней</option>
          <option value={30}>30 дней</option>
          <option value={90}>90 дней</option>
          <option value="all">Все время</option>
        </select>
      </div>

      {!hasGroup ? (
        <p className="status-line">Создайте группу и добавьте учеников, чтобы увидеть аналитику.</p>
      ) : null}

      {hasGroup ? (
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
                  {user.name} ({appRoleLabel(normalizeUserRole(user.role))})
                </option>
              ))}
            </select>
            <button type="button" className="btn-secondary" onClick={() => void handleAddMember()}>
              Добавить в группу
            </button>
          </div>

          <ul className="profiles-list scrollable">
            {members.map((member) => (
              <li key={member.id} className="profile-item">
                <div>
                  <p className="profile-name">{member.name}</p>
                  <span className="role-pill">
                    {appRoleLabel(normalizeUserRole(member.role))}
                  </span>
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
        <StatCard title="Метрика" value={metricTitle(metric)} />
        <StatCard title="Лучший" value={formatMetric(summary?.best, metric)} />
        <StatCard title="Средний" value={formatMetric(summary?.avg, metric)} />
        <StatCard title="Худший" value={formatMetric(summary?.worst, metric)} />
        <StatCard title="Сессий" value={String(summary?.sessionsTotal ?? 0)} />
        <StatCard title="Участников" value={String(summary?.membersTotal ?? 0)} />
      </div>

      <section className="setup-block" data-testid="group-comparison-block">
        <h3>Сравнение групп и общей статистики</h3>
        <div className="action-row">
          <select
            value={compareGroupId}
            onChange={(event) => setCompareGroupId(event.target.value)}
          >
            <option value="">Выберите группу для сравнения</option>
            {groups
              .filter((entry) => entry.id !== groupId)
              .map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.name}
                </option>
              ))}
          </select>
        </div>

        <div className="comparison-grid">
          <StatCard title="Текущая группа" value={formatMetric(summary?.avg, metric)} />
          <StatCard
            title="Группа для сравнения"
            value={formatMetric(compareGroupAverage, metric)}
          />
          <StatCard
            title="Все пользователи"
            value={formatMetric(globalAverage, metric)}
          />
        </div>
        <p className="comparison-note">
          Метрика сравнения: {metricTitle(metric)} за выбранный период в режиме {selectedModeTitle}.
        </p>
      </section>

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
                {member.name} ({appRoleLabel(normalizeUserRole(member.role))})
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
        <h3>Динамика по группе</h3>
        {trend.length === 0 ? (
          <p>Пока нет данных для выбранных фильтров.</p>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={trend}>
              <CartesianGrid strokeDasharray="4 4" />
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

      <div className="chart-box">
        <h3>Распределение уровней</h3>
        {levelDistribution.length === 0 ? (
          <p>Недостаточно данных для гистограммы уровней.</p>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={levelDistribution}>
              <CartesianGrid strokeDasharray="4 4" />
              <XAxis dataKey="level" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" name="Сессий" fill="#f2a93b" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </section>
  );
}


