export interface SalaryIncrementFms {
  timestamp: string;
  uniqueNo: string;
  employeeCode: string;
  employeeName: string;
  designation: string;
  dateOfJoining: string;
  joiningCompanyName: string;
  joiningSalary: string;
  currentSalary: string;
  department: string;
  lastIncrementAmount: string;
  lastIncrementDate: string;
  hod: string;
  planned: string;
  actual: string;
  delay: string;
  hodAmount: string;
  hodFeedback: string;
  planned2: string;
  actual2: string;
  delay2: string;
  mgmtAmount: string;
  mgmtFeedback: string;
  planned3: string;
  actual3: string;
  delay3: string;
  dateOfIncrement: string;
  currentSalaryAfterIncrement: string;
  incrementAmount: string;
  nextIncrementNoOfMonth: string;
  note: string;
  status: string;
  status2: string;
  status3: string;
  _row?: number;
}


export type Role = "Staf" | "Admin" | "HOD";

// ... existing interfaces ...

export interface User {
  employeeId: string;
  name: string;
  designation: string;
  companyName: string;
  role: Role;
  cl: number;
  el: number;
  ml: number;
  hod: string;
  mailId?: string;
}


export interface PunchMissFms {
  timestamp: string;
  pmNo: string;
  inOut: "In" | "Out";
  date: string;
  employeeId: string;
  name: string;
  reason: string;
  punchMissTime: string;
  image: string;
  planned: string;
  actual: string;
  delay: string;
  status: string;
  _row?: number;
}


export interface LeaveFms {
  timestamp: string;
  leaveNo: string;
  typeOfLeave: string;
  company: string;
  employeeIdCode: string;
  nameOfEmployee: string;
  reasonForRequestedLeave: string;
  dateRequestedFrom: string;
  dateRequestedTo: string;
  noOfDays: number;
  medicalCertificate?: string;
  planned1: string;
  actual1: string;
  delay1: string;
  status1: string;
  planned2: string;
  actual2: string;
  delay2: string;
  status2: string;
  _row?: number;
}



export interface HolidayWorkingFms {
  timestamp: string;
  holidayWorkingNo: string;
  employeeId: string;
  name: string;
  companyName: string;
  status1: string;
  workingDateFrom: string;
  workingDateTo: string;
  numberOfDays: number;
  reason: string;
  planned1: string;
  actual1: string;
  delay1: string;
  status2: string;
  adjustDays: string;
  adjustMonth: string;
  adjustYear: string;
  remarks: string;
  planned2: string;
  actual2: string;
  delay2: string;
  status3: string;
  _row?: number;
}


export interface Attendance {
  year: string;
  month: string;
  department: string;
  empId: string;
  name: string;
  company: string;
  designation: string;
  date: string;
  in: string;
  out: string;
  missStatus: string;
  punchMissIn: string;
  punchMissOut: string;
  workingHour: string;
  ge8Hour: string;
  fourToEightHour: string;
  lt4Hour: string;
  punchMiss: string;
  punchMissApproved: string;
  actualPunchMiss: string;
}

export interface SalaryRecord {
  employeeCode: string;
  employeeName: string;
  company: string;
  location: string;
  designation: string;
  mode: string;
  bankName: string;
  bankAccountNumber: string;
  ifscCode: string;
  uan: string;
  insuranceId: string;
  noOfDaysPresent: string;
  calculationDays: string;
  totalActual: string;
  basic: string;
  conveyance: string;
  hra: string;
  medicalAllowance: string;
  specialAllowance: string;
  otherAllowances: string;
  payment: string;
  matchWithPayment: string;
  employeeContri12: string;
  toBePaidAfterPF: string;
  additionalSalary: string;
  employerContri833: string;
  employerContri367: string;
  adminExp11: string;
  employeeESIC075: string;
  employerESIC325: string;
  email: string;
  joiningDate: string;
  year: string;
  month: string;
}
