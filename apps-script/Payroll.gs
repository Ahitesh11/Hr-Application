/**
 * Payroll.gs — Generates the 'Payroll' sheet for a given Year + Month from
 * 'Attendance' / 'Sales Attendance' (days present) and 'Present Employees'
 * (fixed monthly Salary + bank/statutory master data), grouped by Company
 * with subtotal rows.
 */

var PAYROLL_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

var PAYROLL_HEADERS = [
  'Employee Code', 'Employee Name', 'Company', 'Location', 'Designation', 'Mode', 'Bank Name',
  'Bank Account Number', 'IFSC Code', 'UAN', 'Insurance Id', 'No. of Days Present', 'Calculation Days',
  'Total Actual', 'Basic', 'Conveyance', 'HRA', 'Medical Allowance', 'Special Allowance', 'Other Allowances',
  'Payment', "This Sholud Be Match With Payment", "Emp'ee Contri @ 12%", 'To Be Paid After PF',
  'Additional Salary', "Emp'er Contri @ 8.33%", "Emp'er Contri @ 3.67%", 'Admin Exp @ 1.1%',
  "Emp'ee ESIC @0.75%", "Emp'er ESIC @ 3.25%"
];

// Columns that get summed into a per-company subtotal row + a grand-total row.
var PAYROLL_SUMMARY_COLS = ['totalActual', 'basic', 'conveyance', 'hra', 'medicalAllowance', 'specialAllowance',
  'otherAllowances', 'payment', 'employeeContri12', 'employerContri833', 'employerContri367', 'adminExp11',
  'employeeESIC075', 'employerESIC325'];

// Keyword-based matchers (normalized: lowercase, non-alphanumeric stripped) used to locate each
// concept in the *live* Payroll sheet headers. Deliberately NOT relying on camelize()/exact text,
// since real-world headers here carry apostrophes/typos (e.g. "Emp'ee Contri @ 12%",
// "This Sholud Be Match With Payment") that don't camelize to predictable keys.
var PAYROLL_COL_MATCHERS = {
  employeeCode: function (n) { return n.indexOf('employeecode') !== -1 || n.indexOf('empcode') !== -1 || n.indexOf('employeeid') !== -1 || n.indexOf('empid') !== -1; },
  employeeName: function (n) { return n.indexOf('employeename') !== -1 || n === 'name'; },
  company: function (n) { return n.indexOf('company') !== -1; },
  location: function (n) { return n.indexOf('location') !== -1; },
  designation: function (n) { return n.indexOf('designation') !== -1; },
  mode: function (n) { return n === 'mode'; },
  bankName: function (n) { return n.indexOf('bankname') !== -1; },
  bankAccountNumber: function (n) { return n.indexOf('bankaccount') !== -1 || n.indexOf('accountnumber') !== -1; },
  ifscCode: function (n) { return n.indexOf('ifsc') !== -1; },
  uan: function (n) { return n.indexOf('uan') !== -1; },
  insuranceId: function (n) { return n.indexOf('insurance') !== -1; },
  noOfDaysPresent: function (n) { return n.indexOf('dayspresent') !== -1; },
  calculationDays: function (n) { return n.indexOf('calculationdays') !== -1; },
  totalActual: function (n) { return n.indexOf('totalactual') !== -1; },
  basic: function (n) { return n.indexOf('basic') !== -1; },
  conveyance: function (n) { return n.indexOf('conveyance') !== -1; },
  hra: function (n) { return n.indexOf('hra') !== -1; },
  medicalAllowance: function (n) { return n.indexOf('medical') !== -1; },
  specialAllowance: function (n) { return n.indexOf('special') !== -1; },
  otherAllowances: function (n) { return n.indexOf('other') !== -1 && n.indexOf('allowance') !== -1; },
  payment: function (n) { return n.indexOf('payment') !== -1 && n.indexOf('match') === -1 && n.indexOf('paidafter') === -1; },
  matchWithPayment: function (n) { return n.indexOf('match') !== -1; },
  employeeContri12: function (n) { return n.indexOf('contri') !== -1 && (n.indexOf('employee') !== -1 || n.indexOf('empee') !== -1); },
  toBePaidAfterPF: function (n) { return n.indexOf('paidafter') !== -1 || n.indexOf('tobepaid') !== -1; },
  additionalSalary: function (n) { return n.indexOf('additional') !== -1; },
  employerContri833: function (n) { return n.indexOf('contri') !== -1 && (n.indexOf('employer') !== -1 || n.indexOf('emper') !== -1) && n.indexOf('833') !== -1; },
  employerContri367: function (n) { return n.indexOf('contri') !== -1 && (n.indexOf('employer') !== -1 || n.indexOf('emper') !== -1) && n.indexOf('367') !== -1; },
  adminExp11: function (n) { return n.indexOf('admin') !== -1; },
  employeeESIC075: function (n) { return n.indexOf('esic') !== -1 && (n.indexOf('employee') !== -1 || n.indexOf('empee') !== -1); },
  employerESIC325: function (n) { return n.indexOf('esic') !== -1 && (n.indexOf('employer') !== -1 || n.indexOf('emper') !== -1); }
};

