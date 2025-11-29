const express = require('express');
const {
  createConsultation,
  getConsultation,
  getMyConsultations,
  startConsultation,
  endConsultation,
  cancelConsultation,
  getConsultationHistory,
} = require('../controllers/consultation.controller');
const { protect } = require('../middlewares/auth');

const router = express.Router();

router.use(protect);

router.post('/', createConsultation);
router.get('/', getMyConsultations);
router.get('/history', getConsultationHistory);
router.get('/:id', getConsultation);
router.put('/:id/start', startConsultation);
router.put('/:id/end', endConsultation);
router.put('/:id/cancel', cancelConsultation);

module.exports = router;

