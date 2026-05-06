// components/CalculatorForm.jsx
// Controlled input form for BRRR calculator.
// Collects four inputs, passes values up via onCalculate callback.
// No API calls, no Supabase, no side effects.

import { useState } from 'react';

// Helper: strip non-numeric characters and parse as a number
function parseNumber(value) {
  const cleaned = value.replace(/[^0-9.]/g, '');
  return cleaned === '' ? '' : Number(cleaned);
}

// Helper: format a number as NZD currency display (no symbol, just commas)
function formatDisplay(value) {
  if (value === '' || value === 0) return '';
  return Number(value).toLocaleString('en-NZ');
}

export default function CalculatorForm({ onCalculate }) {
  // Each field stored as raw number (empty string when blank)
  const [fields, setFields] = useState({
    purchasePrice: '',
    renovationCost: '',
    arv: '',
    weeklyRent: '',
  });

  // Track display values separately so commas show while typing
  const [display, setDisplay] = useState({
    purchasePrice: '',
    renovationCost: '',
    arv: '',
    weeklyRent: '',
  });

  const [errors, setErrors] = useState({});

  function handleChange(field, rawValue) {
    const numeric = parseNumber(rawValue);
    setFields((prev) => ({ ...prev, [field]: numeric }));
    setDisplay((prev) => ({ ...prev, [field]: rawValue }));
    // Clear error on change
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }));
    }
  }

  function handleBlur(field) {
    // On blur, format with commas for readability
    setDisplay((prev) => ({
      ...prev,
      [field]: formatDisplay(fields[field]),
    }));
  }

  function validate() {
    const newErrors = {};
    if (!fields.purchasePrice) newErrors.purchasePrice = 'Required';
    if (!fields.renovationCost && fields.renovationCost !== 0)
      newErrors.renovationCost = 'Required';
    if (!fields.arv) newErrors.arv = 'Required';
    if (!fields.weeklyRent) newErrors.weeklyRent = 'Required';
    if (fields.arv && fields.purchasePrice && fields.arv < fields.purchasePrice) {
      newErrors.arv = 'ARV should be higher than purchase price';
    }
    return newErrors;
  }

  function handleSubmit() {
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    // Pass clean numbers up to parent
    onCalculate({
      purchasePrice: Number(fields.purchasePrice),
      renovationBaseCost: Number(fields.renovationCost),
      arv: Number(fields.arv),
      weeklyRent: Number(fields.weeklyRent),
    });
  }

  function handleReset() {
    setFields({ purchasePrice: '', renovationCost: '', arv: '', weeklyRent: '' });
    setDisplay({ purchasePrice: '', renovationCost: '', arv: '', weeklyRent: '' });
    setErrors({});
  }

  // Field config — keeps JSX clean
  const fieldConfig = [
    {
      key: 'purchasePrice',
      label: 'Purchase Price',
      hint: 'What you are paying for the property',
      prefix: '$',
    },
    {
      key: 'renovationCost',
      label: 'Renovation Cost',
      hint: 'Base estimate before contingency buffer',
      prefix: '$',
    },
    {
      key: 'arv',
      label: 'After Repair Value (ARV)',
      hint: 'Estimated value after renovations are complete',
      prefix: '$',
    },
    {
      key: 'weeklyRent',
      label: 'Expected Weekly Rent',
      hint: 'Market rent for the area',
      prefix: '$',
    },
  ];

  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <p style={styles.eyebrow}>BRRR ANALYSIS</p>
        <h2 style={styles.title}>Property Calculator</h2>
        <p style={styles.subtitle}>
          Enter your property details to run a full Buy · Renovate · Refinance · Rent analysis.
        </p>
      </div>

      <div style={styles.fields}>
        {fieldConfig.map(({ key, label, hint, prefix }) => (
          <div key={key} style={styles.fieldGroup}>
            <label style={styles.label}>{label}</label>
            <p style={styles.hint}>{hint}</p>
            <div style={styles.inputWrapper}>
              <span style={styles.prefix}>{prefix}</span>
              <input
                type="text"
                inputMode="numeric"
                value={display[key]}
                onChange={(e) => handleChange(key, e.target.value)}
                onBlur={() => handleBlur(key)}
                placeholder="0"
                style={{
                  ...styles.input,
                  ...(errors[key] ? styles.inputError : {}),
                }}
              />
            </div>
            {errors[key] && (
              <p style={styles.errorText}>{errors[key]}</p>
            )}
          </div>
        ))}
      </div>

      <div style={styles.actions}>
        <button onClick={handleReset} style={styles.resetButton}>
          Reset
        </button>
        <button onClick={handleSubmit} style={styles.calculateButton}>
          Calculate →
        </button>
      </div>
    </div>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
