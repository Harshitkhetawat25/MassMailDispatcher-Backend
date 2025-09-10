const MailLog = require("../model/mailLogModel");

const mailLogController = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit) || 10)); // clamp for safety

    const filters = { user: req.user.id };

    if (req.query.status && ["success", "failed"].includes(req.query.status)) {
      filters.status = req.query.status;
    }

    // date range filtering (expects YYYY-MM-DD from frontend inputs)

    if (req.query.from || req.query.to) {
      filters.sentAt = {};
      if (req.query.from) filters.sentAt.$gte = new Date(req.query.from);
      if (req.query.to) {
        const toDate = new Date(req.query.to);
        toDate.setHours(23, 59, 59, 999);
        filters.sentAt.$lte = toDate;
      }
    }

    const skip = (page - 1) * limit;
    const [logs, total] = await Promise.all([
      MailLog.find(filters).sort({ sentAt: -1 }).skip(skip).limit(limit),
      MailLog.countDocuments(filters),
    ]);
    const totalPages = Math.ceil(total / limit);
    res.json({ success: true, logs, total, page, totalPages });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

module.exports = mailLogController;
