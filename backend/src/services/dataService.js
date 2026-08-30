/**
 * Data Service
 * 
 * Fetches Monday.com data, normalizes it, and provides it to analytics.
 * Implements simple in-memory caching (5-minute TTL) to avoid excessive API calls.
 */

const mondayService = require('./mondayService');
const { normalizeDeals, normalizeWorkOrders } = require('../utils/normalizer');

// Simple in-memory cache
const cache = {};
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCacheKey(type) {
  // Since we use a global API key, the cache is global across users
  return `global:${type}`;
}

function getCached(key) {
  const entry = cache[key];
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    delete cache[key];
    return null;
  }
  return entry.data;
}

function setCache(key, data) {
  cache[key] = { data, timestamp: Date.now() };
}

/**
 * Identify boards from Monday.com using global token
 */
async function getIdentifiedBoards() {
  const boardsKey = getCacheKey('identifiedBoards');
  let boards = getCached(boardsKey);
  
  if (!boards) {
    if (!process.env.MONDAY_API_TOKEN) {
      throw new Error('Monday API Token is not configured in .env');
    }
    const allBoards = await mondayService.getBoards();
    boards = mondayService.identifyBoards(allBoards);
    setCache(boardsKey, boards);
  }
  
  return boards;
}


/**
 * Fetch and normalize Deals data
 */
async function getDeals() {
  const cacheKey = getCacheKey('deals');
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const { dealsBoard } = await getIdentifiedBoards();
  if (!dealsBoard) {
    throw new Error('Could not automatically identify a Deals board. Please ensure a board exists with Deal-related columns.');
  }

  const { items, columns } = await mondayService.getBoardItems(dealsBoard.id);
  const rawRecords = mondayService.transformItems(items, columns);
  const normalized = normalizeDeals(rawRecords);

  setCache(cacheKey, normalized);
  return normalized;
}

/**
 * Fetch and normalize Work Orders data
 */
async function getWorkOrders() {
  const cacheKey = getCacheKey('workOrders');
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const { workOrdersBoard } = await getIdentifiedBoards();
  if (!workOrdersBoard) {
    throw new Error('Could not automatically identify a Work Orders board. Please ensure a board exists with Work Order columns.');
  }

  const { items, columns } = await mondayService.getBoardItems(workOrdersBoard.id);
  const rawRecords = mondayService.transformItems(items, columns);
  const normalized = normalizeWorkOrders(rawRecords);

  setCache(cacheKey, normalized);
  return normalized;
}

/**
 * Get both boards' data
 */
async function getAllData() {
  if (!process.env.MONDAY_API_TOKEN) {
    throw new Error('Monday API Token is not configured in .env');
  }

  const [deals, workOrders] = await Promise.all([
    getDeals().catch(err => ({ records: [], dataQuality: [`Deals: ${err.message}`] })),
    getWorkOrders().catch(err => ({ records: [], dataQuality: [`Work Orders: ${err.message}`] })),
  ]);

  return {
    deals: deals.records,
    workOrders: workOrders.records,
    dataQuality: [...(deals.dataQuality || []), ...(workOrders.dataQuality || [])],
  };
}

/**
 * Clear global cache
 */
function clearCache() {
  delete cache[getCacheKey('deals')];
  delete cache[getCacheKey('workOrders')];
  delete cache[getCacheKey('identifiedBoards')];
}

module.exports = { getDeals, getWorkOrders, getAllData, clearCache, getIdentifiedBoards };
