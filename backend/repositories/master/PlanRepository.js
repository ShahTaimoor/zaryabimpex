const BaseRepository = require('../BaseRepository');
const Plan = require('../../models/master/Plan');

class PlanRepository extends BaseRepository {
  constructor() {
    // Initialize the model before calling super
    const model = Plan;
    super(model);
  }

  /**
   * Find plan by planId or _id
   * @param {string} planId - Plan ID (can be planId string or MongoDB _id)
   * @returns {Promise<Plan|null>}
   */
  async findByPlanId(planId) {
    // Try to find by _id first (MongoDB ObjectId)
    const mongoose = require('mongoose');
    if (mongoose.Types.ObjectId.isValid(planId)) {
      const planById = await this.Model.findById(planId);
      if (planById) {
        return planById;
      }
    }
    // If not found by _id, try to find by planId field
    return this.Model.findOne({ planId });
  }

  /**
   * Find all active plans
   * @returns {Promise<Array>}
   */
  async findActivePlans() {
    return this.Model.find({ isActive: true }).sort({ price: 1 });
  }

  /**
   * Check if planId exists
   * @param {string} planId - Plan ID
   * @returns {Promise<boolean>}
   */
  async planIdExists(planId) {
    const count = await this.Model.countDocuments({ planId });
    return count > 0;
  }
}

module.exports = new PlanRepository();