function normalizePayrollHeader(h) {
  return h.toString().toLowerCase().replace(/[^a-z0-9]/g, '');
}

function toPayrollNum(v) {
  var n = parseFloat((v || '').toString().replace(/,/g, ''));
  return isNaN(n) ? 0 : n;
}

// The generic getHeaderInfo() common-header list doesn't include "employee code", so the
// Payroll sheet's header row needs its own scan (mirrors getHeaderInfo's title-row-skipping approach).
function findPayrollHeaderRow(sheet) {
  var data = sheet.getDataRange().getValues();
  for (var i = 0; i < Math.min(15, data.length); i++) {
    for (var j = 0; j < data[i].length; j++) {
      if (normalizePayrollHeader(data[i][j]).indexOf('employeecode') !== -1) {
        return { index: i, headers: data[i] };
      }
    }
  }
  return { index: -1, headers: null };
}

// Summarizes a long list of employee codes into one warning line instead of one warning per code
// (a wrong column match can otherwise flood the response with thousands of near-duplicate lines).
function summarizeCodes(prefix, codes) {
  if (!codes || !codes.length) return '';
  var shown = codes.slice(0, 15).join(', ');
  var extra = codes.length > 15 ? ' (+' + (codes.length - 15) + ' more)' : '';
  return prefix + ' (' + codes.length + '): ' + shown + extra;
}

// Sheets often auto-format a typed "2026" into a Date cell; compare on the actual year number
// in that case instead of the stringified Date (which would never equal "2026").
function payrollYearMatches(cellVal, targetYear) {
  if (Object.prototype.toString.call(cellVal) === '[object Date]') {
    return cellVal.getFullYear().toString() === targetYear.toString().trim();
  }
  return (cellVal || '').toString().trim() === targetYear.toString().trim();
}

function payrollMonthMatches(cellVal, targetMonth) {
  if (Object.prototype.toString.call(cellVal) === '[object Date]') {
    return PAYROLL_MONTHS[cellVal.getMonth()].toLowerCase() === targetMonth.toString().trim().toLowerCase();
  }
  return (cellVal || '').toString().trim().toLowerCase() === targetMonth.toString().trim().toLowerCase();
}

// The shared getHeaderInfo() detects a header row by looking for a cell containing hints like
// "pmmpl" — which works for sheets whose header literally says "Employee Id", but backfires on
// 'Present Employees' if its real header text doesn't match any hint: the scan then falls through
// to the first DATA row, whose "PMMPL-1" style employee code also contains "pmmpl" and gets
// mistaken for a header. This dedicated finder instead requires an Employee Code AND a Salary
// header-like cell in the same row, which a data row won't have.
function findPresentEmployeesHeaderRow(sheet) {
  var data = sheet.getDataRange().getValues();
  for (var i = 0; i < Math.min(15, data.length); i++) {
    var hasCode = false, hasSalary = false;
    for (var j = 0; j < data[i].length; j++) {
      var l = data[i][j].toString().toLowerCase().trim();
      if (l.includes('employee code') || l.includes('emp code') || l.includes('employee id') || l.includes('emp id')) hasCode = true;
      if (l.includes('salary')) hasSalary = true;
    }
    if (hasCode && hasSalary) return { index: i, headers: data[i] };
  }
  return { index: -1, headers: null };
}

