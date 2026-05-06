// lib/brrrCalculations.js
// Pure BRRR calculation utilities — no side effects, no API calls.
// All monetary values are in NZD. Percentages are decimals (e.g. 0.05 = 5%).

/**
 * Estimate After Repair Value.
 * If you have a manual ARV, just pass it through.
 * Optional: average comparable sale prices.
 *
 * @param {number} manualARV - Direct ARV estimate (overrides comps if provided)
 * @param {number[]} compSalePrices - Array of comparable sale prices
 * @returns {number} arv
 */
export function calcAfterRepairValue(manualARV, compSalePrices = []) {
  if (manualARV && manualARV > 0) return manualARV;
  if (compSalePrices.length === 0) return 0;
  const total = compSalePrices.reduce((sum, price) => sum + price, 0);
  return total / compSalePrices.length;
}

/**
 * Calculate total renovation budget including contingency.
 *
 * @param {number} baseCost - Estimated renovation cost before contingency
 * @param {number} contingencyRate - Buffer as decimal, e.g. 0.15 for 15%
 * @returns {{ baseCost, contingency, totalCost }}
 */
export function calcRenovationBudget(baseCost, contingencyRate = 0.15) {
  const contingency = baseCost * contingencyRate;
  const totalCost = baseCost + contingency;
  return { baseCost, contingency, totalCost };
}

/**
 * Calculate purchase metrics — max offer price, LVR, and initial equity.
 *
 * @param {number} purchasePrice - Actual or proposed purchase price
 * @param {number} arv - After Repair Value
 * @param {number} targetLVR - Target loan-to-value ratio, e.g. 0.70 for 70%
 * @returns {{ purchasePrice, arv, targetLVR, maxOfferPrice, initialEquity, initialLVR }}
 */
export function calcPurchaseMetrics(purchasePrice, arv, targetLVR = 0.70) {
  const maxOfferPrice = arv * targetLVR;
  const initialEquity = arv - purchasePrice;
  const initialLVR = purchasePrice / arv;
  return {
    purchasePrice,
    arv,
    targetLVR,
    maxOfferPrice,
    initialEquity,
    initialLVR,
  };
}

/**
 * Calculate refinance metrics — new loan, cash out, remaining equity.
 *
 * @param {number} arv - After Repair Value
 * @param {number} originalLoanAmount - Original mortgage/purchase loan
 * @param {number} refinanceLVR - LVR used for refinance, e.g. 0.70 for 70%
 * @returns {{ newLoanAmount, cashOut, remainingEquity, refinanceLVR }}
 */
export function calcRefinanceMetrics(arv, originalLoanAmount, refinanceLVR = 0.70) {
  const newLoanAmount = arv * refinanceLVR;
  const cashOut = newLoanAmount - originalLoanAmount;
  const remainingEquity = arv - newLoanAmount;
  return {
    newLoanAmount,
    cashOut,
    remainingEquity,
    refinanceLVR,
  };
}

/**
 * Calculate rental performance metrics.
 *
 * @param {number} weeklyRent - Expected weekly rent in NZD
 * @param {number} arv - After Repair Value (used as property value for yield calc)
 * @param {number} annualExpenses - Insurance, rates, maintenance, PM fees, etc.
 * @param {number} annualMortgageCost - Annual mortgage repayments
 * @returns {{ weeklyRent, annualRent, grossYield, netYield, annualCashflow, weeklyCashflow }}
 */
export function calcRentalMetrics(weeklyRent, arv, annualExpenses = 0, annualMortgageCost = 0) {
  const annualRent = weeklyRent * 52;
  const grossYield = annualRent / arv;
  const netIncome = annualRent - annualExpenses;
  const netYield = netIncome / arv;
  const annualCashflow = netIncome - annualMortgageCost;
  const weeklyCashflow = annualCashflow / 52;
  return {
    weeklyRent,
    annualRent,
    grossYield,
    netYield,
    annualCashflow,
    weeklyCashflow,
  };
}

/**
 * Master BRRR summary — runs all calculations in one call.
 *
 * @param {Object} inputs
 * @param {number} inputs.purchasePrice
 * @param {number} inputs.arv
 * @param {number} inputs.renovationBaseCost
 * @param {number} inputs.weeklyRent
 * @param {number} inputs.annualExpenses
 * @param {number} inputs.targetLVR - e.g. 0.70
 * @param {number} inputs.contingencyRate - e.g. 0.15
 * @returns {Object} Full BRRR summary
 */
export function calcBRRRSummary({
  purchasePrice,
  arv,
  renovationBaseCost,
  weeklyRent,
  annualExpenses = 0,
  targetLVR = 0.70,
  contingencyRate = 0.15,
}) {
  const renovation = calcRenovationBudget(renovationBaseCost, contingencyRate);
  const purchase = calcPurchaseMetrics(purchasePrice, arv, targetLVR);
  const totalInvested = purchasePrice + renovation.totalCost;
  const refinance = calcRefinanceMetrics(arv, totalInvested, targetLVR);
  const annualMortgageCost = 0; // Placeholder — pass in when mortgage calc is added
  const rental = calcRentalMetrics(weeklyRent, arv, annualExpenses, annualMortgageCost);

  return {
    purchase,
    renovation,
    refinance,
    rental,
    totalInvested,
    // Key BRRR outcome: did you get your money back?
    capitalRecovered: refinance.cashOut >= totalInvested,
    moneyLeftIn: Math.max(0, totalInvested - refinance.cashOut),
  };
}
