/**
 * Chat Controller
 * 
 * Orchestrates the full query flow:
 * User Question → LLM Query Understanding → Data Retrieval → Analytics → LLM Response
 */

const dataService = require('../services/dataService');
const analytics = require('../services/analyticsService');
const aiService = require('../services/aiService');

/**
 * Execute a query plan against the data
 */
function executeQueryPlan(queryPlan, deals, workOrders) {
  const filters = queryPlan.filters || {};
  const results = {};

  switch (queryPlan.intent) {
    case 'pipeline_analysis':
      results.pipeline = analytics.calculatePipeline(deals, filters);
      results.pipelineByStage = analytics.calculatePipelineByStage(deals);
      if (filters.sector) {
        results.sectorDeals = analytics.calculateDealsBySector(deals).find(
          s => s.sector.toLowerCase() === (filters.sector || '').toLowerCase()
        );
      }
      break;

    case 'revenue_analysis':
      results.revenue = analytics.calculateRevenue(deals, filters);
      break;

    case 'deal_count':
      results.dealCount = analytics.calculateDealCount(deals, filters);
      break;

    case 'sector_analysis':
      results.sectorBreakdown = analytics.calculateDealsBySector(deals);
      if (filters.sector) {
        results.pipeline = analytics.calculatePipeline(deals, filters);
        results.revenue = analytics.calculateRevenue(deals, filters);
        results.operations = analytics.calculateOperationalMetrics(workOrders, filters);
        results.billing = analytics.calculateBillingMetrics(workOrders, filters);
      }
      break;

    case 'stage_analysis':
      results.stageBreakdown = analytics.calculatePipelineByStage(deals);
      results.pipeline = analytics.calculatePipeline(deals, filters);
      break;

    case 'operational_metrics':
      results.operations = analytics.calculateOperationalMetrics(workOrders, filters);
      results.billing = analytics.calculateBillingMetrics(workOrders, filters);
      break;

    case 'billing_metrics':
      results.billing = analytics.calculateBillingMetrics(workOrders, filters);
      break;

    case 'collection_metrics':
      results.billing = analytics.calculateBillingMetrics(workOrders, filters);
      results.receivables = analytics.calculateReceivables(workOrders, filters);
      break;

    case 'receivables':
      results.receivables = analytics.calculateReceivables(workOrders, filters);
      break;

    case 'cross_board_analysis':
      results.crossBoard = analytics.calculateCrossBoardMetrics(deals, workOrders, filters);
      if (filters.sector) {
        results.pipeline = analytics.calculatePipeline(deals, filters);
        results.operations = analytics.calculateOperationalMetrics(workOrders, filters);
        results.billing = analytics.calculateBillingMetrics(workOrders, filters);
      }
      break;

    case 'leadership_update':
      results.leadership = analytics.generateLeadershipMetrics(deals, workOrders);
      break;

    case 'general_question':
    default:
      // Provide a general overview
      results.pipeline = analytics.calculatePipeline(deals);
      results.revenue = analytics.calculateRevenue(deals);
      results.operations = analytics.calculateOperationalMetrics(workOrders);
      break;
  }

  return results;
}

/**
 * POST /api/chat — Main chat endpoint
 */
async function chat(req, res) {
  try {
    const { message, conversationHistory } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Step 1: LLM Query Understanding
    const queryPlan = await aiService.understandQuery(message, conversationHistory || []);

    // Handle clarification
    if (queryPlan.intent === 'clarification_needed') {
      return res.json({
        response: queryPlan.clarification || "Could you be more specific about what you'd like to know? I can analyze pipeline, revenue, deals, operations, or cross-board sector performance.",
        queryPlan,
        dataQuality: [],
        metrics: null,
      });
    }

    // Step 2: Fetch Data from Monday.com
    let allData;
    try {
      allData = await dataService.getAllData(req.userId);
    } catch (dataErr) {
      return res.json({
        response: `We couldn't retrieve your Monday.com data right now. ${dataErr.message}`,
        queryPlan,
        dataQuality: [],
        metrics: null,
      });
    }

    const { deals, workOrders, dataQuality } = allData;

    if (deals.length === 0 && workOrders.length === 0) {
      return res.json({
        response: "I don't have any data to analyze yet. Please make sure your Monday.com boards (Deals and Work Orders) are properly connected and contain data.",
        queryPlan,
        dataQuality: ['No data available from Monday.com boards.'],
        metrics: null,
      });
    }

    // Step 3: Execute Analytics
    const calculatedMetrics = executeQueryPlan(queryPlan, deals, workOrders);

    // Step 4: Generate Response
    const response = await aiService.generateResponse(
      message, queryPlan, calculatedMetrics, dataQuality
    );

    res.json({
      response,
      queryPlan,
      dataQuality,
      metrics: calculatedMetrics,
    });
  } catch (err) {
    console.error('Chat error:', err);

    // Handle specific error types
    if (err.message?.includes('API key')) {
      return res.status(500).json({
        error: 'The AI service is not configured. Please check the API key.',
      });
    }

    res.status(500).json({
      error: err.message || 'Something went wrong. Please try again.',
    });
  }
}

module.exports = { chat };
