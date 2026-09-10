/**
 * Google Apps Script for FMS Management System - V3 (Auto-Header Detection)
 *
 * Core.gs — spreadsheet access, the doGet/doPost router, and the generic
 * sheet read/write helpers (getData, submitData, updateStep, camelize, etc.)
 * shared by every other file in this project.
 *
 * Apps Script projects share one global scope across all .gs files, so
 * every function/const declared in any file here is callable from any other
 * file with no imports.
 */

function getSs() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    if (ss) return ss;
    throw new Error("No active spreadsheet");
  } catch (e) {
    throw new Error("Spreadsheet not found. Ensure the script is bound to the sheet.");
  }

}

const IMAGE_FOLDER_ID = "1XI0dY2IrEc8y4OaO-KJioW2QLhPJHsmd";

const SHEETS = {
  'Salary Fms': ['Month', 'Year', 'Employee ID', 'Name', 'Gross Salary', 'Total Days', 'Paid Days', 'Leave Taken', 'LWP', 'Deductions', 'Net Salary', 'Slip Generated Date', 'Status'],
  'Salary Increment': [
    'Timestamp', 'Unique No.', 'Employee Code', 'Employee Name', 'Designation', 'Date of Joining',
    'Joining Company Name', 'Joining Salary', 'Current Salary', 'Department', 'Last Increment Amount',
    'Last Increment Date', 'Hod', 'Planned', 'Actual', 'Delay', 'Hod Amount', 'Hod Feedback',
    'Planned2', 'Actual2', 'Delay2', 'Mgmt Amount', 'Mgmt Feedback',
    'Planned3', 'Actual3', 'Delay3', 'Date Of Increment', 'Current Salary', 'Increment Amount',
    'Next Increment (No. Of Month)', 'Note', 'Status', 'Status2', 'Status3'
  ],
  'Loan Application': [
    'Timestamp', 'Loan No.', 'Employee Id', 'Employee Name', 'Designation', 'Work Location',
    'Request Amount', 'Monthly Deduction Amount', 'Reason', 'Company Name',
    'Planned 1', 'Actual 1', 'Delay 1', 'Status 1', 'Approved Amount',
    'Planned 2', 'Actual 2', 'Delay 2', 'Payment Form',
    'Planned 3', 'Actual 3', 'Delay 3', 'Status 2'
  ],
  'Direct Advance': [
    'Timestamp', 'DA Number', 'Employee ID', 'Date', 'Person Name', 'Amount', 'Payment Type', 'Notes',
    'Planned 1', 'Actual 1', 'Delay 1', 'Status1',
    'Planned 2', 'Actual 2', 'Delay 2', 'Status2'
  ]
};

// ── IST date/time formatting ────────────────────────────────────────────────
// Every auto-stamped Timestamp / Actual(1/2/3) column must be saved as a real
// Date value, always displayed as dd/MM/yyyy HH:mm:ss in IST — regardless of
// (a) what shape the frontend sent the value in (ISO string, epoch millis, a
// serialized JS Date, an already-formatted dd/MM/yyyy string, ...), and
// (b) the spreadsheet's own locale/timezone settings, which is what causes
// values to silently shift a day or get mis-parsed as MM/dd instead of dd/MM.
const IST_TIMEZONE = 'Asia/Kolkata';
const IST_DATETIME_FORMAT = 'dd/mm/yyyy hh:mm:ss';

// Cell display for a Date value follows the *spreadsheet's* timezone setting
// (not the script project's), so pin it to IST once per request.
function ensureIstTimeZone(ss) {
  try {
    if (ss.getSpreadsheetTimeZone() !== IST_TIMEZONE) ss.setSpreadsheetTimeZone(IST_TIMEZONE);
  } catch (e) {
    // Insufficient permission or already set elsewhere — non-fatal.
  }
}

function istNow() {
  return new Date();
}

