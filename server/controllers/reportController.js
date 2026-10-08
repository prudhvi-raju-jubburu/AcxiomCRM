const Customer = require('../models/Customer');
const Lead = require('../models/Lead');
const Opportunity = require('../models/Opportunity');
const FollowUp = require('../models/FollowUp');
const User = require('../models/User');
const { parseDateFilter } = require('../utils/dateFilter');

/**
 * Base RBAC helper for reports
 */
const getReportBaseFilter = (user) => {
  if (user.role === 'Sales Executive') {
    return { assignedTo: user._id };
  }
  return {};
};

/**
 * @desc    Customer Report
 * @route   GET /api/reports/customers
 * @access  Private (Role-based)
 */
const getCustomerReport = async (req, res, next) => {
  try {
    const baseFilter = getReportBaseFilter(req.user);
    const dateParsed = parseDateFilter(req.query, 'createdAt');
    if (dateParsed.error) {
      return res.status(400).json({ success: false, message: dateParsed.error });
    }

    const filter = { ...baseFilter, ...dateParsed.filter };
    if (req.query.status) {
      filter.status = req.query.status;
    }
    if (req.query.source) {
      filter.source = req.query.source;
    }

    const [total, active, inactive, sourceAgg, assignedAgg, customers] = await Promise.all([
      Customer.countDocuments(filter),
      Customer.countDocuments({ ...filter, status: 'Active' }),
      Customer.countDocuments({ ...filter, status: 'Inactive' }),
      Customer.aggregate([
        { $match: filter },
        { $group: { _id: '$source', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      Customer.aggregate([
        { $match: filter },
        { $group: { _id: '$assignedTo', count: { $sum: 1 } } },
      ]),
      Customer.find(filter)
        .populate('assignedTo', 'name email role')
        .sort({ createdAt: -1 })
        .limit(100),
    ]);

    res.status(200).json({
      success: true,
      data: {
        summary: {
          total,
          active,
          inactive,
          bySource: sourceAgg.map((s) => ({ source: s._id || 'Unknown', count: s.count })),
        },
        customers,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Lead Report
 * @route   GET /api/reports/leads
 * @access  Private (Role-based)
 */
const getLeadReport = async (req, res, next) => {
  try {
    const baseFilter = getReportBaseFilter(req.user);
    const dateParsed = parseDateFilter(req.query, 'createdAt');
    if (dateParsed.error) {
      return res.status(400).json({ success: false, message: dateParsed.error });
    }

    const filter = { ...baseFilter, ...dateParsed.filter };
    if (req.query.status) {
      filter.status = req.query.status;
    }
    if (req.query.source) {
      filter.source = req.query.source;
    }

    const [total, statusAgg, sourceAgg, leads] = await Promise.all([
      Lead.countDocuments(filter),
      Lead.aggregate([
        { $match: filter },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      Lead.aggregate([
        { $match: filter },
        { $group: { _id: '$source', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      Lead.find(filter)
        .populate('assignedTo', 'name email role')
        .populate('convertedCustomer', 'name company')
        .sort({ createdAt: -1 })
        .limit(100),
    ]);

    const statusCounts = {
      New: 0,
      Contacted: 0,
      Qualified: 0,
      Lost: 0,
      Converted: 0,
    };
    statusAgg.forEach((s) => {
      if (s._id && statusCounts[s._id] !== undefined) {
        statusCounts[s._id] = s.count;
      }
    });

    const conversionRate =
      total > 0 ? Number(((statusCounts.Converted / total) * 100).toFixed(1)) : 0;

    res.status(200).json({
      success: true,
      data: {
        summary: {
          total,
          byStatus: statusCounts,
          conversionRate,
          bySource: sourceAgg.map((s) => ({ source: s._id || 'Unknown', count: s.count })),
        },
        leads,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Follow-Up Activities Report
 * @route   GET /api/reports/followups
 * @access  Private (Role-based)
 */
const getFollowUpReport = async (req, res, next) => {
  try {
    const baseFilter = getReportBaseFilter(req.user);
    const dateParsed = parseDateFilter(req.query, 'scheduledDate');
    if (dateParsed.error) {
      return res.status(400).json({ success: false, message: dateParsed.error });
    }

    const filter = { ...baseFilter, ...dateParsed.filter };
    if (req.query.status) {
      filter.status = req.query.status;
    }
    if (req.query.type) {
      filter.type = req.query.type;
    }

    const [total, statusAgg, typeAgg, followUps] = await Promise.all([
      FollowUp.countDocuments(filter),
      FollowUp.aggregate([
        { $match: filter },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      FollowUp.aggregate([
        { $match: filter },
        { $group: { _id: '$type', count: { $sum: 1 } } },
      ]),
      FollowUp.find(filter)
        .populate('customer', 'name company')
        .populate('lead', 'name company')
        .populate('opportunity', 'name amount stage')
        .populate('assignedTo', 'name email role')
        .sort({ scheduledDate: -1 })
        .limit(100),
    ]);

    const statusCounts = { Pending: 0, Completed: 0, Cancelled: 0 };
    statusAgg.forEach((s) => {
      if (s._id && statusCounts[s._id] !== undefined) {
        statusCounts[s._id] = s.count;
      }
    });

    res.status(200).json({
      success: true,
      data: {
        summary: {
          total,
          pending: statusCounts.Pending,
          completed: statusCounts.Completed,
          cancelled: statusCounts.Cancelled,
          byType: typeAgg.map((t) => ({ type: t._id || 'Other', count: t.count })),
        },
        followUps,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Opportunity Report
 * @route   GET /api/reports/opportunities
 * @access  Private (Role-based)
 */
const getOpportunityReport = async (req, res, next) => {
  try {
    const baseFilter = getReportBaseFilter(req.user);
    const dateParsed = parseDateFilter(req.query, 'createdAt');
    if (dateParsed.error) {
      return res.status(400).json({ success: false, message: dateParsed.error });
    }

    const filter = { ...baseFilter, ...dateParsed.filter };
    if (req.query.stage) {
      filter.stage = req.query.stage;
    }

    const [total, stageAgg, opportunities] = await Promise.all([
      Opportunity.countDocuments(filter),
      Opportunity.aggregate([
        { $match: filter },
        {
          $group: {
            _id: '$stage',
            count: { $sum: 1 },
            amount: { $sum: '$amount' },
          },
        },
      ]),
      Opportunity.find(filter)
        .populate('customer', 'name company')
        .populate('lead', 'name company')
        .populate('assignedTo', 'name email role')
        .sort({ createdAt: -1 })
        .limit(100),
    ]);

    const stageMap = {};
    const allStages = [
      'Prospecting',
      'Qualification',
      'Proposal',
      'Negotiation',
      'Closed Won',
      'Closed Lost',
    ];
    allStages.forEach((st) => {
      stageMap[st] = { count: 0, amount: 0 };
    });

    stageAgg.forEach((s) => {
      if (s._id && stageMap[s._id]) {
        stageMap[s._id].count = s.count;
        stageMap[s._id].amount = s.amount;
      }
    });

    const openStages = ['Prospecting', 'Qualification', 'Proposal', 'Negotiation'];
    const openOpportunities = openStages.reduce((sum, st) => sum + stageMap[st].count, 0);
    const pipelineAmount = openStages.reduce((sum, st) => sum + stageMap[st].amount, 0);
    const wonAmount = stageMap['Closed Won'].amount;
    const lostAmount = stageMap['Closed Lost'].amount;
    const totalAmount = Object.values(stageMap).reduce((sum, s) => sum + s.amount, 0);

    res.status(200).json({
      success: true,
      data: {
        summary: {
          total,
          open: openOpportunities,
          closedWon: stageMap['Closed Won'].count,
          closedLost: stageMap['Closed Lost'].count,
          pipelineAmount,
          wonAmount,
          lostAmount,
          totalAmount,
          byStage: allStages.map((st) => ({
            stage: st,
            count: stageMap[st].count,
            amount: stageMap[st].amount,
          })),
        },
        opportunities,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Sales Pipeline Report
 * @route   GET /api/reports/pipeline
 * @access  Private (Role-based)
 */
const getPipelineReport = async (req, res, next) => {
  try {
    const baseFilter = getReportBaseFilter(req.user);
    const dateParsed = parseDateFilter(req.query, 'createdAt');
    if (dateParsed.error) {
      return res.status(400).json({ success: false, message: dateParsed.error });
    }

    const filter = { ...baseFilter, ...dateParsed.filter };

    const stageAgg = await Opportunity.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$stage',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
          avgProbability: { $avg: '$probability' },
        },
      },
    ]);

    const allStages = [
      'Prospecting',
      'Qualification',
      'Proposal',
      'Negotiation',
      'Closed Won',
      'Closed Lost',
    ];

    const stageMap = {};
    allStages.forEach((st) => {
      stageMap[st] = { count: 0, totalAmount: 0, avgProbability: 0 };
    });

    let overallTotalAmount = 0;
    stageAgg.forEach((item) => {
      if (item._id && stageMap[item._id]) {
        stageMap[item._id].count = item.count;
        stageMap[item._id].totalAmount = item.totalAmount;
        stageMap[item._id].avgProbability = Number((item.avgProbability || 0).toFixed(1));
        overallTotalAmount += item.totalAmount;
      }
    });

    const activeStages = ['Prospecting', 'Qualification', 'Proposal', 'Negotiation'];
    const activePipelineValue = activeStages.reduce((sum, st) => sum + stageMap[st].totalAmount, 0);
    const activeOpportunitiesCount = activeStages.reduce((sum, st) => sum + stageMap[st].count, 0);

    const stagesBreakdown = allStages.map((st) => {
      const stageAmount = stageMap[st].totalAmount;
      const pct = overallTotalAmount > 0 ? Number(((stageAmount / overallTotalAmount) * 100).toFixed(1)) : 0;
      return {
        stage: st,
        count: stageMap[st].count,
        totalAmount: stageAmount,
        avgProbability: stageMap[st].avgProbability,
        percentageOfTotal: pct,
      };
    });

    res.status(200).json({
      success: true,
      data: {
        totalOpportunities: stagesBreakdown.reduce((sum, s) => sum + s.count, 0),
        activeOpportunities: activeOpportunitiesCount,
        pipelineValue: activePipelineValue,
        wonValue: stageMap['Closed Won'].totalAmount,
        lostValue: stageMap['Closed Lost'].totalAmount,
        overallTotalValue: overallTotalAmount,
        stages: stagesBreakdown,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Lead Conversion Report
 * @route   GET /api/reports/conversion
 * @access  Private (Role-based)
 */
const getConversionReport = async (req, res, next) => {
  try {
    const baseFilter = getReportBaseFilter(req.user);
    const dateParsed = parseDateFilter(req.query, 'createdAt');
    if (dateParsed.error) {
      return res.status(400).json({ success: false, message: dateParsed.error });
    }

    const filter = { ...baseFilter, ...dateParsed.filter };

    const [totalLeads, statusAgg, sourceAgg] = await Promise.all([
      Lead.countDocuments(filter),
      Lead.aggregate([
        { $match: filter },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      Lead.aggregate([
        { $match: filter },
        {
          $group: {
            _id: { source: '$source', status: '$status' },
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    const statusCounts = {
      New: 0,
      Contacted: 0,
      Qualified: 0,
      Lost: 0,
      Converted: 0,
    };
    statusAgg.forEach((s) => {
      if (s._id && statusCounts[s._id] !== undefined) {
        statusCounts[s._id] = s.count;
      }
    });

    const conversionRate =
      totalLeads > 0 ? Number(((statusCounts.Converted / totalLeads) * 100).toFixed(1)) : 0;

    // Source breakdown
    const sourceMap = {};
    sourceAgg.forEach((item) => {
      const src = item._id.source || 'Website';
      const st = item._id.status;
      if (!sourceMap[src]) {
        sourceMap[src] = { source: src, total: 0, converted: 0 };
      }
      sourceMap[src].total += item.count;
      if (st === 'Converted') {
        sourceMap[src].converted += item.count;
      }
    });

    const sourceBreakdown = Object.values(sourceMap).map((s) => ({
      source: s.source,
      total: s.total,
      converted: s.converted,
      conversionRate: s.total > 0 ? Number(((s.converted / s.total) * 100).toFixed(1)) : 0,
    }));

    res.status(200).json({
      success: true,
      data: {
        totalLeads,
        qualifiedLeads: statusCounts.Qualified,
        convertedLeads: statusCounts.Converted,
        lostLeads: statusCounts.Lost,
        conversionRate,
        sources: sourceBreakdown,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    User Activity & Performance Report (Admin & Manager only)
 * @route   GET /api/reports/user-performance
 * @access  Private (Admin & Manager only, Sales Executive receives HTTP 403)
 */
const getUserPerformanceReport = async (req, res, next) => {
  try {
    // Strictly verify role: only Admin and Manager permitted
    if (req.user.role === 'Sales Executive') {
      return res.status(403).json({
        success: false,
        message: 'Access denied: User performance report is restricted to Managers and Administrators.',
      });
    }

    const dateParsed = parseDateFilter(req.query, 'createdAt');
    if (dateParsed.error) {
      return res.status(400).json({ success: false, message: dateParsed.error });
    }

    // Fetch all users with role 'Sales Executive'
    const users = await User.find({ role: 'Sales Executive', isActive: true })
      .select('name email role')
      .lean();

    const performanceData = await Promise.all(
      users.map(async (u) => {
        const userFilter = { assignedTo: u._id, ...dateParsed.filter };

        const [
          assignedLeads,
          convertedLeads,
          assignedOpps,
          oppsAgg,
          pendingFollowUps,
          completedFollowUps,
        ] = await Promise.all([
          Lead.countDocuments(userFilter),
          Lead.countDocuments({ ...userFilter, status: 'Converted' }),
          Opportunity.countDocuments(userFilter),
          Opportunity.aggregate([
            { $match: userFilter },
            {
              $group: {
                _id: '$stage',
                count: { $sum: 1 },
                amount: { $sum: '$amount' },
              },
            },
          ]),
          FollowUp.countDocuments({ ...userFilter, status: 'Pending' }),
          FollowUp.countDocuments({ ...userFilter, status: 'Completed' }),
        ]);

        let wonOpportunities = 0;
        let wonAmount = 0;
        let pipelineAmount = 0;

        oppsAgg.forEach((item) => {
          if (item._id === 'Closed Won') {
            wonOpportunities = item.count;
            wonAmount = item.amount;
          } else if (['Prospecting', 'Qualification', 'Proposal', 'Negotiation'].includes(item._id)) {
            pipelineAmount += item.amount;
          }
        });

        const conversionRate =
          assignedLeads > 0 ? Number(((convertedLeads / assignedLeads) * 100).toFixed(1)) : 0;

        return {
          user: {
            id: u._id,
            name: u.name,
            email: u.email,
            role: u.role,
          },
          assignedLeads,
          convertedLeads,
          conversionRate,
          assignedOpportunities: assignedOpps,
          wonOpportunities,
          pipelineAmount,
          wonAmount,
          pendingFollowUps,
          completedFollowUps,
        };
      })
    );

    res.status(200).json({
      success: true,
      data: {
        totalExecutives: users.length,
        executives: performanceData,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCustomerReport,
  getLeadReport,
  getFollowUpReport,
  getOpportunityReport,
  getPipelineReport,
  getConversionReport,
  getUserPerformanceReport,
};
