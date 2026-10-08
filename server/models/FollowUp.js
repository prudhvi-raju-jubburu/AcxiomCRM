const mongoose = require('mongoose');

const followUpSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      default: null,
    },
    lead: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lead',
      default: null,
    },
    opportunity: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Opportunity',
      default: null,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Assigned user is required'],
    },
    type: {
      type: String,
      enum: {
        values: ['Call', 'Email', 'Meeting', 'Visit', 'Other'],
        message: 'Type must be Call, Email, Meeting, Visit, or Other',
      },
      default: 'Call',
    },
    subject: {
      type: String,
      required: [true, 'Follow-up subject is required'],
      trim: true,
      maxlength: [150, 'Subject cannot exceed 150 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },
    scheduledDate: {
      type: Date,
      required: [true, 'Scheduled date and time are required'],
    },
    status: {
      type: String,
      enum: {
        values: ['Pending', 'Completed', 'Cancelled'],
        message: 'Status must be Pending, Completed, or Cancelled',
      },
      default: 'Pending',
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [1000, 'Notes cannot exceed 1000 characters'],
    },
  },
  {
    timestamps: true,
  }
);

// Validation ensuring at least one entity is associated
followUpSchema.pre('validate', function (next) {
  if (!this.customer && !this.lead && !this.opportunity) {
    this.invalidate(
      'customer',
      'Follow-up must be associated with at least one record (Customer, Lead, or Opportunity).'
    );
  }
  next();
});

module.exports = mongoose.model('FollowUp', followUpSchema);
