/**
 * SalaryIncrement.gs — 'Actual Salary Increment' sheet reads.
 */

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
