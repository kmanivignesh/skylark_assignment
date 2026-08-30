/**
 * Data Normalization Layer for Skylark BI Agent
 * 
 * Handles messy real-world data from Monday.com boards:
 * - Header-leak rows (column names appearing as values)
 * - Date format inconsistencies
 * - Text case normalization
 * - Numeric parsing (currencies, mixed formats)
 * - Missing value detection
 */

// Known missing value patterns
const MISSING_PATTERNS = new Set([
  '', 'null', 'none', 'n/a', 'na', '-', 'unknown', 'tbd', 'undefined',
]);

/**
 * Check if a value represents a missing/null value
 */
function isMissing(val) {
  if (val === null || val === undefined) return true;
  const s = String(val).trim().toLowerCase();
  return MISSING_PATTERNS.has(s);
}

/**
 * Parse a numeric value safely, handling currency symbols, commas, etc.
 */
function parseNumber(val) {
  if (val === null || val === undefined || val === '') return { value: null, valid: false };
  if (typeof val === 'number') return { value: val, valid: !isNaN(val) };
  
  let s = String(val).trim();
  // Remove currency symbols and commas
  s = s.replace(/[₹$€£,]/g, '').trim();
  // Remove trailing units like "HA", "km", etc.
  s = s.replace(/\s*[a-zA-Z]+\s*$/, '').trim();
  
  const num = parseFloat(s);
  if (isNaN(num)) return { value: null, valid: false };
  return { value: num, valid: true };
}

/**
 * Parse a date value safely
 */
function parseDate(val) {
  if (val === null || val === undefined || val === '') return { value: null, valid: false };
  
  const s = String(val).trim();
  
  // Skip if it looks like a column header
  if (/^[A-Z][a-z]/.test(s) && s.includes(' ') && !s.includes('-') && !s.includes('/') && !s.match(/\d{4}/)) {
    return { value: null, valid: false };
  }

  // Try ISO format first (YYYY-MM-DD...)
  const isoMatch = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) {
    const d = new Date(parseInt(isoMatch[1]), parseInt(isoMatch[2]) - 1, parseInt(isoMatch[3]));
    if (!isNaN(d.getTime())) return { value: d.toISOString().split('T')[0], valid: true };
  }

  // Try DD/MM/YYYY
  const slashMatch = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashMatch) {
    const d = new Date(parseInt(slashMatch[3]), parseInt(slashMatch[2]) - 1, parseInt(slashMatch[1]));
    if (!isNaN(d.getTime())) return { value: d.toISOString().split('T')[0], valid: true };
  }

  // Try MM-DD-YYYY
  const dashMatch = s.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (dashMatch) {
    const d = new Date(parseInt(dashMatch[3]), parseInt(dashMatch[1]) - 1, parseInt(dashMatch[2]));
    if (!isNaN(d.getTime())) return { value: d.toISOString().split('T')[0], valid: true };
  }

  // Fallback to Date constructor
  const d = new Date(s);
  if (!isNaN(d.getTime())) return { value: d.toISOString().split('T')[0], valid: true };

  return { value: null, valid: false };
}

/**
 * Normalize sector names (case-insensitive, trim)
 */
function normalizeSector(val) {
  if (isMissing(val)) return null;
  const s = String(val).trim();
  
  // Map known variations
  const lower = s.toLowerCase();
  const sectorMap = {
    'mining': 'Mining',
    'renewables': 'Renewables',
    'railways': 'Railways',
    'powerline': 'Powerline',
    'construction': 'Construction',
    'others': 'Others',
    'dsp': 'DSP',
    'tender': 'Tender',
    'manufacturing': 'Manufacturing',
    'aviation': 'Aviation',
    'security and surveillance': 'Security and Surveillance',
    'energy': 'Renewables', // Common alias
  };

  return sectorMap[lower] || s;
}

/**
 * Normalize deal status
 */
function normalizeDealStatus(val) {
  if (isMissing(val)) return null;
  const s = String(val).trim();
  const lower = s.toLowerCase();
  
  // Filter out header-leak values
  if (lower === 'deal status') return null;
  
  const statusMap = {
    'open': 'Open',
    'won': 'Won',
    'dead': 'Dead',
    'on hold': 'On Hold',
    'lost': 'Dead',
  };
  return statusMap[lower] || s;
}

/**
 * Normalize execution status for work orders
 */
function normalizeExecutionStatus(val) {
  if (isMissing(val)) return null;
  const s = String(val).trim();
  const lower = s.toLowerCase();
  
  const statusMap = {
    'completed': 'Completed',
    'ongoing': 'Ongoing',
    'not started': 'Not Started',
    'executed until current month': 'Ongoing',
    'pause / struck': 'Paused',
    'partial completed': 'Partially Completed',
    'details pending from client': 'Pending',
  };
  return statusMap[lower] || s;
}

