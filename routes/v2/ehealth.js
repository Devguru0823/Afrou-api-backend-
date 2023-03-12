const router = require('express').Router();
const {
	getPlans,
	createEhealthPlan,
	getPlan,
	updatePlan,
	deletePlan,
	searchPlan,
	getUserPurchasedPlans,
	getSingleUserPurchasedPlan,
	subscribe,
	getTestimonialVideos,
} = require('../../models/v2/ehealth');
const ADMINAUTH = require('../../admin/authentication');
const AUTH = require('../../_helpers/v2/authentication');

router.route('/testimonials').get(getTestimonialVideos);
router.route('/subscribe').post(subscribe);
router.route('/search').get(searchPlan);
router.route('/subscriptions').get(AUTH.authenticate, getUserPurchasedPlans);
router
	.route('/subscriptions/:id')
	.get(AUTH.authenticate, getSingleUserPurchasedPlan);
router.route('/').get(getPlans).post(createEhealthPlan);
router
	.route('/:id')
	.get(getPlan)
	.put(ADMINAUTH.authenticate, updatePlan)
	.delete(ADMINAUTH.authenticate, deletePlan);

module.exports = router;
