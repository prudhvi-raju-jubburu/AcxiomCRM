const mongoose = require('mongoose');

const opportunitySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Opportunity name is required'],
      trim: true,
      maxlength: [120, 'Opportunity name cannot exceed 120 characters'],
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: [true, 'Associated customer is required'],
    },
    lead: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lead',
      default: null,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Assigned user is required'],
    },
    amount: {
      type: Number,
      required: [true, 'Opportunity deal amount is required'],
      min: [0.01, 'Amount must be greater than 0'],
    },
    probability: {
      type: Number,
      required: [true, 'Win probability is required'],
      min: [0, 'Probability cannot be less than 0'],
      max: [100, 'Probability cannot exceed 100'],
      default: 20,
    },
    expectedCloseDate: {
      type: Date,
      required: [true, 'Expected close date is required'],
    },
    stage: {
      type: String,
      enum: {
        values: [
          'Prospecting',
          'Qualification',
          'Proposal',
          'Negotiation',
          'Closed Won',
          'Closed Lost',
        ],
        message: 'Stage must be Prospecting, Qualification, Proposal, Negotiation, Closed Won, or Closed Lost',
      },
      default: 'Prospecting',
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },
  },
  {
    timestamps: true,
  }
);

// Pre-save hook enforcing business rules:
// - Closed Won probability is automatically set to 100%
// - Closed Lost probability is automatically set to 0%
opportunitySchema.pre('save', function (next) {
  if (this.stage === 'Closed Won') {
    this.probability = 100;
  } else if (this.stage === 'Closed Lost') {
    this.probability = 0;
  }
  next();
});

module.exports = mongoose.model('Opportunity', opportunitySchema);
