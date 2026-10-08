const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/User');
const Customer = require('../models/Customer');
const Lead = require('../models/Lead');
const Opportunity = require('../models/Opportunity');
const FollowUp = require('../models/FollowUp');

// Load environment configuration
dotenv.config();

const seedUsers = [
  {
    name: 'System Administrator',
    email: 'admin@acxiom.com',
    password: 'Admin@123',
    role: 'Admin',
    isActive: true,
  },
  {
    name: 'Sales Manager',
    email: 'manager@acxiom.com',
    password: 'Manager@123',
    role: 'Manager',
    isActive: true,
  },
  {
    name: 'Executive User',
    email: 'sales@acxiom.com',
    password: 'Sales@123',
    role: 'Sales Executive',
    isActive: true,
  },
];

const runSeed = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/acxiom_crm';
    await mongoose.connect(mongoUri);
    console.log(`[Seed] Connected to MongoDB: ${mongoose.connection.name}`);

    // 1. Seed or update Users
    const userMap = {};
    for (const userData of seedUsers) {
      let user = await User.findOne({ email: userData.email });

      if (user) {
        user.name = userData.name;
        user.role = userData.role;
        user.isActive = userData.isActive;
        user.failedLoginAttempts = 0;
        user.lockoutUntil = null;
        user.password = userData.password;
        await user.save();
        console.log(`[Seed] Updated user: ${userData.email}`);
      } else {
        user = await User.create(userData);
        console.log(`[Seed] Created user: ${userData.email}`);
      }
      userMap[user.email] = user;
    }

    const salesExec = userMap['sales@acxiom.com'];
    const manager = userMap['manager@acxiom.com'];

    // 2. Seed Demo Customers (idempotent by email)
    const demoCustomers = [
      {
        name: 'Reliance Retail Fleet',
        email: 'procurement@relianceretail.com',
        phone: '+91-9820011223',
        company: 'Reliance Retail Ltd',
        city: 'Mumbai',
        state: 'Maharashtra',
        source: 'Website',
        status: 'Active',
        assignedTo: salesExec._id,
        notes: 'Enterprise account with 500+ POS licenses.',
      },
      {
        name: 'Tata Motors Commercial',
        email: 'fleet.ops@tatamotors.com',
        phone: '+91-9811223344',
        company: 'Tata Motors',
        city: 'Pune',
        state: 'Maharashtra',
        source: 'Referral',
        status: 'Active',
        assignedTo: salesExec._id,
        notes: 'Commercial vehicle telematics integration.',
      },
      {
        name: 'Infosys BPM Systems',
        email: 'vendor.ops@infosys.com',
        phone: '+91-9988776655',
        company: 'Infosys Ltd',
        city: 'Bengaluru',
        state: 'Karnataka',
        source: 'LinkedIn',
        status: 'Inactive',
        assignedTo: manager._id,
        notes: 'Account on hold pending annual contract renewal.',
      },
    ];

    const customerMap = {};
    for (const cust of demoCustomers) {
      let existing = await Customer.findOne({ email: cust.email });
      if (existing) {
        Object.assign(existing, cust);
        await existing.save();
        console.log(`[Seed] Updated customer: ${cust.name}`);
      } else {
        existing = await Customer.create(cust);
        console.log(`[Seed] Created customer: ${cust.name}`);
      }
      customerMap[cust.name] = existing;
    }

    // 3. Seed Demo Leads (idempotent by email)
    const demoLeads = [
      {
        name: 'Sunil Verma',
        email: 'sunil@apexsolutions.in',
        phone: '+91-9876543210',
        company: 'Apex Solutions',
        source: 'Website',
        status: 'Qualified',
        assignedTo: salesExec._id,
        notes: 'Interested in CRM enterprise licensing. Budget approved for Q3.',
      },
      {
        name: 'Meera Nair',
        email: 'meera@cloudscale.io',
        phone: '+91-9765432109',
        company: 'CloudScale Technologies',
        source: 'Referral',
        status: 'Contacted',
        assignedTo: salesExec._id,
        notes: 'Demo conducted. Requested custom SLA quotation.',
      },
      {
        name: 'Rohan Joshi',
        email: 'rohan@fintechpulse.com',
        phone: '+91-9654321098',
        company: 'Fintech Pulse',
        source: 'Cold Call',
        status: 'New',
        assignedTo: salesExec._id,
        notes: 'Inbound enquiry from product webinar.',
      },
      {
        name: 'Pooja Hegde',
        email: 'pooja@innovatedesign.co',
        phone: '+91-9543210987',
        company: 'Innovate Design Studio',
        source: 'Event',
        status: 'Lost',
        assignedTo: manager._id,
        notes: 'Decided to continue with existing in-house tool.',
      },
    ];

    const leadMap = {};
    for (const ld of demoLeads) {
      let existing = await Lead.findOne({ email: ld.email });
      if (existing) {
        Object.assign(existing, ld);
        await existing.save();
        console.log(`[Seed] Updated lead: ${ld.name}`);
      } else {
        existing = await Lead.create(ld);
        console.log(`[Seed] Created lead: ${ld.name}`);
      }
      leadMap[ld.name] = existing;
    }

    // 4. Seed Demo Opportunities (idempotent by name)
    const futureDate = (days) => {
      const d = new Date();
      d.setDate(d.getDate() + days);
      return d;
    };

    const demoOpportunities = [
      {
        name: 'Reliance POS Cloud Expansion',
        customer: customerMap['Reliance Retail Fleet']?._id,
        lead: leadMap['Sunil Verma']?._id,
        assignedTo: salesExec._id,
        amount: 50000,
        probability: 100,
        stage: 'Closed Won',
        expectedCloseDate: futureDate(15),
        description: 'Multi-store rollout across 120 retail outlets.',
      },
      {
        name: 'Tata Motors Telematics Fleet Upgrade',
        customer: customerMap['Tata Motors Commercial']?._id,
        lead: null,
        assignedTo: salesExec._id,
        amount: 35000,
        probability: 60,
        stage: 'Proposal',
        expectedCloseDate: futureDate(30),
        description: 'Hardware GPS integration proposal submitted for review.',
      },
      {
        name: 'Infosys Enterprise License Renewal',
        customer: customerMap['Infosys BPM Systems']?._id,
        lead: null,
        assignedTo: manager._id,
        amount: 80000,
        probability: 75,
        stage: 'Negotiation',
        expectedCloseDate: futureDate(20),
        description: 'Annual corporate software maintenance negotiation.',
      },
    ];

    const opportunityMap = {};
    for (const opp of demoOpportunities) {
      if (!opp.customer) continue;
      let existing = await Opportunity.findOne({ name: opp.name });
      if (existing) {
        Object.assign(existing, opp);
        await existing.save();
        console.log(`[Seed] Updated opportunity: ${opp.name}`);
      } else {
        existing = await Opportunity.create(opp);
        console.log(`[Seed] Created opportunity: ${opp.name}`);
      }
      opportunityMap[opp.name] = existing;
    }

    // 5. Seed Demo Follow-ups / Activities (idempotent by subject)
    const demoFollowUps = [
      {
        customer: customerMap['Tata Motors Commercial']?._id,
        opportunity: opportunityMap['Tata Motors Telematics Fleet Upgrade']?._id,
        lead: null,
        assignedTo: salesExec._id,
        type: 'Call',
        subject: 'Product Demo Review with Fleet Managers',
        description: 'Review GPS tracking metrics and answer technical API queries.',
        scheduledDate: futureDate(2),
        status: 'Pending',
        notes: 'Prepare slide deck for telemetry latency benchmarks.',
      },
      {
        customer: customerMap['Reliance Retail Fleet']?._id,
        opportunity: opportunityMap['Reliance POS Cloud Expansion']?._id,
        lead: null,
        assignedTo: salesExec._id,
        type: 'Meeting',
        subject: 'Contract Handover & Account Onboarding',
        description: 'Hand over final signed agreement and introduce support engineer.',
        scheduledDate: new Date(),
        status: 'Completed',
        notes: 'PO copy received. Handed over to operations.',
      },
      {
        customer: customerMap['Infosys BPM Systems']?._id,
        opportunity: opportunityMap['Infosys Enterprise License Renewal']?._id,
        lead: null,
        assignedTo: manager._id,
        type: 'Meeting',
        subject: 'Quarterly Executive Review with Vendor Manager',
        description: 'Discuss discount tiers for volume licenses.',
        scheduledDate: futureDate(5),
        status: 'Pending',
        notes: 'Finance team pre-approved up to 10% volume discount.',
      },
    ];

    for (const fu of demoFollowUps) {
      let existing = await FollowUp.findOne({ subject: fu.subject });
      if (existing) {
        Object.assign(existing, fu);
        await existing.save();
        console.log(`[Seed] Updated follow-up: ${fu.subject}`);
      } else {
        await FollowUp.create(fu);
        console.log(`[Seed] Created follow-up: ${fu.subject}`);
      }
    }

    console.log('[Seed] Database seeding completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error(`[Seed] Error during seeding: ${error.message}`);
    process.exit(1);
  }
};

runSeed();