// Inline styles keep the component self-contained and beginner-friendly.
// Matches PropFlow aesthetic: black, white, minimal, gold accent.

const styles = {
  card: {
    background: '#ffffff',
    border: '1px solid #e5e5e5',
    borderRadius: '2px',
    padding: '2.5rem',
    maxWidth: '560px',
    width: '100%',
    fontFamily: "'Georgia', serif",
  },
  header: {
    marginBottom: '2rem',
    borderBottom: '1px solid #e5e5e5',
    paddingBottom: '1.5rem',
  },
  eyebrow: {
    fontSize: '0.65rem',
    letterSpacing: '0.2em',
    color: '#C9A84C', // warm gold
    margin: '0 0 0.5rem 0',
    fontFamily: "'Georgia', serif",
  },
  title: {
    fontSize: '1.6rem',
    fontWeight: '400',
    color: '#111111',
    margin: '0 0 0.5rem 0',
    fontFamily: "'Playfair Display', 'Georgia', serif",
  },
  subtitle: {
    fontSize: '0.85rem',
    color: '#666666',
    margin: 0,
    lineHeight: '1.5',
  },
  fields: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
    marginBottom: '2rem',
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
  },
  label: {
    fontSize: '0.8rem',
    fontWeight: '600',
    color: '#111111',
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
  },
  hint: {
    fontSize: '0.75rem',
    color: '#999999',
    margin: '0 0 0.4rem 0',
  },
  inputWrapper: {
    display: 'flex',
    alignItems: 'center',
    border: '1px solid #d0d0d0',
    borderRadius: '2px',
    overflow: 'hidden',
    transition: 'border-color 0.2s',
  },
  prefix: {
    padding: '0.65rem 0.75rem',
    background: '#f5f5f5',
    color: '#666666',
    fontSize: '0.9rem',
    borderRight: '1px solid #d0d0d0',
    userSelect: 'none',
  },
  input: {
    flex: 1,
    border: 'none',
    outline: 'none',
    padding: '0.65rem 0.75rem',
    fontSize: '1rem',
    color: '#111111',
    fontFamily: "'Georgia', serif",
    background: '#ffffff',
  },
  inputError: {
    background: '#fff8f8',
  },
  errorText: {
    fontSize: '0.75rem',
    color: '#c0392b',
    margin: '0.2rem 0 0 0',
  },
  actions: {
    display: 'flex',
    gap: '0.75rem',
    justifyContent: 'flex-end',
    borderTop: '1px solid #e5e5e5',
    paddingTop: '1.5rem',
  },
  resetButton: {
    padding: '0.65rem 1.25rem',
    background: 'transparent',
    border: '1px solid #d0d0d0',
    borderRadius: '2px',
    color: '#666666',
    fontSize: '0.85rem',
    cursor: 'pointer',
    fontFamily: "'Georgia', serif",
    letterSpacing: '0.03em',
  },
  calculateButton: {
    padding: '0.65rem 1.5rem',
    background: '#111111',
    border: '1px solid #111111',
    borderRadius: '2px',
    color: '#ffffff',
    fontSize: '0.85rem',
    cursor: 'pointer',
    fontFamily: "'Georgia', serif",
    letterSpacing: '0.05em',
  },
};
