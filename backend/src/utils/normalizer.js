/**
 * Normalize and clean Monday.com data
 */

function normalizeDeals(rawRecords) {
  const records = [];

  for (const row of rawRecords) {
    if (row._item_name && row._item_name.includes('Subitems of')) continue;

    const valStr = (row['Masked Deal value'] || row['Deal value'] || '').toString().replace(/[^0-9.-]+/g, '');
    const amount = valStr ? parseFloat(valStr) : 0;

    const probStr = (row['Closure Probability'] || '').toLowerCase();
    let probability = 0.5;
    if (probStr.includes('high')) probability = 0.8;
    else if (probStr.includes('low')) probability = 0.2;

    records.push({
      id: row._item_id,
      name: row._item_name,
      status: (row['Deal Status'] || 'Open').trim(),
      stage: (row['Deal Stage'] || 'Unknown').trim(),
      sector: (row['Sector/service'] || row['Sector'] || 'Unknown').trim(),
      amount,
      probability,
      closeDate: row['Close Date'] || null,
      owner: (row['Owner code'] || '').trim(),
    });
  }

  return { records };
}

function normalizeWorkOrders(rawRecords) {
  const records = [];

  for (const row of rawRecords) {
    if (row._item_name && row._item_name.includes('Subitems of')) continue;

    const parseMoney = (val) => {
      if (!val) return 0;
      const str = val.toString().replace(/[^0-9.-]+/g, '');
      return str ? parseFloat(str) : 0;
    };

    records.push({
      id: row._item_id,
      name: row._item_name,
      status: (row['Execution Status'] || 'Not Started').trim(),
      sector: (row['Sector'] || 'Unknown').trim(),
      amount: parseMoney(row['Amount ']),
      billed: parseMoney(row['Billed']),
      collected: parseMoney(row['Collected']),
      receivable: parseMoney(row['Receivable']),
      type: (row['Nature of Work'] || row['Type of Work'] || 'Unknown').trim(),
      startDate: row['Start date'] || null,
    });
  }

  return { records };
}

module.exports = { normalizeDeals, normalizeWorkOrders };
