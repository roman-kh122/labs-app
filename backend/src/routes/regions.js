const express = require('express');
const router = express.Router();
const regionsController = require('../controllers/regionsController');
const authMiddleware = require('../middleware/auth');

router.get('/', regionsController.getAll);
router.get('/:id', regionsController.getById);
router.post('/', authMiddleware, regionsController.create);
router.put('/:id', authMiddleware, regionsController.update);
router.delete('/:id', authMiddleware, regionsController.remove);

module.exports = router;
