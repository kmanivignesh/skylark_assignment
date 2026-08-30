const router = require('express').Router();
const auth = require('../middleware/auth');
const { status, listBoards } = require('../controllers/mondayController');

router.get('/status', auth, status);
router.get('/boards', auth, listBoards);

module.exports = router;
