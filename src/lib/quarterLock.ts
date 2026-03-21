/**
 * Quarter-based locking logic tied to URSSAF declaration deadlines.
 * After the URSSAF deadline for a quarter passes, entries for that quarter
 * are sealed — but with up to 2 modifications allowed per quarter.
 */

const MAX_EDITS_PER_QUARTER = 2;

/** Get the quarter (1-4) for a given month string "YYYY-MM" */
export function getQuarterForMonth(month: string): { year: number; quarter: number; key: string } {
  const [y, m] = month.split("-").map(Number);
  const quarter = Math.ceil(m / 3);
  return { year: y, quarter, key: `${y}-Q${quarter}` };
}

/** Get the URSSAF declaration deadline for a given quarter */
function getUrssafDeadline(year: number, quarter: number): Date {
  switch (quarter) {
    case 1: return new Date(year, 3, 30); // 30 avril
    case 2: return new Date(year, 6, 31); // 31 juillet
    case 3: return new Date(year, 9, 31); // 31 octobre
    case 4: return new Date(year + 1, 0, 31); // 31 janvier N+1
    default: return new Date(year, 3, 30);
  }
}

/** Check if a quarter's URSSAF deadline has passed */
export function isQuarterSealed(year: number, quarter: number): boolean {
  const deadline = getUrssafDeadline(year, quarter);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now > deadline;
}

export interface QuarterEditState {
  editable: boolean;
  sealed: boolean;
  editsUsed: number;
  editsRemaining: number;
}

/** 
 * Determine editability for a given month based on its quarter's URSSAF deadline
 * and remaining edit rights.
 */
export function getMonthEditState(month: string, quarterEdits: Record<string, number>): QuarterEditState {
  const { year, quarter, key } = getQuarterForMonth(month);
  const sealed = isQuarterSealed(year, quarter);
  const editsUsed = quarterEdits[key] ?? 0;

  if (!sealed) {
    return { editable: true, sealed: false, editsUsed, editsRemaining: MAX_EDITS_PER_QUARTER - editsUsed };
  }

  const editsRemaining = MAX_EDITS_PER_QUARTER - editsUsed;
  return {
    editable: editsRemaining > 0,
    sealed: true,
    editsUsed,
    editsRemaining,
  };
}

/** Get the label for the lock badge */
export function getSealedLabel(state: QuarterEditState): string {
  if (!state.sealed) return "";
  if (state.editsRemaining <= 0) return "🔒 Scellé (0 modif restante)";
  return `🔓 Scellé (${state.editsRemaining} modif${state.editsRemaining > 1 ? "s" : ""} restante${state.editsRemaining > 1 ? "s" : ""})`;
}
