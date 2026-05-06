// components/CalculatorResults.jsx
// Display-only component — receives BRRR summary results and renders them.
// No calculations, no API calls, no Supabase.
// Props: { results } — output of calcBRRRSummary() from lib/brrrCalculations.js

// ─── Helpers ─────────────────────────────────────────────────────────────────

// Format a number as NZD currency
function formatCurrency(value) {
  if (value === null || value === undefined || isNaN(value)) return '—';
  return new Intl.NumberFormat('en-NZ', {
    style: 'currency',
    currency: 'NZD',
    maximumFractionDigits: 0,
  }).format(value);
}

// Format a decimal as a percentage, e.g. 0.065 → "6.5%"
function formatPercent(value) {
  if (value === null || value === undefined || isNaN(value)) return '—';
  return (value * 100).toFixed(1) + '%';
}

// Determine colour for cashflow — green if positive, red if negative
function cashflowColor(value) {
  if (value > 0) return '#2d6a4f';  // dark green
  if (value < 0) return '#c0392b';  // red
  return '#111111';
}

// ─── Sub-components ───────────────────────────────────────────────────────────

// A single metric tile
function MetricTile({ label, value, valueColor, note }) {
  return (
    <div style={styles.tile}>
      <p style={styles.tileLabel}>{label}</p>
      <p style={{ ...styles.tileValue, color: valueColor || '#111111' }}>{value}</p>
      {note && <p style={styles.tileNote}>{note}</p>}
    </div>
  );
}

