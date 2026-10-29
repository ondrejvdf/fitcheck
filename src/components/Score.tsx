export default function Score({
  value,
  small = false,
}: {
  value: number | null;
  small?: boolean;
}) {
  const color =
    value === null
      ? "#8b9291"
      : value >= 80
        ? "#208358"
        : value >= 60
          ? "#ab8a18"
          : value >= 40
            ? "#d47a25"
            : "#d34f4f";
  return (
    <div className={"score " + (small ? "small" : "")} style={{ color }}>
      <svg viewBox="0 0 120 120" aria-hidden="true">
        <circle
          cx="60"
          cy="60"
          r="52"
          fill="none"
          stroke="currentColor"
          opacity=".12"
          strokeWidth="8"
        />
        <circle
          className="score-progress"
          cx="60"
          cy="60"
          r="52"
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${(value ?? 0) * 3.267} 326.7`}
          transform="rotate(-90 60 60)"
        />
      </svg>
      <strong>
        {value ?? "—"}
        {value !== null && <sup>%</sup>}
      </strong>
      {!small && <span>FITCHECK SKÓRE</span>}
    </div>
  );
}
