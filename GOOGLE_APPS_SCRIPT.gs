""""""""""""""""""""/**
 * Google Apps Script for FMS Management System - V3 (Auto-Header Detection)
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
  const commonHeaders = ['timestamp', 'year', 'employee id', 'emp id', 'leave no', 'pm no', 'pmmpl', 'name as per aadhar', 'joining'];
  for (let i = 0; i < data.length; i++) {
    if (data[i].some(cell => {
      const val = cell.toString().toLowerCase();
      return commonHeaders.some(h => val.includes(h));
    })) {
      return { index: i, headers: data[i] };
    }
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
        result = getData(ss, 'Present Employees', undefined);
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
      case 'getPresentEmployees':
        result = getData(ss, 'Present Employees');
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

function login(ss, employeeId, password) {
  const sheet = ss.getSheetByName('User');
  if (!sheet) return { success: false, error: "User sheet not found" };
  const { headers, index } = getHeaderInfo(sheet);
  const data = sheet.getDataRange().getDisplayValues();
  
  const empIdCol = headers.findIndex(h => h.toLowerCase().includes('employee id') || h.toLowerCase().includes('emp id'));
  const passCol = headers.findIndex(h => h.toLowerCase().includes('password'));

  for (let i = index + 1; i < data.length; i++) {
    if (data[i][empIdCol].toString() === employeeId.toString() && data[i][passCol].toString() === password.toString()) {
      const row = {};
      headers.forEach((h, idx) => {
        const key = camelize(h);
        row[key] = data[i][idx];
      });
      const hodCol = headers.findIndex(h => h.toLowerCase() === 'hod');
      const isActuallyAnHod = data.some((r, idx) => idx > index && r[hodCol] === employeeId.toString());
      let finalRole = row.role || "Staf";
      if (isActuallyAnHod && finalRole !== "Admin") {
        finalRole = "HOD";
      }

      return {
        success: true,
        user: {
          employeeId: data[i][empIdCol],
          name: row.name || "",
          designation: row.designation || "",
          companyName: row.companyName || "",
          role: finalRole,
          cl: parseFloat(row.cl) || 0,
          el: parseFloat(row.el) || 0,
          ml: parseFloat(row.ml) || 0,
          hod: row.hod || "",
          mailId: row.mailId || ""
        }
      };

    }
  }
  return { success: false, error: "Invalid credentials" };
}

function updateMailId(ss, employeeId, mailId) {
  try {
    const sheet = ss.getSheetByName('User');
    if (!sheet) return { success: false, error: "User sheet not found" };
    const { headers, index } = getHeaderInfo(sheet);
    const data = sheet.getDataRange().getValues();
    const empIdCol = headers.findIndex(h => h.toLowerCase().includes('employee id') || h.toLowerCase().includes('emp id'));
    const mailCol = headers.findIndex(h => h.toLowerCase().includes('mail id') || h.toLowerCase().includes('mailid') || h.toLowerCase().includes('email'));
    if (empIdCol === -1) return { success: false, error: "Employee ID column not found" };
    if (mailCol === -1) return { success: false, error: "Mail Id column not found" };
    for (let i = index + 1; i < data.length; i++) {
      if (data[i][empIdCol].toString() === employeeId.toString()) {
        sheet.getRange(i + 1, mailCol + 1).setValue(mailId);
        return { success: true };
      }
    }
    return { success: false, error: "Employee not found" };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

function getData(ss, sheetName, employeeId) {
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];
  
  const { headers, index } = getHeaderInfo(sheet);
  const data = sheet.getDataRange().getDisplayValues();
  const results = [];
  
  let empIdIdx = headers.findIndex(h => {
    const val = h.toLowerCase();
    return val.includes('employee id') || val.includes('emp id') || val.includes('employee code') || val.includes('emp code');
  });
  
  for (let i = index + 1; i < data.length; i++) {
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
  let idIdx = headers.findIndex(h => h.toLowerCase().includes('unique no') || h.toLowerCase().includes('uniqueno'));
  if (idIdx === -1) idIdx = headers.findIndex(h => h.toLowerCase().includes('no.'));

  // Logic to update existing row if ID exists
  if (idIdx !== -1 && payload.uniqueNo) {
    // Find row by Unique No.
    let uniqueNoIdx = headers.findIndex(h => h.toLowerCase().includes('no.'));
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
    const val = h.toLowerCase();
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


// ── HOD Email Notification ─────────────────────────────────────────────────

function sendLeaveEmailToHod(ss, leavePayload) {
  try {
    var userSheet = ss.getSheetByName('User');
    if (!userSheet) return;

    var info    = getHeaderInfo(userSheet);
    var headers = info.headers;
    var index   = info.index;
    var data    = userSheet.getDataRange().getDisplayValues();

    var empIdIdx = headers.findIndex(function(h) {
      return h.toLowerCase().includes('employee id') || h.toLowerCase().includes('emp id');
    });
    var hodIdx  = headers.findIndex(function(h) { return h.toLowerCase() === 'hod'; });
    var mailIdx = headers.findIndex(function(h) { return h.toLowerCase().includes('mail'); });
    var nameIdx = headers.findIndex(function(h) { return h.toLowerCase() === 'name'; });

    if (empIdIdx === -1 || hodIdx === -1 || mailIdx === -1) return;

    // Find employee row → get their HOD employee ID
    var employeeId = leavePayload.employeeIdCode || leavePayload.employeeId || '';
    var hodEmpId   = '';
    var empName    = leavePayload.nameOfEmployee || employeeId;

    for (var i = index + 1; i < data.length; i++) {
      if (data[i][empIdIdx].toString() === employeeId.toString()) {
        hodEmpId = data[i][hodIdx].toString();
        break;
      }
    }
    if (!hodEmpId) return;

    // Find HOD row → get their email
    var hodEmail = '';
    var hodName  = 'HOD';
    for (var j = index + 1; j < data.length; j++) {
      if (data[j][empIdIdx].toString() === hodEmpId) {
        hodEmail = data[j][mailIdx].toString().trim();
        if (nameIdx !== -1) hodName = data[j][nameIdx].toString();
        break;
      }
    }
    if (!hodEmail) return;

    // Build and send the email
    var subject = '[Leave Request] ' + empName + ' (' + employeeId + ') – ' + leavePayload.typeOfLeave;
    var body =
      'Dear ' + hodName + ',\n\n' +
      'A leave request has been submitted and requires your approval.\n\n' +
      '───────────────────────────\n' +
      'Employee  : ' + empName + ' (' + employeeId + ')\n' +
      'Leave Type: ' + leavePayload.typeOfLeave + '\n' +
      'From      : ' + leavePayload.dateRequestedFrom + '\n' +
      'To        : ' + leavePayload.dateRequestedTo + '\n' +
      'Days      : ' + leavePayload.noOfDays + '\n' +
      'Reason    : ' + (leavePayload.reasonForRequestedLeave || '—') + '\n' +
      '───────────────────────────\n\n' +
      'Please login to the HR Portal to Approve or Reject this request.\n\n' +
      'Regards,\n';

    MailApp.sendEmail(hodEmail, subject, body);
  } catch (e) {
    // Email is non-critical – log but don't break the leave submission
    Logger.log('Leave email error: ' + e.message);
  }
}

// ── Joining Sheet ──────────────────────────────────────────────────────────
// Header is in row 7 of the "Joining" sheet.
// We override getHeaderInfo for this sheet by searching from row 6 (0-indexed)
// so the generic Timestamp-search in getHeaderInfo still finds it correctly.

function getJoiningData(ss) {
  const sheet = ss.getSheetByName('Joining');
  if (!sheet) return [];

  const HEADER_ROW = 7; // 1-based
  const data = sheet.getDataRange().getDisplayValues();
  const headers = data[HEADER_ROW - 1]; // 0-based index = 6
  const results = [];

  for (let i = HEADER_ROW; i < data.length; i++) {
    const row = data[i];
    // Skip completely empty rows
    if (row.every(cell => cell === '' || cell === null)) continue;
    const obj = {};
    headers.forEach((h, idx) => {
      const key = camelize(h);
      if (key) obj[key] = row[idx];
    });
    obj['_row'] = i + 1;
    results.push(obj);
  }
  return results;
}

function submitJoiningData(ss, payload) {
  const sheet = ss.getSheetByName('Joining');
  if (!sheet) return { success: false, error: 'Joining sheet not found' };

  const { headers, index } = getHeaderInfo(sheet);
  const data = sheet.getDataRange().getValues();

  // Handle image / document uploads to Drive
  const imageKeys = [
    'aadharFrontsidePhoto', 'panCard', 'candidateSPhoto',
    'photoOfFrontBankPassbook', 'qualicationPhoto',
    'salarySlip', 'resumeCopy', 'relievingExperienceLetter'
  ];
  imageKeys.forEach(function(k) {
    if (payload[k] && payload[k].startsWith('data:')) {
      const fileName = k + '_' + (payload.nameAsPerAadhar || 'Upload') + '_' + new Date().getTime();
      payload[k] = saveImageToDrive(payload[k], fileName, IMAGE_FOLDER_ID);
    }
  });

  // Build new row aligned to headers
  const newRow = headers.map(function(h) {
    const key = camelize(h);
    if (key === 'timestamp') return payload.timestamp || new Date().toLocaleString();
    return payload[key] !== undefined ? payload[key] : '';
  });

  // Find first empty row after header or append
  let targetRow = data.length + 1;
  for (let i = index + 1; i < data.length; i++) {
    if (data[i].every(function(c) { return c === '' || c === null; })) {
      targetRow = i + 1;
      break;
    }
  }

  sheet.getRange(targetRow, 1, 1, newRow.length).setValues([newRow]);
  return { success: true, added: true };
}

// ── Living Sheet ───────────────────────────────────────────────────────────

// Living data lives in the Joining sheet itself as extra columns.
// submitLivingData: finds the employee row by PMMPL-AC and updates the Living columns.
// getLivingHistory: reads Joining sheet, returns only rows where dateOfLiving is filled.

function submitLivingData(ss, payload) {
  const sheet = ss.getSheetByName('Joining');
  if (!sheet) return { success: false, error: 'Joining sheet not found' };

  const { headers, index } = getHeaderInfo(sheet);
  const data = sheet.getDataRange().getValues();

  // Find PMMPL-AC column
  const pmmplIdx = headers.findIndex(function(h) {
    return h.toString().toLowerCase().includes('pmmpl');
  });
  if (pmmplIdx === -1) return { success: false, error: 'PMMPL-AC column not found in Joining sheet' };

  // Find the employee row
  let targetRowIdx = -1;
  for (let i = index + 1; i < data.length; i++) {
    if (data[i][pmmplIdx] && data[i][pmmplIdx].toString().trim() === payload.pmmplAc.toString().trim()) {
      targetRowIdx = i;
      break;
    }
  }
  if (targetRowIdx === -1) return { success: false, error: 'Employee ' + payload.pmmplAc + ' not found in Joining sheet' };

  // Map each column header to the correct payload value using keyword matching.
  // This handles long header names like "Handover Of Assets , Id Card , Visiting Card".
  headers.forEach(function(h, colIdx) {
    const kl = h.toString().toLowerCase();
    let val = undefined;

    if (kl.includes('date') && kl.includes('living')) {
      val = payload.dateOfLiving;
    } else if (kl.includes('total') && kl.includes('working')) {
      val = payload.totalWorkingDays;
    } else if (kl === 'amount' || (kl.includes('amount') && !kl.includes('increment'))) {
      val = payload.amount;
    } else if (kl === 'planned1' || kl === 'planned 1') {
      val = payload.dateOfLiving;                      // planned payment = date of living
    } else if (kl.includes('actual') && !kl.includes('1')) {
      val = payload.actual;                            // auto-timestamp
    } else if (kl.includes('asset') || (kl.includes('handover') && (kl.includes('id card') || kl.includes('visiting')))) {
      val = payload.handoverAssets;
    } else if (kl.includes('clearance') && !kl.includes('document') && !kl.includes('signed')) {
      val = payload.clearanceForm;
    } else if ((kl.includes('handover') && kl.includes('document')) || (kl.includes('document') && kl.includes('sign'))) {
      val = payload.handoverDocSigned;
    } else if (kl.includes('biometric') || kl.includes('whatsapp') || (kl.includes('cancel') && kl.includes('email'))) {
      val = payload.cancelEmailBiometric;
    } else if (kl.includes('benefit') || kl.includes('enrollment')) {
      val = payload.removeBenefitEnrollment;
    }

    if (val !== undefined) {
      sheet.getRange(targetRowIdx + 1, colIdx + 1).setValue(val);
    }
  });

  return { success: true, updated: true };
}

function getLivingHistory(ss) {
  const sheet = ss.getSheetByName('Joining');
  if (!sheet) return [];

  // Single sheet read (avoids the extra getValues() call inside getHeaderInfo)
  const data = sheet.getDataRange().getDisplayValues();
  const commonHeaders = ['timestamp', 'year', 'employee id', 'emp id', 'leave no', 'pm no', 'pmmpl', 'name as per aadhar', 'joining'];
  let index = 0;
  let headers = data[0] || [];
  for (let r = 0; r < data.length; r++) {
    if (data[r].some(function(cell) {
      const val = cell.toString().toLowerCase();
      return commonHeaders.some(function(h) { return val.includes(h); });
    })) {
      index = r;
      headers = data[r];
      break;
    }
  }

  // Find the dateOfLiving column index
  const dateOfLivingIdx = headers.findIndex(function(h) {
    const kl = h.toString().toLowerCase();
    return kl.includes('date') && kl.includes('living');
  });
  if (dateOfLivingIdx === -1) return [];

  const results = [];
  for (let i = index + 1; i < data.length; i++) {
    const dateVal = data[i][dateOfLivingIdx];
    if (!dateVal || dateVal.toString().trim() === '') continue;

    // Build row with standard camelized keys
    const row = {};
    headers.forEach(function(h, idx) {
      row[camelize(h.toString())] = data[i][idx];
    });

    // Normalize Living-specific keys using same fuzzy logic as submitLivingData
    // so the frontend always receives predictable short keys
    headers.forEach(function(h, idx) {
      const kl = h.toString().toLowerCase();
      const val = data[i][idx];
      if (kl.includes('date') && kl.includes('living')) {
        row.dateOfLiving = val;
      } else if (kl.includes('total') && kl.includes('working')) {
        row.totalWorkingDays = val;
      } else if (kl === 'amount' || (kl.includes('amount') && !kl.includes('increment'))) {
        row.amount = val;
      } else if (kl === 'planned1' || kl === 'planned 1') {
        row.planned1 = val;
      } else if (kl === 'actual1' || kl === 'actual 1') {
        row.actual1 = val;
      } else if (kl.includes('make payment') || kl.includes('payment form')) {
        row.makePaymentForm = val;
      } else if (kl.includes('asset') || (kl.includes('handover') && (kl.includes('id card') || kl.includes('visiting')))) {
        row.handoverAssets = val;
      } else if (kl.includes('clearance') && !kl.includes('document') && !kl.includes('signed')) {
        row.clearanceForm = val;
      } else if ((kl.includes('handover') && kl.includes('document')) || (kl.includes('document') && kl.includes('sign'))) {
        row.handoverDocSigned = val;
      } else if (kl.includes('biometric') || kl.includes('whatsapp') || (kl.includes('cancel') && kl.includes('email'))) {
        row.cancelEmailBiometric = val;
      } else if (kl.includes('benefit') || kl.includes('enrollment')) {
        row.removeBenefitEnrollment = val;
      }
    });

    row._row = i + 1;
    results.push(row);
  }
  return results;
}

// ── Living Salary Payment Step ────────────────────────────────────────────

function updateLivingPayment(ss, pmmplAc, paymentDate) {
  const sheet = ss.getSheetByName('Joining');
  if (!sheet) return { success: false, error: 'Joining sheet not found' };

  const { headers, index } = getHeaderInfo(sheet);
  const data = sheet.getDataRange().getValues();

  const pmmplIdx = headers.findIndex(function(h) {
    return h.toString().toLowerCase().includes('pmmpl');
  });
  if (pmmplIdx === -1) return { success: false, error: 'PMMPL-AC column not found' };

  let targetRowIdx = -1;
  for (let i = index + 1; i < data.length; i++) {
    if (data[i][pmmplIdx] && data[i][pmmplIdx].toString().trim() === pmmplAc.toString().trim()) {
      targetRowIdx = i;
      break;
    }
  }
  if (targetRowIdx === -1) return { success: false, error: 'Employee ' + pmmplAc + ' not found' };

  const actual = paymentDate || new Date().toLocaleDateString('en-IN');

  // Only write to Actual1 column — nothing else
  const actual1Idx = headers.findIndex(function(h) {
    const kl = h.toString().toLowerCase();
    return kl === 'actual1' || kl === 'actual 1';
  });
  if (actual1Idx === -1) return { success: false, error: 'Actual1 column not found in Joining sheet' };

  sheet.getRange(targetRowIdx + 1, actual1Idx + 1).setValue(actual);

  return { success: true, updated: true };
}

// ── Paid Leave Passbook ────────────────────────────────────────────────────

function savePaidLeaveReport(ss, rows) {
  try {
    var sheet = ss.getSheetByName('Paid Leave');
    if (!sheet) return { success: false, error: "'Paid Leave' sheet not found. Please create it in Google Sheets first." };

    var HEADERS = [
      'Timestamp', 'Employee ID', 'Employee Name', 'Department',
      'Month', 'Year',
      'EL Opening', 'EL Credit', 'EL Availed', 'EL Closing',
      'CL Opening', 'CL Credit', 'CL Availed', 'CL Closing',
      'Total Leave Balance'
    ];

    // Detect or create header row
    var allData = sheet.getDataRange().getValues();
    var headerRowIdx = -1;
    for (var i = 0; i < Math.min(allData.length, 5); i++) {
      if (allData[i].some(function(c) { return c.toString().toLowerCase().includes('employee id'); })) {
        headerRowIdx = i;
        break;
      }
    }
    if (headerRowIdx === -1) {
      sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
      headerRowIdx = 0;
    }

    // Re-read after possible header write
    var data = sheet.getDataRange().getValues();
    var headers = data[headerRowIdx];

    var empIdIdx = headers.findIndex(function(h) { return h.toString().toLowerCase().includes('employee id'); });
    var monthIdx  = headers.findIndex(function(h) { return h.toString().toLowerCase() === 'month'; });
    var yearIdx   = headers.findIndex(function(h) { return h.toString().toLowerCase() === 'year'; });

    var timestamp = new Date().toLocaleString();
    var added = 0, updated = 0;

    (rows || []).forEach(function(row) {
      var newValues = [
        timestamp,
        row.employeeId    || '',
        row.employeeName  || '',
        row.department    || '',
        row.month         || '',
        row.year          || '',
        row.elOpening     != null ? row.elOpening    : '',
        row.elCredit      != null ? row.elCredit     : '',
        row.elAvailed     != null ? row.elAvailed    : '',
        row.elClosing     != null ? row.elClosing    : '',
        row.clOpening     != null ? row.clOpening    : '',
        row.clCredit      != null ? row.clCredit     : '',
        row.clAvailed     != null ? row.clAvailed    : '',
        row.clClosing     != null ? row.clClosing    : '',
        row.totalLeaveBalance != null ? row.totalLeaveBalance : ''
      ];

      // Check for existing row (same Employee ID + Month + Year)
      var existingIdx = -1;
      for (var i = headerRowIdx + 1; i < data.length; i++) {
        if (
          data[i][empIdIdx] != null && data[i][empIdIdx].toString().trim() === (row.employeeId || '').toString().trim() &&
          data[i][monthIdx]  != null && data[i][monthIdx].toString().trim()  === (row.month    || '').toString().trim() &&
          data[i][yearIdx]   != null && data[i][yearIdx].toString().trim()   === (row.year     || '').toString().trim()
        ) {
          existingIdx = i;
          break;
        }
      }

      if (existingIdx !== -1) {
        sheet.getRange(existingIdx + 1, 1, 1, newValues.length).setValues([newValues]);
        updated++;
      } else {
        sheet.getRange(sheet.getLastRow() + 1, 1, 1, newValues.length).setValues([newValues]);
        added++;
      }
    });

    return { success: true, added: added, updated: updated };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

function camelize(str) {
  return str.toLowerCase()
    .replace(/>=/g, 'ge')
    .replace(/<=/g, 'le')
    .replace(/</g, 'lt')
    .replace(/>/g, 'gt')
    .replace(/4-8/g, 'fourToEight')
    .replace(/[^a-zA-Z0-9]+(.)/g, (m, chr) => chr.toUpperCase())
    .replace(/[^a-zA-Z0-9]/g, '');
}

// ── Actual Salary Increment Sheet ─────────────────────────────────────────
// Reads ALL rows from "Actual Salary Increment" sheet.
// Columns: Timestamp | Employee ID | Date Of Increment | Current Salary |
//          Increment Amount | Note | Next Increment (No. Of Month) | Name

function getActualSalaryIncrements(ss) {
  var sheet = ss.getSheetByName('Actual Salary Increment');
  if (!sheet) return [];

  var data = sheet.getDataRange().getDisplayValues();
  if (data.length < 2) return [];

  // Row 1 is always the header for this sheet
  var headers = data[0];
  var results = [];

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    // Skip completely empty rows
    if (row.every(function(c) { return c === '' || c === null; })) continue;

    var obj = {};
    headers.forEach(function(h, idx) {
      obj[camelize(h.toString())] = row[idx];
    });

    // Always expose predictable short keys regardless of header capitalisation
    obj.timestamp            = row[headers.findIndex(function(h) { return h.toString().toLowerCase().includes('timestamp'); })] || '';
    obj.employeeId           = row[headers.findIndex(function(h) { var l = h.toString().toLowerCase(); return l.includes('employee id') || l.includes('emp id'); })] || '';
    obj.dateOfIncrement      = row[headers.findIndex(function(h) { var l = h.toString().toLowerCase(); return l.includes('date') && l.includes('increment'); })] || '';
    obj.currentSalary        = row[headers.findIndex(function(h) { var l = h.toString().toLowerCase(); return l.includes('current salary'); })] || '';
    obj.incrementAmount      = row[headers.findIndex(function(h) { var l = h.toString().toLowerCase(); return l.includes('increment amount'); })] || '';
    obj.note                 = row[headers.findIndex(function(h) { return h.toString().toLowerCase() === 'note'; })] || '';
    obj.nextIncrementNoOfMonth = row[headers.findIndex(function(h) { var l = h.toString().toLowerCase(); return l.includes('next increment'); })] || '';
    obj.name                 = row[headers.findIndex(function(h) { return h.toString().toLowerCase() === 'name'; })] || '';
    obj._row                 = i + 1;

    results.push(obj);
  }
  return results;
}

// ── Hiring Tracker ─────────────────────────────────────────────────────────

function getHiringTracker(ss) {
  var sheet = ss.getSheetByName('Hiring Tracker');
  if (!sheet) return [];
  var data = sheet.getDataRange().getDisplayValues();
  
  var headerRowIdx = -1;
  for (var i = 0; i < data.length; i++) {
    if (data[i].some(function(cell) { return cell.toString().toLowerCase().includes('indent number'); })) {
      headerRowIdx = i;
      break;
    }
  }
  
  if (headerRowIdx === -1) return [];
  
  var headers = data[headerRowIdx];
  var results = [];
  
  for (var i = headerRowIdx + 1; i < data.length; i++) {
    var row = data[i];
    if (row.every(function(c) { return c === '' || c === null; })) continue;
    
    var obj = {};
    headers.forEach(function(h, idx) {
      if (!h) return;
      var key = camelize(h.toString());
      obj[key] = row[idx];
    });
    
    var getCol = function(nameStr) {
      var idx = headers.findIndex(function(h) { return h.toString().toLowerCase() === nameStr.toLowerCase(); });
      return idx !== -1 ? row[idx] : '';
    };
    
    obj.timestamp = getCol('Timestamp');
    obj.indentNumber = getCol('Indent Number');
    obj.company = getCol('Company');
    obj.post = getCol('Post');
    obj.gender = getCol('Gender');
    obj.prefer = getCol('Prefer');
    obj.numberOfEnquiryNeed = getCol('Number Of Enquiry Need') || getCol('Number Of Enquiry Need ');
    obj.positionFullFillDate = getCol('Position Full-Fill Date');
    obj.department = getCol('Department');
    obj.experience = getCol('Experience');
    
    var plannedCols = [], actualCols = [], delayCols = [];
    headers.forEach(function(h, idx) {
      var lowered = h.toString().toLowerCase().trim();
      if (lowered.includes('planned')) plannedCols.push(idx);
      if (lowered.includes('actual')) actualCols.push(idx);
      if (lowered.includes('delay')) delayCols.push(idx);
    });
    
    obj.planned1 = plannedCols[0] !== undefined ? row[plannedCols[0]] : '';
    obj.actual1 = actualCols[0] !== undefined ? row[actualCols[0]] : '';
    obj.delay1 = delayCols[0] !== undefined ? row[delayCols[0]] : '';
    obj.socialSitePost = getCol('Social Site Post');
    obj.which = getCol('Which');
    
    obj.planned2 = plannedCols[1] !== undefined ? row[plannedCols[1]] : '';
    obj.actual2 = actualCols[1] !== undefined ? row[actualCols[1]] : '';
    obj.delay2 = delayCols[1] !== undefined ? row[delayCols[1]] : '';
    obj.whatDidTheCandidateSays = getCol('What Did The Candidate Says');
    obj.followUpHistory = getCol('Follow Up History');
    obj.trackerStatus = getCol('Tracker Status');
    obj.nextCallDate = getCol('Next Call Date');
    
    obj.planned3 = plannedCols[2] !== undefined ? row[plannedCols[2]] : '';
    obj.actual3 = actualCols[2] !== undefined ? row[actualCols[2]] : '';
    obj.delay3 = delayCols[2] !== undefined ? row[delayCols[2]] : '';
    obj.interviewStatus = getCol('Interview Status');
    
    obj._row = i + 1;
    results.push(obj);
  }
  return results;
}

function submitHiringTracker(ss, payload) {
  var sheet = ss.getSheetByName('Hiring Tracker');
  if (!sheet) return { success: false, error: 'Hiring Tracker sheet not found' };
  
  var data = sheet.getDataRange().getDisplayValues();
  var headerRowIdx = -1;
  for (var i = 0; i < data.length; i++) {
    if (data[i].some(function(cell) { return cell.toString().toLowerCase().includes('indent number'); })) {
      headerRowIdx = i;
      break;
    }
  }
  
  if (headerRowIdx === -1) return { success: false, error: 'Headers not found in Hiring Tracker' };
  
  var headers = data[headerRowIdx];
  var newRow = new Array(headers.length);
  for (var i = 0; i < newRow.length; i++) newRow[i] = '';
  
  var indentNum = "IND-" + new Date().getTime().toString().slice(-6);
  var setVal = function(nameStr, val) {
    var idx = headers.findIndex(function(h) { return h.toString().toLowerCase().trim() === nameStr.toLowerCase().trim(); });
    if (idx !== -1) newRow[idx] = val;
  };
  
  setVal('Timestamp', new Date().toLocaleString());
  setVal('Indent Number', indentNum);
  setVal('Company', payload.company || '');
  setVal('Post', payload.post || '');
  setVal('Gender', payload.gender || '');
  setVal('Prefer', payload.prefer || '');
  setVal('Number Of Enquiry Need', payload.numberOfEnquiryNeed || '');
  setVal('Position Full-Fill Date', payload.positionFullFillDate || '');
  setVal('Department', payload.department || '');
  setVal('Experience', payload.experience || '');
  
  sheet.getRange(sheet.getLastRow() + 1, 1, 1, newRow.length).setValues([newRow]);
  return { success: true };
}

function updateHiringTrackerStep(ss, payload) {
  var sheet = ss.getSheetByName('Hiring Tracker');
  if (!sheet) return { success: false, error: 'Hiring Tracker sheet not found' };
  
  var data = sheet.getDataRange().getDisplayValues();
  var headerRowIdx = -1;
  for (var i = 0; i < data.length; i++) {
    if (data[i].some(function(cell) { return cell.toString().toLowerCase().includes('indent number'); })) {
      headerRowIdx = i;
      break;
    }
  }
  if (headerRowIdx === -1) return { success: false, error: 'Headers not found in Hiring Tracker' };
  
  var headers = data[headerRowIdx];
  var indentIdx = headers.findIndex(function(h) { return h.toString().toLowerCase().trim() === 'indent number'; });
  
  var targetRowIdx = -1;
  for (var i = headerRowIdx + 1; i < data.length; i++) {
    if (data[i][indentIdx] && data[i][indentIdx].toString() === payload.indentNumber) {
      targetRowIdx = i;
      break;
    }
  }
  if (targetRowIdx === -1) return { success: false, error: 'Indent Number not found' };
  
  var setVal = function(nameStr, val) {
    var idx = headers.findIndex(function(h) { return h.toString().toLowerCase().trim() === nameStr.toLowerCase().trim(); });
    if (idx !== -1) {
      sheet.getRange(targetRowIdx + 1, idx + 1).setValue(val);
    }
  };
  
  // Find Actual columns based on order
  var actualCols = [];
  headers.forEach(function(h, idx) {
    if (h.toString().toLowerCase().trim().includes('actual')) actualCols.push(idx);
  });
  
  var timestamp = new Date().toLocaleString();
  
  if (payload.tab === 'social-site') {
    if (actualCols[0] !== undefined) sheet.getRange(targetRowIdx + 1, actualCols[0] + 1).setValue(timestamp);
    setVal('Social Site Post', payload.socialSitePost);
    setVal('Which', payload.which);
  } else if (payload.tab === 'call-tracker' || payload.tab === 'follow-up') {
    if (payload.trackerStatus !== 'In Progress') {
      if (actualCols[1] !== undefined) sheet.getRange(targetRowIdx + 1, actualCols[1] + 1).setValue(timestamp);
    }
    
    // Append to Follow Up History if there's a new remark
    if (payload.whatDidTheCandidateSays) {
      var historyIdx = headers.findIndex(function(h) { return h.toString().toLowerCase().trim() === 'follow up history'; });
      if (historyIdx !== -1) {
        var currentHistory = sheet.getRange(targetRowIdx + 1, historyIdx + 1).getValue();
        var d = new Date();
        var formattedDate = [
          ('0' + d.getDate()).slice(-2),
          ('0' + (d.getMonth() + 1)).slice(-2),
          d.getFullYear()
        ].join('-') + ' ' + ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2);
        
        var newEntry = "[" + formattedDate + "] " + payload.whatDidTheCandidateSays;
        var newHistory = currentHistory ? currentHistory + "\n" + newEntry : newEntry;
        sheet.getRange(targetRowIdx + 1, historyIdx + 1).setValue(newHistory);
      }
    }

    if (payload.candidatePhoto && payload.candidatePhoto.toString().startsWith('data:')) {
      var ext = payload.candidatePhoto.indexOf('application/pdf') > -1 ? '.pdf' : '.png';
      var fn = 'Photo_' + (payload.candidateName || payload.indentNumber) + '_' + new Date().getTime() + ext;
      payload.candidatePhoto = saveImageToDrive(payload.candidatePhoto, fn, "1XI0dY2IrEc8y4OaO-KJioW2QLhPJHsmd");
    }
    if (payload.resumeCopy && payload.resumeCopy.toString().startsWith('data:')) {
      var ext = payload.resumeCopy.indexOf('application/pdf') > -1 ? '.pdf' : '.png';
      var fn = 'Resume_' + (payload.candidateName || payload.indentNumber) + '_' + new Date().getTime() + ext;
      payload.resumeCopy = saveImageToDrive(payload.resumeCopy, fn, "1XI0dY2IrEc8y4OaO-KJioW2QLhPJHsmd");
    }

    setVal('What Did The Candidate Says', payload.whatDidTheCandidateSays);
    setVal('Tracker Status', payload.trackerStatus);
    setVal('Next Call Date', payload.nextCallDate);
    
    if(payload.candidateName !== undefined) setVal('Candidate Name', payload.candidateName);
    if(payload.dob !== undefined) setVal('DOB', payload.dob);
    if(payload.candidatePhoneNumber !== undefined) setVal('Candidate Phone Number', payload.candidatePhoneNumber);
    if(payload.previousCompanyName !== undefined) setVal('Previous Company Name', payload.previousCompanyName);
    if(payload.jobExperience !== undefined) setVal('Job Experience', payload.jobExperience);
    if(payload.reasonForLeaving !== undefined) setVal('Reason Of Leaving Previous Company', payload.reasonForLeaving);
    if(payload.maritalStatus !== undefined) setVal('Marital Status', payload.maritalStatus);
    if(payload.presentAddress !== undefined) setVal('Present Address', payload.presentAddress);
    if(payload.candidatePhoto !== undefined) setVal('Candidate Photo', payload.candidatePhoto);
    if(payload.resumeCopy !== undefined) setVal('Resume Copy', payload.resumeCopy);
    if(payload.interviewScheduleDate !== undefined) setVal('Interview Schedule Date', payload.interviewScheduleDate);

  } else if (payload.tab === 'interview') {
    if (actualCols[2] !== undefined) sheet.getRange(targetRowIdx + 1, actualCols[2] + 1).setValue(timestamp);
    setVal('Interview Status', payload.interviewStatus);
  }
  
  return { success: true };
}

function generateOfferLetterPDF(payload) {
  const companyData = {
    "Pmmpl": {
      name: "Passary Minerals Madhya Pvt Ltd.",
      address: "Tendua Road, Beside Jwala Petrol Pump, Hirapur Raipur (C.G.) - 492099",
      mobile: "7223844007",
      email: "pmmpl@pasmin.com",
      gstin: "22AHCP9274B1ZI",
      cin: "C14100CT2014PTC001598"
    },
    "Purab": {
      name: "Passary Minerals Purab Pvt Ltd.",
      address: "C/O Bansal Cement Pvt. Ltd Tata Metaliks Road Plot No.- 39 Kalaikunda Kharagpur Paschim Medinipur WB - 721303",
      mobile: "7978054819",
      email: "pmpurab@gmail.com",
      gstin: "19AAKCP01391ZT",
      cin: "U74999WB2018PTC227354"
    },
    "Refrasynth": {
      name: "Refrasynth Minerals Pvt Ltd.",
      address: "B-602, Babylon Tower, VIP Road, Telibandha Raipur (C.G.) 492001",
      mobile: "7222980807",
      email: "refrasynthminerals@gmail.com",
      gstin: "22AAJCR9122Q1ZW",
      cin: "U14290CT2019PTC009701"
    },
    "Rkl": {
      name: "Passary Minerals Rourkela Pvt Ltd.",
      address: "Kachery Road , Rourkela - 769012 - Sundergarh Odisha , India",
      mobile: "6612500547",
      email: "info@pasmin.com",
      gstin: "21AABCP0611Q1ZO",
      cin: "U27101OR1990PTC002639"
    },
    "Refratech": {
      name: "Refratech Application Services Private Limited",
      address: "Block B2, Dm Tower, Rawanbhata, Raipur, Chhattisgarh, 492001.",
      mobile: "9752099411",
      email: "refratech1@gmail.com",
      gstin: "22AANCR8181R1ZH",
      cin: "U33200CT2024PTC016624"
    }
  };

  const comp = companyData[payload.department] || companyData["Pmmpl"];
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; font-size: 12px; color: #333; line-height: 1.5; margin: 40px; }
        .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; }
        .header h1 { margin: 0; font-size: 20px; color: #1e3a8a; }
        .header p { margin: 2px 0; font-size: 10px; }
        .title { text-align: center; font-size: 16px; font-weight: bold; text-decoration: underline; margin: 20px 0; color: #1e3a8a; }
        .date { text-align: right; font-weight: bold; margin-bottom: 20px; }
        .content { margin-top: 20px; }
        .details { margin-top: 20px; line-height: 1.8; }
        .details span { font-weight: bold; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>${comp.name}</h1>
        <p>${comp.address}</p>
        <p>Mobile: ${comp.mobile} | Email: ${comp.email}</p>
        <p>GSTIN: ${comp.gstin} | CIN: ${comp.cin}</p>
      </div>
      
      <div class="date">Date: ${payload.offerLetterDate || ""}</div>
      
      <div class="title">LETTER OF OFFER</div>
      
      <div class="content">
        <p>Dear <strong>${payload.fullName || ""}</strong>,</p>
        <p style="color: #1e3a8a; font-weight: bold;">Congratulations!</p>
        <p>We are pleased to offer you the position of <strong>${payload.designation || ""}</strong>. This offer is extended based on the outcome of your interview discussions and the credentials submitted by you. The terms and conditions governing this offer are detailed below.</p>
        
        <h3 style="color: #1e3a8a; text-decoration: underline;">A. EMPLOYMENT DETAILS</h3>
        <div class="details">
          <div><span>Designation:</span> ${payload.designation || ""}</div>
          <div><span>Date of Joining:</span> ${payload.dateOfJoining || ""}</div>
          <div><span>Department:</span> ${payload.department || ""}</div>
          <div><span>Reporting To:</span> ${payload.reportingTo || ""}</div>
          <div><span>Place of Posting:</span> ${payload.placeOfPosting || ""}</div>
          <div><span>Probation Period:</span> ${payload.probationPeriod || ""}</div>
          <div><span>Probation End Date:</span> ${payload.probationEndDate || ""}</div>
          <div><span>Notice Period:</span> ${payload.noticePeriod || ""}</div>
        </div>
      </div>
    </body>
    </html>
  `;
  
  try {
    const blob = Utilities.newBlob(html, "text/html", "OfferLetter.html").getAs("application/pdf");
    blob.setName("Offer_Letter_" + (payload.candidateId || "New") + ".pdf");
    
    const folder = DriveApp.getFolderById(IMAGE_FOLDER_ID);
    const file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    return file.getUrl();
  } catch (err) {
    return "Error: " + err.message;
  }
}

function generateDocumentPDF(payload) {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        @page {z
          size: A4 portrait;
          margin: 15mm;
        }
        body { 
          font-family: Arial, sans-serif; 
          font-size: 13px; 
          color: #333; 
          line-height: 1.5; 
          margin: 0;
          padding: 0;
        }
        .print-break { page-break-before: always; }
      </style>
    </head>
    <body>
      ${payload.htmlBody || ""}
    </body>
    </html>
  `;
  
  try {
    const safeTitle = (payload.documentTitle || "Document").replace(/[^a-zA-Z0-9 ]/g, "");
    const blob = Utilities.newBlob(html, "text/html", safeTitle + ".html").getAs("application/pdf");
    blob.setName(safeTitle + "_" + (payload.employeeId || "New") + ".pdf");
    
    const folder = DriveApp.getFolderById(IMAGE_FOLDER_ID);
    const file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    return file.getUrl();
  } catch (err) {
    return "Error: " + err.message;
  }
}
