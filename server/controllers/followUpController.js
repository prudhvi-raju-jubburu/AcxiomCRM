const FollowUp = require('../models/FollowUp');
const Customer = require('../models/Customer');
const Lead = require('../models/Lead');
const Opportunity = require('../models/Opportunity');
const User = require('../models/User');
const { logAuditEvent } = require('../utils/auditLogger');

/**
 * Get all follow-ups with role-based filtering and status/type filters
 * GET /api/followups?status=&type=&customer=&lead=&opportunity=&assignedTo=
 */
const getFollowUps = async (req, res, next) => {
  try {
    const { status, type, customer, lead, opportunity, assignedTo } = req.query;
    const query = {};

    // BACKEND ROLE FILTERING:
    // Sales Executive can ONLY view follow-ups assigned to them
    if (req.user.role === 'Sales Executive') {
      query.assignedTo = req.user._id;
    } else if (assignedTo) {
      query.assignedTo = assignedTo;
    }

    // Status filter
    if (status && ['Pending', 'Completed', 'Cancelled'].includes(status)) {
      query.status = status;
    }

    // Type filter
    if (type && ['Call', 'Email', 'Meeting', 'Visit', 'Other'].includes(type)) {
      query.type = type;
    }

    // Related record filters
    if (customer) query.customer = customer;
    if (lead) query.lead = lead;
    if (opportunity) query.opportunity = opportunity;

    const followUps = await FollowUp.find(query)
      .populate('customer', 'name company email phone')
      .populate('lead', 'name company status')
      .populate('opportunity', 'name amount stage')
      .populate('assignedTo', 'name email role')
      .sort({ scheduledDate: 1 });

    res.status(200).json({
      success: true,
      count: followUps.length,
      data: followUps,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get a single follow-up by ID
 * GET /api/followups/:id
 */
const getFollowUpById = async (req, res, next) => {
  try {
    const followUp = await FollowUp.findById(req.params.id)
      .populate('customer', 'name company email phone')
      .populate('lead', 'name company status')
      .populate('opportunity', 'name amount stage')
      .populate('assignedTo', 'name email role');

    if (!followUp) {
      return res.status(404).json({
        success: false,
        message: 'Follow-up activity not found.',
      });
    }

    // Role-based authorization check
    if (
      req.user.role === 'Sales Executive' &&
      (!followUp.assignedTo ||
        followUp.assignedTo._id.toString() !== req.user._id.toString())
    ) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You can only view follow-ups assigned to you.',
      });
    }

    res.status(200).json({
      success: true,
      data: followUp,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new follow-up activity
 * POST /api/followups
 */
const createFollowUp = async (req, res, next) => {
  try {
    const {
      customer,
      lead,
      opportunity,
      assignedTo,
      type,
      subject,
      description,
      scheduledDate,
      status,
      notes,
    } = req.body;

    // Required fields check
    if (!subject || !subject.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Follow-up subject is required.',
      });
    }

    if (!scheduledDate) {
      return res.status(400).json({
        success: false,
        message: 'Scheduled date and time are required.',
      });
    }

    // Relationship validation: At least one related entity must be provided
    if (!customer && !lead && !opportunity) {
      return res.status(400).json({
        success: false,
        message: 'Follow-up must be associated with at least one record (Customer, Lead, or Opportunity).',
      });
    }

    // Validate existence of related records if supplied
    if (customer) {
      const custDoc = await Customer.findById(customer);
      if (!custDoc) {
        return res.status(400).json({
          success: false,
          message: 'The associated customer does not exist.',
        });
      }
    }

    if (lead) {
      const leadDoc = await Lead.findById(lead);
      if (!leadDoc) {
        return res.status(400).json({
          success: false,
          message: 'The associated lead does not exist.',
        });
      }
    }

    if (opportunity) {
      const oppDoc = await Opportunity.findById(opportunity);
      if (!oppDoc) {
        return res.status(400).json({
          success: false,
          message: 'The associated opportunity does not exist.',
        });
      }
    }

    // Type validation
    const validTypes = ['Call', 'Email', 'Meeting', 'Visit', 'Other'];
    if (type && !validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: `Type must be one of: ${validTypes.join(', ')}`,
      });
    }

    // Status validation
    const validStatuses = ['Pending', 'Completed', 'Cancelled'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Status must be one of: ${validStatuses.join(', ')}`,
      });
    }

    // Assignment logic
    let finalAssignedTo = req.user._id;

    if (req.user.role === 'Sales Executive') {
      finalAssignedTo = req.user._id;
    } else if (assignedTo) {
      const targetUser = await User.findById(assignedTo);
      if (!targetUser) {
        return res.status(400).json({
          success: false,
          message: 'The assigned user does not exist.',
        });
      }
      if (!targetUser.isActive) {
        return res.status(400).json({
          success: false,
          message: 'Cannot assign follow-up to an inactive user.',
        });
      }
      finalAssignedTo = targetUser._id;
    }

    const followUp = await FollowUp.create({
      customer: customer || null,
      lead: lead || null,
      opportunity: opportunity || null,
      assignedTo: finalAssignedTo,
      type: type || 'Call',
      subject: subject.trim(),
      description: description ? description.trim() : undefined,
      scheduledDate: new Date(scheduledDate),
      status: status || 'Pending',
      notes: notes ? notes.trim() : undefined,
    });

    await followUp.populate('customer', 'name company email phone');
    await followUp.populate('lead', 'name company status');
    await followUp.populate('opportunity', 'name amount stage');
    await followUp.populate('assignedTo', 'name email role');

    logAuditEvent({
      action: 'FOLLOWUP_CREATED',
      performedBy: req.user.email,
      targetEntity: 'FOLLOWUP',
      details: {
        followUpId: followUp._id,
        type: followUp.type,
        subject: followUp.subject,
        scheduledDate: followUp.scheduledDate,
      },
      ip: req.ip,
    });

    res.status(201).json({
      success: true,
      message: 'Follow-up activity scheduled successfully.',
      data: followUp,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update an existing follow-up activity
 * PUT /api/followups/:id
 */
const updateFollowUp = async (req, res, next) => {
  try {
    const followUp = await FollowUp.findById(req.params.id);

    if (!followUp) {
      return res.status(404).json({
        success: false,
        message: 'Follow-up activity not found.',
      });
    }

    // Role-based authorization check
    if (
      req.user.role === 'Sales Executive' &&
      (!followUp.assignedTo ||
        followUp.assignedTo.toString() !== req.user._id.toString())
    ) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You can only update follow-ups assigned to you.',
      });
    }

    const {
      customer,
      lead,
      opportunity,
      assignedTo,
      type,
      subject,
      description,
      scheduledDate,
      status,
      notes,
    } = req.body;

    if (subject) followUp.subject = subject.trim();

    if (scheduledDate) {
      followUp.scheduledDate = new Date(scheduledDate);
    }

    if (type) {
      const validTypes = ['Call', 'Email', 'Meeting', 'Visit', 'Other'];
      if (!validTypes.includes(type)) {
        return res.status(400).json({
          success: false,
          message: `Type must be one of: ${validTypes.join(', ')}`,
        });
      }
      followUp.type = type;
    }

    if (status) {
      const validStatuses = ['Pending', 'Completed', 'Cancelled'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: `Status must be one of: ${validStatuses.join(', ')}`,
        });
      }
      followUp.status = status;
    }

    if (description !== undefined) {
      followUp.description = description ? description.trim() : undefined;
    }

    if (notes !== undefined) {
      followUp.notes = notes ? notes.trim() : undefined;
    }

    if (customer !== undefined) followUp.customer = customer || null;
    if (lead !== undefined) followUp.lead = lead || null;
    if (opportunity !== undefined) followUp.opportunity = opportunity || null;

    // Reassignment rule
    if (assignedTo !== undefined) {
      if (req.user.role === 'Sales Executive') {
        if (assignedTo && assignedTo.toString() !== req.user._id.toString()) {
          return res.status(403).json({
            success: false,
            message: 'Access denied: Sales Executives cannot reassign follow-ups.',
          });
        }
      } else {
        if (assignedTo) {
          const targetUser = await User.findById(assignedTo);
          if (!targetUser) {
            return res.status(400).json({
              success: false,
              message: 'The assigned user does not exist.',
            });
          }
          if (!targetUser.isActive) {
            return res.status(400).json({
              success: false,
              message: 'Cannot assign follow-up to an inactive user.',
            });
          }
          followUp.assignedTo = targetUser._id;
        }
      }
    }

    await followUp.save();
    await followUp.populate('customer', 'name company email phone');
    await followUp.populate('lead', 'name company status');
    await followUp.populate('opportunity', 'name amount stage');
    await followUp.populate('assignedTo', 'name email role');

    logAuditEvent({
      action: 'FOLLOWUP_UPDATED',
      performedBy: req.user.email,
      targetEntity: 'FOLLOWUP',
      details: {
        followUpId: followUp._id,
        status: followUp.status,
        type: followUp.type,
      },
      ip: req.ip,
    });

    res.status(200).json({
      success: true,
      message: 'Follow-up activity updated successfully.',
      data: followUp,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a follow-up activity
 * DELETE /api/followups/:id
 * Admin & Manager only
 */
const deleteFollowUp = async (req, res, next) => {
  try {
    if (req.user.role === 'Sales Executive') {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Sales Executives are not authorized to delete follow-ups.',
      });
    }

    const followUp = await FollowUp.findById(req.params.id);
    if (!followUp) {
      return res.status(404).json({
        success: false,
        message: 'Follow-up activity not found.',
      });
    }

    await FollowUp.findByIdAndDelete(req.params.id);

    logAuditEvent({
      action: 'FOLLOWUP_DELETED',
      performedBy: req.user.email,
      targetEntity: 'FOLLOWUP',
      details: { followUpId: req.params.id, subject: followUp.subject },
      ip: req.ip,
    });

    res.status(200).json({
      success: true,
      message: 'Follow-up activity deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getFollowUps,
  getFollowUpById,
  createFollowUp,
  updateFollowUp,
  deleteFollowUp,
};
