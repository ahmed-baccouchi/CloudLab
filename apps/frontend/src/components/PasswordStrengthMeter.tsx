import React from 'react';
import { Check, X, Shield, Clock, AlertCircle } from 'lucide-react';
import type { PasswordAnalysis } from '../utils/password-strength';

interface Props {
  analysis: PasswordAnalysis;
  passwordLength: number;
}

export const PasswordStrengthMeter: React.FC<Props> = ({ analysis, passwordLength }) => {
  if (passwordLength === 0) return null;

  // Segment filling calculation (4 visual segments)
  const segments = [1, 2, 3, 4];
  const activeSegments = Math.min(4, Math.max(1, analysis.score));

  return (
    <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {/* Visual Segment Bar */}
      <div style={{ display: 'flex', gap: '4px', height: '6px' }}>
        {segments.map((seg) => {
          const isFilled = seg <= activeSegments;
          return (
            <div
              key={seg}
              style={{
                flex: 1,
                borderRadius: '3px',
                backgroundColor: isFilled ? analysis.color : 'rgba(255, 255, 255, 0.1)',
                transition: 'all 0.3s ease',
                boxShadow: isFilled ? `0 0 8px ${analysis.color}40` : 'none',
              }}
            />
          );
        })}
      </div>

      {/* Strength Label + Crack Time Estimation */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <Shield size={13} color={analysis.color} />
          <span style={{ fontWeight: 600, color: analysis.color }}>
            {analysis.label}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#94a3b8' }}>
          <Clock size={12} />
          <span>Crack time: <strong style={{ color: '#e2e8f0' }}>{analysis.crackTimeDisplay}</strong></span>
        </div>
      </div>

      {/* Security Feedback Warning if any */}
      {analysis.warning && (
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '6px',
            backgroundColor: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '4px',
            padding: '6px 8px',
            fontSize: '11px',
            color: '#fca5a5',
          }}
        >
          <AlertCircle size={13} style={{ flexShrink: 0, marginTop: '2px' }} />
          <span>{analysis.warning}</span>
        </div>
      )}

      {/* Condition Checklist */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '4px 10px',
          padding: '8px 10px',
          backgroundColor: 'rgba(0, 0, 0, 0.25)',
          borderRadius: '6px',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          fontSize: '11px',
        }}
      >
        {analysis.conditions.map((cond) => (
          <div
            key={cond.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              color: cond.met ? '#34d399' : '#64748b',
              transition: 'color 0.2s ease',
            }}
          >
            {cond.met ? (
              <Check size={12} strokeWidth={3} style={{ color: '#10b981', flexShrink: 0 }} />
            ) : (
              <X size={12} strokeWidth={2.5} style={{ color: '#64748b', flexShrink: 0 }} />
            )}
            <span>{cond.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