/**
 * Normalize billing status
 */
function normalizeBillingStatus(val) {
  if (isMissing(val)) return null;
  const s = String(val).trim();
  const lower = s.toLowerCase();
  
  const statusMap = {
    'fully billed': 'Fully Billed',
    'partially billed': 'Partially Billed',
    'not billed yet': 'Not Billed',
    'billed': 'Fully Billed',
    'billed- visit 7': 'Fully Billed',
    'billed- visit 3': 'Fully Billed',
    'stuck': 'Stuck',
    'not billable': 'Not Billable',
    'update required': 'Update Required',
  };
  return statusMap[lower] || s;
}

/**
 * Normalize and clean Deals board data
 * Returns { records: [], dataQuality: [] }
 */
function normalizeDeals(rawRecords) {
  const dataQuality = [];
  let headerLeakCount = 0;
  let missingDealValue = 0;
  let missingCloseDate = 0;
  let missingSector = 0;
  let missingProbability = 0;
  let invalidDates = 0;

  const records = [];

  for (const raw of rawRecords) {
    // Detect header-leak rows: Deal Status == "Deal Status"
    const dealStatusVal = raw['Deal Status'] || raw['deal_status'] || raw._item_name;
    if (String(dealStatusVal).trim() === 'Deal Status' || String(raw['Deal Stage'] || '').trim() === 'Deal Stage') {
      headerLeakCount++;
      continue;
    }

    const dealName = raw['Deal Name'] || raw._item_name || null;
    const ownerCode = isMissing(raw['Owner code']) ? null : String(raw['Owner code']).trim();
    const clientCode = isMissing(raw['Client Code']) ? null : String(raw['Client Code']).trim();
    const dealStatus = normalizeDealStatus(raw['Deal Status']);
    const dealStage = isMissing(raw['Deal Stage']) || String(raw['Deal Stage']).trim() === 'Deal Stage' 
      ? null : String(raw['Deal Stage']).trim();
    const sector = normalizeSector(raw['Sector/service'] || raw['Sector']);
    const productDeal = isMissing(raw['Product deal']) || String(raw['Product deal']).trim() === 'Product deal'
      ? null : String(raw['Product deal']).trim();
    
    const probability = (function() {
      const v = raw['Closure Probability'];
      if (isMissing(v) || String(v).trim() === 'Closure Probability') { missingProbability++; return null; }
      return String(v).trim();
    })();

    const dealValue = (function() {
      const parsed = parseNumber(raw['Masked Deal value']);
      if (!parsed.valid) { missingDealValue++; return null; }
      return parsed.value;
    })();

    const tentativeCloseDate = (function() {
      const parsed = parseDate(raw['Tentative Close Date']);
      if (!parsed.valid && raw['Tentative Close Date'] && !isMissing(raw['Tentative Close Date'])) {
        if (String(raw['Tentative Close Date']).trim() !== 'Tentative Close Date') invalidDates++;
      }
      if (!parsed.valid) { missingCloseDate++; }
      return parsed.valid ? parsed.value : null;
    })();

    const closeDate = (function() {
      const parsed = parseDate(raw['Close Date (A)']);
      return parsed.valid ? parsed.value : null;
    })();

    const createdDate = (function() {
      const parsed = parseDate(raw['Created Date']);
      return parsed.valid ? parsed.value : null;
    })();

    if (!sector) missingSector++;

    records.push({
      dealName,
      ownerCode,
      clientCode,
      dealStatus,
      closeDate,
      closureProbability: probability,
      dealValue,
      tentativeCloseDate,
      dealStage,
      productDeal,
      sector,
      createdDate,
    });
  }

  // Build quality report
  if (headerLeakCount > 0) dataQuality.push(`${headerLeakCount} header-leak rows were filtered out.`);
  if (missingDealValue > 0) dataQuality.push(`${missingDealValue} deals have missing monetary values.`);
  if (missingCloseDate > 0) dataQuality.push(`${missingCloseDate} deals have missing tentative close dates.`);
  if (missingSector > 0) dataQuality.push(`${missingSector} deals have missing sector information.`);
  if (missingProbability > 0) dataQuality.push(`${missingProbability} deals have missing closure probability.`);
  if (invalidDates > 0) dataQuality.push(`${invalidDates} records contain unparseable dates.`);

  return { records, dataQuality };
}

/**
 * Normalize and clean Work Orders board data
 * Returns { records: [], dataQuality: [] }
 */
