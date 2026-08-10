import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";
import {
  UserPlus, Users, Loader2, Search, Upload, CheckCircle,
  AlertCircle, X, Eye, ChevronDown, LogOut, History
} from "lucide-react";
import { cn } from "../lib/utils";

type TabId = "new" | "present" | "living";

const GENDER_OPTIONS = ["Male", "Female", "Other"];
const PF_ESIC_OPTIONS = ["Yes", "No"];
const PAYMENT_MODE = ["Cash", "Bank"];
const ATTENDANCE_MODE = ["Machine", "Outsider"];
const INCENTIVE_CAT = ["MIS Basis", "Non Incentive", "Non Mis", "OT Basis", "Per MT"];
const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

const JOINING_COMPANY_OPTIONS = [
  "Pmmpl", "Purab", "Refrasynth", "Refratech", "Rkl", "Pasmin Llp",
];

const JOINING_PLACE_OPTIONS = [
  "Application", "Factory Madhya", "Factory Purab",
  "Factory Refrasynth", "Factory Rkl", "Management", "MDO Office",
  "Mdo Office", "Production", "Rkl Office", "Sales",
];

const DESIGNATION_OPTIONS = [
  "Accounts Executive", "Accounts Manager", "Admin executive",
  "Application Incharge", "Application Labour", "Application Manager",
  "Application Supervisor", "Asset Fitter", "Assistant Chemist",
  "Assistant Marketing Manager", "Cashier", "CFO", "Civil Site Supervisor",
  "CRM", "Crusher Supervisor", "Data Operator", "DME", "Draftsman", "Driver",
  "EA", "Electrical Helper", "Financial Executive", "Gm Hr",
  "Grinding Mill Supervisor", "Guard", "Help", "Helper", "HR",
  "Hydra Operator", "JCB Operator", "Jr Accountant", "Jr. Purchase Executive",
  "Lab Assistant", "Lab Helper", "Lab Incharge", "Labour", "Liasoning",
  "Marketing Executive", "Marketing Manager", "Mechanical Hepler", "Mechnical Helper",
  "MIS", "Office Boy", "PC", "Plant Electrician", "Plant Executive",
  "Plant Helper", "Plant Incharge", "Plant Mechanical", "Plant Supervisor",
  "Production Supervisor", "Project manager", "Purchase Executive", "Purchase Manager",
  "Sales & Marketing", "Sales Cordinator", "Sales Executive", "Sales Manager",
  "Senior General Manager", "Site Supervisor", "Sr Accountant",
  "Stock Yard Supervisor", "Store Executive", "Store Manager", "Store Purchaser",
  "Technical Head", "Welder", "Workshop Operator","Admin Executive","Logistic Executive","Fitter",
];

const emptyForm = {
  linkedIndentNumber: "",
  pmmplAc: "",
  nameAsPerAadhar: "",
  fatherName: "",
  dateOfJoining: "",
  joiningPlace: "",
  designation: "",
  salary: "",
  aadharFrontsidePhoto: "",
  panCard: "",
  candidateSPhoto: "",
  currentAddress: "",
  addressAsPerAadharCard: "",
  dateOfBirthAsPerAadharCard: "",
  gender: "",
  mobileNo: "",
  familyMobileNo: "",
  relationshipWithFamilyPerson: "",
  pastPfIdNoIfAny: "",
  currentBankACNo: "",
  ifscCode: "",
  branchName: "",
  photoOfFrontBankPassbook: "",
  personalEmailId: "",
  esicNoIfAny: "",
  highestQualification: "",
  pfEligible: "",
  esicEligible: "",
  joiningCompanyName: "",
  emailIdToBeIssue: "",
  issueMobile: "",
  issueLaptop: "",
  aadharCardNo: "",
  modeOfAttendancea: "",
  qualicationPhoto: "",
  paymentMode: "",
  emailAddress: "",
  salarySlip: "",
  resumeCopy: "",
  incentiveCategory: "",
  relievingExperienceLetter: "",
  identificationMarks: "",
  bloodGroup: "",
};

type FormState = typeof emptyForm;

type LivingForm = {
  dateOfLiving: string;
  totalWorkingDays: string;
  amount: string;
  handoverAssets: boolean;
  clearanceForm: boolean;
  handoverDocSigned: boolean;
  cancelEmailBiometric: boolean;
  removeBenefitEnrollment: boolean;
};

const emptyLivingForm: LivingForm = {
  dateOfLiving: "",
  totalWorkingDays: "",
  amount: "",
  handoverAssets: false,
  clearanceForm: false,
  handoverDocSigned: false,
  cancelEmailBiometric: false,
  removeBenefitEnrollment: false,
};

const fileFields: { key: keyof FormState; label: string }[] = [
  { key: "aadharFrontsidePhoto",     label: "Aadhar Frontside Photo" },
  { key: "panCard",                  label: "PAN Card" },
  { key: "candidateSPhoto",          label: "Candidate's Photo" },
  { key: "photoOfFrontBankPassbook", label: "Front Bank Passbook Photo" },
  { key: "qualicationPhoto",         label: "Qualification Photo" },
  { key: "salarySlip",               label: "Salary Slip" },
  { key: "resumeCopy",               label: "Resume Copy" },
  { key: "relievingExperienceLetter",label: "Relieving / Experience Letter" },
];

