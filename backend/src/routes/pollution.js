const express = require('express');
const router = express.Router();
const pollutionController = require('../controllers/pollutionController');
const authMiddleware = require('../middleware/auth');

// Public routes
router.get('/current', pollutionController.getCurrent);
router.get('/search', pollutionController.searchCity);
router.get('/history', pollutionController.getHistory);
router.get('/averages', pollutionController.getAverages);
router.get('/latest', pollutionController.getLatest);

// Protected routes
router.post('/fetch/:regionId', authMiddleware, pollutionController.fetchAndStore);
router.post('/fetch-all', authMiddleware, pollutionController.fetchAll);

module.exports = router;
