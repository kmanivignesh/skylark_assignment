/**
 * Deterministic Analytics Engine
 * 
 * Performs all business metric calculations server-side.
 * The LLM NEVER does arithmetic — it only interprets these results.
 */

/**
 * Format currency in Indian Rupees
 */
function formatINR(amount) {
  if (amount === null || amount === undefined) return 'N/A';
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)} Cr`;
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)} L`;
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}K`;
  return `₹${amount.toFixed(0)}`;
}

/**
 * Get current quarter boundaries
 */
function getCurrentQuarter() {
  const now = new Date();
  const quarter = Math.floor(now.getMonth() / 3);
  const start = new Date(now.getFullYear(), quarter * 3, 1);
  const end = new Date(now.getFullYear(), (quarter + 1) * 3, 0);
  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
    label: `Q${quarter + 1} ${now.getFullYear()}`,
  };
}

/**
 * Filter deals by time period
 */
function filterByPeriod(records, dateField, period) {
  if (!period || period === 'all') return records;

  const quarter = getCurrentQuarter();
  const now = new Date();

  switch (period) {
    case 'current_quarter':
    case 'this_quarter':
      return records.filter(r => {
        const d = r[dateField];
        return d && d >= quarter.start && d <= quarter.end;
      });
    case 'this_year':
      const yearStart = `${now.getFullYear()}-01-01`;
      const yearEnd = `${now.getFullYear()}-12-31`;
      return records.filter(r => {
        const d = r[dateField];
        return d && d >= yearStart && d <= yearEnd;
      });
    default:
      return records;
  }
}

/**
 * Calculate pipeline metrics from deals
 */
function calculatePipeline(deals, filters = {}) {
  let filtered = [...deals];

  // Apply sector filter
  if (filters.sector) {
    const sectorLower = filters.sector.toLowerCase();
    filtered = filtered.filter(d => d.sector && d.sector.toLowerCase() === sectorLower);
  }

  // Apply period filter  
  if (filters.period) {
    filtered = filterByPeriod(filtered, 'tentativeCloseDate', filters.period);
  }

  // Active pipeline = Open deals only
  const activePipeline = filtered.filter(d => d.dealStatus === 'Open');
  const activeWithValue = activePipeline.filter(d => d.dealValue !== null);
  const totalPipelineValue = activeWithValue.reduce((sum, d) => sum + d.dealValue, 0);

  // All deals metrics
  const allWithValue = filtered.filter(d => d.dealValue !== null);
  const totalValue = allWithValue.reduce((sum, d) => sum + d.dealValue, 0);

  // Stage distribution
  const byStage = {};
  activePipeline.forEach(d => {
    const stage = d.dealStage || 'Unknown';
    if (!byStage[stage]) byStage[stage] = { count: 0, value: 0, missingValue: 0 };
    byStage[stage].count++;
    if (d.dealValue !== null) byStage[stage].value += d.dealValue;
    else byStage[stage].missingValue++;
  });

  // Status distribution (all deals, not just filtered)
  const byStatus = {};
  filtered.forEach(d => {
    const status = d.dealStatus || 'Unknown';
    if (!byStatus[status]) byStatus[status] = { count: 0, value: 0, missingValue: 0 };
    byStatus[status].count++;
    if (d.dealValue !== null) byStatus[status].value += d.dealValue;
    else byStatus[status].missingValue++;
  });

  return {
    totalDeals: filtered.length,
    activeDeals: activePipeline.length,
    activePipelineValue: totalPipelineValue,
    activePipelineFormatted: formatINR(totalPipelineValue),
    dealsWithValue: activeWithValue.length,
    dealsMissingValue: activePipeline.length - activeWithValue.length,
    byStage,
    byStatus,
    avgDealSize: activeWithValue.length > 0 ? totalPipelineValue / activeWithValue.length : 0,
    avgDealSizeFormatted: activeWithValue.length > 0 ? formatINR(totalPipelineValue / activeWithValue.length) : 'N/A',
  };
}

/**
 * Calculate revenue from won deals
 */
function calculateRevenue(deals, filters = {}) {
  let wonDeals = deals.filter(d => d.dealStatus === 'Won');

  if (filters.sector) {
    const sectorLower = filters.sector.toLowerCase();
    wonDeals = wonDeals.filter(d => d.sector && d.sector.toLowerCase() === sectorLower);
  }

  if (filters.period) {
    wonDeals = filterByPeriod(wonDeals, 'closeDate', filters.period);
  }

  const withValue = wonDeals.filter(d => d.dealValue !== null);
  const totalRevenue = withValue.reduce((sum, d) => sum + d.dealValue, 0);

  // By sector
  const bySector = {};
  wonDeals.forEach(d => {
    const sector = d.sector || 'Unknown';
    if (!bySector[sector]) bySector[sector] = { count: 0, value: 0, missingValue: 0 };
    bySector[sector].count++;
    if (d.dealValue !== null) bySector[sector].value += d.dealValue;
    else bySector[sector].missingValue++;
  });

  return {
    totalWonDeals: wonDeals.length,
    wonWithValue: withValue.length,
    wonMissingValue: wonDeals.length - withValue.length,
    totalRevenue,
    totalRevenueFormatted: formatINR(totalRevenue),
    bySector,
    avgDealSize: withValue.length > 0 ? totalRevenue / withValue.length : 0,
    avgDealSizeFormatted: withValue.length > 0 ? formatINR(totalRevenue / withValue.length) : 'N/A',
  };
}

/**
 * Calculate deal count metrics
 */
function calculateDealCount(deals, filters = {}) {
  let filtered = [...deals];

  if (filters.sector) {
    const sectorLower = filters.sector.toLowerCase();
    filtered = filtered.filter(d => d.sector && d.sector.toLowerCase() === sectorLower);
  }

  const byStatus = {};
  filtered.forEach(d => {
    const status = d.dealStatus || 'Unknown';
    if (!byStatus[status]) byStatus[status] = 0;
    byStatus[status]++;
  });

  const byProbability = {};
  filtered.forEach(d => {
    const prob = d.closureProbability || 'Unknown';
    if (!byProbability[prob]) byProbability[prob] = 0;
    byProbability[prob]++;
  });

  return {
    total: filtered.length,
    byStatus,
    byProbability,
    winRate: byStatus['Won'] && (byStatus['Won'] + (byStatus['Dead'] || 0)) > 0
      ? ((byStatus['Won'] / (byStatus['Won'] + (byStatus['Dead'] || 0))) * 100).toFixed(1) + '%'
      : 'N/A',
  };
}

/**
 * Calculate deals distribution by sector
 */
function calculateDealsBySector(deals) {
  const bySector = {};
  deals.forEach(d => {
    const sector = d.sector || 'Unknown';
    if (!bySector[sector]) bySector[sector] = { count: 0, value: 0, missingValue: 0, open: 0, won: 0, dead: 0 };
    bySector[sector].count++;
    if (d.dealValue !== null) bySector[sector].value += d.dealValue;
    else bySector[sector].missingValue++;
    if (d.dealStatus === 'Open') bySector[sector].open++;
    else if (d.dealStatus === 'Won') bySector[sector].won++;
    else if (d.dealStatus === 'Dead') bySector[sector].dead++;
  });

  return Object.entries(bySector)
    .map(([sector, data]) => ({
      sector,
      ...data,
      valueFormatted: formatINR(data.value),
    }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Calculate pipeline distribution by stage
 */
function calculatePipelineByStage(deals) {
  const openDeals = deals.filter(d => d.dealStatus === 'Open');
  const byStage = {};

  openDeals.forEach(d => {
    const stage = d.dealStage || 'Unknown';
    if (!byStage[stage]) byStage[stage] = { count: 0, value: 0, missingValue: 0 };
    byStage[stage].count++;
    if (d.dealValue !== null) byStage[stage].value += d.dealValue;
    else byStage[stage].missingValue++;
  });

  return Object.entries(byStage)
    .map(([stage, data]) => ({
      stage,
      ...data,
      valueFormatted: formatINR(data.value),
    }))
    .sort((a, b) => {
      // Sort by stage prefix letter
      const aLetter = a.stage.charAt(0);
      const bLetter = b.stage.charAt(0);
      return aLetter.localeCompare(bLetter);
    });
}

/**
 * Calculate operational metrics from work orders
 */
function calculateOperationalMetrics(workOrders, filters = {}) {
  let filtered = [...workOrders];

  if (filters.sector) {
    const sectorLower = filters.sector.toLowerCase();
    filtered = filtered.filter(w => w.sector && w.sector.toLowerCase() === sectorLower);
  }

  const byStatus = {};
  filtered.forEach(w => {
    const status = w.executionStatus || 'Unknown';
    if (!byStatus[status]) byStatus[status] = 0;
    byStatus[status]++;
  });

  const bySector = {};
  filtered.forEach(w => {
    const sector = w.sector || 'Unknown';
    if (!bySector[sector]) bySector[sector] = { count: 0, completed: 0, ongoing: 0, notStarted: 0 };
    bySector[sector].count++;
    if (w.executionStatus === 'Completed') bySector[sector].completed++;
    else if (w.executionStatus === 'Ongoing') bySector[sector].ongoing++;
    else if (w.executionStatus === 'Not Started') bySector[sector].notStarted++;
  });

  const byNature = {};
  filtered.forEach(w => {
    const nature = w.natureOfWork || 'Unknown';
    if (!byNature[nature]) byNature[nature] = 0;
    byNature[nature]++;
  });

  return {
    total: filtered.length,
    byStatus,
    bySector,
    byNature,
    completionRate: byStatus['Completed'] && filtered.length > 0
      ? ((byStatus['Completed'] / filtered.length) * 100).toFixed(1) + '%'
      : 'N/A',
  };
}

/**
 * Calculate billing and collection metrics from work orders
 */
function calculateBillingMetrics(workOrders, filters = {}) {
  let filtered = [...workOrders];

  if (filters.sector) {
    const sectorLower = filters.sector.toLowerCase();
    filtered = filtered.filter(w => w.sector && w.sector.toLowerCase() === sectorLower);
  }

  const totalAmount = filtered.reduce((sum, w) => sum + (w.amountExclGST || 0), 0);
  const totalBilled = filtered.reduce((sum, w) => sum + (w.billedExclGST || 0), 0);
  const totalCollected = filtered.reduce((sum, w) => sum + (w.collectedInclGST || 0), 0);
  const totalToBill = filtered.reduce((sum, w) => sum + (w.toBillExclGST || 0), 0);
  const totalReceivable = filtered.reduce((sum, w) => sum + (w.receivable || 0), 0);

  // Invoice status distribution
  const byInvoiceStatus = {};
  filtered.forEach(w => {
    const status = w.invoiceStatus || 'Unknown';
    if (!byInvoiceStatus[status]) byInvoiceStatus[status] = 0;
    byInvoiceStatus[status]++;
  });

  return {
    totalOrderValue: totalAmount,
    totalOrderValueFormatted: formatINR(totalAmount),
    totalBilled,
    totalBilledFormatted: formatINR(totalBilled),
    totalCollected,
    totalCollectedFormatted: formatINR(totalCollected),
    totalToBill,
    totalToBillFormatted: formatINR(totalToBill),
    totalReceivable,
    totalReceivableFormatted: formatINR(totalReceivable),
    collectionRate: totalBilled > 0 ? ((totalCollected / totalBilled) * 100).toFixed(1) + '%' : 'N/A',
    billingRate: totalAmount > 0 ? ((totalBilled / totalAmount) * 100).toFixed(1) + '%' : 'N/A',
    byInvoiceStatus,
    recordCount: filtered.length,
    recordsWithBilledValue: filtered.filter(w => w.billedExclGST !== null).length,
    recordsWithCollectedValue: filtered.filter(w => w.collectedInclGST !== null).length,
  };
}

/**
 * Calculate receivables
 */
function calculateReceivables(workOrders, filters = {}) {
  let filtered = [...workOrders];

  if (filters.sector) {
    const sectorLower = filters.sector.toLowerCase();
    filtered = filtered.filter(w => w.sector && w.sector.toLowerCase() === sectorLower);
  }

  const withReceivable = filtered.filter(w => w.receivable !== null && w.receivable > 0);
  const totalReceivable = withReceivable.reduce((sum, w) => sum + w.receivable, 0);

  // By sector
  const bySector = {};
  withReceivable.forEach(w => {
    const sector = w.sector || 'Unknown';
    if (!bySector[sector]) bySector[sector] = { count: 0, amount: 0 };
    bySector[sector].count++;
    bySector[sector].amount += w.receivable;
  });

  return {
    totalReceivable,
    totalReceivableFormatted: formatINR(totalReceivable),
    recordsWithReceivable: withReceivable.length,
    bySector: Object.entries(bySector).map(([sector, data]) => ({
      sector,
      ...data,
      amountFormatted: formatINR(data.amount),
    })).sort((a, b) => b.amount - a.amount),
  };
}

/**
 * Cross-board sector analysis
 */
function calculateCrossBoardMetrics(deals, workOrders, filters = {}) {
  const sectors = new Set();
  deals.forEach(d => { if (d.sector) sectors.add(d.sector); });
  workOrders.forEach(w => { if (w.sector) sectors.add(w.sector); });

  const sectorFilter = filters.sector ? filters.sector.toLowerCase() : null;

  const results = [];
  for (const sector of sectors) {
    if (sectorFilter && sector.toLowerCase() !== sectorFilter) continue;

    const sectorDeals = deals.filter(d => d.sector === sector);
    const sectorWOs = workOrders.filter(w => w.sector === sector);

    const pipeline = calculatePipeline(sectorDeals);
    const revenue = calculateRevenue(sectorDeals);
    const ops = calculateOperationalMetrics(sectorWOs);
    const billing = calculateBillingMetrics(sectorWOs);

    results.push({
      sector,
      deals: {
        total: sectorDeals.length,
        open: pipeline.activeDeals,
        won: revenue.totalWonDeals,
        pipelineValue: pipeline.activePipelineValue,
        pipelineFormatted: pipeline.activePipelineFormatted,
        revenueValue: revenue.totalRevenue,
        revenueFormatted: revenue.totalRevenueFormatted,
      },
      workOrders: {
        total: sectorWOs.length,
        completed: ops.byStatus['Completed'] || 0,
        ongoing: ops.byStatus['Ongoing'] || 0,
        orderValue: billing.totalOrderValue,
        orderValueFormatted: billing.totalOrderValueFormatted,
        receivable: billing.totalReceivable,
        receivableFormatted: billing.totalReceivableFormatted,
      },
    });
  }

  return results.sort((a, b) => b.deals.total - a.deals.total);
}

/**
 * Generate leadership update
 */
function generateLeadershipMetrics(deals, workOrders) {
  const pipeline = calculatePipeline(deals);
  const revenue = calculateRevenue(deals);
  const dealCount = calculateDealCount(deals);
  const sectorBreakdown = calculateDealsBySector(deals);
  const stageBreakdown = calculatePipelineByStage(deals);
  const ops = calculateOperationalMetrics(workOrders);
  const billing = calculateBillingMetrics(workOrders);
  const receivables = calculateReceivables(workOrders);
  const crossBoard = calculateCrossBoardMetrics(deals, workOrders);

  return {
    pipeline,
    revenue,
    dealCount,
    sectorBreakdown,
    stageBreakdown,
    operations: ops,
    billing,
    receivables,
    crossBoard,
  };
}

module.exports = {
  calculatePipeline,
  calculateRevenue,
  calculateDealCount,
  calculateDealsBySector,
  calculatePipelineByStage,
  calculateOperationalMetrics,
  calculateBillingMetrics,
  calculateReceivables,
  calculateCrossBoardMetrics,
  generateLeadershipMetrics,
  formatINR,
  getCurrentQuarter,
};
