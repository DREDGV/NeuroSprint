import { Link } from "react-router-dom";

interface SessionResultMetric {
  label: string;
  value: string;
  testId?: string;
}

interface SessionSaveState {
  text: string;
  testId: string;
}

interface SessionResultSummaryProps {
  testId: string;
  title: string;
  metrics: SessionResultMetric[];
  previousSummary: string;
  bestSummary?: string | null;
  tip: string;
  saveSummary: string;
  saveState?: SessionSaveState;
  extraNotes?: string[];
  retryLabel?: string;
  statsLabel?: string;
  statsTo?: string;
  onRetry: () => void;
}

export function SessionResultSummary({
  testId,
  title,
  metrics,
  previousSummary,
  bestSummary,
  tip,
  saveSummary,
  saveState,
  extraNotes,
  retryLabel = "Повторить",
  statsLabel = "К статистике",
  statsTo = "/stats",
  onRetry
}: SessionResultSummaryProps) {
  return (
    <section className="result-box" data-testid={testId}>
      <h3>{title}</h3>

      {metrics.map((metric) => (
        <p key={metric.label} data-testid={metric.testId}>
          {metric.label}: {metric.value}
        </p>
      ))}

      <p>{previousSummary}</p>
      {bestSummary ? <p>{bestSummary}</p> : null}
      <p className="status-line">{tip}</p>
      {saveState ? <p data-testid={saveState.testId}>{saveState.text}</p> : null}
      <p>{saveSummary}</p>

      {extraNotes?.map((note) => (
        <p key={note} className="status-line">
          {note}
        </p>
      ))}

      <div className="action-row">
        <button
          type="button"
          className="btn-secondary"
          onClick={onRetry}
          data-testid={`${testId}-retry-btn`}
        >
          {retryLabel}
        </button>
        <Link className="btn-ghost" to={statsTo} data-testid={`${testId}-stats-link`}>
          {statsLabel}
        </Link>
      </div>
    </section>
  );
}
