// Import Income and Expense models
const Income = require("../models/Income");
const Expense = require("../models/Expense");

// Import mongoose utilities
const { Types } = require("mongoose");

// Controller to fetch dashboard data
exports.getDashboardData = async (req, res) => {
  try {
    // Check if user is authenticated
    if (!req.user || !req.user._id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Convert userId to MongoDB ObjectId
    const userObjectId = new Types.ObjectId(req.user._id);

    // Calculate total income using aggregation
    const totalIncome = await Income.aggregate([
      { $match: { userId: userObjectId } }, // Filter by user
      { $group: { _id: null, total: { $sum: "$amount" } } }, // Sum income amounts
    ]);

    // Calculate total expense using aggregation
    const totalExpense = await Expense.aggregate([
      { $match: { userId: userObjectId } }, // Filter by user
      { $group: { _id: null, total: { $sum: "$amount" } } }, // Sum expense amounts
    ]);

    // Fetch income transactions from the last 60 days
    const last60DaysIncomeTransactions = await Income.find({
      userId: userObjectId,
      date: { $gte: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000) },
    }).sort({ date: -1 }); // Latest first

    // Calculate total income for the last 60 days
    const incomeLast60Days = last60DaysIncomeTransactions.reduce(
      (sum, transaction) => sum + transaction.amount,
      0,
    );

    // Fetch expense transactions from the last 30 days
    const last30DaysExpenseTransactions = await Expense.find({
      userId: userObjectId,
      date: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
    }).sort({ date: -1 }); // Latest first

    // Calculate total expense for the last 30 days
    const expenseLast30Days = last30DaysExpenseTransactions.reduce(
      (sum, transaction) => sum + transaction.amount,
      0,
    );

    // Fetch last 5 recent transactions (Income + Expense combined)
    const lastTransactions = [
      // Get recent income transactions
      ...(await Income.find({ userId: userObjectId })
        .sort({ date: -1 })
        .limit(5)
        .lean() // Convert to plain JS objects for better performance
        .then((txns) =>
          txns.map((txn) => ({
            ...txn,
            type: "Income", // Add transaction type
          })),
        )),

      // Get recent expense transactions
      ...(await Expense.find({ userId: userObjectId })
        .sort({ date: -1 })
        .limit(5)
        .lean()
        .then((txns) =>
          txns.map((txn) => ({
            ...txn,
            type: "Expense", // Add transaction type
          })),
        )),
    ]
      .sort((a, b) => new Date(b.date) - new Date(a.date)) // Sort all by latest date
      .slice(0, 5); // Keep only the latest 5 overall transactions

    // Send dashboard response
    res.status(200).json({
      totalIncome: totalIncome[0]?.total || 0,
      totalExpense: totalExpense[0]?.total || 0,
      totalBalance:
        (totalIncome[0]?.total || 0) - (totalExpense[0]?.total || 0),

      last30DaysExpenses: {
        total: expenseLast30Days,
        transactions: last30DaysExpenseTransactions,
      },

      last60DaysIncome: {
        total: incomeLast60Days,
        transactions: last60DaysIncomeTransactions,
      },

      recentTransactions: lastTransactions,
    });
  } catch (error) {
    // Handle unexpected server errors
    console.error("Dashboard Error:", error);
    res.status(500).json({
      message: "Server Error!",
      error: error.message,
    });
  }
};
