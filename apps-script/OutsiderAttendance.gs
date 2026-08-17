/**
 * OutsiderAttendance.gs — Field/outsider attendance punch-in with photo +
 * geolocation, and HR approval status updates.
 */

// -------------------------------------------------------------
// Outsider Attendance
// -------------------------------------------------------------
function submitOutsiderAttendance(ss, request) {
  try {
    const sheet = ss.getSheetByName('Outsider Attendance');
    if (!sheet) return { success: false, error: 'Sheet "Outsider Attendance" not found' };

    let imageLink = "";
    if (request.image) {
      try {
        const fileBase64 = request.image;
        const base64Data = fileBase64.split(',')[1] || fileBase64;
        const blob = Utilities.newBlob(Utilities.base64Decode(base64Data), "image/jpeg", "Attendance_" + request.employeeId + "_" + new Date().getTime() + ".jpg");
        const folder = DriveApp.getFolderById(IMAGE_FOLDER_ID);
        const file = folder.createFile(blob);
        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        imageLink = file.getUrl();
      } catch (err) {
        console.error("Image upload failed:", err);
      }
    }

    const row = [
      new Date().toLocaleString("en-IN"), // Timestamp
      request.date || "", // Date
      request.time || "", // Time
      request.employeeId || "", // Emp Id
      request.name || "", // Name
      request.status || "", // Status
      imageLink, // Image Link
      request.latitude || "", // Latitude
      request.longitude || "", // Longitude
      request.address || "", // Address
      request.mapLink || "", // Map Link
      request.leaveStartDate || "", // Leave Start Date
      request.leaveEndDate || "", // Leave End Date
      request.reason || "" // Reason
    ];

    sheet.appendRow(row);
    return { success: true, message: "Attendance recorded successfully" };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

function updateOutsiderAttendanceHRStatus(ss, request) {
  try {
    const sheet = ss.getSheetByName('Outsider Attendance');
    if (!sheet) return { success: false, error: 'Sheet not found' };

    const data = sheet.getDataRange().getValues();
    const headers = data[0];

    // We need Timestamp to uniquely identify the row
    const timestampIdx = headers.findIndex(h => h.toString().toLowerCase() === 'timestamp');
    const hrStatusIdx = headers.findIndex(h => h.toString().toLowerCase() === 'hr status');
    const hrRemarksIdx = headers.findIndex(h => h.toString().toLowerCase() === 'hr remarks');

    if (timestampIdx === -1) return { success: false, error: 'Timestamp column not found' };

    // If HR Status columns don't exist, create them
    let targetHrStatusIdx = hrStatusIdx;
    let targetHrRemarksIdx = hrRemarksIdx;

    if (hrStatusIdx === -1) {
      targetHrStatusIdx = headers.length;
      sheet.getRange(1, targetHrStatusIdx + 1).setValue('HR Status');
    }
    if (hrRemarksIdx === -1) {
      targetHrRemarksIdx = hrStatusIdx === -1 ? headers.length + 1 : headers.length;
      sheet.getRange(1, targetHrRemarksIdx + 1).setValue('HR Remarks');
    }

    const targetTimestamp = request.timestamp; // The timestamp of the row to update

    for (let i = 1; i < data.length; i++) {
      const rowTimestamp = new Date(data[i][timestampIdx]).getTime();
      const reqTimestamp = new Date(targetTimestamp).getTime();

      // Allow slight time difference or string match
      if (data[i][timestampIdx].toString() === targetTimestamp.toString() ||
          (!isNaN(rowTimestamp) && !isNaN(reqTimestamp) && Math.abs(rowTimestamp - reqTimestamp) < 5000)) {

        sheet.getRange(i + 1, targetHrStatusIdx + 1).setValue(request.hrStatus);
        sheet.getRange(i + 1, targetHrRemarksIdx + 1).setValue(request.hrRemarks || "");

        return { success: true, message: 'Status updated successfully' };
      }
    }

    return { success: false, error: 'Record not found' };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}
