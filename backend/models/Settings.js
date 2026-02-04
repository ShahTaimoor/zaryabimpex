const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  // Company Information
  companyName: {
    type: String,
    required: true,
    trim: true,
    default: 'Zaryab Traders New 2024'
  },
  contactNumber: {
    type: String,
    required: true,
    trim: true,
    default: '+1 (555) 123-4567'
  },
  address: {
    type: String,
    required: true,
    trim: true,
    default: '123 Business Street, City, State, ZIP'
  },
  email: {
    type: String,
    trim: true,
    lowercase: true
  },

  // Additional Company Details
  website: {
    type: String,
    trim: true
  },
  taxId: {
    type: String,
    trim: true
  },
  registrationNumber: {
    type: String,
    trim: true
  },

  // Branding
  logo: {
    type: String, // Base64 string or URL
    trim: true
  },

  // System Settings
  currency: {
    type: String,
    default: 'USD'
  },
  dateFormat: {
    type: String,
    enum: ['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD'],
    default: 'MM/DD/YYYY'
  },
  timeFormat: {
    type: String,
    enum: ['12h', '24h'],
    default: '12h'
  },

  // Business Settings
  fiscalYearStart: {
    type: Number,
    min: 1,
    max: 12,
    default: 1 // January
  },
  defaultTaxRate: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },

  // Print Settings
  printSettings: {
    showLogo: { type: Boolean, default: true },
    showCompanyDetails: { type: Boolean, default: true },
    showTax: { type: Boolean, default: true },
    showDiscount: { type: Boolean, default: true },
    showDate: { type: Boolean, default: true }, // Keeping existing one
    showFooter: { type: Boolean, default: true }, // Added matching PrintModal
    showEmail: { type: Boolean, default: true }, // Added for email visibility
    showCameraTime: { type: Boolean, default: false }, // Added matching PrintModal
    showDescription: { type: Boolean, default: true }, // Added for item description visibility
    headerText: { type: String, trim: true, default: '' },
    footerText: { type: String, trim: true, default: '' },
    invoiceLayout: { type: String, enum: ['standard', 'compact', 'detailed'], default: 'standard' }
  },

  // Singleton pattern - only one settings document should exist
  _id: {
    type: String,
    default: 'company_settings'
  }
}, {
  timestamps: true,
  _id: false // Disable auto _id generation since we're providing our own
});

// Ensure only one settings document exists
settingsSchema.statics.getSettings = async function () {
  let settings = await this.findById('company_settings');
  if (!settings) {
    try {
      settings = await this.create({ _id: 'company_settings' });
    } catch (err) {
      if (err.code === 11000) {
        // Duplicate key - settings already exists, fetch it
        settings = await this.findById('company_settings');
      } else {
        throw err;
      }
    }
  }
  return settings;
};

settingsSchema.statics.updateSettings = async function (updates) {
  const settings = await this.getSettings();
  Object.assign(settings, updates);
  await settings.save();
  return settings;
};

const Settings = mongoose.model('Settings', settingsSchema);

module.exports = Settings;

