import React, { useState, useEffect } from "react";
import { api } from "../services/api";
import { format } from "date-fns";
import { 
  ChevronLeft, Search, CheckCircle, 
  FileText, Loader2, PenTool, Type, Settings
} from "lucide-react";
import { cn } from "../lib/utils";
import { logoBase64 } from "../lib/logoBase64";
import { DEFAULT_TEMPLATES, parseTemplate } from "../lib/templates";

const DOCUMENT_TYPES = [
  { id: "Offer Letter", label: "Offer Letter" },
  { id: "Appointment Letter", label: "Appointment Letter" },
  { id: "Probation Extension Letter", label: "Probation Extension Letter" },
  { id: "Resignation Acceptance Letter", label: "Resignation Acceptance Letter" },
  { id: "Regret Letter", label: "Regret Letter" },
  { id: "Relieving Letter", label: "Relieving Letter" },
  { id: "Termination Letter", label: "Termination Letter" },
];

const STEPS = [
  { id: 1, label: "Select Employee", icon: Search },
  { id: 2, label: "Document Details", icon: Settings },
  { id: 3, label: "Editable Preview", icon: PenTool },
  { id: 4, label: "Final Result", icon: CheckCircle },
];

export const DocumentGeneratorModule = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [documentType, setDocumentType] = useState("Offer Letter");
  
  const [employees, setEmployees] = useState<any[]>([]);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [selectedEmployeeKey, setSelectedEmployeeKey] = useState("");
  const [selectedIndentKey, setSelectedIndentKey] = useState("");
  
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{ status: "success" | "error" | null, link?: string, error?: string }>({ status: null });

  // Standard Fields
  const [formData, setFormData] = useState({
    candidateId: "",
    fullName: "",
    department: "", // Used for Letterhead
    designation: "",
    mobileNumber: "",
    emailId: "",
  });

  // Dynamic Fields
  const [dynamicFields, setDynamicFields] = useState<Record<string, string>>({
    documentDate: format(new Date(), "yyyy-MM-dd"),
    dateOfJoining: "",
    reportingTo: "",
    placeOfPosting: "",
    probationPeriod: "Three months",
    probationEndDate: "",
    noticePeriod: "15 days",
    relievingDate: "",
    lastWorkingDate: "",
    reason: "",
    interviewDate: "",
    position: "",
    monthlySalary: "25,000",
    refNo: "PMMPL/HR/OL/26-27/01",
    chequeNo: "",
    bankName: "",
    accountHolderName: "",
  });

  // Final HTML Body for preview
  const [htmlBody, setHtmlBody] = useState("");

  useEffect(() => {
    const fetchEmployees = async () => {
      setIsLoading(true);
      try {
        const [empData, hiringData] = await Promise.all([
          api.getPresentEmployees(),
          api.getHiringTracker(),
        ]);
        setEmployees(empData || []);
        // Candidates not yet joined (no employee record yet) — searchable by Indent No. so an
        // Offer Letter can be generated before their joining date.
        setCandidates((hiringData || []).filter((c: any) => c.indentNumber));
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchEmployees();
  }, []);

  const employeeKey = (e: any) => (e.employeeId || e.candidateId || e.empCode || e.employeeCode || "").toString();

  const handleEmployeeDropdownChange = (key: string) => {
    setSelectedEmployeeKey(key);
    setSelectedIndentKey("");
    if (!key) return;
    const emp = employees.find(e => employeeKey(e) === key);
    if (emp) handleSelectEmployee(emp);
  };

  const handleCandidateDropdownChange = (indentNumber: string) => {
    setSelectedIndentKey(indentNumber);
    setSelectedEmployeeKey("");
    if (!indentNumber) return;
    const cand = candidates.find(c => c.indentNumber === indentNumber);
    if (cand) handleSelectEmployee({ ...cand, _source: "candidate" as const });
  };

  const handleSelectEmployee = (emp: any) => {
    if (emp._source === "candidate") {
      // Pre-joining candidate from the Hiring Tracker — identified by Indent No. since they don't
      // have an Employee ID yet.
      setFormData({
        candidateId: emp.indentNumber || "",
        fullName: emp.candidateName || "",
        department: emp.company || "",
        designation: emp.post || "",
        mobileNumber: emp.candidatePhoneNumber || "",
        emailId: "",
      });
      setDynamicFields(prev => ({
        ...prev,
        dateOfJoining: "",
        placeOfPosting: emp.department || "",
      }));
    } else {
      setFormData({
        candidateId: emp.employeeId || emp.candidateId || emp.empCode || emp.employeeCode || "",
        fullName: emp.nameAsPerAadhar || emp.name || emp.employeeName || "",
        department: emp.companyName || emp.department || "",
        designation: emp.designation || "",
        mobileNumber: emp.mobileNumber || emp.contactNo || "",
        emailId: emp.mailId || emp.emailId || emp.email || "",
      });
      setDynamicFields(prev => ({
        ...prev,
        dateOfJoining: emp.dateOfJoining || "",
        placeOfPosting: emp.placeOfPosting || emp.workLocation || "",
      }));
    }
    setCurrentStep(2);
  };

  const handleNext = () => {
    if (currentStep === 2) {
      generateInitialHTML();
    }
    if (currentStep < 4) setCurrentStep(c => c + 1);
  };

  const handlePrev = () => {
    if (currentStep > 1) setCurrentStep(c => c - 1);
  };

  const generateInitialHTML = () => {
    
    // Construct Company Info based on selection
    const companyData: Record<string, any> = {
      "Pmmpl": { name: "Passary Minerals Pvt. Ltd.", address: "Kachery Road, Near Axis Bank, Sundergarh Rourkela - 769 012. Odisha, India", mobile: "+91-7223844007", email: "marketing@pasmin.com\ninfo@pasmin.com", gstin: "21AABCP0611Q1ZO", cin: "U27101OR1990PTC002639", web: "www.pasmin.com" },
      "Purab": { name: "Passary Minerals Purab Pvt Ltd.", address: "Kalaikunda Kharagpur Paschim Medinipur WB - 721303", mobile: "7978054819", email: "pmpurab@gmail.com", gstin: "19AAKCP01391ZT", cin: "U74999WB2018PTC227354", web: "www.pasmin.com" },
      "Refrasynth": { name: "Refrasynth Minerals Pvt Ltd.", address: "B-602, Babylon Tower, VIP Road, Telibandha Raipur (C.G.) 492001", mobile: "7222980807", email: "refrasynthminerals@gmail.com", gstin: "22AAJCR9122Q1ZW", cin: "U14290CT2019PTC009701", web: "www.pasmin.com" },
      "Rkl": { name: "Passary Minerals Rourkela Pvt Ltd.", address: "Kachery Road , Rourkela - 769012 - Sundergarh Odisha", mobile: "6612500547", email: "info@pasmin.com", gstin: "21AABCP0611Q1ZO", cin: "U27101OR1990PTC002639", web: "www.pasmin.com" },
      "Refratech": { name: "Refratech Application Services Private Limited", address: "Block B2, Dm Tower, Rawanbhata, Raipur, Chhattisgarh, 492001.", mobile: "9752099411", email: "refratech1@gmail.com", gstin: "22AANCR8181R1ZH", cin: "U33200CT2024PTC016624", web: "www.pasmin.com" }
    };
    const comp = companyData[formData.department] || companyData["Pmmpl"];
    
    // Generate Header (Left Logo, Right Address)
    const headerHTML = `
<table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
  <tr>
    <td style="width: 45%; vertical-align: bottom;">
      <img src="${logoBase64}" style="max-width: 120px; height: auto; margin-bottom: 5px;" />
      <h1 style="margin: 0; font-size: 22px; color: #727a20;">${comp.name}</h1>
      <p style="margin: 0; font-size: 8px; font-weight: bold; color: #555;">MINES * MINERAL * REFRACTORY * STAINLESS STEEL</p>
    </td>
    <td style="width: 55%; vertical-align: bottom; font-size: 11px; line-height: 1.3;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr><td style="color: #727a20; width: 60px;">Address</td><td>${comp.address}</td></tr>
        <tr><td style="color: #727a20;">Email</td><td>${comp.email.replace('\\n', '<br/>')}</td></tr>
        <tr><td style="color: #727a20;">Web</td><td>${comp.web}</td></tr>
        <tr><td style="color: #727a20;">GSTIN</td><td>${comp.gstin}</td></tr>
        <tr><td style="color: #727a20;">CIN</td><td>${comp.cin}</td></tr>
      </table>
    </td>
  </tr>
</table>

<table style="width: 100%; margin-bottom: 20px; font-weight: bold; font-size: 12px;">
  <tr>
    <td style="width: 60%;">${dynamicFields.refNo ? "Ref. No.: " + dynamicFields.refNo : ""}</td>
    <td style="width: 40%; text-align: right;">${dynamicFields.documentDate ? format(new Date(dynamicFields.documentDate), "MMMM dd, yyyy") : ""}</td>
  </tr>
</table>

<div style="text-align: center; font-weight: bold; text-decoration: underline; font-size: 14px; margin-bottom: 25px;">
  ${documentType}
</div>
`;

    // Footer signature block
    const footerHTML = `
<div style="margin-top: 50px; font-size: 12px;">
  <p>Best Regards</p>
  <p style="font-weight: bold; margin-bottom: 40px; color: #000080;">${comp.name.toUpperCase()}</p>
  <p>(Authorized Signatory)</p>
  <p style="font-weight: bold;">HR DEPARTMENT</p>
</div>
`;

    // Load custom template from LocalStorage or use default
    const savedTemplates = JSON.parse(localStorage.getItem("pasmin_document_templates") || "{}");
    const templateHtml = savedTemplates[documentType] || DEFAULT_TEMPLATES[documentType] || "";

    const tokens = {
      FullName: formData.fullName,
      Designation: formData.designation,
      CandidateId: formData.candidateId,
      MobileNumber: formData.mobileNumber,
      CompanyName: comp.name,
      CompanyAddress: comp.address,
      CompanyEmail: comp.email,
      CompanyWeb: comp.web,
      CompanyGSTIN: comp.gstin,
      CompanyCIN: comp.cin,
      DateOfJoining: dynamicFields.dateOfJoining,
      LastWorkingDate: dynamicFields.lastWorkingDate,
      MonthlySalary: dynamicFields.monthlySalary,
      ChequeNo: dynamicFields.chequeNo,
      BankName: dynamicFields.bankName,
      AccountHolderName: dynamicFields.accountHolderName,
      PlaceOfPosting: dynamicFields.placeOfPosting,
      ProbationPeriod: dynamicFields.probationPeriod,
      NoticePeriod: dynamicFields.noticePeriod,
      RefNo: dynamicFields.refNo,
      DocumentDate: dynamicFields.documentDate ? format(new Date(dynamicFields.documentDate), "MMMM dd, yyyy") : ""
    };

    const parsedBody = parseTemplate(templateHtml, tokens);

    if (documentType === "Relieving Letter") {
      setHtmlBody((headerHTML + parsedBody).trim());
    } else {
      setHtmlBody((headerHTML + parsedBody + footerHTML).trim());
    }
  };

  const handlePreview = () => {
    const html = `<!DOCTYPE html>
    <html>
    <head>
      <title>${documentType}</title>
      <style>
        @page {
          size: A4 portrait;
          margin: 15mm;
        }
        body { 
          font-family: 'Helvetica', 'Arial', sans-serif; 
          color: #000;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .print-break { page-break-before: always; }
        
        @media screen {
          body {
            max-width: 210mm;
            min-height: 297mm;
            margin: 20px auto;
            padding: 15mm;
            box-shadow: 0 0 10px rgba(0,0,0,0.2);
            background: #fff;
          }
          html { background: #525659; }
        }
        
        @media print {
          body { padding: 0; margin: 0; box-shadow: none; min-height: auto; }
        }
      </style>
    </head>
    <body>
      ${htmlBody || ""}
      <script>
        window.onload = () => {
          setTimeout(() => {
            window.print();
          }, 500);
        };
      </script>
    </body>
    </html>`;
    
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, "_blank", "width=860,height=900");
    if (!win) {
      const a = document.createElement("a");
      a.href = url;
      a.download = `Preview_${documentType}.html`;
      a.click();
    }
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setSubmitResult({ status: null });
    try {
      const payload = {
        timestamp: format(new Date(), "yyyy-MM-dd HH:mm:ss"),
        candidateId: formData.candidateId,
        employeeId: formData.candidateId,
        fullName: formData.fullName,
        department: formData.department,
        designation: formData.designation,
        mobileNumber: formData.mobileNumber,
        emailId: formData.emailId,
        
        documentType: documentType,
        documentTitle: documentType.toUpperCase(),
        documentDate: dynamicFields.documentDate,
        htmlBody: htmlBody.replace(logoBase64, "[LOGO_IMAGE_BASE64]"),
        includeSignature: true,
        
        status: "Generated",
      };
      
      const res = await api.submitDocument(payload);
      if (res && res.success) {
        setSubmitResult({ status: "success", link: res.documentLink });
      } else {
        setSubmitResult({ status: "error", error: res?.error || "Unknown error" });
      }
    } catch (err) {
      console.error(err);
      setSubmitResult({ status: "error", error: String(err) });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setCurrentStep(1);
    setSelectedEmployeeKey("");
    setSelectedIndentKey("");
    setSubmitResult({ status: null });
    setFormData({
      candidateId: "",
      fullName: "",
      department: "",
      designation: "",
      mobileNumber: "",
      emailId: "",
    });
  };

  if (submitResult.status === "success") {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 bg-slate-50">
        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-6">
          <CheckCircle className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">{documentType} Generated</h2>
        <p className="text-slate-500 mb-4 max-w-md text-center">
          The document for {formData.fullName} has been successfully created and saved to the database.
        </p>
        
        {submitResult.link && !submitResult.link.includes("Error") ? (
          <div className="mb-8 p-4 bg-white border border-slate-200 rounded-xl flex items-center gap-3">
            <FileText className="w-5 h-5 text-pink-600" />
            <a href={submitResult.link} target="_blank" rel="noopener noreferrer" className="text-pink-600 font-bold hover:underline">
              View PDF Document
            </a>
          </div>
        ) : (
          <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm max-w-md text-center">
            <strong>PDF Generation Failed:</strong> {submitResult.link || "Unknown Error"}
          </div>
        )}

        <button
          onClick={resetForm}
          className="px-6 py-2.5 bg-pink-600 text-white font-bold rounded-xl shadow-lg hover:bg-pink-700 hover:shadow-pink-200 transition-all"
        >
          Create Another Document
        </button>
      </div>
    );
  }

  if (submitResult.status === "error") {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 bg-slate-50">
        <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-6">
          <CheckCircle className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Submission Failed</h2>
        <p className="text-red-500 mb-8 max-w-md text-center font-mono text-sm">
          {submitResult.error}
        </p>
        <button
          onClick={() => setSubmitResult({ status: null })}
          className="px-6 py-2.5 bg-slate-200 text-slate-800 font-bold rounded-xl hover:bg-slate-300 transition-all"
        >
          Go Back & Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-slate-50 overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-xl font-extrabold text-pink-900 mb-1">Generate Document</h1>
          <p className="text-sm text-slate-500">Create beautiful, standardized documents instantly</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-500 mr-2">Step {currentStep} of 4</span>
          <div className="flex gap-1">
            {[1, 2, 3, 4].map(s => (
              <div 
                key={s} 
                className={cn("h-1.5 rounded-full transition-all", s <= currentStep ? "bg-pink-600 w-8" : "bg-slate-200 w-4")}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
        <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden flex flex-col min-h-[600px]">
          
          <div className="flex-1 p-6 md:p-10">
            {/* Step Header */}
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 rounded-xl bg-pink-50 text-pink-600 flex items-center justify-center shrink-0">
                {React.createElement(STEPS[currentStep - 1].icon, { className: "w-6 h-6" })}
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-800">Step {currentStep}: {STEPS[currentStep - 1].label}</h2>
                <p className="text-sm text-slate-500">
                  {currentStep === 1 && "Select the document type and employee"}
                  {currentStep === 2 && "Provide context-specific details for this document"}
                  {currentStep === 3 && "Customize the final content directly before generating"}
                  {currentStep === 4 && "Review and save to database"}
                </p>
              </div>
            </div>

            {/* Step 1 Content */}
            {currentStep === 1 && (
              <div className="max-w-xl mx-auto pt-4">
                <div className="mb-8">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-2">Document Type *</label>
                  <select 
                    value={documentType}
                    onChange={(e) => setDocumentType(e.target.value)}
                    className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-pink-500 focus:ring-4 focus:ring-pink-50 font-bold"
                  >
                    {DOCUMENT_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                  </select>
                </div>

                <div className="mb-6">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-2">
                    Select Employee <span className="normal-case font-medium text-slate-400">(already joined)</span>
                  </label>
                  <div className="relative">
                    <select
                      value={selectedEmployeeKey}
                      onChange={(e) => handleEmployeeDropdownChange(e.target.value)}
                      className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-pink-500 focus:ring-4 focus:ring-pink-50 font-medium appearance-none"
                    >
                      <option value="">{isLoading ? "Loading employees…" : "-- Select Employee --"}</option>
                      {employees.map((e, i) => {
                        const key = employeeKey(e);
                        const name = e.nameAsPerAadhar || e.name || e.employeeName || "Unnamed";
                        return (
                          <option key={key || i} value={key}>
                            {name} — {key} ({e.designation || e.companyName || e.department || ""})
                          </option>
                        );
                      })}
                    </select>
                    {isLoading && (
                      <div className="absolute right-10 top-1/2 -translate-y-1/2">
                        <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                      </div>
                    )}
                  </div>
                </div>

                <div className="mb-6">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-2">
                    Select Candidate <span className="normal-case font-medium text-amber-600">(pre-joining, by Indent No.)</span>
                  </label>
                  <div className="relative">
                    <select
                      value={selectedIndentKey}
                      onChange={(e) => handleCandidateDropdownChange(e.target.value)}
                      className="w-full px-4 py-3.5 bg-amber-50 border border-amber-200 rounded-xl text-slate-800 focus:outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-50 font-medium appearance-none"
                    >
                      <option value="">{isLoading ? "Loading candidates…" : "-- Select Candidate --"}</option>
                      {candidates.map((c, i) => (
                        <option key={c.indentNumber || i} value={c.indentNumber}>
                          {c.candidateName || "Unnamed"} — {c.indentNumber} ({c.post || ""} • {c.company || ""})
                        </option>
                      ))}
                    </select>
                    {isLoading && (
                      <div className="absolute right-10 top-1/2 -translate-y-1/2">
                        <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                      </div>
                    )}
                  </div>
                </div>

                {formData.fullName && (
                  <div className="mt-6 p-4 bg-pink-50 border border-pink-100 rounded-xl flex items-center justify-between">
                    <span className="text-sm font-medium text-pink-800">Selected: <strong>{formData.fullName}</strong></span>
                    <button onClick={() => setFormData(prev => ({...prev, fullName: ""}))} className="text-xs font-bold text-pink-600 hover:underline">Change</button>
                  </div>
                )}
              </div>
            )}

            {/* Step 2 Content */}
            {currentStep === 2 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Field label="Document Date *" type="date" value={dynamicFields.documentDate} onChange={(v) => setDynamicFields(prev => ({...prev, documentDate: v}))} />
                
                <Field label="Full Name *" value={formData.fullName} onChange={(v) => setFormData(prev => ({...prev, fullName: v}))} />
                <Field label="Designation *" value={formData.designation} onChange={(v) => setFormData(prev => ({...prev, designation: v}))} />
                <Field label="Department (Letterhead) *" value={formData.department} onChange={(v) => setFormData(prev => ({...prev, department: v}))} />
                
                {documentType === "Offer Letter" && (
                  <>
                    <Field label="Ref No" value={dynamicFields.refNo} onChange={(v) => setDynamicFields(prev => ({...prev, refNo: v}))} />
                    <Field label="Monthly Salary (CTC)" value={dynamicFields.monthlySalary} onChange={(v) => setDynamicFields(prev => ({...prev, monthlySalary: v}))} />
                    <Field label="Place of Posting (e.g. Rourkela, Sundergarh, Odisha)" value={dynamicFields.placeOfPosting} onChange={(v) => setDynamicFields(prev => ({...prev, placeOfPosting: v}))} />
                    <Field label="Probation Period" value={dynamicFields.probationPeriod} onChange={(v) => setDynamicFields(prev => ({...prev, probationPeriod: v}))} />
                    <Field label="Notice Period" value={dynamicFields.noticePeriod} onChange={(v) => setDynamicFields(prev => ({...prev, noticePeriod: v}))} />
                  </>
                )}

                {documentType === "Appointment Letter" && (
                  <>
                    <Field label="Date of Joining" type="date" value={dynamicFields.dateOfJoining} onChange={(v) => setDynamicFields(prev => ({...prev, dateOfJoining: v}))} />
                    <Field label="Monthly Salary (CTC)" value={dynamicFields.monthlySalary} onChange={(v) => setDynamicFields(prev => ({...prev, monthlySalary: v}))} />
                    <Field label="Cheque No" value={dynamicFields.chequeNo} onChange={(v) => setDynamicFields(prev => ({...prev, chequeNo: v}))} />
                    <Field label="Bank Name" value={dynamicFields.bankName} onChange={(v) => setDynamicFields(prev => ({...prev, bankName: v}))} />
                    <Field label="Account Holder Name" value={dynamicFields.accountHolderName} onChange={(v) => setDynamicFields(prev => ({...prev, accountHolderName: v}))} />
                  </>
                )}
                
                {documentType === "Probation Extension Letter" && (
                  <>
                    <Field label="Date of Joining" type="date" value={dynamicFields.dateOfJoining} onChange={(v) => setDynamicFields(prev => ({...prev, dateOfJoining: v}))} />
                    <Field label="Extension Period" value={dynamicFields.probationPeriod} onChange={(v) => setDynamicFields(prev => ({...prev, probationPeriod: v}))} />
                    <Field label="New End Date" type="date" value={dynamicFields.probationEndDate} onChange={(v) => setDynamicFields(prev => ({...prev, probationEndDate: v}))} />
                  </>
                )}

                {documentType === "Resignation Acceptance Letter" && (
                  <>
                    <Field label="Notice Period" value={dynamicFields.noticePeriod} onChange={(v) => setDynamicFields(prev => ({...prev, noticePeriod: v}))} />
                    <Field label="Last Working Date" type="date" value={dynamicFields.lastWorkingDate} onChange={(v) => setDynamicFields(prev => ({...prev, lastWorkingDate: v}))} />
                  </>
                )}

                {documentType === "Regret Letter" && (
                  <>
                    <Field label="Position Applied For" value={dynamicFields.position} onChange={(v) => setDynamicFields(prev => ({...prev, position: v}))} />
                    <Field label="Interview Date" type="date" value={dynamicFields.interviewDate} onChange={(v) => setDynamicFields(prev => ({...prev, interviewDate: v}))} />
                  </>
                )}

                {documentType === "Relieving Letter" && (
                  <>
                    <Field label="Date of Joining" type="date" value={dynamicFields.dateOfJoining} onChange={(v) => setDynamicFields(prev => ({...prev, dateOfJoining: v}))} />
                    <Field label="Last Working Date" type="date" value={dynamicFields.lastWorkingDate} onChange={(v) => setDynamicFields(prev => ({...prev, lastWorkingDate: v}))} />
                  </>
                )}

                {documentType === "Termination Letter" && (
                  <>
                    <Field label="Last Working Date" type="date" value={dynamicFields.lastWorkingDate} onChange={(v) => setDynamicFields(prev => ({...prev, lastWorkingDate: v}))} />
                    <div className="md:col-span-2">
                      <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1.5">Reason for Termination</label>
                      <input 
                        value={dynamicFields.reason}
                        onChange={(e) => setDynamicFields(prev => ({...prev, reason: e.target.value}))}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:border-pink-400 focus:ring-2 focus:ring-pink-100 outline-none"
                      />
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Step 3 Content (Editable Preview) */}
            {currentStep === 3 && (
              <div className="flex flex-col h-[600px]">
                <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded-lg text-sm mb-4 flex items-center gap-2 shrink-0">
                  <Type className="w-4 h-4 shrink-0" />
                  <p>Edit the text on the left, and see the live visual preview of your document on the right.</p>
                </div>
                
                <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-0">
                  {/* Left: Editor */}
                  <div className="flex flex-col">
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-2">HTML / Text Content</label>
                    <textarea
                      value={htmlBody}
                      onChange={(e) => setHtmlBody(e.target.value)}
                      className="flex-1 w-full bg-slate-50 border border-slate-200 rounded-xl p-4 font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-pink-200 custom-scrollbar"
                    />
                  </div>
                  
                  {/* Right: Live Preview */}
                  <div className="flex flex-col bg-slate-100 rounded-xl overflow-hidden border border-slate-200">
                    <div className="bg-slate-200 px-4 py-2 border-b border-slate-300 text-xs font-bold text-slate-600 flex justify-between items-center shrink-0">
                      <span>Live PDF Preview (Letterhead Included)</span>
                    </div>
                    <div className="flex-1 overflow-auto p-4 custom-scrollbar bg-gray-300 flex justify-center">
                      <div className="bg-white shadow-xl w-full max-w-[800px] p-[40px] text-black border border-gray-200 min-h-[900px] transform origin-top md:scale-[0.8]">
                        <div 
                          className="text-[13px] text-justify leading-relaxed prose prose-sm max-w-none"
                          dangerouslySetInnerHTML={{ __html: htmlBody || "<p class='text-slate-400'>Document content will appear here...</p>" }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 4 Content (Submit) */}
            {currentStep === 4 && (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="w-20 h-20 bg-pink-50 text-pink-600 rounded-full flex items-center justify-center mb-6 shadow-inner">
                  <FileText className="w-10 h-10" />
                </div>
                <h3 className="text-2xl font-black text-slate-800 mb-2">Ready to Generate!</h3>
                <p className="text-slate-500 mb-8 max-w-md text-center">
                  You are about to generate a <strong>{documentType}</strong> for <strong>{formData.fullName}</strong>.
                  <br/><br/>
                  Click <strong>Preview / Print PDF</strong> to view or print the document without saving. Or click <strong>Generate & Save</strong> to store it in Google Sheets.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <button
                    onClick={handlePreview}
                    className="flex items-center justify-center gap-2 px-8 py-4 bg-white border-2 border-slate-200 text-slate-700 rounded-2xl font-bold text-lg hover:border-pink-400 hover:text-pink-600 transition-all transform hover:-translate-y-1 shadow-sm"
                  >
                    <FileText className="w-6 h-6" /> Preview / Print PDF
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-pink-600 to-pink-600 text-white rounded-2xl font-bold text-lg hover:shadow-xl hover:shadow-pink-200 transition-all disabled:opacity-70 disabled:cursor-not-allowed transform hover:-translate-y-1"
                  >
                    {isSubmitting ? (
                      <><Loader2 className="w-6 h-6 animate-spin" /> Generating...</>
                    ) : (
                      <><CheckCircle className="w-6 h-6" /> Generate & Save Document</>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Footer Navigation */}
          {currentStep < 4 && (
            <div className="p-6 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
              <button
                onClick={handlePrev}
                disabled={currentStep === 1}
                className={cn(
                  "flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold transition-all",
                  currentStep > 1 
                    ? "text-slate-600 hover:bg-slate-200" 
                    : "text-slate-300 cursor-not-allowed"
                )}
              >
                <ChevronLeft className="w-5 h-5" />
                Previous
              </button>
              
              <button
                onClick={handleNext}
                disabled={currentStep === 1 && !formData.fullName}
                className={cn(
                  "flex items-center gap-2 px-6 py-2.5 text-white rounded-xl font-bold shadow-lg transition-all",
                  currentStep === 1 && !formData.fullName 
                    ? "bg-pink-300 cursor-not-allowed shadow-none" 
                    : "bg-pink-600 hover:bg-pink-700 shadow-pink-200"
                )}
              >
                {currentStep === 3 ? "Review Final Document" : "Next Step"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Extracted Field Component
const Field = ({ label, type = "text", value, onChange }: { label: string, type?: string, value: string, onChange: (v: string) => void }) => (
  <div>
    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1.5">{label}</label>
    <input 
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:border-pink-400 focus:ring-2 focus:ring-pink-100 outline-none transition-all"
    />
  </div>
);
