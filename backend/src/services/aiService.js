/**
 * AI Service
 * 
 * Uses LLM for two purposes:
 * 1. Query Understanding — parse user question into structured query plan
 * 2. Response Generation — explain calculated metrics in executive-friendly language
 * 
 * The LLM NEVER performs calculations. All math is done in analyticsService.
 */

const { GoogleGenAI } = require('@google/genai');

// Initialize lazily to prevent crash on startup if key is missing
let ai = null;
function getAI() {
  if (!ai) {
    ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || 'MISSING_KEY' });
  }
  return ai;
}

// Allowlisted query plan schema
const ALLOWED_INTENTS = [
  'pipeline_analysis', 'revenue_analysis', 'deal_count',
  'sector_analysis', 'stage_analysis', 'operational_metrics',
  'billing_metrics', 'collection_metrics', 'receivables',
  'cross_board_analysis', 'leadership_update', 'clarification_needed',
  'general_question',
];

const ALLOWED_BOARDS = ['deals', 'workOrders', 'both'];

const ALLOWED_METRICS = [
  'pipeline_value', 'deal_count', 'stage_distribution', 'status_distribution',
  'revenue', 'win_rate', 'avg_deal_size', 'sector_distribution',
  'active_work_orders', 'completion_rate', 'execution_status',
  'total_order_value', 'billed_value', 'collected_value',
  'receivable_amount', 'billing_rate', 'collection_rate',
  'cross_board_sector', 'leadership_summary',
];

const SYSTEM_PROMPT_QUERY_UNDERSTANDING = `You are a business intelligence query analyzer for Skylark Drones.

Your job is to understand the user's business question and create a structured query plan.

Available data boards:
1. "deals" - Sales pipeline with: Deal Name, Owner code, Client Code, Deal Status (Open/Won/Dead/On Hold), Close Date, Closure Probability (High/Medium/Low), Masked Deal value, Tentative Close Date, Deal Stage (A. Lead Generated through O. Not Relevant), Product deal, Sector/service, Created Date
2. "workOrders" - Operations with: Deal name, Customer Code, Serial #, Nature of Work, Execution Status (Completed/Ongoing/Not Started/Paused), dates, Sector, Type of Work, monetary values (Amount, Billed, Collected, Receivable), Invoice/Billing Status

Available sectors: Mining, Renewables, Railways, Powerline, Construction, Others, DSP, Tender, Manufacturing, Aviation, Security and Surveillance

IMPORTANT: "Energy" is commonly used to refer to "Renewables" sector.

Respond with a JSON object only matching this structure exactly (do not wrap in markdown tags like \`\`\`json):
{
  "intent": one of ${JSON.stringify(ALLOWED_INTENTS)},
  "boards": array of ${JSON.stringify(ALLOWED_BOARDS)},
  "filters": {
    "sector": string or null,
    "period": "current_quarter" | "this_year" | "all" | null,
    "status": string or null
  },
  "metrics": array of metric names from ${JSON.stringify(ALLOWED_METRICS)},
  "clarification": string or null (if intent is "clarification_needed", provide the question to ask)
}

If the question is ambiguous and truly unclear, use intent "clarification_needed" and provide the clarification question.
If it's a greeting or off-topic, use intent "general_question".
Prefer giving an answer over asking for clarification — only ask when genuinely necessary.`;

const SYSTEM_PROMPT_RESPONSE = `You are Skylark BI Agent, an executive business intelligence assistant for Skylark Drones.

Generate a concise, founder-level business insight response based on the calculated metrics provided.

Rules:
- Use markdown formatting (bold, bullets, headers)
- Lead with the key metric/answer first
- Include 2-3 key points
- Add a brief strategic insight where relevant
- Use Indian Rupee formatting (₹, Cr, L)
- Keep responses focused — max 200 words for simple queries, 400 for complex/leadership updates
- Never fabricate data not present in the metrics
- If data is limited (e.g., many missing values), mention it
- Reference any obvious limitations in the data naturally
- Do NOT repeat raw JSON — translate into natural business language
- Use "we" and "our" to sound like an internal advisor`;

/**
 * Parse user question into structured query plan
 */
async function understandQuery(question, conversationHistory = []) {
  try {
    let fullPrompt = SYSTEM_PROMPT_QUERY_UNDERSTANDING + '\n\n';

    // Add recent conversation for context
    const recentHistory = conversationHistory.slice(-4);
    for (const msg of recentHistory) {
      fullPrompt += `${msg.role.toUpperCase()}: ${msg.content}\n\n`;
    }

    fullPrompt += `USER: ${question}`;

    const response = await getAI().models.generateContent({
      model: 'gemini-3.6-flash',
      contents: fullPrompt,
      config: {
        temperature: 0.1,
        responseMimeType: 'application/json',
      }
    });

    const content = response.text;
    const plan = JSON.parse(content);

    // Validate query plan
    if (!ALLOWED_INTENTS.includes(plan.intent)) {
      plan.intent = 'general_question';
    }
    if (plan.boards) {
      plan.boards = plan.boards.filter(b => ALLOWED_BOARDS.includes(b));
      if (plan.boards.length === 0) plan.boards = ['both'];
    }
    if (plan.metrics) {
      plan.metrics = plan.metrics.filter(m => ALLOWED_METRICS.includes(m));
    }

    return plan;
  } catch (err) {
    console.error('Query understanding error:', err);
    // Fallback plan
    return {
      intent: 'general_question',
      boards: ['both'],
      filters: {},
      metrics: ['pipeline_value', 'deal_count'],
    };
  }
}

/**
 * Generate executive-level response from calculated metrics
 */
async function generateResponse(question, queryPlan, calculatedMetrics) {
  try {
    const metricsContext = JSON.stringify(calculatedMetrics, null, 2);

    const userPrompt = `User Question: ${question}

Query Plan Intent: ${queryPlan.intent}

Calculated Metrics:
${metricsContext}

Generate a concise executive business intelligence response.`;

    const response = await getAI().models.generateContent({
      model: 'gemini-3.6-flash',
      contents: [
        { role: 'user', parts: [{ text: SYSTEM_PROMPT_RESPONSE + '\n\n' + userPrompt }] }
      ],
      config: {
        temperature: 0.3,
      }
    });

    console.log('AI Response:', response.text);
    return response.text;
  } catch (err) {
    console.error('Response generation error:', err);
    throw new Error('The AI service is temporarily unavailable. Please try again.');
  }
}

module.exports = { understandQuery, generateResponse };
