/**
 * Joining.gs — Joining sheet (onboarding) + the Living (off-boarding) flow,
 * which reuses the Joining sheet's rows/columns rather than a separate sheet.
 */

// ── Joining Sheet ──────────────────────────────────────────────────────────
// Header is in row 7 of the "Joining" sheet.
// We override getHeaderInfo for this sheet by searching from row 6 (0-indexed)
// so the generic Timestamp-search in getHeaderInfo still finds it correctly.

function getJoiningData(ss) {
  const sheet = ss.getSheetByName('Joining');
  if (!sheet) return [];

  const data = sheet.getDataRange().getDisplayValues();

  // Dynamically find header row
  let headerIndex = 6;
  for (let i = 0; i < Math.min(20, data.length); i++) {
    if (data[i].some(cell => {
      const val = cell.toString().toLowerCase();
      return val.includes('pmmpl-ac') || val.includes('name as per aadhar') || val.includes('employee id');
    })) {
      headerIndex = i;
      break;
    }
  }

  const headers = data[headerIndex];
  const results = [];

  for (let i = headerIndex + 1; i < data.length; i++) {
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

  // Use the same header detection as getJoining/submitLivingData/updateLivingPayment (all call
  // getHeaderInfo) so this reads the exact same header row they write to. The previous inline
  // copy here added 'year'/'joining' as extra hint substrings and skipped getHeaderInfo's
  // sparse-row guard, so it could latch onto an earlier title row and always return [].
  const data = sheet.getDataRange().getDisplayValues();
  const headerInfo = getHeaderInfo(sheet);
  const index = headerInfo.index;
  const headers = headerInfo.headers;

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
