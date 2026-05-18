export type StatsSummary = {
  avg: number;
  median: number;
  min: number;
  max: number;
  stdDev: number;
};

export function median(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

export function summarize(values: number[]): StatsSummary {
  if (!values.length) {
    return { avg: 0, median: 0, min: 0, max: 0, stdDev: 0 };
  }
  const sum = values.reduce((acc, v) => acc + v, 0);
  const avg = sum / values.length;
  const med = median(values);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const variance = values.reduce((acc, v) => acc + (v - avg) ** 2, 0) / values.length;
  const stdDev = Math.sqrt(variance);
  return { avg, median: med, min, max, stdDev };
}
