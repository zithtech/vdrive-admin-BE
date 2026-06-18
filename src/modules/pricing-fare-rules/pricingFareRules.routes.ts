import { Router } from 'express';
import PricingFareRulesController from './pricingFareRules.controller';
import DriverTimeSlotsPricingController from './driverTimeSlotsPricing.controller';
import { PricingFareRulesValidation } from './pricingFareRules.validator';
import { DriverTimeSlotsPricingValidation } from './driverTimeSlotsPricing.validator';
import { validateBody, validateParams, validateQuery } from '../../utilities/helper';
import { requirePermission } from '../../shared/authorization';

const router = Router();

// ==================== PRICING FARE RULES ROUTES ====================

// GET all pricing fare rules
router.get(
  '/',
  requirePermission('pricing', 'read'),
  validateQuery(PricingFareRulesValidation.getPricingFareRulesValidation),
  PricingFareRulesController.getPricingFareRules
);

// GET single pricing fare rule by ID
router.get(
  '/:id',
  requirePermission('pricing', 'read'),
  validateParams(PricingFareRulesValidation.pricingFareRuleIdValidation),
  PricingFareRulesController.getPricingFareRuleById
);

// CREATE new pricing fare rule
router.post(
  '/',
  requirePermission('pricing', 'create'),
  validateBody(PricingFareRulesValidation.createPricingFareRuleValidation),
  PricingFareRulesController.createPricingFareRule
);

// UPDATE pricing fare rule
router.put(
  '/:id',
  requirePermission('pricing', 'update'),
  validateParams(PricingFareRulesValidation.pricingFareRuleIdValidation),
  validateBody(PricingFareRulesValidation.updatePricingFareRuleValidation),
  PricingFareRulesController.updatePricingFareRule
);

// DELETE pricing fare rule
router.delete(
  '/:id',
  requirePermission('pricing', 'delete'),
  validateParams(PricingFareRulesValidation.pricingFareRuleIdValidation),
  PricingFareRulesController.deletePricingFareRule
);

// CREATE pricing fare rule with time slots
router.post(
  '/with-slots',
  requirePermission('pricing', 'create'),
  validateBody(PricingFareRulesValidation.createPricingRuleWithSlotsValidation),
  PricingFareRulesController.createPricingRuleWithSlots
);

// UPDATE pricing fare rule with time slots
router.put(
  '/with-slots/:id',
  requirePermission('pricing', 'update'),
  validateParams(PricingFareRulesValidation.pricingFareRuleIdValidation),
  validateBody(PricingFareRulesValidation.updatePricingRuleWithSlotsValidation),
  PricingFareRulesController.updatePricingRuleWithSlots
);

// ==================== DRIVER TIME SLOTS PRICING ROUTES ====================

// GET all driver time slots pricing
router.get(
  '/time-slots/all',
  requirePermission('pricing', 'read'),
  validateQuery(DriverTimeSlotsPricingValidation.getDriverTimeSlotsPricingValidation),
  DriverTimeSlotsPricingController.getDriverTimeSlotsPricing
);

// GET driver time slots pricing by pricing fare rule ID
router.get(
  '/time-slots/by-fare-rule/:price_and_fare_rules_id',
  requirePermission('pricing', 'read'),
  validateParams(DriverTimeSlotsPricingValidation.pricingFareRuleIdValidation),
  DriverTimeSlotsPricingController.getByPricingFareRuleId
);

// GET single driver time slots pricing by ID
router.get(
  '/time-slots/:id',
  requirePermission('pricing', 'read'),
  validateParams(DriverTimeSlotsPricingValidation.driverTimeSlotsPricingIdValidation),
  DriverTimeSlotsPricingController.getDriverTimeSlotsPricingById
);

// CREATE new driver time slots pricing
router.post(
  '/time-slots',
  requirePermission('pricing', 'create'),
  validateBody(DriverTimeSlotsPricingValidation.createDriverTimeSlotsPricingValidation),
  DriverTimeSlotsPricingController.createDriverTimeSlotsPricing
);

// BULK CREATE driver time slots pricing
router.post(
  '/time-slots/bulk',
  requirePermission('pricing', 'create'),
  validateBody(DriverTimeSlotsPricingValidation.bulkCreateDriverTimeSlotsPricingValidation),
  DriverTimeSlotsPricingController.bulkCreateDriverTimeSlotsPricing
);

// UPDATE driver time slots pricing
router.put(
  '/time-slots/:id',
  requirePermission('pricing', 'update'),
  validateParams(DriverTimeSlotsPricingValidation.driverTimeSlotsPricingIdValidation),
  validateBody(DriverTimeSlotsPricingValidation.updateDriverTimeSlotsPricingValidation),
  DriverTimeSlotsPricingController.updateDriverTimeSlotsPricing
);

// DELETE driver time slots pricing
router.delete(
  '/time-slots/:id',
  requirePermission('pricing', 'delete'),
  validateParams(DriverTimeSlotsPricingValidation.driverTimeSlotsPricingIdValidation),
  DriverTimeSlotsPricingController.deleteDriverTimeSlotsPricing
);

export default router;
