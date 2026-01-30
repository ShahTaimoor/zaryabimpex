const mongoose = require('mongoose');

const planSchema = new mongoose.Schema({
  planId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  duration: {
    type: String,
    required: true,
    enum: ['1 month', '3 months', '6 months', '12 months'],
    default: '1 month'
  },
  durationInMonths: {
    type: Number,
    required: false, // Will be calculated from duration
    min: 1
  },
  features: [{
    type: String,
    trim: true
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  collection: 'plans'
});

// Pre-save hook to calculate durationInMonths
planSchema.pre('save', function(next) {
  const durationMap = {
    '1 month': 1,
    '3 months': 3,
    '6 months': 6,
    '12 months': 12
  };
  this.durationInMonths = durationMap[this.duration] || 1;
  next();
});

// Index
planSchema.index({ isActive: 1 });

module.exports = mongoose.model('Plan', planSchema);