// Parses Date objects, epoch millis, ISO date/datetime strings, and dd/MM/yyyy
// (with optional time) strings into a real Date. Deliberately never routes a
// date-only string through the native `new Date(str)` parser — that parses as
// UTC midnight and can render as the previous day once shown in IST.
function parseIncomingDate(input) {
  if (input === undefined || input === null || input === '') return null;
  if (input instanceof Date) return isNaN(input.getTime()) ? null : input;
  if (typeof input === 'number') {
    const d = new Date(input);
    return isNaN(d.getTime()) ? null : d;
  }

  const str = input.toString().trim();
  if (!str) return null;

  // ISO: yyyy-MM-dd or yyyy-MM-ddTHH:mm:ss(.sss)(Z|+hh:mm)
  let m = str.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?/);
  if (m) {
    return new Date(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0), +(m[6] || 0));
  }

  // dd/MM/yyyy or dd/MM/yyyy HH:mm:ss (our own display format, or manual re-entry)
  m = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[ ,]+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (m) {
    return new Date(+m[3], +m[2] - 1, +m[1], +(m[4] || 0), +(m[5] || 0), +(m[6] || 0));
  }

  // Last resort — covers things like Date.toString() output or a locale
  // string such as "9/10/2026, 3:07:25 pm".
  const fallback = new Date(str);
  return isNaN(fallback.getTime()) ? null : fallback;
}

// Returns the dd/MM/yyyy HH:mm:ss IST display string for any supported input.
function formatIstDateTime(input) {
  const d = parseIncomingDate(input);
  if (!d) return (input === undefined || input === null) ? '' : input;
  return Utilities.formatDate(d, IST_TIMEZONE, 'dd/MM/yyyy HH:mm:ss');
}

// Writes a real Date value into `range` (defaulting to now) and pins its
// display format, so Sheets never re-interprets it via its own locale.
function setIstDateTimeValue(range, input) {
  const d = parseIncomingDate(input) || istNow();
  range.setValue(d);
  range.setNumberFormat(IST_DATETIME_FORMAT);
}

// Timestamp / Actual / Actual1 / Actual2 / Actual3 — the auto-stamped columns
// this project writes a "moment" into (as opposed to a user-picked plain date
// like DOB or Next Call Date, which are left untouched).
function isAutoStampKey(key) {
  return key === 'timestamp' || /^actual[123]?$/.test(key);
}

// Helper to find the header row dynamically
function getHeaderInfo(sheet) {
  const data = sheet.getDataRange().getValues();
  const commonHeaders = ['timestamp', 'employee id', 'emp id', 'employee code', 'emp code', 'leave no', 'pm no', 'pmmpl', 'name as per aadhar'];

  // "Present Employees" data rows contain cells like "Pmmpl" (company) and "PMMPL-2"
  // (employee code), which false-positive-match the 'pmmpl' keyword below and make
  // the scan mistake an early data row for the header row. Unlike "Joining", this
  // sheet has no title rows above its headers — row 1 (index 0) is the real header
  // row (confirmed via the debugRows diagnostic) — so skip the keyword scan entirely.
  if (sheet.getName() === 'Present Employees') {
    return { index: 0, headers: data[0] };
  }

  for (let i = 0; i < Math.min(20, data.length); i++) {
    // A real header row usually has multiple columns, skip title rows
    const nonEmptyCells = data[i].filter(c => c !== '' && c !== null);
    if (nonEmptyCells.length < 3) continue;

    if (data[i].some(cell => {
      const val = (cell || '').toString().toLowerCase();
      return commonHeaders.some(h => val === h || val.includes(h));
    })) {
      return { index: i, headers: data[i] };
    }
  }

  // Fallback for Joining which has headers on row 7 (index 6)
  if (sheet.getName() === 'Joining' && data.length > 6) {
    return { index: 6, headers: data[6] };
  }

  // Fallback for Direct Advance which has headers on row 6 (index 5)
  if (sheet.getName() === 'Direct Advance' && data.length > 5) {
    return { index: 5, headers: data[5] };
  }

  return { index: 0, headers: data[0] }; // Fallback to first row
}

function doGet(e) {
  return ContentService.createTextOutput("FMS API is running. Time: " + new Date().toLocaleString())
    .setMimeType(ContentService.MimeType.TEXT);
}