// The BRRR verdict banner at the bottom
function BRRRVerdict({ capitalRecovered, moneyLeftIn }) {
  const success = capitalRecovered;

  return (
    <div style={{
      ...styles.verdict,
      borderColor: success ? '#2d6a4f' : '#C9A84C',
      background: success ? '#f0faf4' : '#fffbf0',
    }}>
      <div style={styles.verdictLeft}>
        <span style={{
          ...styles.verdictBadge,
          background: success ? '#2d6a4f' : '#C9A84C',
        }}>
          {success ? 'CAPITAL RECYCLED' : 'CAPITAL PARTIALLY TIED UP'}
        </span>
        <p style={styles.verdictTitle}>
          {success
            ? 'Strong BRRR result — you pulled your capital out.'
            : 'Good deal — some capital remains in the property.'}
        </p>
        <p style={styles.verdictBody}>
          {success
            ? 'The refinance recovered your full investment. You can redeploy this capital into your next deal while keeping the asset.'
            : `You have ${formatCurrency(moneyLeftIn)} still in the deal after refinancing. Consider whether the equity position and cashflow justify leaving it there.`}
        </p>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CalculatorResults({ results }) {
  // If no results yet, render nothing
  if (!results) return null;

  const { purchase, renovation, refinance, rental, totalInvested, capitalRecovered, moneyLeftIn } = results;

  return (
    <div style={styles.wrapper}>

      {/* Section header */}
      <div style={styles.header}>
        <p style={styles.eyebrow}>ANALYSIS RESULTS</p>
        <h2 style={styles.title}>BRRR Summary</h2>
      </div>

      {/* Divider */}
      <div style={styles.divider} />

      {/* Investment overview row */}
      <div style={styles.section}>
        <p style={styles.sectionLabel}>INVESTMENT</p>
        <div style={styles.grid}>
          <MetricTile
            label="Purchase Price"
            value={formatCurrency(purchase.purchasePrice)}
          />
          <MetricTile
            label="Renovation (inc. contingency)"
            value={formatCurrency(renovation.totalCost)}
            note={`Base ${formatCurrency(renovation.baseCost)} + ${formatCurrency(renovation.contingency)} buffer`}
          />
          <MetricTile
            label="Total Invested"
            value={formatCurrency(totalInvested)}
            note="Purchase + full renovation"
          />
        </div>
      </div>

      <div style={styles.divider} />

      {/* Refinance row */}
      <div style={styles.section}>
        <p style={styles.sectionLabel}>REFINANCE</p>
        <div style={styles.grid}>
          <MetricTile
            label="After Repair Value (ARV)"
            value={formatCurrency(purchase.arv)}
          />
          <MetricTile
            label="New Loan Amount"
            value={formatCurrency(refinance.newLoanAmount)}
            note={`At ${formatPercent(refinance.refinanceLVR)} LVR`}
          />
          <MetricTile
            label="Remaining Equity"
            value={formatCurrency(refinance.remainingEquity)}
            note="Your ownership stake post-refinance"
          />
        </div>
      </div>

      <div style={styles.divider} />

      {/* Rental row */}
      <div style={styles.section}>
        <p style={styles.sectionLabel}>RENTAL PERFORMANCE</p>
        <div style={styles.grid}>
          <MetricTile
            label="Annual Rent"
            value={formatCurrency(rental.annualRent)}
            note={`${formatCurrency(rental.weeklyRent)} / week`}
          />
          <MetricTile
            label="Gross Yield"
            value={formatPercent(rental.grossYield)}
            note="Annual rent ÷ ARV"
          />
          <MetricTile
            label="Weekly Cashflow"
            value={formatCurrency(rental.weeklyCashflow)}
            valueColor={cashflowColor(rental.weeklyCashflow)}
            note="After expenses (excl. mortgage)"
          />
        </div>
      </div>

      <div style={styles.divider} />

      {/* Capital outcome row */}
      <div style={styles.section}>
        <p style={styles.sectionLabel}>CAPITAL OUTCOME</p>
        <div style={styles.grid}>
          <MetricTile
            label="Cash Out via Refinance"
            value={formatCurrency(refinance.cashOut)}
          />
          <MetricTile
            label="Money Left in Deal"
            value={formatCurrency(moneyLeftIn)}
            valueColor={moneyLeftIn === 0 ? '#2d6a4f' : '#C9A84C'}
            note={moneyLeftIn === 0 ? 'Full capital recycled' : 'Still tied up after refinance'}
          />
        </div>
      </div>

      <div style={styles.divider} />

      {/* BRRR Verdict */}
      <BRRRVerdict capitalRecovered={capitalRecovered} moneyLeftIn={moneyLeftIn} />

    </div>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
// Matches PropFlow aesthetic: black, white, minimal, gold accent, Playfair Display.

const styles = {
  wrapper: {
    background: '#ffffff',
    border: '1px solid #e5e5e5',
    borderRadius: '2px',
    padding: '2.5rem',
    maxWidth: '560px',
    width: '100%',
    fontFamily: "'Georgia', serif",
  },
  header: {
    marginBottom: '1.5rem',
  },
  eyebrow: {
    fontSize: '0.65rem',
    letterSpacing: '0.2em',
    color: '#C9A84C',
    margin: '0 0 0.5rem 0',
  },
  title: {
    fontSize: '1.6rem',
    fontWeight: '400',
    color: '#111111',
    margin: 0,
    fontFamily: "'Playfair Display', 'Georgia', serif",
  },
  divider: {
    height: '1px',
    background: '#e5e5e5',
    margin: '1.5rem 0',
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  sectionLabel: {
    fontSize: '0.6rem',
    letterSpacing: '0.2em',
    color: '#999999',
    margin: 0,
    textTransform: 'uppercase',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
    gap: '1rem',
  },
  tile: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.2rem',
  },
  tileLabel: {
    fontSize: '0.7rem',
    color: '#888888',
    margin: 0,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  tileValue: {
    fontSize: '1.15rem',
    fontWeight: '600',
    color: '#111111',
    margin: 0,
    fontFamily: "'Playfair Display', 'Georgia', serif",
  },
  tileNote: {
    fontSize: '0.7rem',
    color: '#aaaaaa',
    margin: 0,
    lineHeight: '1.4',
  },
  verdict: {
    border: '1px solid',
    borderRadius: '2px',
    padding: '1.25rem 1.5rem',
  },
  verdictLeft: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  verdictBadge: {
    display: 'inline-block',
    fontSize: '0.6rem',
    letterSpacing: '0.15em',
    color: '#ffffff',
    padding: '0.25rem 0.6rem',
    borderRadius: '2px',
    alignSelf: 'flex-start',
  },
  verdictTitle: {
    fontSize: '0.95rem',
    fontWeight: '600',
    color: '#111111',
    margin: 0,
    fontFamily: "'Playfair Display', 'Georgia', serif",
  },
  verdictBody: {
    fontSize: '0.8rem',
    color: '#555555',
    margin: 0,
    lineHeight: '1.6',
  },
};
