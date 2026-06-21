export function interpolate(start: number, end: number, progress: number): number {
  const p = Math.min(progress, 1)
  return Math.round(start + (end - start) * p)
}

export function clampValue(value: number): number {
  return Math.max(0, Math.min(255, value))
}