function doPost(e) {
  if (!e || !e.postData) {
    return createJsonResponse({ success: false, error: "No postData found" });
  }

  try {
    const request = JSON.parse(e.postData.contents);
    const action = request.action;
    let result = { success: false };

    const ss = getSs();
    ensureIstTimeZone(ss);

    switch (action) {
      case 'test':
        result = { success: true, message: "Connection Successful!", sheets: ss.getSheets().map(s => s.getName()) };
        break;
      case 'login':
        result = login(ss, request.employeeId, request.password);
        break;
      case 'getPunchMiss':
        result = getData(ss, 'Punch Miss Fms', request.employeeId);
        break;
      case 'submitPunchMiss':
        result = submitData(ss, 'Punch Miss Fms', request);
        break;
      case 'getLeaves':
        result = getData(ss, 'Leave Fms', request.employeeId);
        break;
      case 'submitLeave':
        result = submitData(ss, 'Leave Fms', request);
        if (result.success) sendLeaveEmailToHod(ss, request);
        break;
      case 'getHolidayWorking':
        result = getData(ss, 'Holiday Working Fms', request.employeeId);
        break;
      case 'submitHolidayWorking':
        result = submitData(ss, 'Holiday Working Fms', request);
        break;
      case 'getAttendance':
        result = getData(ss, 'Attendance', request.employeeId);
        break;
      case 'getOutsiderAttendance':
        result = getData(ss, 'Outsider Attendance', request.employeeId);
        break;
      case 'submitOutsiderAttendance':
        result = submitOutsiderAttendance(ss, request);
        break;
      case 'updateOutsiderAttendanceHRStatus':
        result = updateOutsiderAttendanceHRStatus(ss, request);
        break;
      case 'getSalaryRecords':
        result = getData(ss, 'Salary Paid Records', request.employeeId);
        break;
      case 'getSalaryIncrements':
        result = getData(ss, 'Salary Increment', request.employeeId);
        break;
      case 'getEmployeeDetails':
        result = getData(ss, "User", request.employeeId);
        break;

      case 'submitSalaryIncrement':
        result = submitData(ss, 'Salary Increment', request);
        break;
      case 'updateStep':
        result = updateStep(ss, request.sheetName, request.rowId, request.step, request.actual, request.status, request.extraFields, request.rowIndex);
        break;

      case 'getJoining':
        result = getData(ss, 'Joining', undefined);
        break;

      case 'submitJoining':
        result = submitJoiningData(ss, request);
        break;

      case 'updateMailId':
        result = updateMailId(ss, request.employeeId, request.mailId);
        break;

      case 'getUsers':
        result = getUsers(ss);
        break;

      case 'addUser':
        result = addUser(ss, request);
        break;

      case 'updateUser':
        result = updateUser(ss, request);
        break;

      case 'deleteUser':
        result = deleteUser(ss, request.employeeId);
        break;

      case 'submitLiving':
        result = submitLivingData(ss, request);
        break;

      case 'getLivingHistory':
        result = getLivingHistory(ss);
        break;

      case 'updateLivingPayment':
        result = updateLivingPayment(ss, request.pmmplAc, request.paymentDate);
        break;

      case 'savePaidLeaveReport':
        result = savePaidLeaveReport(ss, request.rows);
        break;

      case 'getPresentEmployees':
        result = getPresentEmployeesRows(ss);
        break;

      case 'getActualSalaryIncrements':
        result = getActualSalaryIncrements(ss);
        break;

      case 'getHiringTracker':
        result = getHiringTracker(ss);
        break;
      case 'submitHiringTracker':
        result = submitHiringTracker(ss, request);
        break;
      case 'updateHiringTrackerStep':
        result = updateHiringTrackerStep(ss, request);
        break;

      case 'getLoanApplications':
        result = getData(ss, 'Loan Application', request.employeeId);
        break;
      case 'submitLoanApplication':
        result = submitData(ss, 'Loan Application', request);
        break;

      case 'getDirectAdvances':
        result = getData(ss, 'Direct Advance', request.employeeId);
        break;
      case 'submitDirectAdvance':
        request.daNumber = request.daNumber || ("DA-" + new Date().getTime().toString().slice(-6));
        result = submitData(ss, 'Direct Advance', request);
        break;
      case 'getOfferLetters':
        result = getData(ss, 'Offer Letters');
        break;
      case 'submitOfferLetter':
        request.documentLink = generateOfferLetterPDF(request);
        result = submitData(ss, 'Offer Letters', request);
        result.documentLink = request.documentLink; // Pass it back to see what generated
        break;
      case 'submitDocument':
        request.documentLink = generateDocumentPDF(request);
        result = submitData(ss, 'Offer Letters', request);
        result.documentLink = request.documentLink;
        break;
    }
    return createJsonResponse(result);
  } catch (err) {
    return createJsonResponse({ success: false, error: err.message });
  }
}

