/**
 * Persists which routine tasks the user has marked complete, per scan.
 * Key = scanId, value = array of task indices (0-based) that are completed.
 */

const STORAGE_KEY = 'faceq_task_completions';

function load(): Record<string, number[]> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const out: Record<string, number[]> = {};
      for (const [scanId, arr] of Object.entries(parsed)) {
        if (Array.isArray(arr)) {
          out[scanId] = arr.filter((x) => typeof x === 'number' && Number.isInteger(x));
        }
      }
      return out;
    }
  } catch {
    // ignore
  }
  return {};
}

function save(data: Record<string, number[]>): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

/** Get completed task indices for a scan (0-based). */
export function getCompletedIndices(scanId: string): number[] {
  const data = load();
  return data[scanId] ?? [];
}

/** Return whether the task at the given index is completed for this scan. */
export function isTaskCompleted(scanId: string, taskIndex: number): boolean {
  return getCompletedIndices(scanId).includes(taskIndex);
}

/** Toggle completion for a task. Returns new completed state for that task. */
export function toggleTaskCompleted(scanId: string, taskIndex: number): boolean {
  const data = load();
  const list = data[scanId] ?? [];
  const idx = list.indexOf(taskIndex);
  let completed: boolean;
  if (idx >= 0) {
    list.splice(idx, 1);
    completed = false;
  } else {
    list.push(taskIndex);
    list.sort((a, b) => a - b);
    completed = true;
  }
  if (list.length === 0) delete data[scanId];
  else data[scanId] = list;
  save(data);
  return completed;
}
