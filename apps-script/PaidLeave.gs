/**
 * PaidLeave.gs — Paid Leave passbook (EL/CL opening-credit-availed-closing).
 */

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