function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function getData(ss, sheetName, employeeId) {
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];

  const { headers, index } = getHeaderInfo(sheet);
  const data = sheet.getDataRange().getDisplayValues();
  const results = [];

  let empIdIdx = headers.findIndex(h => {
    const val = (h || '').toString().toLowerCase();
    return val.includes('employee id') || val.includes('emp id') || val.includes('employee code') || val.includes('emp code');
  });

  for (let i = index + 1; i < data.length; i++) {
    // Skip fully-blank rows — the sheet's used range can extend past the real
    // data (leftover formatting, deleted rows, etc.), which would otherwise
    // pad the results with empty records.
    if (data[i].every(cell => cell === '' || cell === null)) continue;

    const row = {};
    let currentSalaryCount = 0;
    headers.forEach((header, idx) => {
      let key = camelize(header);
      if (header === "Current Salary" || header === "current salary") {
        currentSalaryCount++;
        if (currentSalaryCount === 2) key = "currentSalaryAfterIncrement";
      }
      row[key] = data[i][idx];
    });

    if (!employeeId || (empIdIdx !== -1 && data[i][empIdIdx].toString() === employeeId.toString())) {
      row._row = i + 1; // Store the 1-based row number for fast updates
      results.push(row);
    }

  }
  return results;
}

function getPresentEmployeesRows(ss) {
  return getData(ss, 'Present Employees', undefined);
}

function submitData(ss, sheetName, payload) {
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    const keys = Object.keys(payload).filter(k => k !== "image" && k !== "medicalCertificate");
    const headers = keys.map(k => k.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()));
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold");
  }

  const { headers, index } = getHeaderInfo(sheet);
  const data = sheet.getDataRange().getValues();

  if (payload.image && payload.image.startsWith("data:image")) {
    const fileName = (payload.name || "Upload") + "_" + new Date().getTime() + ".png";
    payload.image = saveImageToDrive(payload.image, fileName, IMAGE_FOLDER_ID);
  }

  if (payload.medicalCertificate && payload.medicalCertificate.startsWith("data:image")) {
    const fileName = "MedCert_" + (payload.nameOfEmployee || "User") + "_" + new Date().getTime() + ".png";
    const folderId = payload.folderId || "1d45zekLBdo-BcLp2-1fqmDOEZ1ZM-hXx";
    payload.medicalCertificate = saveImageToDrive(payload.medicalCertificate, fileName, folderId);
  }

  // Find Unique No column index
  let idIdx = headers.findIndex(h => (h || '').toString().toLowerCase().includes('unique no') || (h || '').toString().toLowerCase().includes('uniqueno'));
  if (idIdx === -1) idIdx = headers.findIndex(h => (h || '').toString().toLowerCase().includes('no.'));

  // Logic to update existing row if ID exists
  if (idIdx !== -1 && payload.uniqueNo) {
    // Find row by Unique No.
    let uniqueNoIdx = headers.findIndex(h => (h || '').toString().toLowerCase().includes('no.'));
    for (let i = index + 1; i < data.length; i++) {
      if (data[i][uniqueNoIdx].toString() === payload.uniqueNo.toString()) {
        let currentSalaryCount = 0;
        headers.forEach((header, colIdx) => {
          let key = camelize(header);
          if (header === "Current Salary" || header === "current salary") {
            currentSalaryCount++;
            if (currentSalaryCount === 2) key = "currentSalaryAfterIncrement";
          }

          if (['planned', 'planned2', 'planned3'].includes(key)) return;
          if (payload[key] !== undefined) {
            if (isAutoStampKey(key)) {
              setIstDateTimeValue(sheet.getRange(i + 1, colIdx + 1), payload[key]);
            } else {
              sheet.getRange(i + 1, colIdx + 1).setValue(payload[key]);
            }
          }
        });
        return { success: true, updated: true };
      }
    }
  }

  // Otherwise, Create New Row
  const autoStampCols = [];
  const newRow = headers.map((header, colIdx) => {
    const key = camelize(header);
    // PROTECT FORMULA COLUMNS: leave empty so GAS/sheet maintains formula if applicable
    if (['planned', 'planned2', 'planned3'].includes(key)) return "";

    if (isAutoStampKey(key)) {
      const dateVal = key === 'timestamp'
        ? (parseIncomingDate(payload[key]) || istNow())
        : (payload[key] !== undefined ? (parseIncomingDate(payload[key]) || payload[key]) : "");
      if (dateVal instanceof Date) autoStampCols.push(colIdx);
      return dateVal;
    }

    return payload[key] !== undefined ? payload[key] : "";
  });

  if (idIdx !== -1 && !newRow[idIdx]) {
    newRow[idIdx] = sheetName.split(' ')[0].toUpperCase() + "-" + (sheet.getLastRow() + 1);
  }

  // Find first empty row or append
  let targetRow = data.length + 1;
  for (let i = index + 1; i < data.length; i++) {
    const isEmpty = data[i].every(cell => cell === "" || cell === null);
    if (isEmpty) {
      targetRow = i + 1;
      break;
    }
  }

  sheet.getRange(targetRow, 1, 1, newRow.length).setValues([newRow]);
  autoStampCols.forEach(function(colIdx) {
    sheet.getRange(targetRow, colIdx + 1).setNumberFormat(IST_DATETIME_FORMAT);
  });
  return { success: true, added: true };
}

