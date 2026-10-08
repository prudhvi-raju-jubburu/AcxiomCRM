const Customer = require('../models/Customer');
const User = require('../models/User');
const { logAuditEvent } = require('../utils/auditLogger');

/**
 * Get all customers with search and role-based filtering
 * GET /api/customers?search=&status=&assignedTo=
 */
const getCustomers = async (req, res, next) => {
  try {
    const { search, status, assignedTo } = req.query;
    const query = {};

    // BACKEND ROLE FILTERING:
    // Sales Executive can ONLY view customers assigned to them
    if (req.user.role === 'Sales Executive') {
      query.assignedTo = req.user._id;
    } else if (assignedTo) {
      // Admin and Manager can optionally filter by a specific assigned user
      query.assignedTo = assignedTo;
    }

    // Status filter
    if (status && ['Active', 'Inactive'].includes(status)) {
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

    const customers = await Customer.find(query)
      .populate('assignedTo', 'name email role')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: customers.length,
      data: customers,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get a single customer by ID
 * GET /api/customers/:id
 */
const getCustomerById = async (req, res, next) => {
  try {
    const customer = await Customer.findById(req.params.id).populate(
      'assignedTo',
      'name email role'
    );

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found.',
      });
    }

    // Role-based authorization check
    if (
      req.user.role === 'Sales Executive' &&
      (!customer.assignedTo ||
        customer.assignedTo._id.toString() !== req.user._id.toString())
    ) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You can only view customers assigned to you.',
      });
    }

    res.status(200).json({
      success: true,
      data: customer,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new customer
 * POST /api/customers
 */
const createCustomer = async (req, res, next) => {
  try {
    const { name, email, phone, company, address, city, state, source, status, assignedTo, notes } =
      req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Customer name is required.',
      });
    }

    let finalAssignedTo = null;

    // Assignment logic based on user role
    if (req.user.role === 'Sales Executive') {
      // Sales Executives automatically have newly created customers assigned to themselves
      finalAssignedTo = req.user._id;
    } else if (assignedTo) {
      // Admin/Manager can assign to any active user
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
          message: 'Cannot assign customer to an inactive user.',
        });
      }
      finalAssignedTo = targetUser._id;
    }

    const customer = await Customer.create({
      name: name.trim(),
      email: email ? email.toLowerCase().trim() : undefined,
      phone: phone ? phone.trim() : undefined,
      company: company ? company.trim() : undefined,
      address: address ? address.trim() : undefined,
      city: city ? city.trim() : undefined,
      state: state ? state.trim() : undefined,
      source: source || 'Website',
      status: status || 'Active',
      assignedTo: finalAssignedTo,
      notes: notes ? notes.trim() : undefined,
    });

    await customer.populate('assignedTo', 'name email role');

    logAuditEvent({
      action: 'CUSTOMER_CREATED',
      performedBy: req.user.email,
      targetEntity: 'CUSTOMER',
      details: { customerId: customer._id, name: customer.name, assignedTo: finalAssignedTo },
      ip: req.ip,
    });

    res.status(201).json({
      success: true,
      message: 'Customer created successfully.',
      data: customer,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update an existing customer
 * PUT /api/customers/:id
 */
const updateCustomer = async (req, res, next) => {
  try {
    const customer = await Customer.findById(req.params.id);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found.',
      });
    }

    // Role-based authorization check
    if (
      req.user.role === 'Sales Executive' &&
      (!customer.assignedTo ||
        customer.assignedTo.toString() !== req.user._id.toString())
    ) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You can only update customers assigned to you.',
      });
    }

    const { name, email, phone, company, address, city, state, source, status, assignedTo, notes } =
      req.body;

    if (name) customer.name = name.trim();
    if (email !== undefined) customer.email = email ? email.toLowerCase().trim() : undefined;
    if (phone !== undefined) customer.phone = phone ? phone.trim() : undefined;
    if (company !== undefined) customer.company = company ? company.trim() : undefined;
    if (address !== undefined) customer.address = address ? address.trim() : undefined;
    if (city !== undefined) customer.city = city ? city.trim() : undefined;
    if (state !== undefined) customer.state = state ? state.trim() : undefined;
    if (source && ['Website', 'Referral', 'Cold Call', 'LinkedIn', 'Event', 'Other'].includes(source)) {
      customer.source = source;
    }
    if (status && ['Active', 'Inactive'].includes(status)) {
      customer.status = status;
    }
    if (notes !== undefined) customer.notes = notes ? notes.trim() : undefined;

    // Assignment authorization rule:
    // Only Admin or Manager can reassign a customer
    if (assignedTo !== undefined) {
      if (req.user.role === 'Sales Executive') {
        if (assignedTo && assignedTo.toString() !== req.user._id.toString()) {
          return res.status(403).json({
            success: false,
            message: 'Access denied: Sales Executives cannot reassign customers to other users.',
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
              message: 'Cannot assign customer to an inactive user.',
            });
          }
          customer.assignedTo = targetUser._id;
        } else {
          customer.assignedTo = null;
        }
      }
    }

    await customer.save();
    await customer.populate('assignedTo', 'name email role');

    logAuditEvent({
      action: 'CUSTOMER_UPDATED',
      performedBy: req.user.email,
      targetEntity: 'CUSTOMER',
      details: { customerId: customer._id, name: customer.name },
      ip: req.ip,
    });

    res.status(200).json({
      success: true,
      message: 'Customer updated successfully.',
      data: customer,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a customer
 * DELETE /api/customers/:id
 * Only Admin and Manager are authorized to delete customers
 */
const deleteCustomer = async (req, res, next) => {
  try {
    if (req.user.role === 'Sales Executive') {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Sales Executives are not authorized to delete customers.',
      });
    }

    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found.',
      });
    }

    await Customer.findByIdAndDelete(req.params.id);

    logAuditEvent({
      action: 'CUSTOMER_DELETED',
      performedBy: req.user.email,
      targetEntity: 'CUSTOMER',
      details: { customerId: req.params.id, name: customer.name },
      ip: req.ip,
    });

    res.status(200).json({
      success: true,
      message: 'Customer deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
};
