import zxcvbn from 'zxcvbn';

export interface PasswordCondition {
  id: string;
  label: string;
  met: boolean;
}

export interface PasswordAnalysis {
  score: number; // 0 to 4
  label: 'Too Weak' | 'Weak' | 'Fair' | 'Strong' | 'Very Strong';
  color: string;
  conditions: PasswordCondition[];
  crackTimeDisplay: string;
  warning?: string;
  suggestions: string[];
  isAcceptable: boolean;
}

export function evaluatePassword(password: string): PasswordAnalysis {
  if (!password) {
    return {
      score: 0,
      label: 'Too Weak',
      color: '#64748b',
      conditions: [
        { id: 'length', label: 'At least 8 characters', met: false },
        { id: 'uppercase', label: 'At least one uppercase letter (A-Z)', met: false },
        { id: 'lowercase', label: 'At least one lowercase letter (a-z)', met: false },
        { id: 'number', label: 'At least one number (0-9)', met: false },
        { id: 'special', label: 'At least one special character (!@#$%^&*)', met: false },
      ],
      crackTimeDisplay: 'instant',
      suggestions: [],
      isAcceptable: false,
    };
  }

  // 1. Evaluate explicit rule conditions
  const conditions: PasswordCondition[] = [
    {
      id: 'length',
      label: 'At least 8 characters',
      met: password.length >= 8,
    },
    {
      id: 'uppercase',
      label: 'At least one uppercase letter (A-Z)',
      met: /[A-Z]/.test(password),
    },
    {
      id: 'lowercase',
      label: 'At least one lowercase letter (a-z)',
      met: /[a-z]/.test(password),
    },
    {
      id: 'number',
      label: 'At least one number (0-9)',
      met: /[0-9]/.test(password),
    },
    {
      id: 'special',
      label: 'At least one special character (!@#$%^&*)',
      met: /[^A-Za-z0-9]/.test(password),
    },
  ];

  const metCount = conditions.filter((c) => c.met).length;

  // 2. Evaluate inherent algorithmic entropy & dictionary attack resistance with zxcvbn
  const zxResult = zxcvbn(password);
  const zxScore = zxResult.score; // 0 to 4

  // Crack time display
  const crackTime =
    (zxResult.crack_times_display as any)?.offline_slow_hashing_1e4_per_second ||
    zxResult.crack_times_display?.online_no_throttling_10_per_second ||
    'instant';

  // Combined score: requires both structural requirements AND real-world unpredictability
  // A password like "Password123!" has all characters but is heavily penalized by zxcvbn
  let label: 'Too Weak' | 'Weak' | 'Fair' | 'Strong' | 'Very Strong';
  let color: string;

  if (zxScore === 0 || password.length < 6) {
    label = 'Too Weak';
    color = '#ef4444'; // Red
  } else if (zxScore === 1 || metCount < 3) {
    label = 'Weak';
    color = '#f97316'; // Orange
  } else if (zxScore === 2 || metCount < 4) {
    label = 'Fair';
    color = '#eab308'; // Yellow
  } else if (zxScore === 3 && metCount >= 4) {
    label = 'Strong';
    color = '#10b981'; // Green
  } else if (zxScore === 4 && metCount === 5) {
    label = 'Very Strong';
    color = '#00d4ff'; // Cyan / Super strong
  } else {
    label = 'Fair';
    color = '#eab308';
  }

  // Acceptable if it has at least 8 chars, meets at least 3 conditions, and zxcvbn score >= 2
  const isAcceptable = password.length >= 8 && metCount >= 3 && zxScore >= 2;

  return {
    score: zxScore,
    label,
    color,
    conditions,
    crackTimeDisplay: crackTime,
    warning: zxResult.feedback.warning || undefined,
    suggestions: zxResult.feedback.suggestions || [],
    isAcceptable,
  };
}
