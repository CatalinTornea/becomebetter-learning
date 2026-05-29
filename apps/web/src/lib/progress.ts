export function calculateCompletion(completed: number, total: number) {
  if (total <= 0) return 0;
  return Math.round((completed / total) * 100);
}
