const axios = require('axios');

const MONDAY_API = 'https://api.monday.com/v2';

/**
 * Make a GraphQL request to Monday.com API
 * Uses the global MONDAY_API_TOKEN if token is not passed
 */
async function mondayQuery(query, variables = {}, token = null) {
  const authToken = token || process.env.MONDAY_API_TOKEN;
  
  if (!authToken) {
    throw new Error('Monday API Token is not configured in .env');
  }

  const response = await axios.post(MONDAY_API, 
    JSON.stringify({ query, variables }),
    {
      headers: {
        'Authorization': authToken,
        'Content-Type': 'application/json',
        'API-Version': '2024-10',
      },
    }
  );
  
  if (response.data.errors) {
    throw new Error(`Monday API error: ${JSON.stringify(response.data.errors)}`);
  }
  return response.data.data;
}

/**
 * Get user's workspace and boards
 */
async function getBoards(token = null) {
  const query = `query {
    boards(limit: 50) {
      id
      name
      items_count
      columns {
        id
        title
        type
      }
    }
  }`;
  const data = await mondayQuery(query, {}, token);
  return data.boards || [];
}

/**
 * Get all items from a board with pagination
 */
async function getBoardItems(boardId, token = null) {
  const allItems = [];
  let cursor = null;
  
  // First page
  const firstQuery = `query ($boardId: [ID!]!) {
    boards(ids: $boardId) {
      name
      columns {
        id
        title
        type
      }
      items_page(limit: 500) {
        cursor
        items {
          id
          name
          column_values {
            id
            text
            value
            column {
              title
            }
          }
        }
      }
    }
  }`;
  
  const firstData = await mondayQuery(firstQuery, { boardId: [boardId] }, token);
  const board = firstData.boards[0];
  const columns = board.columns;
  const firstPage = board.items_page;
  allItems.push(...firstPage.items);
  cursor = firstPage.cursor;
  
  // Paginate
  while (cursor) {
    const nextQuery = `query ($cursor: String!) {
      next_items_page(limit: 500, cursor: $cursor) {
        cursor
        items {
          id
          name
          column_values {
            id
            text
            value
            column {
              title
            }
          }
        }
      }
    }`;
    const nextData = await mondayQuery(nextQuery, { cursor }, token);
    const nextPage = nextData.next_items_page;
    allItems.push(...nextPage.items);
    cursor = nextPage.cursor;
  }

  return { items: allItems, columns };
}

/**
 * Identify Deals and Work Orders boards from user's boards
 */
function identifyBoards(boards) {
  let dealsBoard = null;
  let workOrdersBoard = null;

  for (const board of boards) {
    const name = board.name.toLowerCase();
    const colNames = board.columns.map(c => c.title.toLowerCase());

    // Identify Deals board by column patterns
    if (
      (name.includes('deal') || name.includes('funnel') || name.includes('pipeline')) ||
      (colNames.some(c => c.includes('deal stage')) && colNames.some(c => c.includes('deal status')))
    ) {
      if (!dealsBoard || board.items_count > dealsBoard.items_count) {
        dealsBoard = board;
      }
    }

    // Identify Work Orders board by column patterns
    if (
      (name.includes('work order') || name.includes('work_order') || name.includes('tracker')) ||
      (colNames.some(c => c.includes('execution status')) && colNames.some(c => c.includes('nature of work')))
    ) {
      if (!workOrdersBoard || board.items_count > workOrdersBoard.items_count) {
        workOrdersBoard = board;
      }
    }
  }

  return { dealsBoard, workOrdersBoard };
}

/**
 * Transform Monday.com items into flat objects using column titles
 */
function transformItems(items, columns) {
  const colMap = {};
  columns.forEach(c => { colMap[c.id] = c.title; });

  return items.map(item => {
    const row = { _item_name: item.name, _item_id: item.id };
    item.column_values.forEach(cv => {
      const title = cv.column?.title || colMap[cv.id] || cv.id;
      row[title] = cv.text || null;
    });
    return row;
  });
}

module.exports = {
  getBoards,
  getBoardItems,
  identifyBoards,
  transformItems,
  mondayQuery,
};
