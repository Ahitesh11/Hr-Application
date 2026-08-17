/**
 * HiringTracker.gs — Hiring Tracker sheet: indent creation, social-site
 * posting, call/follow-up tracker, and interview step updates.
 */

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