// Backs the 'getPresentEmployees' action (used by the Joining module's "Present Employees" tab).
// Uses findPresentEmployeesHeaderRow instead of the generic getHeaderInfo/getData, because
// getHeaderInfo mistakes a data row like "PMMPL-1" for the header (it matches the 'pmmpl' hint),
// which previously made every header cell lookup crash with "h.toLowerCase is not a function".
function getPresentEmployeesRows(ss) {
  var sheet = ss.getSheetByName('Present Employees');
  if (!sheet) return [];
  var info = findPresentEmployeesHeaderRow(sheet);
  if (info.index === -1) return [];

  var data = sheet.getDataRange().getDisplayValues();
  var headers = info.headers;
  var results = [];
  for (var i = info.index + 1; i < data.length; i++) {
    var row = {};
    var hasData = false;
    for (var j = 0; j < headers.length; j++) {
      var key = camelize(headers[j].toString());
      if (!key) continue;
      row[key] = data[i][j];
      if (data[i][j] !== '' && data[i][j] != null) hasData = true;
    }
    if (!hasData) continue;
    row._row = i + 1;
    results.push(row);
  }
  return results;
}

function generatePayroll(ss, year, month) {
  try {
    if (!year || !month) return { success: false, error: 'Year and Month are required' };
    var monthIdx = PAYROLL_MONTHS.findIndex(function (m) { return m.toLowerCase() === month.toString().trim().toLowerCase(); });
    if (monthIdx === -1) return { success: false, error: 'Unrecognized month: ' + month };
    var daysInMonth = new Date(parseInt(year, 10), monthIdx + 1, 0).getDate();

    var warnings = [];

    // 1. Present Employees master map (fixed monthly Salary + bank/statutory info) — this is the
    //    driver: payroll is generated for every employee found here, per the user's requirement.
    var peSheet = ss.getSheetByName('Present Employees');
    if (!peSheet) return { success: false, error: "'Present Employees' sheet not found" };
    var peInfo = findPresentEmployeesHeaderRow(peSheet);
    if (peInfo.index === -1) {
      // Don't fall back to the generic (unreliable-for-this-sheet) detector again — instead dump
      // the raw first few rows so the real header row is visible directly, no more guessing.
      var rawPreview = peSheet.getDataRange().getValues().slice(0, 5).map(function (row, i) {
        return 'Row ' + (i + 1) + ': ' + row.map(function (c) { return c === '' ? '·' : c; }).join(' | ');
      }).join('\n');
      return { success: false, error: "Could not find a row in 'Present Employees' containing both an Employee Code and a Salary column header. Raw first 5 rows:\n" + rawPreview };
    }
    var peData = peSheet.getDataRange().getValues();
    var peHeaders = peInfo.headers;
    var peCol = {
      code: peHeaders.findIndex(function (h) { var l = h.toString().toLowerCase(); return l.includes('employee code') || l.includes('emp code') || l.includes('employee id') || l.includes('emp id') || l.includes('pmmpl'); }),
      name: peHeaders.findIndex(function (h) {
        var l = h.toString().toLowerCase();
        if (l.includes('employee name') || l.includes('name as per aadhar') || l.trim() === 'name') return true;
        return l.includes('name') && l.indexOf('company') === -1 && l.indexOf('bank') === -1 && l.indexOf('father') === -1 && l.indexOf('mother') === -1 && l.indexOf('nominee') === -1;
      }),
      company: peHeaders.findIndex(function (h) { return h.toString().toLowerCase().includes('company'); }),
      location: peHeaders.findIndex(function (h) {
        var l = h.toString().toLowerCase();
        if (l.includes('bank')) return false; // never let a bank-name/branch column be picked up as "location"
        return l.includes('location') || l.trim() === 'work place' || l.trim() === 'workplace' || l.includes('posting');
      }),
      designation: peHeaders.findIndex(function (h) { return h.toString().toLowerCase().includes('designation'); }),
      mode: peHeaders.findIndex(function (h) { var l = h.toString().toLowerCase().trim(); return l === 'mode' || l === 'payment mode' || l === 'salary mode'; }),
      bankName: peHeaders.findIndex(function (h) { return h.toString().toLowerCase().includes('bank name'); }),
      bankAccountNumber: peHeaders.findIndex(function (h) { var l = h.toString().toLowerCase(); return l.includes('bank account') || l.includes('account number'); }),
      ifscCode: peHeaders.findIndex(function (h) { return h.toString().toLowerCase().includes('ifsc'); }),
      uan: peHeaders.findIndex(function (h) { return h.toString().toLowerCase().includes('uan'); }),
      insuranceId: peHeaders.findIndex(function (h) { return h.toString().toLowerCase().includes('insurance'); }),
      // Prefer an exact/plain "Salary" column (the current monthly figure Payroll should prorate)
      // over "Joining Salary" (a historical value from onboarding) or any other salary-ish column —
      // only fall back to those if there's no plain "Salary" column at all.
      salary: (function () {
        var exact = peHeaders.findIndex(function (h) { return h.toString().toLowerCase().trim() === 'salary'; });
        if (exact !== -1) return exact;
        var nonJoining = peHeaders.findIndex(function (h) { var l = h.toString().toLowerCase(); return l.includes('salary') && l.indexOf('joining') === -1; });
        if (nonJoining !== -1) return nonJoining;
        return peHeaders.findIndex(function (h) { return h.toString().toLowerCase().includes('salary'); });
      })()
    };
    if (peCol.code === -1) return { success: false, error: "Could not find an Employee Code/Id column in 'Present Employees'. Headers found: " + peHeaders.join(' | ') };
    if (peCol.salary === -1) return { success: false, error: "Could not find a 'Salary' column in 'Present Employees'. Headers found: " + peHeaders.join(' | ') };

    // Self-diagnosing: flag if any field wasn't found, or if two different fields accidentally
    // mapped to the same column (a sure sign one of them is wrong) — but only when something is
    // actually wrong. When every field maps to a distinct real column, that's not a warning, it's
    // just how it's supposed to work, so nothing is added to the warnings list in that case.
    var peMissingFields = [];
    var peIndexUsed = {};
    var peCollisions = [];
    Object.keys(peCol).forEach(function (key) {
      var idx = peCol[key];
      if (idx === -1) { peMissingFields.push(key); return; }
      if (peIndexUsed[idx]) { peCollisions.push(peIndexUsed[idx] + ' & ' + key + ' both matched "' + peHeaders[idx] + '"'); }
      else peIndexUsed[idx] = key;
    });
    if (peMissingFields.length) {
      warnings.push("'Present Employees': no column found for " + peMissingFields.join(', ') + ' (those fields will be blank on every row)');
    }
    if (peCollisions.length) {
      warnings.push("'Present Employees' COLUMN COLLISIONS (likely wrong): " + peCollisions.join('; '));
    }

    var employeeMaster = {};
    var employeeOrder = [];
    for (var p = peInfo.index + 1; p < peData.length; p++) {
      var code = (peData[p][peCol.code] || '').toString().trim();
      if (!code) continue;
      employeeMaster[code] = {
        name: peCol.name !== -1 ? peData[p][peCol.name] : '',
        company: peCol.company !== -1 ? peData[p][peCol.company] : '',
        location: peCol.location !== -1 ? peData[p][peCol.location] : '',
        designation: peCol.designation !== -1 ? peData[p][peCol.designation] : '',
        mode: peCol.mode !== -1 ? peData[p][peCol.mode] : 'Bank',
        bankName: peCol.bankName !== -1 ? peData[p][peCol.bankName] : '',
        bankAccountNumber: peCol.bankAccountNumber !== -1 ? peData[p][peCol.bankAccountNumber] : '',
        ifscCode: peCol.ifscCode !== -1 ? peData[p][peCol.ifscCode] : '',
        uan: peCol.uan !== -1 ? peData[p][peCol.uan] : '',
        insuranceId: peCol.insuranceId !== -1 ? peData[p][peCol.insuranceId] : '',
        salary: toPayrollNum(peData[p][peCol.salary])
      };
      employeeOrder.push(code);
    }

    // 2. Attendance + Sales Attendance -> No. of Days Present, for the selected Year+Month.
    //    'Attendance' (Factory/MDO Office staff) and 'Sales Attendance' (Sales staff) are the two
    //    real sheets that exist today. 'Master Attendance' (a punch-data-derived summary sheet with
    //    a "Grand Total Days" column) does NOT exist yet — it's read here too, but only opportunistically:
    //    if/when it's built later it's picked up automatically with no code change, and until then it's
    //    silently skipped (no warning) since its absence is expected, not an error.
    //    A sheet is skipped entirely (with one warning) if its Year/Month columns can't be found,
    //    rather than silently pulling in every month's rows and corrupting the results.
    //    Employees appearing in more than one of these sheets is expected (each sheet covers a
    //    different population) — only a genuine duplicate *within the same sheet* is warned about.
    var attendanceMap = {};
    ['Attendance', 'Sales Attendance', 'Master Attendance'].forEach(function (sheetName) {
      var aSheet = ss.getSheetByName(sheetName);
      if (!aSheet) { if (sheetName !== 'Master Attendance') warnings.push("'" + sheetName + "' sheet not found - skipped"); return; }
      var aInfo = getHeaderInfo(aSheet);
      var aData = aSheet.getDataRange().getValues();
      var aHeaders = aInfo.headers;
      var yearIdx = aHeaders.findIndex(function (h) { return h.toString().toLowerCase().trim() === 'year'; });
      var monthCol = aHeaders.findIndex(function (h) { return h.toString().toLowerCase().trim() === 'month'; });
      var codeIdx = aHeaders.findIndex(function (h) { var l = h.toString().toLowerCase(); return l.includes('emp id code') || l.includes('employee code') || l.includes('emp code') || l.includes('employee id') || l.includes('emp id'); });
      var grandTotalIdx = aHeaders.findIndex(function (h) { var l = h.toString().toLowerCase(); return l.includes('grand total'); });
      var totalIdx = aHeaders.findIndex(function (h) { return h.toString().toLowerCase().trim() === 'total'; });
      var dayIdxs = [];
      aHeaders.forEach(function (h, idx) { if (/^\d{1,2}$/.test(h.toString().trim())) dayIdxs.push(idx); });

      if (codeIdx === -1) { warnings.push("'" + sheetName + "' sheet: could not find an Employee Code column - skipped"); return; }
      if (yearIdx === -1 || monthCol === -1) { warnings.push("'" + sheetName + "' sheet: could not find Year/Month columns - skipped entirely to avoid mixing months"); return; }

      // Two possible shapes: "wide" (one row per employee per month, with a Total or day-of-month
      // columns — e.g. Sales Attendance) vs "long" (one row per employee per punch/date within the
      // month — e.g. Attendance, which has no Total/day columns at all). For "long", every matching
      // row is a real day, not a duplicate — so they're counted, not flagged.
      var isWideFormat = (grandTotalIdx !== -1) || (totalIdx !== -1) || (dayIdxs.length > 0);

      var dupCodesInSheet = [];
      var seenInThisSheet = {};
      for (var i = aInfo.index + 1; i < aData.length; i++) {
        var empCode = (aData[i][codeIdx] || '').toString().trim();
        if (!empCode) continue;
        if (!payrollYearMatches(aData[i][yearIdx], year)) continue;
        if (!payrollMonthMatches(aData[i][monthCol], month)) continue;

        if (!isWideFormat) {
          // Long format: each matching row is one day present for that employee.
          attendanceMap[empCode] = (attendanceMap[empCode] || 0) + 1;
          continue;
        }

        var days = grandTotalIdx !== -1 ? toPayrollNum(aData[i][grandTotalIdx]) : (totalIdx !== -1 ? toPayrollNum(aData[i][totalIdx]) : 0);
        if (!days && dayIdxs.length) {
          days = dayIdxs.reduce(function (sum, idx) { return sum + toPayrollNum(aData[i][idx]); }, 0);
        }

        if (seenInThisSheet[empCode]) {
          dupCodesInSheet.push(empCode);
          continue;
        }
        seenInThisSheet[empCode] = true;

        if (attendanceMap[empCode] == null) attendanceMap[empCode] = days;
      }
      if (dupCodesInSheet.length) {
        warnings.push(summarizeCodes("Duplicate rows within '" + sheetName + "' for " + month + ' ' + year + ' - using the first match', dupCodesInSheet));
      }
    });

    // Employees with attendance but no Present Employees record still get a row — with blank
    // master data (company/bank/salary) — instead of being silently dropped, so HR can see them
    // in the sheet and fill in their details, rather than losing them entirely.
    var orphanCodes = Object.keys(attendanceMap).filter(function (c) { return !employeeMaster[c]; });
    if (orphanCodes.length) {
      warnings.push(summarizeCodes('Has attendance for ' + month + ' ' + year + " but missing from Present Employees - included with blank details (fill in Present Employees)", orphanCodes));
      orphanCodes.forEach(function (c) {
        employeeMaster[c] = { name: '', company: '', location: '', designation: '', mode: 'Bank', bankName: '', bankAccountNumber: '', ifscCode: '', uan: '', insuranceId: '', salary: 0 };
        employeeOrder.push(c);
      });
    }

    // 3. Compute payroll rows — one per Present Employees record (0 days if no attendance found,
    //    0 pay if no/zero salary — always included as a row rather than silently skipped, so every
    //    employee is visible in the Payroll sheet even when their source data is incomplete).
    var rows = [];
    var missingAttendanceCodes = [];
    var zeroSalaryCodes = [];
    employeeOrder.forEach(function (empCode) {
      var master = employeeMaster[empCode];
      if (!master.salary || master.salary <= 0) {
        zeroSalaryCodes.push(empCode);
      }
      var hasAttendance = attendanceMap[empCode] != null;
      if (!hasAttendance) missingAttendanceCodes.push(empCode);
      var noOfDaysPresent = hasAttendance ? attendanceMap[empCode] : 0;

      // "Total Actual" is the flat monthly Salary itself (unprorated) — confirmed from real payroll
      // data: an employee with 0 days present still shows their full Salary in this column. The
      // attendance ratio is applied *inside* each allowance formula instead, and is what gets written
      // to the "Calculation Days" column (e.g. 30/31 = 0.9677419355), not a plain day count.
      var totalActual = master.salary;
      var ratio = daysInMonth > 0 ? (noOfDaysPresent / daysInMonth) : 0;
      var proratedGross = Math.round(totalActual * ratio);

      var basic = Math.min(Math.round(totalActual * ratio * 0.65), 15000);
      var conveyance = Math.round(totalActual * ratio * 0.10);
      var hra = Math.round(totalActual * ratio * 0.10);
      var medicalAllowance = Math.round(totalActual * ratio * 0.05);
      var specialAllowance = Math.round(totalActual * ratio * 0.10);
      var otherAllowances = Math.max(0, proratedGross - (basic + conveyance + hra + medicalAllowance + specialAllowance));
      var payment = basic + conveyance + hra + medicalAllowance + specialAllowance + otherAllowances;

      // PF only applies if the employee has a UAN — left blank (not 0) otherwise, matching the
      // real sheet exactly. ESIC only applies if the employee has an Insurance Id — shown as 0
      // (not blank) otherwise.
      var hasUan = master.uan && master.uan.toString().trim() !== '';
      var employeeContri12 = hasUan ? Math.round(basic * 0.12) : '';
      var employerContri833 = hasUan ? Math.round(basic * 0.0833) : '';
      var employerContri367 = hasUan ? Math.round(basic * 0.0367) : '';
      var adminExp11 = hasUan ? Math.round(basic * 0.011) : '';

      var hasInsurance = master.insuranceId && master.insuranceId.toString().trim() !== '';
      var employeeESIC075 = hasInsurance ? Math.round(proratedGross * 0.0075) : 0;
      var employerESIC325 = hasInsurance ? Math.round(proratedGross * 0.0325) : 0;

      rows.push({
        employeeCode: empCode,
        employeeName: master.name,
        company: master.company,
        location: master.location,
        designation: master.designation,
        mode: master.mode,
        bankName: master.bankName,
        bankAccountNumber: master.bankAccountNumber,
        ifscCode: master.ifscCode,
        uan: master.uan,
        insuranceId: master.insuranceId,
        noOfDaysPresent: noOfDaysPresent,
        calculationDays: ratio,
        totalActual: totalActual,
        basic: basic,
        conveyance: conveyance,
        hra: hra,
        medicalAllowance: medicalAllowance,
        specialAllowance: specialAllowance,
        otherAllowances: otherAllowances,
        payment: payment,
        matchWithPayment: payment,
        employeeContri12: employeeContri12,
        toBePaidAfterPF: '',
        additionalSalary: '',
        employerContri833: employerContri833,
        employerContri367: employerContri367,
        adminExp11: adminExp11,
        employeeESIC075: employeeESIC075,
        employerESIC325: employerESIC325
      });
    });

    if (missingAttendanceCodes.length) {
      warnings.push(summarizeCodes('No attendance record for ' + month + ' ' + year + ' - shown with 0 days present', missingAttendanceCodes));
    }
    if (zeroSalaryCodes.length) {
      warnings.push(summarizeCodes("Missing/zero 'Salary' in Present Employees - included with 0 pay (fill in Salary)", zeroSalaryCodes));
    }

    rows.sort(function (a, b) {
      var c = (a.company || '').toString().localeCompare((b.company || '').toString());
      if (c !== 0) return c;
      return (a.employeeCode || '').toString().localeCompare((b.employeeCode || '').toString());
    });

    var written = writePayrollSheet(ss, year, month, rows);
    return { success: true, rows: rows, warnings: warnings, written: written.count };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// Builds one output row (array aligned to the live sheet's header order) from a row object
// keyed by the canonical PAYROLL_COL_MATCHERS keys.
function buildPayrollRowArray(headers, colIdx, r) {
  var arr = new Array(headers.length).fill('');
  Object.keys(colIdx).forEach(function (key) {
    var idx = colIdx[key];
    if (idx === -1) return;
    var v = r[key];
    arr[idx] = (v === undefined || v === null) ? '' : v;
  });
  return arr;
}

function writePayrollSheet(ss, year, month, rows) {
  var sheet = ss.getSheetByName('Payroll');
  if (!sheet) sheet = ss.insertSheet('Payroll');

  var found = findPayrollHeaderRow(sheet);
  var headers, headerRowIdx;
  if (found.index === -1) {
    headerRowIdx = 0;
    sheet.getRange(1, 1, 1, PAYROLL_HEADERS.length).setValues([PAYROLL_HEADERS]);
    sheet.getRange(1, 1, 1, PAYROLL_HEADERS.length).setFontWeight('bold');
    headers = PAYROLL_HEADERS;
  } else {
    headerRowIdx = found.index;
    headers = found.headers;
  }

  var colIdx = {};
  Object.keys(PAYROLL_COL_MATCHERS).forEach(function (key) {
    colIdx[key] = headers.findIndex(function (h) { return PAYROLL_COL_MATCHERS[key](normalizePayrollHeader(h)); });
  });

  // Preserve any manually-entered "Additional Salary" values already on the sheet before we clear it.
  var preservedAdditional = {};
  if (colIdx.employeeCode !== -1 && colIdx.additionalSalary !== -1) {
    var existing = sheet.getDataRange().getValues();
    for (var i = headerRowIdx + 1; i < existing.length; i++) {
      var code = (existing[i][colIdx.employeeCode] || '').toString().trim();
      var addl = existing[i][colIdx.additionalSalary];
      if (code && addl !== '' && addl != null) preservedAdditional[code] = addl;
    }
  }

  // Best-effort: stamp Year / Month label cells sitting above the header row (e.g. a title strip).
  try {
    if (headerRowIdx > 0) {
      var above = sheet.getRange(1, 1, headerRowIdx, sheet.getMaxColumns()).getValues();
      for (var r2 = 0; r2 < above.length; r2++) {
        for (var c2 = 0; c2 < above[r2].length; c2++) {
          var cell = (above[r2][c2] || '').toString().trim().toLowerCase();
          if (cell === 'year') sheet.getRange(r2 + 1, c2 + 2).setValue(parseInt(year, 10));
          if (cell === 'month' || cell === 'month name') sheet.getRange(r2 + 1, c2 + 2).setValue(month);
        }
      }
    }
  } catch (e) { /* title layout differs - not fatal */ }

  // Clear old data rows (Payroll holds one month's live snapshot, regenerating replaces it).
  var lastRow = sheet.getLastRow();
  if (lastRow > headerRowIdx + 1) {
    sheet.getRange(headerRowIdx + 2, 1, lastRow - headerRowIdx - 1, headers.length).clearContent();
  }

  // Build employee rows + per-company subtotal rows + a grand-total row.
  var output = [];
  var groups = {};
  var groupOrder = [];
  rows.forEach(function (r) {
    var key = (r.company || 'Unassigned').toString();
    if (!groups[key]) { groups[key] = []; groupOrder.push(key); }
    groups[key].push(r);
  });

  var grandTotal = {};
  PAYROLL_SUMMARY_COLS.forEach(function (k) { grandTotal[k] = 0; });

  groupOrder.forEach(function (company) {
    var groupRows = groups[company];
    var subtotal = {};
    PAYROLL_SUMMARY_COLS.forEach(function (k) { subtotal[k] = 0; });

    groupRows.forEach(function (r) {
      if (preservedAdditional[r.employeeCode] !== undefined) r.additionalSalary = preservedAdditional[r.employeeCode];
      output.push(buildPayrollRowArray(headers, colIdx, r));
      PAYROLL_SUMMARY_COLS.forEach(function (k) {
        var v = typeof r[k] === 'number' ? r[k] : 0;
        subtotal[k] += v;
        grandTotal[k] += v;
      });
    });

    var subtotalRow = { employeeName: company + ' Total' };
    PAYROLL_SUMMARY_COLS.forEach(function (k) { subtotalRow[k] = subtotal[k]; });
    output.push(buildPayrollRowArray(headers, colIdx, subtotalRow));
  });

  var grandRow = { employeeName: 'Grand Total' };
  PAYROLL_SUMMARY_COLS.forEach(function (k) { grandRow[k] = grandTotal[k]; });
  output.push(buildPayrollRowArray(headers, colIdx, grandRow));

  if (output.length) {
    sheet.getRange(headerRowIdx + 2, 1, output.length, headers.length).setValues(output);
  }

  return { count: rows.length };
}

function getPayrollRows(ss) {
  var sheet = ss.getSheetByName('Payroll');
  if (!sheet) return [];
  var found = findPayrollHeaderRow(sheet);
  if (found.index === -1) return [];
  var headers = found.headers;
  var data = sheet.getDataRange().getValues();

  var colIdx = {};
  Object.keys(PAYROLL_COL_MATCHERS).forEach(function (key) {
    colIdx[key] = headers.findIndex(function (h) { return PAYROLL_COL_MATCHERS[key](normalizePayrollHeader(h)); });
  });
  if (colIdx.employeeCode === -1) return [];

  var results = [];
  for (var i = found.index + 1; i < data.length; i++) {
    var code = (data[i][colIdx.employeeCode] || '').toString().trim();
    if (!code) continue; // skip subtotal / grand-total rows
    var row = {};
    Object.keys(colIdx).forEach(function (key) {
      var idx = colIdx[key];
      row[key] = idx !== -1 ? data[i][idx] : '';
    });
    row._row = i + 1;
    results.push(row);
  }
  return results;
}