function normalizeWorkOrders(rawRecords) {
  const dataQuality = [];
  let missingAmount = 0;
  let missingExecStatus = 0;
  let missingSector = 0;
  let missingDates = 0;
  let negativeValues = 0;

  const records = [];

  for (const raw of rawRecords) {
    const dealName = raw['Deal name masked'] || raw._item_name || null;
    const customerCode = isMissing(raw['Customer Name Code']) ? null : String(raw['Customer Name Code']).trim();
    const serialNumber = raw['Serial #'] || null;
    const natureOfWork = isMissing(raw['Nature of Work']) ? null : String(raw['Nature of Work']).trim();
    const executionStatus = normalizeExecutionStatus(raw['Execution Status']);
    const sector = normalizeSector(raw['Sector']);
    const typeOfWork = isMissing(raw['Type of Work']) ? null : String(raw['Type of Work']).trim();
    const documentType = isMissing(raw['Document Type']) ? null : String(raw['Document Type']).trim();
    const softwarePlatform = isMissing(raw['Is any Skylark software platform part of the client deliverables in this deal?'])
      ? null : String(raw['Is any Skylark software platform part of the client deliverables in this deal?']).trim();
    const bdOwner = isMissing(raw['BD/KAM Personnel code']) ? null : String(raw['BD/KAM Personnel code']).trim();

    // Dates
    const poDate = parseDate(raw['Date of PO/LOI']);
    const startDate = parseDate(raw['Probable Start Date']);
    const endDate = parseDate(raw['Probable End Date']);
    const deliveryDate = parseDate(raw['Data Delivery Date']);
    const lastInvoiceDate = parseDate(raw['Last invoice date']);

    // Monetary values
    const amountExclGST = parseNumber(raw['Amount in Rupees (Excl of GST) (Masked)']);
    const amountInclGST = parseNumber(raw['Amount in Rupees (Incl of GST) (Masked)']);
    const billedExclGST = parseNumber(raw['Billed Value in Rupees (Excl of GST.) (Masked)']);
    const billedInclGST = parseNumber(raw['Billed Value in Rupees (Incl of GST.) (Masked)']);
    const collectedInclGST = parseNumber(raw['Collected Amount in Rupees (Incl of GST.) (Masked)']);
    const toBillExclGST = parseNumber(raw['Amount to be billed in Rs. (Exl. of GST) (Masked)']);
    const toBillInclGST = parseNumber(raw['Amount to be billed in Rs. (Incl. of GST) (Masked)']);
    const receivable = parseNumber(raw['Amount Receivable (Masked)']);

    // Invoice/billing status
    const invoiceStatus = normalizeBillingStatus(raw['Invoice Status']);
    const billingStatus = normalizeBillingStatus(raw['Billing Status']);
    const woStatus = isMissing(raw['WO Status (billed)']) ? null : String(raw['WO Status (billed)']).trim();

    // Track quality issues
    if (!amountExclGST.valid) missingAmount++;
    if (!executionStatus) missingExecStatus++;
    if (!sector) missingSector++;
    if (!poDate.valid && !startDate.valid) missingDates++;
    if (receivable.valid && receivable.value < 0) negativeValues++;
    if (toBillExclGST.valid && toBillExclGST.value < 0) negativeValues++;

    records.push({
      dealName,
      customerCode,
      serialNumber,
      natureOfWork,
      executionStatus,
      sector,
      typeOfWork,
      documentType,
      softwarePlatform,
      bdOwner,
      poDate: poDate.valid ? poDate.value : null,
      startDate: startDate.valid ? startDate.value : null,
      endDate: endDate.valid ? endDate.value : null,
      deliveryDate: deliveryDate.valid ? deliveryDate.value : null,
      lastInvoiceDate: lastInvoiceDate.valid ? lastInvoiceDate.value : null,
      amountExclGST: amountExclGST.valid ? amountExclGST.value : null,
      amountInclGST: amountInclGST.valid ? amountInclGST.value : null,
      billedExclGST: billedExclGST.valid ? billedExclGST.value : null,
      billedInclGST: billedInclGST.valid ? billedInclGST.value : null,
      collectedInclGST: collectedInclGST.valid ? collectedInclGST.value : null,
      toBillExclGST: toBillExclGST.valid ? toBillExclGST.value : null,
      toBillInclGST: toBillInclGST.valid ? toBillInclGST.value : null,
      receivable: receivable.valid ? receivable.value : null,
      invoiceStatus,
      billingStatus,
      woStatus,
    });
  }

  if (missingAmount > 0) dataQuality.push(`${missingAmount} work orders have missing monetary values.`);
  if (missingExecStatus > 0) dataQuality.push(`${missingExecStatus} work orders have missing execution status.`);
  if (missingSector > 0) dataQuality.push(`${missingSector} work orders have missing sector information.`);
  if (missingDates > 0) dataQuality.push(`${missingDates} work orders have no PO date or start date.`);
  if (negativeValues > 0) dataQuality.push(`${negativeValues} records have negative billing/receivable values (likely credits or adjustments).`);

  return { records, dataQuality };
}

module.exports = {
  normalizeDeals,
  normalizeWorkOrders,
  isMissing,
  parseNumber,
  parseDate,
  normalizeSector,
};
