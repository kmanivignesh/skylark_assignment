const mondayService = require('../services/mondayService');
const dataService = require('../services/dataService');

/**
 * GET /api/monday/status — Check connection status
 */
async function status(req, res) {
  try {
    const hasToken = !!process.env.MONDAY_API_TOKEN;
    
    if (!hasToken) {
      return res.json({ connected: false });
    }

    // Verify token is still valid and fetch identified boards
    let boards = { deals: null, workOrders: null };
    try {
      const { dealsBoard, workOrdersBoard } = await dataService.getIdentifiedBoards();
      
      if (dealsBoard) {
        boards.deals = { id: dealsBoard.id, name: dealsBoard.name, itemCount: dealsBoard.items_count };
      }
      if (workOrdersBoard) {
        boards.workOrders = { id: workOrdersBoard.id, name: workOrdersBoard.name, itemCount: workOrdersBoard.items_count };
      }
    } catch (apiErr) {
      console.error('Monday API error during status check:', apiErr.message);
      return res.json({ connected: false, error: 'Token expired or invalid' });
    }

    res.json({
      connected: true,
      boards,
    });
  } catch (err) {
    console.error('Monday status error:', err);
    res.status(500).json({ error: 'Failed to check connection status' });
  }
}

/**
 * GET /api/monday/boards — List identified boards
 */
async function listBoards(req, res) {
  try {
    if (!process.env.MONDAY_API_TOKEN) {
      return res.status(400).json({ error: 'Monday.com not connected' });
    }

    const allBoards = await mondayService.getBoards();
    const { dealsBoard, workOrdersBoard } = mondayService.identifyBoards(allBoards);

    res.json({
      all: allBoards.map(b => ({ id: b.id, name: b.name, itemCount: b.items_count })),
      identified: {
        deals: dealsBoard ? { id: dealsBoard.id, name: dealsBoard.name, itemCount: dealsBoard.items_count } : null,
        workOrders: workOrdersBoard ? { id: workOrdersBoard.id, name: workOrdersBoard.name, itemCount: workOrdersBoard.items_count } : null,
      },
    });
  } catch (err) {
    console.error('Monday boards error:', err);
    res.status(500).json({ error: 'Failed to fetch boards' });
  }
}

module.exports = { status, listBoards };
