/**
 * Users.gs — Settings page CRUD for the 'User' sheet (login accounts / roles).
 * Reuses the same header-keyword-matching approach as Joining.gs's Living
 * columns, since the User sheet's header text isn't guaranteed to camelize
 * to a fixed key set.
 */

function getUsers(ss) {
  const sheet = ss.getSheetByName('User');
  if (!sheet) return [];

  const { headers, index } = getHeaderInfo(sheet);
  const data = sheet.getDataRange().getDisplayValues();
  const passIdx = headers.findIndex(h => h.toString().toLowerCase().includes('password'));

  const results = [];
  for (let i = index + 1; i < data.length; i++) {
    const row = data[i];
    if (row.every(cell => cell === '' || cell === null)) continue;

    const obj = {};
    headers.forEach((h, idx) => {
      const key = camelize(h);
      if (!key) return;
      if (idx === passIdx) return; // never ship the password to the client
      obj[key] = row[idx];
    });
    obj.hasPassword = passIdx !== -1 && data[i][passIdx].toString().trim() !== '';
    obj._row = i + 1;
    results.push(obj);
  }
  return results;
}

function findUserHeaderCols_(headers) {
  const find = (test) => headers.findIndex(h => test(h.toString().toLowerCase()));
  return {
    empId: find(h => h.includes('employee id') || h.includes('emp id')),
    password: find(h => h.includes('password')),
    name: find(h => h === 'name' || (h.includes('name') && !h.includes('company') && !h.includes('hod'))),
    designation: find(h => h.includes('designation')),
    companyName: find(h => h.includes('company')),
    role: find(h => h.includes('role')),
    cl: find(h => h === 'cl' || h.includes('casual')),
    el: find(h => h === 'el' || h.includes('earned')),
    ml: find(h => h === 'ml' || h.includes('medical leave')),
    hod: find(h => h.trim() === 'hod'),
    mailId: find(h => h.includes('mail id') || h.includes('mailid') || h.includes('email')),
  };
}

function addUser(ss, payload) {
  const sheet = ss.getSheetByName('User');
  if (!sheet) return { success: false, error: 'User sheet not found' };
  if (!payload.employeeId) return { success: false, error: 'Employee ID is required' };
  if (!payload.password) return { success: false, error: 'Password is required' };

  const { headers, index } = getHeaderInfo(sheet);
  const data = sheet.getDataRange().getValues();
  const cols = findUserHeaderCols_(headers);
  if (cols.empId === -1) return { success: false, error: 'Employee ID column not found in User sheet' };

  for (let i = index + 1; i < data.length; i++) {
    if (data[i][cols.empId] && data[i][cols.empId].toString().trim() === payload.employeeId.toString().trim()) {
      return { success: false, error: 'Employee ID ' + payload.employeeId + ' already exists' };
    }
  }

  const newRow = new Array(headers.length).fill('');
  const setIfPresent = (colIdx, val) => { if (colIdx !== -1 && val !== undefined) newRow[colIdx] = val; };
  setIfPresent(cols.empId, payload.employeeId);
  setIfPresent(cols.password, payload.password);
  setIfPresent(cols.name, payload.name);
  setIfPresent(cols.designation, payload.designation);
  setIfPresent(cols.companyName, payload.companyName);
  setIfPresent(cols.role, payload.role);
  setIfPresent(cols.cl, payload.cl);
  setIfPresent(cols.el, payload.el);
  setIfPresent(cols.ml, payload.ml);
  setIfPresent(cols.hod, payload.hod);
  setIfPresent(cols.mailId, payload.mailId);

  let targetRow = data.length + 1;
  for (let i = index + 1; i < data.length; i++) {
    if (data[i].every(c => c === '' || c === null)) { targetRow = i + 1; break; }
  }

  sheet.getRange(targetRow, 1, 1, newRow.length).setValues([newRow]);
  return { success: true, added: true };
}

function updateUser(ss, payload) {
  const sheet = ss.getSheetByName('User');
  if (!sheet) return { success: false, error: 'User sheet not found' };
  if (!payload.employeeId) return { success: false, error: 'Employee ID is required' };

  const { headers, index } = getHeaderInfo(sheet);
  const data = sheet.getDataRange().getValues();
  const cols = findUserHeaderCols_(headers);
  if (cols.empId === -1) return { success: false, error: 'Employee ID column not found in User sheet' };

  let targetRowIdx = -1;
  for (let i = index + 1; i < data.length; i++) {
    if (data[i][cols.empId] && data[i][cols.empId].toString().trim() === payload.employeeId.toString().trim()) {
      targetRowIdx = i;
      break;
    }
  }
  if (targetRowIdx === -1) return { success: false, error: 'Employee ' + payload.employeeId + ' not found in User sheet' };

  const rowNum = targetRowIdx + 1;
  const setIfPresent = (colIdx, val) => {
    if (colIdx !== -1 && val !== undefined && val !== '') sheet.getRange(rowNum, colIdx + 1).setValue(val);
  };
  setIfPresent(cols.password, payload.password); // only overwritten when a new one is actually supplied
  setIfPresent(cols.name, payload.name);
  setIfPresent(cols.designation, payload.designation);
  setIfPresent(cols.companyName, payload.companyName);
  setIfPresent(cols.role, payload.role);
  setIfPresent(cols.cl, payload.cl);
  setIfPresent(cols.el, payload.el);
  setIfPresent(cols.ml, payload.ml);
  setIfPresent(cols.hod, payload.hod);
  setIfPresent(cols.mailId, payload.mailId);

  return { success: true, updated: true };
}

function deleteUser(ss, employeeId) {
  const sheet = ss.getSheetByName('User');
  if (!sheet) return { success: false, error: 'User sheet not found' };
  if (!employeeId) return { success: false, error: 'Employee ID is required' };

  const { headers, index } = getHeaderInfo(sheet);
  const data = sheet.getDataRange().getValues();
  const cols = findUserHeaderCols_(headers);
  if (cols.empId === -1) return { success: false, error: 'Employee ID column not found in User sheet' };

  for (let i = index + 1; i < data.length; i++) {
    if (data[i][cols.empId] && data[i][cols.empId].toString().trim() === employeeId.toString().trim()) {
      sheet.deleteRow(i + 1);
      return { success: true, deleted: true };
    }
  }
  return { success: false, error: 'Employee ' + employeeId + ' not found in User sheet' };
}
