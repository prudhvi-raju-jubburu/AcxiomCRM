/**
 * Date Filtering Helper for AcxiomCRM Reports and Dashboards
 *
 * Supports:
 * - Specific date range: ?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
 * - Presets: ?period=today | this_week | this_month
 */

const parseDateFilter = (query, field = 'createdAt') => {
  const { startDate, endDate, period } = query;
  const now = new Date();

  // Preset periods
  if (period) {
    if (period === 'today') {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      return { filter: { [field]: { $gte: start, $lte: end } } };
    }

    if (period === 'this_week') {
      const day = now.getDay();
      const diffToMonday = now.getDate() - day + (day === 0 ? -6 : 1);
      const start = new Date(now.getFullYear(), now.getMonth(), diffToMonday, 0, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth(), diffToMonday + 6, 23, 59, 59, 999);
      return { filter: { [field]: { $gte: start, $lte: end } } };
    }

    if (period === 'this_month') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      return { filter: { [field]: { $gte: start, $lte: end } } };
    }
  }

  // Explicit startDate / endDate
  if (startDate || endDate) {
    const range = {};

    if (startDate) {
      const startParsed = new Date(startDate);
      if (isNaN(startParsed.getTime())) {
        return { error: 'Invalid startDate format. Expected YYYY-MM-DD or ISO date string.' };
      }
      // Start of day
      startParsed.setHours(0, 0, 0, 0);
      range.$gte = startParsed;
    }

    if (endDate) {
      const endParsed = new Date(endDate);
      if (isNaN(endParsed.getTime())) {
        return { error: 'Invalid endDate format. Expected YYYY-MM-DD or ISO date string.' };
      }
      // End of day
      endParsed.setHours(23, 59, 59, 999);
      range.$lte = endParsed;
    }

    if (range.$gte && range.$lte && range.$gte > range.$lte) {
      return { error: 'startDate cannot be after endDate.' };
    }

    return { filter: { [field]: range } };
  }

  // No date filter specified
  return { filter: {} };
};

module.exports = { parseDateFilter };
