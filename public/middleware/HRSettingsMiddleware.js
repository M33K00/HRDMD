const HRSettings = require("../models/hrsettings");
const DaysPresent = require("../models/dayspresent");
const DaysPresentA = require("../models/dayspresentA");
const DaysAbsent = require("../models/daysabsent");
const DaysAbsentA = require("../models/daysabsentA");

const checkHRSettings = async (req, res, next) => {
    req.models = { HRSettings };
    next()
};

const vlPointsAdditions = [
  0.042, 0.063, 0.125, 0.167, 0.208, 0.250, 0.292, 0.333, 0.375, 0.417, 
  0.458, 0.500, 0.542, 0.583, 0.625, 0.667, 0.708, 0.750, 0.792, 0.833, 
  0.875, 0.917, 0.958, 1.000, 1.042, 1.083, 1.125, 1.167, 1.208, 1.250
];
  
async function calculateMonthlyVLPoints(email, VLPoints) {
  
    let totalVLPoints = VLPoints;
  
    // Fetch attendance records from both DaysPresent and DaysPresentA collections
    const daysPresent = await DaysPresent.find({ email }).sort({ date: 1 });
    const daysPresentA = await DaysPresentA.find({ email }).sort({ date: 1 });
    const combinedDaysPresent = [...daysPresent, ...daysPresentA];
  
    // Fetch absence records from both DaysAbsent and DaysAbsentA collections
    const daysAbsent = await DaysAbsent.find({ email }).sort({ date: 1 });
    const daysAbsentA = await DaysAbsentA.find({ email }).sort({ date: 1 });
    const combinedDaysAbsent = [...daysAbsent, ...daysAbsentA];
  
    // Sort the combined attendance and absence arrays by date
    combinedDaysPresent.sort((a, b) => a.date - b.date);
    combinedDaysAbsent.sort((a, b) => a.date - b.date);
  
    // Group records by month and year
    const monthlyCounts = {};
    combinedDaysPresent.forEach(record => {
      const year = record.date.getFullYear();
      const month = record.date.getMonth() + 1;
      const key = `${year}-${month.toString().padStart(2, '0')}`;
  
      if (!monthlyCounts[key]) {
        monthlyCounts[key] = { present: 0, absent: 0 };
      }
      monthlyCounts[key].present++;
    });

    combinedDaysAbsent.forEach(record => {
      const year = record.date.getFullYear();
      const month = record.date.getMonth() + 1;
      const key = `${year}-${month.toString().padStart(2, '0')}`;
  
      if (!monthlyCounts[key]) {
        monthlyCounts[key] = { present: 0, absent: 0 };
      }
      monthlyCounts[key].absent++;
    });
  
    // Calculate VL Points for each month
    for (const monthKey in monthlyCounts) {
      const { present: daysPresentInMonth, absent: daysAbsentInMonth } = monthlyCounts[monthKey];
  
      // Determine addition based on days present
      const additionIndex = daysPresentInMonth > 30 ? 29 : daysPresentInMonth - 1;
      const vlPointsForMonth = vlPointsAdditions[additionIndex];
  
      // Deduction based on absences
      const AbsentDeduction = daysAbsentInMonth * 1;
  
      // Update total VL points
      totalVLPoints += vlPointsForMonth;
  
      //console.log(`Month: ${monthKey}, Days Present: ${daysPresentInMonth}, Days Absent: ${daysAbsentInMonth}, VL Points Added: ${vlPointsForMonth}, Absent Deduction: ${AbsentDeduction}`);
    }
  
    // console.log('Total VL Points:', totalVLPoints);  // Final output for verification
    return totalVLPoints;
}

  
  // SL Points Calculation
  async function calculateMonthlySLPoints(email, SLPoints) {
    
    let totalSLPoints = SLPoints;
  
    // Fetch attendance records from both DaysPresent and DaysPresentA collections
    const daysPresent = await DaysPresent.find({ email }).sort({ date: 1 });
    const daysPresentA = await DaysPresentA.find({ email }).sort({ date: 1 });
  
    // Combine both arrays of documents
    const combinedDaysPresent = [...daysPresent, ...daysPresentA];
  
    // Sort the combined array by date in ascending order
    combinedDaysPresent.sort((a, b) => a.date - b.date);
  
    // Group records by month and year
    const monthlyCounts = {};
    combinedDaysPresent.forEach(record => {
      const year = record.date.getFullYear();
      const month = record.date.getMonth() + 1; // Months are 0-indexed, so add 1 for clarity
      const key = `${year}-${month.toString().padStart(2, '0')}`;
  
      if (!monthlyCounts[key]) {
        monthlyCounts[key] = 0;
      }
      monthlyCounts[key]++;
    });
  
    // Calculate SL Points for each month
    for (const monthKey in monthlyCounts) {
      const daysPresentInMonth = monthlyCounts[monthKey];
  
      // Limit streak value to 30 for max addition
      const additionIndex = daysPresentInMonth > 30 ? 29 : daysPresentInMonth - 1;
      const slPointsForMonth = vlPointsAdditions[additionIndex];
      totalSLPoints += slPointsForMonth;
    }
    return totalSLPoints;
}

module.exports = { checkHRSettings, calculateMonthlyVLPoints, calculateMonthlySLPoints };