function FileUpload({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (b64: string) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const hasFile = !!value;

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onChange(reader.result as string);
    reader.readAsDataURL(file);
  };

  return (
    <div>
      <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1.5">{label}</label>
      <div
        onClick={() => ref.current?.click()}
        className={cn(
          "border-2 border-dashed rounded-xl p-3 flex items-center gap-3 cursor-pointer transition-all",
          hasFile
            ? "border-emerald-300 bg-emerald-50"
            : "border-pink-200 bg-pink-50 hover:border-pink-400 hover:bg-pink-100"
        )}
      >
        <input ref={ref} type="file" accept="image/*,.pdf" className="hidden" onChange={handleFile} />
        {hasFile ? (
          <>
            <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
            <span className="text-xs font-bold text-emerald-700 truncate">File uploaded</span>
            <button
              type="button"
              onClick={e => { e.stopPropagation(); onChange(""); if (ref.current) ref.current.value = ""; }}
              className="ml-auto p-1 hover:bg-emerald-100 rounded-lg"
            >
              <X className="w-3.5 h-3.5 text-emerald-600" />
            </button>
          </>
        ) : (
          <>
            <Upload className="w-5 h-5 text-pink-400 shrink-0" />
            <span className="text-xs text-slate-400 font-medium">Click to upload</span>
          </>
        )}
      </div>
    </div>
  );
}

