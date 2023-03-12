const router = require('express').Router();
const flutterwaveRouter = require('./flutterwave');
const paypalRouter = require('./paypal');

router.use('/flutterwave', flutterwaveRouter);
router.use('/paypal', paypalRouter);

module.exports = router;
