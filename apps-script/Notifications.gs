/**
 * Notifications.gs — outbound email notifications.
 */

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
