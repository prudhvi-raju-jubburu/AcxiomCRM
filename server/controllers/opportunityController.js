const Opportunity = require('../models/Opportunity');
const Customer = require('../models/Customer');
const Lead = require('../models/Lead');
const User = require('../models/User');
const { logAuditEvent } = require('../utils/auditLogger');

/**
 * Get all opportunities with search and role-based filtering
 * GET /api/opportunities?search=&stage=&customer=&assignedTo=
 */
const getOpportunities = async (req, res, next) => {
  try {
    const { search, stage, customer, assignedTo } = req.query;
    const query = {};

    // BACKEND ROLE FILTERING:
    // Sales Executive can ONLY view opportunities assigned to them
    if (req.user.role === 'Sales Executive') {
      query.assignedTo = req.user._id;
    } else if (assignedTo) {
      // Admin and Manager can filter by assigned employee
      query.assignedTo = assignedTo;
    }

    // Stage filter
    if (
      stage &&
      [
        'Prospecting',
        'Qualification',
        'Proposal',
        'Negotiation',
        'Closed Won',
        'Closed Lost',
      ].includes(stage)
    ) {
      query.stage = stage;
    }

    // Customer filter
    if (customer) {
      query.customer = customer;
    }

    // Search by opportunity name
    if (search && search.trim()) {
      query.name = { $regex: search.trim(), $options: 'i' };
    }

    const opportunities = await Opportunity.find(query)
      .populate('customer', 'name email company phone city state')
      .populate('lead', 'name email company status')
      .populate('assignedTo', 'name email role')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: opportunities.length,
      data: opportunities,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get single opportunity by ID
 * GET /api/opportunities/:id
 */
const getOpportunityById = async (req, res, next) => {
  try {
    const opportunity = await Opportunity.findById(req.params.id)
      .populate('customer', 'name email company phone city state')
      .populate('lead', 'name email company status')
      .populate('assignedTo', 'name email role');

    if (!opportunity) {
      return res.status(404).json({
        success: false,
        message: 'Opportunity not found.',
      });
    }

    // Role-based authorization check
    if (
      req.user.role === 'Sales Executive' &&
      (!opportunity.assignedTo ||
        opportunity.assignedTo._id.toString() !== req.user._id.toString())
    ) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You can only view opportunities assigned to you.',
      });
    }

    res.status(200).json({
      success: true,
      data: opportunity,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new opportunity
 * POST /api/opportunities
 */
const createOpportunity = async (req, res, next) => {
  try {
    const {
      name,
      customer,
      lead,
      assignedTo,
      amount,
      probability,
      expectedCloseDate,
      stage,
      description,
    } = req.body;

    // Required fields check
    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Opportunity name is required.',
      });
    }

    if (!customer) {
      return res.status(400).json({
        success: false,
        message: 'Associated customer is required.',
      });
    }

    // Validate customer exists
    const customerDoc = await Customer.findById(customer);
    if (!customerDoc) {
      return res.status(400).json({
        success: false,
        message: 'The associated customer does not exist.',
      });
    }

    // If lead is supplied, check existence
    if (lead) {
      const leadDoc = await Lead.findById(lead);
      if (!leadDoc) {
        return res.status(400).json({
          success: false,
          message: 'The associated lead does not exist.',
        });
      }
    }

    // Business Rule A: Amount must be > 0
    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Amount must be a numeric value greater than 0.',
      });
    }

    // Initial Stage validation
    const validStages = [
      'Prospecting',
      'Qualification',
      'Proposal',
      'Negotiation',
      'Closed Won',
      'Closed Lost',
    ];
    if (stage && !validStages.includes(stage)) {
      return res.status(400).json({
        success: false,
        message: `Invalid stage specified. Must be one of: ${validStages.join(', ')}`,
      });
    }
    const currentStage = stage || 'Prospecting';

    // Business Rule B: Probability between 0 and 100
    let numProbability = probability !== undefined ? Number(probability) : 20;
    if (isNaN(numProbability) || numProbability < 0 || numProbability > 100) {
      return res.status(400).json({
        success: false,
        message: 'Probability must be a number between 0 and 100.',
      });
    }

    // Business Rule D & E: Closed Won/Lost probability
    if (currentStage === 'Closed Won') {
      numProbability = 100;
    } else if (currentStage === 'Closed Lost') {
      numProbability = 0;
    }

    // Business Rule C: Expected Close Date validation
    if (!expectedCloseDate) {
      return res.status(400).json({
        success: false,
        message: 'Expected close date is required.',
      });
    }

    const closeDate = new Date(expectedCloseDate);
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const isActiveStage = currentStage !== 'Closed Won' && currentStage !== 'Closed Lost';
    if (isActiveStage && closeDate < startOfToday) {
      return res.status(400).json({
        success: false,
        message: 'Expected close date cannot be in the past for active opportunities.',
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
          message: 'Cannot assign opportunity to an inactive user.',
        });
      }
      finalAssignedTo = targetUser._id;
    }

    const opportunity = await Opportunity.create({
      name: name.trim(),
      customer,
      lead: lead || null,
      assignedTo: finalAssignedTo,
      amount: numAmount,
      probability: numProbability,
      expectedCloseDate: closeDate,
      stage: currentStage,
      description: description ? description.trim() : undefined,
    });

    await opportunity.populate('customer', 'name email company phone');
    await opportunity.populate('lead', 'name email status');
    await opportunity.populate('assignedTo', 'name email role');

    logAuditEvent({
      action: 'OPPORTUNITY_CREATED',
      performedBy: req.user.email,
      targetEntity: 'OPPORTUNITY',
      details: {
        opportunityId: opportunity._id,
        name: opportunity.name,
        amount: opportunity.amount,
        stage: opportunity.stage,
      },
      ip: req.ip,
    });

    res.status(201).json({
      success: true,
      message: 'Opportunity created successfully.',
      data: opportunity,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update an existing opportunity
 * PUT /api/opportunities/:id
 */
const updateOpportunity = async (req, res, next) => {
  try {
    const opportunity = await Opportunity.findById(req.params.id);

    if (!opportunity) {
      return res.status(404).json({
        success: false,
        message: 'Opportunity not found.',
      });
    }

    // Role-based authorization check
    if (
      req.user.role === 'Sales Executive' &&
      (!opportunity.assignedTo ||
        opportunity.assignedTo.toString() !== req.user._id.toString())
    ) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You can only update opportunities assigned to you.',
      });
    }

    const {
      name,
      customer,
      lead,
      assignedTo,
      amount,
      probability,
      expectedCloseDate,
      stage,
      description,
    } = req.body;

    if (name) opportunity.name = name.trim();

    if (customer) {
      const custDoc = await Customer.findById(customer);
      if (!custDoc) {
        return res.status(400).json({
          success: false,
          message: 'The associated customer does not exist.',
        });
      }
      opportunity.customer = custDoc._id;
    }

    if (lead !== undefined) {
      if (lead) {
        const leadDoc = await Lead.findById(lead);
        if (!leadDoc) {
          return res.status(400).json({
            success: false,
            message: 'The associated lead does not exist.',
          });
        }
        opportunity.lead = leadDoc._id;
      } else {
        opportunity.lead = null;
      }
    }

    // Business Rule A: Amount > 0
    if (amount !== undefined) {
      const numAmount = Number(amount);
      if (isNaN(numAmount) || numAmount <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Amount must be a numeric value greater than 0.',
        });
      }
      opportunity.amount = numAmount;
    }

    // Stage update & Automatic probability rules
    const targetStage = stage || opportunity.stage;
    const stageChanged = stage && stage !== opportunity.stage;

    if (stage) {
      if (
        ![
          'Prospecting',
          'Qualification',
          'Proposal',
          'Negotiation',
          'Closed Won',
          'Closed Lost',
        ].includes(stage)
      ) {
        return res.status(400).json({
          success: false,
          message: 'Invalid opportunity stage specified.',
        });
      }
      opportunity.stage = stage;
    }

    // Business Rule D & E: Closed Won/Lost probability
    if (targetStage === 'Closed Won') {
      opportunity.probability = 100;
    } else if (targetStage === 'Closed Lost') {
      opportunity.probability = 0;
    } else if (probability !== undefined) {
      const numProb = Number(probability);
      if (isNaN(numProb) || numProb < 0 || numProb > 100) {
        return res.status(400).json({
          success: false,
          message: 'Probability must be a number between 0 and 100.',
        });
      }
      opportunity.probability = numProb;
    }

    // Business Rule C: Close date validation for active stages
    if (expectedCloseDate) {
      const closeDate = new Date(expectedCloseDate);
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);

      const isActiveStage = targetStage !== 'Closed Won' && targetStage !== 'Closed Lost';
      if (isActiveStage && closeDate < startOfToday) {
        return res.status(400).json({
          success: false,
          message: 'Expected close date cannot be in the past for active opportunities.',
        });
      }
      opportunity.expectedCloseDate = closeDate;
    }

    if (description !== undefined) {
      opportunity.description = description ? description.trim() : undefined;
    }

    // Reassignment rules
    if (assignedTo !== undefined) {
      if (req.user.role === 'Sales Executive') {
        if (assignedTo && assignedTo.toString() !== req.user._id.toString()) {
          return res.status(403).json({
            success: false,
            message: 'Access denied: Sales Executives cannot reassign opportunities.',
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
              message: 'Cannot assign opportunity to an inactive user.',
            });
          }
          opportunity.assignedTo = targetUser._id;
        }
      }
    }

    await opportunity.save();
    await opportunity.populate('customer', 'name email company phone');
    await opportunity.populate('lead', 'name email status');
    await opportunity.populate('assignedTo', 'name email role');

    logAuditEvent({
      action: 'OPPORTUNITY_UPDATED',
      performedBy: req.user.email,
      targetEntity: 'OPPORTUNITY',
      details: {
        opportunityId: opportunity._id,
        name: opportunity.name,
        stage: opportunity.stage,
        probability: opportunity.probability,
      },
      ip: req.ip,
    });

    res.status(200).json({
      success: true,
      message: 'Opportunity updated successfully.',
      data: opportunity,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete an opportunity
 * DELETE /api/opportunities/:id
 * Admin & Manager only
 */
const deleteOpportunity = async (req, res, next) => {
  try {
    if (req.user.role === 'Sales Executive') {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Sales Executives are not authorized to delete opportunities.',
      });
    }

    const opportunity = await Opportunity.findById(req.params.id);
    if (!opportunity) {
      return res.status(404).json({
        success: false,
        message: 'Opportunity not found.',
      });
    }

    await Opportunity.findByIdAndDelete(req.params.id);

    logAuditEvent({
      action: 'OPPORTUNITY_DELETED',
      performedBy: req.user.email,
      targetEntity: 'OPPORTUNITY',
      details: { opportunityId: req.params.id, name: opportunity.name },
      ip: req.ip,
    });

    res.status(200).json({
      success: true,
      message: 'Opportunity deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getOpportunities,
  getOpportunityById,
  createOpportunity,
  updateOpportunity,
  deleteOpportunity,
};
