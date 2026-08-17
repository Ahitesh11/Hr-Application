/**
 * Documents.gs — Offer letter and generic HTML document PDF generation.
 */

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
