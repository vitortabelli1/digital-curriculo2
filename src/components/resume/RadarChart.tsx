"use client";

interface RadarChartProps {
  values: number[];
  labels: string[];
  revealed?: number;
  size?: number;
}

export function RadarChart({
  values,
  labels,
  revealed = labels.length,
  size = 280,
}: RadarChartProps) {
  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2 - 42;
  const n = labels.length;
  const angle = (i: number) => ((-90 + i * (360 / n)) * Math.PI) / 180;
  const point = (i: number, r: number): [number, number] => [
    cx + r * Math.cos(angle(i)),
    cy + r * Math.sin(angle(i)),
  ];

  const rings = [25, 50, 75, 100];

  const dataPoints = labels.map((_, i) =>
    point(i, (i < revealed ? values[i] ?? 0 : 0) * (radius / 100))
  );
  const dataPath = dataPoints.map((p) => p.join(",")).join(" ");

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      width="100%"
      className="mx-auto max-w-[280px]"
      role="img"
      aria-label="Gráfico de aderência do currículo à vaga"
    >
      {rings.map((ring) => (
        <polygon
          key={ring}
          points={labels
            .map((_, i) => point(i, (ring / 100) * radius).join(","))
            .join(" ")}
          fill="none"
          stroke="currentColor"
          className="text-zinc-300 dark:text-zinc-700"
          strokeWidth={1}
        />
      ))}

      {labels.map((_, i) => {
        const [x, y] = point(i, radius);
        return (
          <line
            key={i}
            x1={cx}
            y1={cy}
            x2={x}
            y2={y}
            stroke="currentColor"
            className="text-zinc-300 dark:text-zinc-700"
            strokeWidth={1}
          />
        );
      })}

      <polygon
        points={dataPath}
        fill="rgba(124,58,237,0.35)"
        stroke="#7c3aed"
        strokeWidth={2}
      />

      {dataPoints.map((p, i) =>
        i < revealed ? (
          <circle key={i} cx={p[0]} cy={p[1]} r={3.5} fill="#7c3aed" />
        ) : null
      )}

      {labels.map((label, i) => {
        const [x, y] = point(i, radius + 22);
        const anchor =
          Math.abs(x - cx) < 6 ? "middle" : x > cx ? "start" : "end";
        return (
          <text
            key={i}
            x={x}
            y={y + 4}
            textAnchor={anchor}
            className="fill-zinc-500 text-[10px] font-semibold dark:fill-zinc-400"
          >
            {label}
          </text>
        );
      })}
    </svg>
  );
}
