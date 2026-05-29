export interface SafetyEvaluation {
  readonly safe: boolean;
  readonly reasonCodes: string[];
  readonly sanitizedTask: string;
}

const BLOCKED_PATTERNS = [/ignore\s+all\s+rules/i, /reveal\s+secret/i, /exfiltrate/i];

export function evaluateSafety(task: string): SafetyEvaluation {
  const reasonCodes: string[] = [];
  const normalized = task.trim();

  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(normalized)) {
      reasonCodes.push('SAFETY_BLOCKED_PATTERN');
      return {
        safe: false,
        reasonCodes,
        sanitizedTask: ''
      };
    }
  }

  return {
    safe: true,
    reasonCodes: ['SAFETY_OK'],
    sanitizedTask: normalized
  };
}
