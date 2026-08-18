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
  ]
};

// Helper to find the header row dynamically
function getHeaderInfo(sheet) {
  const data = sheet.getDataRange().getValues();
  const commonHeaders = ['timestamp', 'employee id', 'emp id', 'leave no', 'pm no', 'pmmpl', 'name as per aadhar'];

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
            sheet.getRange(i + 1, colIdx + 1).setValue(payload[key]);
          }
        });
        return { success: true, updated: true };
      }
    }
  }

  // Otherwise, Create New Row
  const newRow = headers.map((header, colIdx) => {
    const key = camelize(header);
    // PROTECT FORMULA COLUMNS: leave empty so GAS/sheet maintains formula if applicable
    if (['planned', 'planned2', 'planned3'].includes(key)) return "";

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
    return val.includes('no.') || val.includes(' no') || val.endsWith('no') || val.includes('unique no') || val.includes('uniqueno');
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
  // 1. Set Actual Time
  if (actualIdx !== -1) sheet.getRange(i + 1, actualIdx + 1).setValue(actual);

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
        sheet.getRange(i + 1, colIdx + 1).setValue(val);
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
