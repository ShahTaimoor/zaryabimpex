const planRepository = require('../repositories/master/PlanRepository');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

class PlanService {
  /**
   * Create a new plan
   * @param {object} planData - Plan data
   * @returns {Promise<{plan: Plan, message: string}>}
   */
  async createPlan(planData) {
    const { name, price, duration, features } = planData;

    if (!name || !price || !duration) {
      throw new Error('Missing required fields: name, price, duration');
    }

    // Generate planId
    const planId = `plan_${Date.now()}_${uuidv4().substring(0, 8)}`;

    if (await planRepository.planIdExists(planId)) {
      throw new Error('Plan ID already exists');
    }

    // Calculate durationInMonths from duration
    const durationMap = {
      '1 month': 1,
      '3 months': 3,
      '6 months': 6,
      '12 months': 12
    };
    const durationInMonths = durationMap[duration] || 1;

    const plan = await planRepository.create({
      planId,
      name,
      price,
      duration,
      durationInMonths,
      features: features || [],
      isActive: true
    });

    logger.info(`Plan created: ${planId} - ${name}`);

    return {
      plan: plan.toObject(),
      message: 'Plan created successfully'
    };
  }

  /**
   * Get all plans
   * @param {object} options - Query options
   * @returns {Promise<Array>}
   */
  async getAllPlans(options = {}) {
    const { activeOnly = false } = options;
    
    if (activeOnly) {
      return await planRepository.findActivePlans();
    }
    
    return await planRepository.findAll({});
  }

  /**
   * Get plan by ID
   * @param {string} planId - Plan ID
   * @returns {Promise<Plan>}
   */
  async getPlanById(planId) {
    const plan = await planRepository.findByPlanId(planId);
    if (!plan) {
      throw new Error('Plan not found');
    }
    return plan;
  }

  /**
   * Update plan
   * @param {string} planId - Plan ID
   * @param {object} updateData - Update data
   * @returns {Promise<{plan: Plan, message: string}>}
   */
  async updatePlan(planId, updateData) {
    const plan = await planRepository.findByPlanId(planId);
    if (!plan) {
      throw new Error('Plan not found');
    }

    // Calculate durationInMonths if duration is being updated
    const finalUpdateData = { ...updateData };
    if (updateData.duration) {
      const durationMap = {
        '1 month': 1,
        '3 months': 3,
        '6 months': 6,
        '12 months': 12
      };
      finalUpdateData.durationInMonths = durationMap[updateData.duration] || 1;
    }

    const updatedPlan = await planRepository.updateById(plan._id, {
      ...finalUpdateData,
      updatedAt: new Date()
    });

    logger.info(`Plan updated: ${planId}`);

    return {
      plan: updatedPlan.toObject(),
      message: 'Plan updated successfully'
    };
  }

  /**
   * Delete plan (soft delete - set isActive to false)
   * @param {string} planId - Plan ID
   * @returns {Promise<{message: string}>}
   */
  async deletePlan(planId) {
    const plan = await planRepository.findByPlanId(planId);
    if (!plan) {
      throw new Error('Plan not found');
    }

    // Soft delete - set isActive to false
    await planRepository.updateById(plan._id, {
      isActive: false,
      updatedAt: new Date()
    });

    logger.info(`Plan deleted (deactivated): ${planId}`);

    return {
      message: 'Plan deleted successfully'
    };
  }
}

module.exports = new PlanService();
