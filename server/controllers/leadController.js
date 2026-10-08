const Lead = require('../models/Lead');
const Customer = require('../models/Customer');
const User = require('../models/User');
const { logAuditEvent } = require('../utils/auditLogger');

/**
 * Get all leads with search and role-based filtering
 * GET /api/leads?search=&status=&assignedTo=
 */
const getLeads = async (req, res, next) => {
  try {
    const { search, status, assignedTo } = req.query;
    const query = {};

    // BACKEND ROLE FILTERING:
    // Sales Executive can ONLY view leads assigned to them
    if (req.user.role === 'Sales Executive') {
      query.assignedTo = req.user._id;
    } else if (assignedTo) {
      // Admin and Manager can filter by assigned user
      query.assignedTo = assignedTo;
    }

    // Status filter
    if (status && ['New', 'Contacted', 'Qualified', 'Lost', 'Converted'].includes(status)) {
      query.status = status;
    }

    // Search by name, email, or company
    if (search && search.trim()) {
      const term = search.trim();
      query.$or = [
        { name: { $regex: term, $options: 'i' } },
        { email: { $regex: term, $options: 'i' } },
        { company: { $regex: term, $options: 'i' } },
      ];
    }

    const leads = await Lead.find(query)
      .populate('assignedTo', 'name email role')
      .populate('convertedCustomer', 'name email company status')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: leads.length,
      data: leads,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get single lead by ID
 * GET /api/leads/:id
 */
const getLeadById = async (req, res, next) => {
  try {
    const lead = await Lead.findById(req.params.id)
      .populate('assignedTo', 'name email role')
      .populate('convertedCustomer', 'name email company status');

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: 'Lead not found.',
      });
    }

    // Role-based authorization check
    if (
      req.user.role === 'Sales Executive' &&
      (!lead.assignedTo ||
        lead.assignedTo._id.toString() !== req.user._id.toString())
    ) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You can only view leads assigned to you.',
      });
    }

    res.status(200).json({
      success: true,
      data: lead,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new lead
 * POST /api/leads
 */
const createLead = async (req, res, next) => {
  try {
    const { name, email, phone, company, source, status, assignedTo, notes } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Lead name is required.',
      });
    }

    let finalAssignedTo = null;

    // Assignment validation
    if (req.user.role === 'Sales Executive') {
      // Sales Executives automatically assign leads to themselves
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
          message: 'Cannot assign lead to an inactive user.',
        });
      }
      finalAssignedTo = targetUser._id;
    }

    // Direct creation cannot start as 'Converted'
    let initialStatus = 'New';
    if (status && ['New', 'Contacted', 'Qualified', 'Lost'].includes(status)) {
      initialStatus = status;
    } else if (status === 'Converted') {
      return res.status(400).json({
        success: false,
        message: 'Cannot create a lead directly as Converted. Use the conversion workflow.',
      });
    }

    const lead = await Lead.create({
      name: name.trim(),
      email: email ? email.toLowerCase().trim() : undefined,
      phone: phone ? phone.trim() : undefined,
      company: company ? company.trim() : undefined,
      source: source || 'Website',
      status: initialStatus,
      assignedTo: finalAssignedTo,
      notes: notes ? notes.trim() : undefined,
    });

    await lead.populate('assignedTo', 'name email role');

    logAuditEvent({
      action: 'LEAD_CREATED',
      performedBy: req.user.email,
      targetEntity: 'LEAD',
      details: { leadId: lead._id, name: lead.name, assignedTo: finalAssignedTo },
      ip: req.ip,
    });

    res.status(201).json({
      success: true,
      message: 'Lead created successfully.',
      data: lead,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update an existing lead
 * PUT /api/leads/:id
 */
const updateLead = async (req, res, next) => {
  try {
    const lead = await Lead.findById(req.params.id);

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: 'Lead not found.',
      });
    }

    // Role-based authorization check
    if (
      req.user.role === 'Sales Executive' &&
      (!lead.assignedTo ||
        lead.assignedTo.toString() !== req.user._id.toString())
    ) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You can only update leads assigned to you.',
      });
    }

    // Business validation: Disallow altering status on already converted leads
    if (lead.status === 'Converted') {
      return res.status(400).json({
        success: false,
        message: 'This lead has already been converted and cannot be modified.',
      });
    }

    const { name, email, phone, company, source, status, assignedTo, notes } = req.body;

    if (name) lead.name = name.trim();
    if (email !== undefined) lead.email = email ? email.toLowerCase().trim() : undefined;
    if (phone !== undefined) lead.phone = phone ? phone.trim() : undefined;
    if (company !== undefined) lead.company = company ? company.trim() : undefined;
    if (source && ['Website', 'Referral', 'Cold Call', 'LinkedIn', 'Event', 'Other'].includes(source)) {
      lead.source = source;
    }
    if (notes !== undefined) lead.notes = notes ? notes.trim() : undefined;

    // Status update rules:
    // 'Converted' cannot be set directly via PUT; only via POST /api/leads/:id/convert
    if (status) {
      if (status === 'Converted') {
        return res.status(400).json({
          success: false,
          message: 'To convert this lead to a customer, please use the Convert action.',
        });
      }
      if (['New', 'Contacted', 'Qualified', 'Lost'].includes(status)) {
        lead.status = status;
      }
    }

    // Assignment authorization rule:
    // Only Admin or Manager can reassign leads
    if (assignedTo !== undefined) {
      if (req.user.role === 'Sales Executive') {
        if (assignedTo && assignedTo.toString() !== req.user._id.toString()) {
          return res.status(403).json({
            success: false,
            message: 'Access denied: Sales Executives cannot reassign leads.',
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
              message: 'Cannot assign lead to an inactive user.',
            });
          }
          lead.assignedTo = targetUser._id;
        } else {
          lead.assignedTo = null;
        }
      }
    }

    await lead.save();
    await lead.populate('assignedTo', 'name email role');

    logAuditEvent({
      action: 'LEAD_UPDATED',
      performedBy: req.user.email,
      targetEntity: 'LEAD',
      details: { leadId: lead._id, name: lead.name, status: lead.status },
      ip: req.ip,
    });

    res.status(200).json({
      success: true,
      message: 'Lead updated successfully.',
      data: lead,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a lead
 * DELETE /api/leads/:id
 * Only Admin and Manager are authorized
 */
const deleteLead = async (req, res, next) => {
  try {
    if (req.user.role === 'Sales Executive') {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Sales Executives are not authorized to delete leads.',
      });
    }

    const lead = await Lead.findById(req.params.id);
    if (!lead) {
      return res.status(404).json({
        success: false,
        message: 'Lead not found.',
      });
    }

    await Lead.findByIdAndDelete(req.params.id);

    logAuditEvent({
      action: 'LEAD_DELETED',
      performedBy: req.user.email,
      targetEntity: 'LEAD',
      details: { leadId: req.params.id, name: lead.name },
      ip: req.ip,
    });

    res.status(200).json({
      success: true,
      message: 'Lead deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Convert a Lead into a Customer
 * POST /api/leads/:id/convert
 */
const convertLeadToCustomer = async (req, res, next) => {
  try {
    const lead = await Lead.findById(req.params.id);

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: 'Lead not found.',
      });
    }

    // Role-based authorization check
    if (
      req.user.role === 'Sales Executive' &&
      (!lead.assignedTo ||
        lead.assignedTo.toString() !== req.user._id.toString())
    ) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You can only convert leads assigned to you.',
      });
    }

    // Business validation rule 1: Duplicate conversion prevention
    if (lead.status === 'Converted' || lead.convertedCustomer) {
      return res.status(400).json({
        success: false,
        message: 'This lead has already been converted into a customer.',
      });
    }

    // Business validation rule 2: Lost leads cannot be converted
    if (lead.status === 'Lost') {
      return res.status(400).json({
        success: false,
        message: 'Cannot convert a lost lead. Please update status first.',
      });
    }

    // 1. Create the new Customer record from lead data
    const newCustomer = await Customer.create({
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      company: lead.company,
      source: lead.source,
      status: 'Active',
      assignedTo: lead.assignedTo,
      notes: lead.notes
        ? `Converted from Lead (${lead.name}): ${lead.notes}`
        : `Converted from Lead (${lead.name})`,
    });

    // 2. Update Lead status and link to the newly created Customer
    lead.status = 'Converted';
    lead.convertedCustomer = newCustomer._id;
    await lead.save();

    await lead.populate('assignedTo', 'name email role');
    await lead.populate('convertedCustomer', 'name email company status');
    await newCustomer.populate('assignedTo', 'name email role');

    logAuditEvent({
      action: 'LEAD_CONVERTED',
      performedBy: req.user.email,
      targetEntity: 'LEAD',
      details: {
        leadId: lead._id,
        customerId: newCustomer._id,
        name: lead.name,
      },
      ip: req.ip,
    });

    res.status(200).json({
      success: true,
      message: 'Lead successfully converted to customer.',
      data: {
        lead,
        customer: newCustomer,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getLeads,
  getLeadById,
  createLead,
  updateLead,
  deleteLead,
  convertLeadToCustomer,
};