function Field({
  label, name, value, onChange, type = "text", required = false,
  placeholder = "",
}: {
  label: string; name: keyof FormState; value: string;
  onChange: (k: keyof FormState, v: string) => void;
  type?: string; required?: boolean; placeholder?: string;
}) {
  return (
    <div>
      <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1.5">
        {label}{required && <span className="text-pink-500 ml-0.5">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(name, e.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full px-3.5 py-2.5 bg-pink-50 border border-pink-100 rounded-xl text-sm font-medium text-slate-800 placeholder:text-slate-300 focus:border-pink-400 focus:ring-2 focus:ring-pink-100 outline-none transition-all"
      />
    </div>
  );
}

function SelectField({
  label, name, value, onChange, options, required = false,
}: {
  label: string; name: keyof FormState; value: string;
  onChange: (k: keyof FormState, v: string) => void;
  options: string[]; required?: boolean;
}) {
  return (
    <div>
      <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1.5">
        {label}{required && <span className="text-pink-500 ml-0.5">*</span>}
      </label>
      <div className="relative">
        <select
          value={value}
          onChange={e => onChange(name, e.target.value)}
          required={required}
          className="w-full px-3.5 py-2.5 bg-pink-50 border border-pink-100 rounded-xl text-sm font-medium text-slate-800 focus:border-pink-400 focus:ring-2 focus:ring-pink-100 outline-none transition-all appearance-none"
        >
          <option value="">-- Select --</option>
          {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
      </div>
    </div>
  );
}

export const JoiningModule = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === "Admin";
  const [activeTab, setActiveTab] = useState<TabId>("new");
  const [form, setForm] = useState<FormState>(emptyForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<"success" | "error" | null>(null);
  const [joiningList, setJoiningList] = useState<any[]>([]);
  const [presentEmployeesList, setPresentEmployeesList] = useState<any[]>([]);
  const [livingList, setLivingList] = useState<any[]>([]);
  const [hiringTrackerList, setHiringTrackerList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [viewRecord, setViewRecord] = useState<any | null>(null);
  const [livingTarget, setLivingTarget] = useState<any | null>(null);
  const [livingForm, setLivingForm] = useState<LivingForm>(emptyLivingForm);
  const [isLivingSubmitting, setIsLivingSubmitting] = useState(false);
  const [livingSubmitResult, setLivingSubmitResult] = useState<"success" | "error" | null>(null);
  const [livingErrorMsg, setLivingErrorMsg] = useState<string>("");
  const [paymentLoadingId, setPaymentLoadingId] = useState<string | null>(null);
  const [paymentModal, setPaymentModal] = useState<any | null>(null);
  const [paymentDate, setPaymentDate] = useState<string>("");
  const [livingView, setLivingView] = useState<"all" | "paid">("all");
  const [isLivingLoading, setIsLivingLoading] = useState(false);
  const livingLoadedRef = useRef(false);

  // Only load joining data on mount (living history is lazy-loaded)
  useEffect(() => { loadJoining(); }, []);

  // Lazy-load living history the first time the "living" tab is opened
  useEffect(() => {
    if (activeTab === "living" && !livingLoadedRef.current) {
      livingLoadedRef.current = true;
      loadLivingHistory();
    }
  }, [activeTab]);

  // Auto-set PMMPL-AC whenever we get fresh joining data
  useEffect(() => {
    setForm(prev => ({ ...prev, pmmplAc: computeNextPmmpl(joiningList) }));
  }, [joiningList]);

  const FILE_KEYS = new Set([
    "aadharFrontsidePhoto", "panCard", "candidateSPhoto",
    "photoOfFrontBankPassbook", "qualicationPhoto",
    "salarySlip", "resumeCopy", "relievingExperienceLetter",
  ]);
  const SKIP_KEYS = new Set(["_row", "action"]);

  const computeNextPmmpl = (list: any[]) => {
    const maxNum = list.reduce((max, r: any) => {
      const m = String(r.pmmplAc || "").match(/(\d+)$/);
      return m ? Math.max(max, parseInt(m[1], 10)) : max;
    }, 0);
    return `PMMPL-${maxNum + 1}`;
  };

  const loadLivingHistory = useCallback(async () => {
    setIsLivingLoading(true);
    try {
      const res = await api.getLivingHistory();
      setLivingList(Array.isArray(res) ? res : []);
    } catch { setLivingList([]); }
    finally { setIsLivingLoading(false); }
  }, []);

  const handleLivingSubmit = async () => {
    if (!livingTarget) return;
    setIsLivingSubmitting(true);
    setLivingSubmitResult(null);
    try {
      const payload = {
        pmmplAc: livingTarget.pmmplAc || "",
        employeeName: livingTarget.nameAsPerAadhar || "",
        designation: livingTarget.designation || "",
        joiningPlace: livingTarget.joiningPlace || "",
        dateOfLiving: livingForm.dateOfLiving,
        totalWorkingDays: livingForm.totalWorkingDays,
        amount: livingForm.amount,
        actual: new Date().toLocaleString("en-IN"),
        handoverAssets: livingForm.handoverAssets ? "Yes" : "No",
        clearanceForm: livingForm.clearanceForm ? "Yes" : "No",
        handoverDocSigned: livingForm.handoverDocSigned ? "Yes" : "No",
        cancelEmailBiometric: livingForm.cancelEmailBiometric ? "Yes" : "No",
        removeBenefitEnrollment: livingForm.removeBenefitEnrollment ? "Yes" : "No",
        timestamp: new Date().toLocaleString("en-IN"),
      };
      const res = await api.submitLiving(payload);
      if (res.ok) {
        setLivingSubmitResult("success");
        await loadLivingHistory();
        setTimeout(() => {
          setLivingTarget(null);
          setLivingForm(emptyLivingForm);
          setLivingSubmitResult(null);
          setLivingErrorMsg("");
        }, 1500);
      } else {
        setLivingErrorMsg(res.error || "Failed to save");
        setLivingSubmitResult("error");
      }
    } catch (e: any) {
      setLivingErrorMsg(e?.message || "Unexpected error");
      setLivingSubmitResult("error");
    } finally {
      setIsLivingSubmitting(false);
    }
  };

  const handlePaymentApprove = async () => {
    if (!paymentModal) return;
    setPaymentLoadingId(paymentModal.pmmplAc);
    try {
      const res = await api.updateLivingPayment(paymentModal.pmmplAc, paymentDate);
      if (res.ok) {
        await loadLivingHistory();
        setPaymentModal(null);
      }
    } finally {
      setPaymentLoadingId(null);
    }
  };

  const openPaymentModal = (record: any) => {
    setPaymentModal(record);
    setPaymentDate(new Date().toISOString().split("T")[0]);
  };

  const loadJoining = async () => {
    setIsLoading(true);
    try {
      const [res, hrRes, peRes] = await Promise.all([
        api.getJoining(),
        api.getHiringTracker(),
        api.getPresentEmployees()
      ]);
      const raw = Array.isArray(res) ? res : [];
      // Remove completely empty records
      const nonEmpty = raw.filter((r: any) =>
        Object.entries(r).some(
          ([k, v]) => !SKIP_KEYS.has(k) && !FILE_KEYS.has(k) && v && String(v).trim() !== ""
        )
      );
      setJoiningList(nonEmpty);
      setHiringTrackerList(Array.isArray(hrRes) ? hrRes : []);
      setPresentEmployeesList(Array.isArray(peRes) ? peRes : []);
    } finally {
      setIsLoading(false);
    }
  };

  // Discover which columns actually have data (try from first record)
  const displayColumns: string[] = (() => {
    if (joiningList.length === 0) return [];
    // Count how many records have a non-empty value for each key
    const counts: Record<string, number> = {};
    joiningList.slice(0, 30).forEach((r: any) => {
      Object.entries(r).forEach(([k, v]) => {
        if (!SKIP_KEYS.has(k) && !FILE_KEYS.has(k) && v && String(v).trim()) {
          counts[k] = (counts[k] || 0) + 1;
        }
      });
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])   // most-populated first
      .map(([k]) => k)
      .filter(k => k !== "timestamp")
      .slice(0, 8);                   // show max 8 columns
  })();

  const setField = (k: keyof FormState, v: string) =>
    setForm(prev => ({ ...prev, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitResult(null);
    try {
      const payload = {
        ...form,
        timestamp: new Date().toLocaleString("en-IN"),
      };
      const ok = await api.submitJoining(payload);
      if (ok) {
        setSubmitResult("success");
        const fresh = await api.getJoining();
        const nonEmpty = Array.isArray(fresh)
          ? fresh.filter((r: any) =>
              Object.entries(r).some(([k, v]) => !SKIP_KEYS.has(k) && !FILE_KEYS.has(k) && v && String(v).trim())
            )
          : [];
        setJoiningList(nonEmpty);
        setForm({ ...emptyForm, pmmplAc: computeNextPmmpl(nonEmpty) });
      } else {
        setSubmitResult("error");
      }
    } catch {
      setSubmitResult("error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const toLabel = (key: string) =>
    key.replace(/([A-Z])/g, " $1").replace(/^./, s => s.toUpperCase()).trim();

  // The "Present Employees" sheet only carries a handful of live/payroll columns (Salary, UAN,
  // bank, next increment date...). All the details captured at onboarding (address, DOB, PF/ESIC,
  // documents...) live in the "Joining" sheet instead. Match the two by employee code so the View
  // modal can show the complete record, not just what's in Present Employees.
  const findJoiningMatch = (r: any) => {
    const id = (r.pmmplAc || r.employeeId || r.employeeCode || "").toString().trim().toLowerCase();
    if (!id) return null;
    return joiningList.find((j: any) => {
      const jid = (j.pmmplAc || j.employeeId || j.employeeCode || "").toString().trim().toLowerCase();
      return jid !== "" && jid === id;
    }) || null;
  };

  const openView = (r: any) => {
    const match = findJoiningMatch(r);
    setViewRecord(match ? { ...match, ...r } : r);
  };

  const livingEmployeeIds = new Set(
    livingList.map((r: any) => r.pmmplAc || r.employeeId || r.employeeCode).filter(Boolean)
  );

  const filtered = presentEmployeesList
    .filter((r: any) => !livingEmployeeIds.has(r.pmmplAc || r.employeeId || r.employeeCode))
    .filter((r: any) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return Object.entries(r).some(
        ([k, v]) => !FILE_KEYS.has(k) && !SKIP_KEYS.has(k) && String(v).toLowerCase().includes(q)
      );
    });

  // Discover which columns actually have data for present employees
  const presentDisplayColumns: string[] = (() => {
    if (presentEmployeesList.length === 0) return [];
    const counts: Record<string, number> = {};
    presentEmployeesList.slice(0, 30).forEach((r: any) => {
      Object.entries(r).forEach(([k, v]) => {
        if (!SKIP_KEYS.has(k) && !FILE_KEYS.has(k) && v && String(v).trim()) {
          counts[k] = (counts[k] || 0) + 1;
        }
      });
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([k]) => k)
      .filter(k => k !== "timestamp")
      .slice(0, 8);
  })();

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="bg-white rounded-3xl border border-pink-100 shadow-sm p-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-pink-600 rounded-2xl">
            <UserPlus className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">Joining Module</h2>
            <p className="text-sm text-slate-400">New employee onboarding & present employee records</p>
          </div>
        </div>
        {/* Tab switcher */}
        <div className="flex gap-2 bg-pink-50 p-1 rounded-2xl border border-pink-100">
          {([
            { id: "new",     label: "New Joining", icon: UserPlus },
            { id: "present", label: "Present Employees", icon: Users },
            { id: "living",  label: "Living History", icon: History },
          ] as { id: TabId; label: string; icon: any }[]).map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all",
                activeTab === t.id
                  ? "bg-pink-600 text-white shadow-md shadow-pink-200"
                  : "text-slate-500 hover:text-pink-600"
              )}
            >
              <t.icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════
          TAB: NEW JOINING FORM
          ══════════════════════════════════════ */}
      {activeTab === "new" && (
        <div className="bg-white rounded-3xl border border-pink-100 shadow-sm overflow-hidden">
          <div className="px-8 py-5 border-b border-pink-50 bg-gradient-to-r from-pink-50 to-pink-50">
            <h3 className="text-base font-bold text-slate-800">New Employee Joining Form</h3>
            <p className="text-xs text-slate-400 mt-0.5">Fill all details carefully — data will be saved to the "Joining" sheet</p>
          </div>

          {submitResult === "success" && (
            <div className="mx-8 mt-6 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
              <p className="text-sm font-bold text-emerald-700">Joining form submitted successfully!</p>
              <button onClick={() => setSubmitResult(null)} className="ml-auto p-1 hover:bg-emerald-100 rounded-lg">
                <X className="w-4 h-4 text-emerald-500" />
              </button>
            </div>
          )}
          {submitResult === "error" && (
            <div className="mx-8 mt-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
              <p className="text-sm font-bold text-red-700">Submission failed. Please try again.</p>
              <button onClick={() => setSubmitResult(null)} className="ml-auto p-1 hover:bg-red-100 rounded-lg">
                <X className="w-4 h-4 text-red-500" />
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="p-8 space-y-8">

            {/* Section 1: Basic Info */}
            <div className="bg-pink-50 border border-pink-100 rounded-2xl p-6 mb-8">
              <h4 className="text-sm font-bold text-pink-900 mb-4 flex items-center gap-2">
                <Search className="w-4 h-4" /> Link Approved Indent
              </h4>
              <p className="text-xs text-pink-700 mb-4">
                You must select an Indent from the Hiring Tracker with "Selected" or "Hired" interview status to proceed.
              </p>
              <div>
                <label className="text-xs font-bold text-pink-800 uppercase tracking-wider block mb-1.5">
                  Select Indent <span className="text-pink-500 ml-0.5">*</span>
                </label>
                <div className="relative max-w-md">
                  <select
                    value={form.linkedIndentNumber || ""}
                    onChange={e => {
                      const indentNo = e.target.value;
                      setField("linkedIndentNumber", indentNo);
                      
                      const selectedIndent = hiringTrackerList.find(r => r.indentNumber === indentNo);
                      if (selectedIndent) {
                        setForm(prev => ({
                          ...prev,
                          joiningCompanyName: selectedIndent.company || prev.joiningCompanyName,
                          designation: selectedIndent.post || prev.designation,
                          gender: selectedIndent.gender || prev.gender,
                        }));
                      }
                    }}
                    required
                    className="w-full px-3.5 py-2.5 bg-white border border-pink-200 rounded-xl text-sm font-bold text-slate-800 focus:border-pink-400 focus:ring-2 focus:ring-pink-100 outline-none transition-all appearance-none shadow-sm"
                  >
                    <option value="">-- Choose Approved Candidate --</option>
                    {hiringTrackerList
                      .filter(r => {
                        // Hide if already joined
                        const isJoined = joiningList.some(j => j.linkedIndentNumber === r.indentNumber);
                        if (isJoined) return false;

                        const status = r.interviewStatus?.toLowerCase() || "";
                        return status.includes("selected") || status.includes("hired");
                      })
                      .map(r => (
                        <option key={r.indentNumber} value={r.indentNumber}>
                          {r.indentNumber} - {r.post} ({r.company})
                        </option>
                      ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-pink-400 pointer-events-none" />
                </div>
              </div>
            </div>

            <div className={cn("transition-all duration-300", !form.linkedIndentNumber ? "opacity-50 pointer-events-none grayscale-[50%]" : "")}>
              <Section title="Basic Information">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {/* PMMPL-AC — auto-generated, read-only */}
                  <div>
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1.5">
                      PMMPL-AC <span className="text-pink-500 ml-0.5">*</span>
                    </label>
                    <div className="flex items-center gap-2 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                      <span className="text-sm font-bold text-slate-800 flex-1">{form.pmmplAc || "Loading…"}</span>
                      <span className="text-[10px] font-bold text-pink-600 bg-pink-100 px-2 py-0.5 rounded-lg">AUTO</span>
                    </div>
                  </div>
                  <Field label="Name As Per Aadhar" name="nameAsPerAadhar" value={form.nameAsPerAadhar} onChange={setField} required />
                  <Field label="Father Name" name="fatherName" value={form.fatherName} onChange={setField} required />
                  <Field label="Date Of Joining" name="dateOfJoining" value={form.dateOfJoining} onChange={setField} type="date" required />
                  <SelectField label="Joining Place" name="joiningPlace" value={form.joiningPlace} onChange={setField} options={JOINING_PLACE_OPTIONS} required />
                  <SelectField label="Designation" name="designation" value={form.designation} onChange={setField} options={DESIGNATION_OPTIONS} required />
                  <Field label="Salary" name="salary" value={form.salary} onChange={setField} type="number" required placeholder="₹" />
                  <Field label="Date Of Birth (Aadhar)" name="dateOfBirthAsPerAadharCard" value={form.dateOfBirthAsPerAadharCard} onChange={setField} type="date" required />
                  <SelectField label="Gender" name="gender" value={form.gender} onChange={setField} options={GENDER_OPTIONS} required />
                  <SelectField label="Blood Group" name="bloodGroup" value={form.bloodGroup} onChange={setField} options={BLOOD_GROUPS} />
                  <Field label="Identification Marks" name="identificationMarks" value={form.identificationMarks} onChange={setField} />
                  <Field label="Highest Qualification" name="highestQualification" value={form.highestQualification} onChange={setField} required />
                </div>
              </Section>

            {/* Section 2: Contact */}
            <Section title="Contact Details">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                <Field label="Mobile No." name="mobileNo" value={form.mobileNo} onChange={setField} type="tel" required />
                <Field label="Family Mobile No." name="familyMobileNo" value={form.familyMobileNo} onChange={setField} type="tel" />
                <Field label="Relationship With Family Person" name="relationshipWithFamilyPerson" value={form.relationshipWithFamilyPerson} onChange={setField} />
                <Field label="Personal Email-ID" name="personalEmailId" value={form.personalEmailId} onChange={setField} type="email" />
                <Field label="Email Address" name="emailAddress" value={form.emailAddress} onChange={setField} type="email" />
                <SelectField label="Joining Company Name" name="joiningCompanyName" value={form.joiningCompanyName} onChange={setField} options={JOINING_COMPANY_OPTIONS} required />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-5">
                <div>
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1.5">Current Address<span className="text-pink-500 ml-0.5">*</span></label>
                  <textarea
                    value={form.currentAddress}
                    onChange={e => setField("currentAddress", e.target.value)}
                    rows={3}
                    required
                    className="w-full px-3.5 py-2.5 bg-pink-50 border border-pink-100 rounded-xl text-sm font-medium text-slate-800 placeholder:text-slate-300 focus:border-pink-400 focus:ring-2 focus:ring-pink-100 outline-none transition-all resize-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1.5">Address As Per Aadhar Card<span className="text-pink-500 ml-0.5">*</span></label>
                  <textarea
                    value={form.addressAsPerAadharCard}
                    onChange={e => setField("addressAsPerAadharCard", e.target.value)}
                    rows={3}
                    required
                    className="w-full px-3.5 py-2.5 bg-pink-50 border border-pink-100 rounded-xl text-sm font-medium text-slate-800 placeholder:text-slate-300 focus:border-pink-400 focus:ring-2 focus:ring-pink-100 outline-none transition-all resize-none"
                  />
                </div>
              </div>
            </Section>

            {/* Section 3: ID Numbers */}
            <Section title="Identity & Compliance">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                <Field label="Aadhar Card No." name="aadharCardNo" value={form.aadharCardNo} onChange={setField} required />
                <Field label="Past PF ID No. (If Any)" name="pastPfIdNoIfAny" value={form.pastPfIdNoIfAny} onChange={setField} />
                <Field label="ESIC No. (If Any)" name="esicNoIfAny" value={form.esicNoIfAny} onChange={setField} />
                <SelectField label="PF Eligible" name="pfEligible" value={form.pfEligible} onChange={setField} options={PF_ESIC_OPTIONS} required />
                <SelectField label="ESIC Eligible" name="esicEligible" value={form.esicEligible} onChange={setField} options={PF_ESIC_OPTIONS} required />
                <SelectField label="Incentive Category" name="incentiveCategory" value={form.incentiveCategory} onChange={setField} options={INCENTIVE_CAT} />
              </div>
            </Section>

            {/* Section 4: Bank Details */}
            <Section title="Bank Details">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                <Field label="Current Bank A/C No." name="currentBankACNo" value={form.currentBankACNo} onChange={setField} required />
                <Field label="IFSC Code" name="ifscCode" value={form.ifscCode} onChange={setField} required />
                <Field label="Branch Name" name="branchName" value={form.branchName} onChange={setField} required />
                <SelectField label="Payment Mode" name="paymentMode" value={form.paymentMode} onChange={setField} options={PAYMENT_MODE} required />
              </div>
            </Section>

            {/* Section 5: Office Issued */}
            <Section title="Office Details">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                <Field label="Email ID To Be Issued" name="emailIdToBeIssue" value={form.emailIdToBeIssue} onChange={setField} type="email" />
                <Field label="Issue Mobile" name="issueMobile" value={form.issueMobile} onChange={setField} />
                <Field label="Issue Laptop" name="issueLaptop" value={form.issueLaptop} onChange={setField} />
                <SelectField label="Mode Of Attendance" name="modeOfAttendancea" value={form.modeOfAttendancea} onChange={setField} options={ATTENDANCE_MODE} required />
              </div>
            </Section>

            {/* Section 6: Document Uploads */}
            <Section title="Document Uploads">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {fileFields.map(f => (
                  <FileUpload
                    key={f.key}
                    label={f.label}
                    value={form[f.key]}
                    onChange={v => setField(f.key, v)}
                  />
                ))}
              </div>
            </Section>

            {/* Submit */}
            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={isSubmitting || !form.linkedIndentNumber}
                className="flex items-center gap-2.5 px-8 py-3.5 bg-pink-600 hover:bg-pink-700 active:scale-[0.98] text-white font-bold text-sm rounded-2xl shadow-lg shadow-pink-200 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> Submitting...</>
                ) : (
                  <><UserPlus className="w-5 h-5" /> Submit Joining Form</>
                )}
              </button>
            </div>
            </div>
          </form>
        </div>
      )}

      {/* ══════════════════════════════════════
          TAB: PRESENT EMPLOYEES TABLE
          ══════════════════════════════════════ */}
      {activeTab === "present" && (
        <div className="bg-white rounded-3xl border border-pink-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-pink-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-pink-600 rounded-xl">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Present Employees</h3>
                <p className="text-xs text-slate-400">All employees joined via the Joining sheet</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search name, ID, company..."
                  className="pl-9 pr-3 py-2 text-xs rounded-xl border border-pink-100 bg-pink-50 outline-none focus:ring-2 focus:ring-pink-400 font-medium text-slate-700 w-52"
                />
              </div>
              <button
                onClick={loadJoining}
                className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-pink-600 bg-pink-50 border border-pink-100 rounded-xl hover:bg-pink-100 transition-all"
              >
                <Loader2 className={cn("w-3.5 h-3.5", isLoading && "animate-spin")} />
                Refresh
              </button>
              <span className="text-xs font-bold text-slate-500 bg-pink-50 px-3 py-2 rounded-xl border border-pink-100">
                {filtered.length} Records
              </span>
            </div>
          </div>

          {isLoading ? (
            <div className="py-20 flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-pink-500" />
              <p className="text-slate-400 text-sm">Loading employees...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-20 flex flex-col items-center gap-3">
              <AlertCircle className="w-10 h-10 text-slate-200" />
              <p className="text-slate-400 font-bold">No joining records found</p>
              <p className="text-slate-300 text-sm text-center max-w-xs">
                Records will appear here once new joining forms are submitted.
              </p>
            </div>
          ) : presentDisplayColumns.length === 0 ? (
            <div className="py-20 flex flex-col items-center gap-3">
              <AlertCircle className="w-10 h-10 text-slate-200" />
              <p className="text-slate-400 font-bold">Data loaded but all fields appear empty</p>
              <p className="text-slate-300 text-sm text-center max-w-xs">
                Check the "Present Employees" sheet in Google Sheets — ensure headers are in the correct row and cells have data.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto overflow-y-auto" style={{ maxHeight: "560px" }}>
              <table className="w-full text-left" style={{ minWidth: `${(presentDisplayColumns.length + 2) * 140}px` }}>
                <thead className="bg-pink-50 border-b border-pink-100 sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-3.5 text-[10px] font-bold text-pink-500 uppercase tracking-wider whitespace-nowrap">#</th>
                    {presentDisplayColumns.map(col => (
                      <th key={col} className="px-4 py-3.5 text-[10px] font-bold text-pink-500 uppercase tracking-wider whitespace-nowrap">
                        {toLabel(col)}
                      </th>
                    ))}
                    <th className="px-4 py-3.5 text-[10px] font-bold text-pink-500 uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-pink-50">
                  {filtered.map((r: any, idx: number) => {
                    const firstCol = presentDisplayColumns[0];
                    const firstVal = r[firstCol] || "?";
                    return (
                      <tr key={idx} className="hover:bg-pink-50/40 transition-colors">
                        <td className="px-4 py-3.5 text-xs text-slate-400 font-bold">{idx + 1}</td>
                        {presentDisplayColumns.map((col, ci) => (
                          <td key={col} className="px-4 py-3.5 max-w-[200px]">
                            {ci === 0 ? (
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-lg bg-pink-600 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                                  {String(firstVal).charAt(0).toUpperCase()}
                                </div>
                                <span className="text-sm font-bold text-slate-800 truncate">{r[col] || "—"}</span>
                              </div>
                            ) : (
                              <span className="text-xs text-slate-600 font-medium truncate block">{r[col] || "—"}</span>
                            )}
                          </td>
                        ))}
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => openView(r)}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold text-pink-600 bg-pink-50 border border-pink-100 rounded-lg hover:bg-pink-100 transition-all"
                            >
                              <Eye className="w-3 h-3" /> View
                            </button>
                            <button
                              onClick={() => { setLivingTarget(r); setLivingForm(emptyLivingForm); setLivingSubmitResult(null); }}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold text-pink-700 bg-pink-50 border border-pink-100 rounded-lg hover:bg-pink-100 transition-all"

                            >
                              <LogOut className="w-3 h-3" /> Living
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════
          TAB: LIVING HISTORY
          ══════════════════════════════════════ */}
      {activeTab === "living" && (
        <div className="bg-white rounded-3xl border border-pink-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-pink-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-pink-700 rounded-xl">
                <History className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Living History</h3>
                <p className="text-xs text-slate-400">Employees who have left the organisation</p>
              </div>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex rounded-xl border border-pink-100 overflow-hidden text-xs font-bold">
                <button
                  onClick={() => setLivingView("all")}
                  className={cn("px-4 py-2 transition-all", livingView === "all" ? "bg-pink-700 text-white" : "bg-pink-50 text-pink-700 hover:bg-pink-100")}
                >
                  All Exits
                </button>
                <button
                  onClick={() => setLivingView("paid")}
                  className={cn("px-4 py-2 transition-all border-l border-pink-100", livingView === "paid" ? "bg-emerald-600 text-white" : "bg-pink-50 text-emerald-700 hover:bg-emerald-50")}
                >
                  Payment History
                </button>
              </div>
              <button
                onClick={loadLivingHistory}
                disabled={isLivingLoading}
                className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-pink-700 bg-pink-50 border border-pink-100 rounded-xl hover:bg-pink-100 transition-all disabled:opacity-60"
              >
                <Loader2 className={cn("w-3.5 h-3.5", isLivingLoading && "animate-spin")} />
                {isLivingLoading ? "Loading..." : "Refresh"}
              </button>
              <span className="text-xs font-bold text-slate-500 bg-pink-50 px-3 py-2 rounded-xl border border-pink-100">
                {livingList.length} Records
              </span>
            </div>
          </div>

          {isLivingLoading ? (
            <div className="py-20 flex flex-col items-center gap-3">
              <Loader2 className="w-10 h-10 text-pink-300 animate-spin" />
              <p className="text-slate-400 font-bold">Loading records...</p>
            </div>
          ) : livingList.length === 0 ? (
            <div className="py-20 flex flex-col items-center gap-3">
              <History className="w-10 h-10 text-slate-200" />
              <p className="text-slate-400 font-bold">No living records yet</p>
              <p className="text-slate-300 text-sm text-center max-w-xs">
                Use the Living button on a present employee to record their exit.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto overflow-y-auto" style={{ maxHeight: "560px" }}>
              <table className="w-full text-left" style={{ minWidth: "1500px" }}>
                <thead className="bg-pink-50 border-b border-pink-100 sticky top-0 z-10">
                  <tr>
                    {["#", "PMMPL-AC", "Employee Name", "Designation", "Date Of Living", "Working Days", "Amount", "Assets", "Clearance", "Doc Signed", "Email/Bio", "Benefits", "Pay Planned", "Payment Form", "Salary Payment"].map(h => (
                      <th key={h} className={cn(
                        "px-4 py-3.5 text-[10px] font-bold uppercase tracking-wider whitespace-nowrap",
                        h === "Salary Payment" ? "text-emerald-700" : h === "Payment Form" ? "text-blue-600" : "text-pink-600"
                      )}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-pink-50">
                  {(livingView === "paid" ? livingList.filter(r => r.actual1) : livingList).map((r: any, idx: number) => (
                    <tr key={idx} className="hover:bg-pink-50/40 transition-colors">
                      <td className="px-4 py-3.5 text-xs text-slate-400 font-bold">{idx + 1}</td>
                      <td className="px-4 py-3.5 text-xs font-bold text-pink-700">{r.pmmplAc || "—"}</td>
                      <td className="px-4 py-3.5 text-sm font-bold text-slate-800">{r.nameAsPerAadhar || r.employeeName || "—"}</td>
                      <td className="px-4 py-3.5 text-xs text-slate-600">{r.designation || "—"}</td>
                      <td className="px-4 py-3.5 text-xs font-bold text-slate-700">{r.dateOfLiving || "—"}</td>
                      <td className="px-4 py-3.5 text-xs text-slate-600">{r.totalWorkingDays || "—"}</td>
                      <td className="px-4 py-3.5 text-xs text-slate-600">{r.amount || "—"}</td>
                      {["handoverAssets", "clearanceForm", "handoverDocSigned", "cancelEmailBiometric", "removeBenefitEnrollment"].map(key => (
                        <td key={key} className="px-4 py-3.5">
                          <span className={cn(
                            "text-[10px] font-bold px-2 py-0.5 rounded-lg",
                            r[key] === "Yes" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-400"
                          )}>{r[key] || "—"}</span>
                        </td>
                      ))}
                      <td className="px-4 py-3.5 text-xs text-slate-500">{r.planned1 || "—"}</td>
                      <td className="px-4 py-3.5">
                        {r.makePaymentForm && r.makePaymentForm.toString().startsWith("http") ? (
                          <a
                            href={r.makePaymentForm}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] font-bold text-blue-600 hover:text-blue-800 underline underline-offset-2 whitespace-nowrap"
                          >
                            Open Form
                          </a>
                        ) : (
                          <span className="text-[10px] text-slate-400">{r.makePaymentForm || "—"}</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        {r.actual1 ? (
                          <button
                            onClick={() => openPaymentModal(r)}
                            className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-all"
                          >
                            Payment Done
                          </button>
                        ) : isAdmin ? (
                          <button
                            onClick={() => openPaymentModal(r)}
                            disabled={paymentLoadingId === r.pmmplAc}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold text-white bg-pink-700 hover:bg-pink-800 rounded-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap"
                          >
                            {paymentLoadingId === r.pmmplAc ? (
                              <><Loader2 className="w-3 h-3 animate-spin" /> Saving...</>
                            ) : (
                              "Mark Paid"
                            )}
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-400">Pending</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Payment Modal ── */}
      {paymentModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">

            {/* Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-emerald-50 to-emerald-50 border-b border-emerald-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600" /> Living Salary Payment
                </h3>
                <p className="text-xs text-emerald-700 font-bold mt-0.5">
                  {paymentModal.nameAsPerAadhar || paymentModal.employeeName || "—"} · {paymentModal.pmmplAc || "—"}
                </p>
              </div>
              <button onClick={() => setPaymentModal(null)} className="p-2 hover:bg-emerald-100 rounded-xl transition-colors">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            {/* Details */}
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Designation",     value: paymentModal.designation },
                  { label: "Date Of Living",  value: paymentModal.dateOfLiving },
                  { label: "Working Days",    value: paymentModal.totalWorkingDays },
                  { label: "Amount",          value: paymentModal.amount ? `₹ ${paymentModal.amount}` : undefined },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-slate-50 rounded-xl px-4 py-3">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</p>
                    <p className="text-sm font-bold text-slate-800 mt-0.5">{value || "—"}</p>
                  </div>
                ))}
              </div>

              {paymentModal.actual1 ? (
                <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-emerald-700">Payment Already Done</p>
                    <p className="text-[10px] text-emerald-600 mt-0.5">{paymentModal.actual1}</p>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1.5">
                    Payment Date <span className="text-emerald-600 ml-0.5">*</span>
                  </label>
                  <input
                    type="date"
                    value={paymentDate}
                    onChange={e => setPaymentDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-emerald-50 border border-emerald-100 rounded-xl text-sm font-medium text-slate-800 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none transition-all"
                  />
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-emerald-100 flex justify-end gap-3 bg-emerald-50/50">
              <button
                onClick={() => setPaymentModal(null)}
                className="px-5 py-2.5 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all"
              >
                Cancel
              </button>
              {!paymentModal.actual1 && (
                <button
                  onClick={handlePaymentApprove}
                  disabled={!paymentDate || paymentLoadingId === paymentModal.pmmplAc}
                  className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md shadow-emerald-200 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {paymentLoadingId === paymentModal.pmmplAc ? (
                    <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...</>
                  ) : (
                    <><CheckCircle className="w-3.5 h-3.5" /> Save Payment</>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── View Record Modal ── */}
      {viewRecord && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-pink-100 flex items-center justify-between bg-gradient-to-r from-pink-50 to-pink-50">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {viewRecord.nameAsPerAadhar || viewRecord.employeeName || viewRecord.name || viewRecord[presentDisplayColumns[0]] || "Record Detail"}
                </h3>
                <p className="text-xs text-pink-600 font-bold">
                  {viewRecord.pmmplAc || viewRecord.employeeId || viewRecord.employeeCode || viewRecord[presentDisplayColumns[1]] || ""}
                </p>
              </div>
              <button onClick={() => setViewRecord(null)} className="p-2 hover:bg-pink-100 rounded-xl transition-colors">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div className="overflow-y-auto p-6">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {Object.entries(viewRecord)
                  .filter(([k, v]) => {
                    if (k.startsWith("_")) return false;
                    if (!v || !String(v).trim()) return false;
                    const s = String(v);
                    if (s.startsWith("data:")) return false;
                    return true;
                  })
                  .map(([k, v]) => {
                    const isLink = String(v).startsWith("https://");
                    const label = toLabel(k);
                    return (
                      <div key={k} className="bg-pink-50 rounded-xl p-3 border border-pink-100">
                        <p className="text-[10px] font-bold text-pink-400 uppercase tracking-wider mb-1">{label}</p>
                        {isLink ? (
                          <a href={String(v)} target="_blank" rel="noopener noreferrer"
                            className="text-xs font-bold text-pink-600 underline break-all">
                            View File
                          </a>
                        ) : (
                          <p className="text-sm font-bold text-slate-700 break-words">{v as string}</p>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        </div>
      )}
      {/* ── Living / Exit Modal ── */}
      {livingTarget && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-pink-100 flex items-center justify-between bg-gradient-to-r from-pink-50 to-pink-50">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <LogOut className="w-4 h-4 text-pink-600" /> Living / Exit Clearance
                </h3>
                <p className="text-xs text-pink-700 font-bold mt-0.5">
                  {livingTarget.nameAsPerAadhar || "—"} · {livingTarget.pmmplAc || "—"}
                </p>
              </div>
              <button onClick={() => setLivingTarget(null)} className="p-2 hover:bg-pink-100 rounded-xl transition-colors">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="overflow-y-auto p-6 space-y-5">
              {livingSubmitResult === "success" && (
                <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                  <p className="text-xs font-bold text-emerald-700">Living record saved successfully!</p>
                </div>
              )}
              {livingSubmitResult === "error" && (
                <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-red-700">Failed to save</p>
                    {livingErrorMsg && <p className="text-[10px] text-red-500 mt-0.5 break-all">{livingErrorMsg}</p>}
                  </div>
                </div>
              )}

              {/* Date of Living */}
              <div>
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1.5">
                  Date Of Living <span className="text-pink-600 ml-0.5">*</span>
                </label>
                <input
                  type="date"
                  value={livingForm.dateOfLiving}
                  onChange={e => setLivingForm(f => ({ ...f, dateOfLiving: e.target.value }))}
                  className="w-full px-3.5 py-2.5 bg-pink-50 border border-pink-100 rounded-xl text-sm font-medium text-slate-800 focus:border-pink-500 focus:ring-2 focus:ring-pink-100 outline-none transition-all"
                />
              </div>

              {/* Total Working Days & Amount */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1.5">
                    Total Working Days
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 26"
                    value={livingForm.totalWorkingDays}
                    onChange={e => setLivingForm(f => ({ ...f, totalWorkingDays: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-pink-50 border border-pink-100 rounded-xl text-sm font-medium text-slate-800 focus:border-pink-500 focus:ring-2 focus:ring-pink-100 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-1.5">
                    Amount
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 15000"
                    value={livingForm.amount}
                    onChange={e => setLivingForm(f => ({ ...f, amount: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-pink-50 border border-pink-100 rounded-xl text-sm font-medium text-slate-800 focus:border-pink-500 focus:ring-2 focus:ring-pink-100 outline-none transition-all"
                  />
                </div>
              </div>

              {/* Checklist */}
              <div className="space-y-3">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Exit Checklist</p>
                {([
                  { key: "handoverAssets",         label: "Handover Of Assets, Id Card, Visiting Card" },
                  { key: "clearanceForm",           label: "Employee Clearance Form" },
                  { key: "handoverDocSigned",       label: "Handover Document Signed and Accepted" },
                  { key: "cancelEmailBiometric",    label: "Cancellation Of Email Id, Biometric Access, WhatsApp" },
                  { key: "removeBenefitEnrollment", label: "Remove Benefit Enrollment" },
                ] as { key: keyof LivingForm; label: string }[]).map(item => (
                  <label key={item.key} className={cn(
                    "flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all select-none",
                    livingForm[item.key]
                      ? "bg-emerald-50 border-emerald-200"
                      : "bg-slate-50 border-slate-200 hover:border-pink-300 hover:bg-pink-50"
                  )}>
                    <div className={cn(
                      "w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all",
                      livingForm[item.key] ? "bg-emerald-500 border-emerald-500" : "border-slate-300"
                    )}>
                      {livingForm[item.key] && <CheckCircle className="w-3.5 h-3.5 text-white" />}
                    </div>
                    <input
                      type="checkbox"
                      className="hidden"
                      checked={livingForm[item.key] as boolean}
                      onChange={e => setLivingForm(f => ({ ...f, [item.key]: e.target.checked }))}
                    />
                    <span className="text-sm font-medium text-slate-700">{item.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="px-6 py-4 border-t border-pink-100 flex justify-end gap-3 bg-pink-50/50">
              <button
                onClick={() => setLivingTarget(null)}
                className="px-5 py-2.5 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleLivingSubmit}
                disabled={isLivingSubmitting || !livingForm.dateOfLiving}
                className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-pink-700 hover:bg-pink-800 rounded-xl shadow-md shadow-pink-300 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isLivingSubmitting ? (
                  <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...</>
                ) : (
                  <><LogOut className="w-3.5 h-3.5" /> Mark as Living</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-3 mb-5">
        <h4 className="text-sm font-bold text-pink-700 uppercase tracking-wider">{title}</h4>
        <div className="flex-1 h-px bg-pink-100" />
      </div>
      {children}
    </div>
  );
}