function saveImageToDrive(base64Data, fileName, folderId) {
  try {
    const splitData = base64Data.split("base64,");
    const contentType = splitData[0].split(":")[1].split(";")[0];
    const bytes = Utilities.base64Decode(splitData[1]);
    const blob = Utilities.newBlob(bytes, contentType, fileName);

    const folder = DriveApp.getFolderById(folderId || IMAGE_FOLDER_ID);
    const file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    return file.getUrl();
  } catch (e) {
    return "Error: " + e.message;
  }
}

function updateStep(ss, sheetName, rowId, step, actual, customStatus, extraFields, rowIndex) {

  const sheet = ss.getSheetByName(sheetName);
  const { headers, index } = getHeaderInfo(sheet);
  const data = sheet.getDataRange().getValues();

  let idIdx = headers.findIndex(h => {
    const val = (h || '').toString().toLowerCase();
    return val.includes('no.') || val.includes(' no') || val.endsWith('no') || val.includes('unique no') || val.includes('uniqueno') || val.endsWith('number');
  });


  if (idIdx === -1) return { success: false, error: "ID column not found" };

  // Use camelize for more robust header matching (matches 'Actual 1' as 'actual1')
  let actualIdx = headers.findIndex(h => camelize(h) === 'actual' + step);
  if (actualIdx === -1) actualIdx = headers.findIndex(h => camelize(h) === 'actual');

  let statusIdx = headers.findIndex(h => camelize(h) === 'status' + step);
  if (statusIdx === -1) statusIdx = headers.findIndex(h => camelize(h) === 'status');

  // High-speed update using rowIndex if available
  if (rowIndex && rowIndex > 0 && rowIndex <= data.length) {
    const rIdx = rowIndex - 1;
    if (data[rIdx][idIdx] && data[rIdx][idIdx].toString().trim() === rowId.toString().trim()) {
      applyUpdates(sheet, rIdx, actualIdx, statusIdx, actual, customStatus, step, extraFields, headers);
      return { success: true };
    }
  }

  // Fallback slow search if rowIndex fails or is missing
  for (let i = index + 1; i < data.length; i++) {
    if (data[i][idIdx] && data[i][idIdx].toString().trim() === rowId.toString().trim()) {
      applyUpdates(sheet, i, actualIdx, statusIdx, actual, customStatus, step, extraFields, headers);
      return { success: true };
    }
  }
  return { success: false, error: "Row not found" };
}

function applyUpdates(sheet, i, actualIdx, statusIdx, actual, customStatus, step, extraFields, headers) {
  // 1. Set Actual Time — always a real Date, displayed dd/MM/yyyy HH:mm:ss IST.
  // Falls back to the server's current time if `actual` is missing/unparsable.
  if (actualIdx !== -1) setIstDateTimeValue(sheet.getRange(i + 1, actualIdx + 1), actual);

  // 2. Set Status
  const defaultStatus = (step === 1) ? 'HOD Approved' : 'Work Done';
  const finalStatus = customStatus || defaultStatus;
  if (statusIdx !== -1) sheet.getRange(i + 1, statusIdx + 1).setValue(finalStatus);

  // 3. Set Extra Fields
  if (extraFields && typeof extraFields === 'object') {
    for (let key in extraFields) {
      const val = extraFields[key];
      const colIdx = headers.findIndex(h => camelize(h) === key);
      if (colIdx !== -1) {
        if (isAutoStampKey(key)) {
          setIstDateTimeValue(sheet.getRange(i + 1, colIdx + 1), val);
        } else {
          sheet.getRange(i + 1, colIdx + 1).setValue(val);
        }
      }
    }
  }
}

function camelize(str) {
  return (str || '').toString().toLowerCase()
    .replace(/>=/g, 'ge')
    .replace(/<=/g, 'le')
    .replace(/</g, 'lt')
    .replace(/>/g, 'gt')
    .replace(/4-8/g, 'fourToEight')
    .replace(/[^a-zA-Z0-9]+(.)/g, (m, chr) => chr.toUpperCase())
    .replace(/[^a-zA-Z0-9]/g, '');
}
