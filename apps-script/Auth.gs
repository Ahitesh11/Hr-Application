/**
 * Auth.gs — login and email/mail-id maintenance for the 'User' sheet.
 */

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
