const Customer = require('../models/Customer');
const Lead = require('../models/Lead');
const Opportunity = require('../models/Opportunity');
const FollowUp = require('../models/FollowUp');
const { parseDateFilter } = require('../utils/dateFilter');

/**
 * @desc    Get role-aware dashboard summary and metrics
 * @route   GET /api/dashboard/summary
 * @access  Private (Admin, Manager, Sales Executive)
 */
const getDashboardSummary = async (req, res, next) => {
  try {
    const isSalesExec = req.user.role === 'Sales Executive';
    const baseFilter = isSalesExec ? { assignedTo: req.user._id } : {};

    // Optional date filtering
    const dateParsed = parseDateFilter(req.query, 'createdAt');
    if (dateParsed.error) {
      return res.status(400).json({
        success: false,
        message: dateParsed.error,
      });
    }

    const appliedFilter = { ...baseFilter, ...dateParsed.filter };

    // 1. CUSTOMERS METRICS
    const [totalCustomers, activeCustomers, inactiveCustomers] = await Promise.all([
      Customer.countDocuments(appliedFilter),
      Customer.countDocuments({ ...appliedFilter, status: 'Active' }),
      Customer.countDocuments({ ...appliedFilter, status: 'Inactive' }),
    ]);

    // 2. LEADS METRICS & STATUS DISTRIBUTION
    const leadStatusMap = {
      New: 0,
      Contacted: 0,
      Qualified: 0,
      Lost: 0,
      Converted: 0,
    };

    const [totalLeads, leadAgg] = await Promise.all([
      Lead.countDocuments(appliedFilter),
      Lead.aggregate([
        { $match: appliedFilter },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
    ]);

    leadAgg.forEach((item) => {
      if (item._id && leadStatusMap[item._id] !== undefined) {
        leadStatusMap[item._id] = item.count;
      }
    });

    const conversionRate =
      totalLeads > 0
        ? Number(((leadStatusMap.Converted / totalLeads) * 100).toFixed(1))
        : 0;

    // 3. OPPORTUNITIES METRICS & STAGE BREAKDOWN
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
      stageMap[st] = { count: 0, amount: 0 };
    });

    const oppAgg = await Opportunity.aggregate([
      { $match: appliedFilter },
      {
        $group: {
          _id: '$stage',
          count: { $sum: 1 },
          amount: { $sum: '$amount' },
        },
      },
    ]);

    let totalOpportunities = 0;
    let totalDealAmount = 0;
    oppAgg.forEach((item) => {
      if (item._id && stageMap[item._id]) {
        stageMap[item._id].count = item.count;
        stageMap[item._id].amount = item.amount;
        totalOpportunities += item.count;
        totalDealAmount += item.amount;
      }
    });

    const openStages = ['Prospecting', 'Qualification', 'Proposal', 'Negotiation'];
    const openOpportunities = openStages.reduce((sum, st) => sum + stageMap[st].count, 0);
    const pipelineAmount = openStages.reduce((sum, st) => sum + stageMap[st].amount, 0);
    const wonAmount = stageMap['Closed Won'].amount;
    const lostAmount = stageMap['Closed Lost'].amount;

    // 4. FOLLOW-UPS METRICS & TYPES
    const followUpStatusMap = {
      Pending: 0,
      Completed: 0,
      Cancelled: 0,
    };

    const followUpTypeMap = {
      Call: 0,
      Email: 0,
      Meeting: 0,
      Visit: 0,
      Other: 0,
    };

    // Use scheduledDate for upcoming calculation
    const now = new Date();
    const [totalFollowUps, followUpStatusAgg, followUpTypeAgg, upcomingFollowUps] =
      await Promise.all([
        FollowUp.countDocuments(appliedFilter),
        FollowUp.aggregate([
          { $match: appliedFilter },
          { $group: { _id: '$status', count: { $sum: 1 } } },
        ]),
        FollowUp.aggregate([
          { $match: appliedFilter },
          { $group: { _id: '$type', count: { $sum: 1 } } },
        ]),
        FollowUp.countDocuments({
          ...baseFilter,
          status: 'Pending',
          scheduledDate: { $gte: now },
        }),
      ]);

    followUpStatusAgg.forEach((item) => {
      if (item._id && followUpStatusMap[item._id] !== undefined) {
        followUpStatusMap[item._id] = item.count;
      }
    });

    followUpTypeAgg.forEach((item) => {
      if (item._id && followUpTypeMap[item._id] !== undefined) {
        followUpTypeMap[item._id] = item.count;
      }
    });

    // Structure role description
    const scopeLabel = isSalesExec
      ? 'Personal Workspace (Assigned Records Only)'
      : req.user.role === 'Manager'
      ? 'Team Pipeline & Activity'
      : 'Organization-Wide Pipeline & Oversight';

    return res.status(200).json({
      success: true,
      data: {
        user: {
          id: req.user._id,
          name: req.user.name,
          role: req.user.role,
        },
        scope: scopeLabel,
        isSalesExecutive: isSalesExec,
        metrics: {
          customers: {
            total: totalCustomers,
            active: activeCustomers,
            inactive: inactiveCustomers,
          },
          leads: {
            total: totalLeads,
            new: leadStatusMap.New,
            contacted: leadStatusMap.Contacted,
            qualified: leadStatusMap.Qualified,
            converted: leadStatusMap.Converted,
            lost: leadStatusMap.Lost,
            conversionRate,
          },
          opportunities: {
            total: totalOpportunities,
            open: openOpportunities,
            closedWon: stageMap['Closed Won'].count,
            closedLost: stageMap['Closed Lost'].count,
            pipelineAmount,
            wonAmount,
            lostAmount,
            totalAmount: totalDealAmount,
          },
          followUps: {
            total: totalFollowUps,
            pending: followUpStatusMap.Pending,
            completed: followUpStatusMap.Completed,
            cancelled: followUpStatusMap.Cancelled,
            upcoming: upcomingFollowUps,
          },
        },
        charts: {
          leadDistribution: Object.keys(leadStatusMap).map((k) => ({
            label: k,
            value: leadStatusMap[k],
          })),
          opportunityPipeline: allStages.map((st) => ({
            stage: st,
            count: stageMap[st].count,
            amount: stageMap[st].amount,
          })),
          followUpStatus: Object.keys(followUpStatusMap).map((k) => ({
            status: k,
            count: followUpStatusMap[k],
          })),
          followUpTypes: Object.keys(followUpTypeMap).map((k) => ({
            type: k,
            count: followUpTypeMap[k],
          })),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboardSummary,
};
