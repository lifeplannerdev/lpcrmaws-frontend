import React from 'react';

export const FDS_BRANCH_OPTIONS = [
  { value: 'ALL', label: '🌐 All Branches (Global)' },
  { value: 'KOTTAYAM', label: '🌿 Kottayam (KTM)' },
  { value: 'KOCHI', label: '🏙️ Kochi' },
];

export function getBranchLabel(branch) {
  if (branch === 'KOTTAYAM') return 'Kottayam (KTM)';
  if (branch === 'KOCHI') return 'Kochi';
  return 'Global Data (All Branches)';
}

export function GlobalDataBadge({ label = 'Global Data' }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        background: 'rgba(201, 169, 110, 0.15)',
        color: 'var(--fds-primary, #C9A96E)',
        border: '1px solid rgba(201, 169, 110, 0.35)',
        padding: '2px 8px',
        borderRadius: '999px',
        fontSize: '0.72rem',
        fontWeight: 700,
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
      }}
    >
      🌐 {label}
    </span>
  );
}

export default function FdsBranchSelector({
  value = 'ALL',
  onChange,
  variant = 'pills', // 'pills' | 'select'
  style = {},
  className = '',
}) {
  if (variant === 'select') {
    return (
      <select
        className={`fds-input fds-select ${className}`}
        style={{ minWidth: 160, ...style }}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        title="Filter by Studio Branch"
      >
        {FDS_BRANCH_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    );
  }

  return (
    <div style={{ display: 'inline-flex', gap: 6, ...style }} className={className}>
      {FDS_BRANCH_OPTIONS.map((opt) => {
        const isSelected = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange?.(opt.value)}
            style={{
              padding: '6px 12px',
              borderRadius: 999,
              fontSize: '0.78rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              border: isSelected ? '1.5px solid var(--fds-primary)' : '1.5px solid var(--fds-border)',
              background: isSelected ? 'var(--fds-primary-muted)' : 'var(--fds-surface-2)',
              color: isSelected ? 'var(--fds-primary)' : 'var(--fds-text-muted)',
              boxShadow: isSelected ? '0 1px 4px rgba(201, 169, 110, 0.15)' : 'none',
              whiteSpace: 'nowrap',
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
