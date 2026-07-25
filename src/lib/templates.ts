export const DEFAULT_TEMPLATES: Record<string, string> = {
  "Offer Letter": `
<div style="font-weight: bold; margin-bottom: 20px; font-size: 13px;">
  <p style="margin: 0;">Ms./Mr. {{FullName}}</p>
  <p style="margin: 0;">{{PlaceOfPosting}}</p>
  <p style="margin: 0;">Contact No: {{MobileNumber}}</p>
</div>

<div style="font-weight: bold; text-decoration: underline; margin-bottom: 20px; font-style: italic; font-size: 13px;">
  This refers to our discussion and your application for employment in the organization.
</div>

<p style="font-weight: bold;">Congratulations!</p>
<p style="text-align: justify; margin-bottom: 15px;">With reference to your application and subsequent interview you had with us for a career in our organization. We are pleased to inform you that you have been selected for the employment in our organization and designated as "<strong>{{Designation}}</strong>" at {{CompanyName}} {{PlaceOfPosting}}.</p>

<p style="text-align: justify; margin-bottom: 15px;">As per our discussion, you will be paid a monthly salary of <strong>CTC Rs. {{MonthlySalary}}/-</strong> for the first three (3) months of your employment, which shall be treated as your probation period. Out of the agreed monthly salary, an amount of Rs. 5,000/- per month will be retained by the Company during the probation period. The accumulated retained amount of Rs. 15,000/- for the first three months will be paid to you along with your 4th month's salary, subject to your successful completion of the probation period and continued employment with the Company. Upon successful completion of the probation period, your monthly salary shall be <strong>CTC Rs. {{MonthlySalary}}/-</strong> effective from the 4th month onwards.</p>

<p style="text-align: justify; margin-bottom: 15px;">In addition, you will be on probation for <strong>{{ProbationPeriod}}</strong> from your date of joining. During the probation, this appointment is terminable from either side by giving {{NoticePeriod}} notice in writing. On confirmation, this appointment is terminable from either side by giving 30 days notice in writing.</p>

<p style="text-align: justify; margin-bottom: 15px;">At the time of joining, you are required to submit <strong>one signed cheque</strong> equivalent to your <strong>gross monthly salary</strong> as a security deposit. The cheque will be kept in the Company's safe custody and may be used only for recovery of any outstanding dues or notice period liabilities, if applicable, as per Company policy. It will be returned after successful completion of your Full & Final Settlement.</p>

<p style="text-align: justify; margin-bottom: 15px;">In the event of separation from the organization whether by resignation, termination or completion of employment, the employee is required to return all company property in their possession. This includes but not limited to ID cards, Laptops, Mobile devices, documents, files, access cards. And any other documents or materials provided by the company so that you are eligible for relieving letter and your full and final settlement.</p>

<p style="text-align: justify; margin-bottom: 15px;">You shall not disclose any information relating to the company or its associates to any unauthorized person, firm or company or any other agency whatsoever either during the currency of your employment or after its termination. Similarly, you will also keep the information relating to your pay package confidential. We strongly believe that your contribution will play a pivotal role in the Company's triumph. Please sign and return the duplicate copy of this letter to signify your acceptance of the above terms and conditions.</p>
`,
  "Appointment Letter": `
<div style="font-weight: bold; margin-bottom: 20px; font-size: 13px;">
  <p style="margin: 0;">To,</p>
  <p style="margin: 0;">Ms./Mr. {{FullName}}</p>
  <p style="margin: 0;">Designation: {{Designation}}</p>
  <p style="margin: 0;">Employee ID: {{CandidateId}}</p>
</div>

<div style="font-weight: bold; margin-bottom: 20px; font-size: 13px;">
  Subject: Appointment as {{Designation}}
</div>

<p style="margin-bottom: 15px;">Dear Ms./Mr. {{FullName}},</p>
<p style="text-align: justify; margin-bottom: 15px;">We are pleased to appoint you as <strong>{{Designation}}</strong> at <strong>{{CompanyName}}</strong>, effective from <strong>{{DateOfJoining}}</strong>.</p>
<p style="text-align: justify; margin-bottom: 15px;">Your employment will be governed by the following terms and conditions:</p>

<p style="font-weight: bold; margin-bottom: 10px;">Terms & Conditions:</p>
<ol style="margin-top: 0; margin-bottom: 15px; text-align: justify; padding-left: 20px;">
  <li style="margin-bottom: 5px;">Your place of posting will be at <strong>{{CompanyName}}</strong>, or any other location as decided by the management.</li>
  <li style="margin-bottom: 5px;">Your monthly salary (CTC/Gross Salary) will be <strong>₹{{MonthlySalary}} per month</strong>, as per company policy and applicable deductions.</li>
  <li style="margin-bottom: 5px;">You shall perform your duties sincerely, honestly, and efficiently as assigned by the management from time to time.</li>
  <li style="margin-bottom: 5px;">You are required to maintain discipline, confidentiality, and comply with all company rules and regulations.</li>
  <li style="margin-bottom: 5px;"><strong>Working Hours:</strong> The company follows flexible working hours; however, the standard working window is from <strong>10:00 AM to 7:00 PM</strong>. Employees are required to complete a minimum of <strong>8 (Eight) working hours per day</strong>.</li>
</ol>

<p style="font-weight: bold; margin-bottom: 10px;">Social Benefits:</p>
<p style="text-align: justify; margin-bottom: 15px;">The employee shall be eligible for statutory and company-provided benefits including <strong>Provident Fund (PF), ESIC, Group Personal Accident, Incentive, Bonus, and Gratuity</strong>, as applicable.</p>

<p style="font-weight: bold; margin-bottom: 10px;">Notice Period:</p>
<ol start="6" style="margin-top: 0; margin-bottom: 15px; text-align: justify; padding-left: 20px;">
  <li style="margin-bottom: 5px;">Either party may terminate this employment by giving <strong>30 (Thirty) days prior written notice</strong>.</li>
  <li style="margin-bottom: 5px;">The employee must serve the complete <strong>30-day notice period</strong> before leaving the organization.</li>
  <li style="margin-bottom: 5px;">In case the employee fails to complete the required notice period or leaves without proper notice/approval, the company reserves the right to make a proportionate <strong>deduction from salary, pending dues, incentives, or any payable amount equivalent to the notice period shortfall</strong>.</li>
  <li style="margin-bottom: 5px;">The company reserves the right to recover any company dues, advances, or liabilities from the employee.</li>
</ol>

<p style="font-weight: bold; margin-bottom: 10px;">Security & Recovery Clause:</p>
<ol start="10" style="margin-top: 0; margin-bottom: 15px; text-align: justify; padding-left: 20px;">
  <li style="margin-bottom: 5px;">The employee shall submit a signed security cheque to the organization at the time of joining as a security towards compliance with company policies and obligations.</li>
</ol>

<p style="font-weight: bold; margin-bottom: 5px;">Cheque Details:</p>
<p style="margin: 0; margin-bottom: 3px;">Cheque No.: <strong>{{ChequeNo}}</strong></p>
<p style="margin: 0; margin-bottom: 3px;">Bank Name: <strong>{{BankName}}</strong></p>
<p style="margin: 0; margin-bottom: 15px;">Account Holder Name: <strong>{{AccountHolderName}}</strong></p>

<ol start="11" style="margin-top: 0; margin-bottom: 15px; text-align: justify; padding-left: 20px;">
  <li style="margin-bottom: 5px;">In case the employee leaves the organization without serving the mandatory 30-day notice period, absconds from duties, or fails to clear outstanding dues, the company shall have the right to recover the applicable amount from salary, full & final settlement, or other dues payable to the employee.</li>
  <li style="margin-bottom: 5px;">If any recovery amount remains unpaid after settlement, the company reserves the right to initiate legal recovery proceedings as per applicable laws and company policy. The Company will use the security cheque which is submitted at the time of employment or during the course of employment, the Company may recover the pending amount by presenting or utilizing the said security cheque, strictly subject to applicable statutory provisions and Company policy.</li>
</ol>

<p style="text-align: justify; margin-bottom: 15px;">Any misconduct, negligence, or violation of company policies may result in disciplinary action, including termination.</p>
<p style="text-align: justify; margin-bottom: 15px;">Please sign and return a copy of this letter as acceptance of the above terms and conditions.</p>
<p style="text-align: justify; margin-bottom: 30px;">We welcome you to the organization and wish you success.</p>

<p style="margin-bottom: 50px;">Sincerely,</p>
<p style="font-weight: bold; margin-bottom: 5px;">Authorized Signatory</p>
<p style="margin: 0; margin-bottom: 5px;">Name: ______________________</p>
<p style="margin: 0; margin-bottom: 30px;">Designation: _________________</p>

<p style="font-weight: bold; margin-bottom: 10px;">Employee Acceptance</p>
<p style="text-align: justify; margin-bottom: 40px;">I, <strong>Ms./Mr. {{FullName}}</strong>, have read and understood all terms and conditions mentioned above and agree to abide by them.</p>

<div style="display: flex; justify-content: space-between;">
  <div>
    <p style="margin: 0; margin-bottom: 5px;">Employee Signature: ______________________</p>
    <p style="margin: 0;">Date: ______________________</p>
  </div>
</div>
`,
  "Probation Extension Letter": `
<div style="font-weight: bold; margin-bottom: 20px; font-size: 13px;">
  <p style="margin: 0;">To,</p>
  <p style="margin: 0;">Ms./Mr. {{FullName}}</p>
  <p style="margin: 0;">Employee ID - {{CandidateId}}</p>
  <p style="margin: 0;">Designation - {{Designation}}</p>
</div>

<p style="font-weight: bold; text-decoration: underline; margin-bottom: 20px; text-align: center; font-size: 14px;">
  Subject: Extension of Probation Period
</p>

<p style="margin-bottom: 15px;">Dear Ms./Mr. {{FullName}},</p>
<p style="text-align: justify; margin-bottom: 15px;">This is with reference to your appointment letter dated <strong>{{DateOfJoining}}</strong> and your subsequent joining the organization as <strong>{{Designation}}</strong>.</p>
<p style="text-align: justify; margin-bottom: 15px;">As per the terms of your employment, your performance was reviewed at the end of your initial probation period. While we appreciate your efforts, we feel that you need some more time to meet the expected performance standards for your role.</p>
<p style="text-align: justify; margin-bottom: 15px;">Therefore, the management has decided to extend your probation period for a further duration of <strong>{{ProbationPeriod}}</strong> effective from <strong>{{DateOfJoining}}</strong>.</p>
<p style="text-align: justify; margin-bottom: 15px;">During this extended probation period, all other terms and conditions of your employment will remain unchanged as per your original appointment letter.</p>
<p style="text-align: justify; margin-bottom: 30px;">We expect to see significant improvement in your performance during this period and wish you the very best.</p>

<p style="margin-bottom: 50px;">Sincerely,</p>
<p style="font-weight: bold;">Authorized Signatory</p>
`,
  "Resignation Acceptance Letter": `
<div style="font-weight: bold; margin-bottom: 20px; font-size: 13px;">
  <p style="margin: 0;">To,</p>
  <p style="margin: 0;">Ms./Mr. {{FullName}}</p>
  <p style="margin: 0;">Employee ID - {{CandidateId}}</p>
  <p style="margin: 0;">Designation - {{Designation}}</p>
</div>

<p style="font-weight: bold; text-decoration: underline; margin-bottom: 20px; text-align: center; font-size: 14px;">
  Subject: Acceptance of Resignation
</p>

<p style="margin-bottom: 15px;">Dear Ms./Mr. {{FullName}},</p>
<p style="text-align: justify; margin-bottom: 15px;">This is to acknowledge the receipt of your resignation letter dated <strong>{{DocumentDate}}</strong>.</p>
<p style="text-align: justify; margin-bottom: 15px;">The management has formally accepted your resignation. As per company policy, you are required to serve a notice period of <strong>{{NoticePeriod}}</strong>. Accordingly, your last working day with the organization will be <strong>{{LastWorkingDate}}</strong>.</p>
<p style="text-align: justify; margin-bottom: 15px;">You are requested to hand over your charge, return all company assets, and complete the necessary exit formalities before your last working day to facilitate a smooth full and final settlement of your dues.</p>
<p style="text-align: justify; margin-bottom: 30px;">We thank you for your services to the company and wish you success in your future endeavors.</p>

<p style="margin-bottom: 50px;">Sincerely,</p>
<p style="font-weight: bold;">Authorized Signatory</p>
`,
  "Regret Letter": `
<div style="font-weight: bold; margin-bottom: 20px; font-size: 13px;">
  <p style="margin: 0;">To,</p>
  <p style="margin: 0;">Ms./Mr. {{FullName}}</p>
</div>

<p style="font-weight: bold; text-decoration: underline; margin-bottom: 20px; text-align: center; font-size: 14px;">
  Subject: Update on your application for {{Designation}}
</p>

<p style="margin-bottom: 15px;">Dear Ms./Mr. {{FullName}},</p>
<p style="text-align: justify; margin-bottom: 15px;">Thank you for taking the time to apply for the position of <strong>{{Designation}}</strong> at <strong>{{CompanyName}}</strong> and for participating in the interview process.</p>
<p style="text-align: justify; margin-bottom: 15px;">We had the opportunity to review several strong candidates for this role. While your qualifications are impressive, we regret to inform you that we have decided to move forward with another candidate whose experience better aligns with our current needs.</p>
<p style="text-align: justify; margin-bottom: 15px;">We will keep your resume in our database and may reach out to you if a suitable position opens up in the future.</p>
<p style="text-align: justify; margin-bottom: 30px;">We appreciate your interest in our organization and wish you the best in your career search.</p>

<p style="margin-bottom: 50px;">Sincerely,</p>
<p style="font-weight: bold;">Human Resources</p>
<p style="font-weight: bold;">{{CompanyName}}</p>
`,
  "Relieving Letter": `
<div style="font-weight: bold; margin-bottom: 20px; font-size: 13px;">
  <p style="margin: 0;">To,</p>
  <p style="margin: 0;">Ms./Mr. {{FullName}}</p>
  <p style="margin: 0;">Employee ID - {{CandidateId}}</p>
  <p style="margin: 0;">Designation - {{Designation}}</p>
</div>

<p style="text-align: justify; margin-bottom: 15px;">This is to certify that <strong>Ms./Mr. {{FullName}}</strong> was employed with <strong>{{CompanyName}}</strong> as <strong>{{Designation}}</strong> from <strong>{{DateOfJoining}}</strong> to <strong>{{LastWorkingDate}}</strong>.</p>
<p style="text-align: justify; margin-bottom: 15px;"><strong>Ms./Mr. {{FullName}}</strong> has completed all assigned responsibilities and has been formally relieved from their duties effective from <strong>{{LastWorkingDate}}</strong>. Company property and obligations have been duly settled.</p>
<p style="text-align: justify; margin-bottom: 30px;">We appreciate their contributions during their tenure with the organization and wish them success in their future endeavours.</p>

<p style="margin-bottom: 40px;">Sincerely,</p>
<p style="font-weight: bold; margin-bottom: 50px;">Authorized Signatory</p>
<p style="font-weight: bold;">{{CompanyName}}</p>
`,
  "Termination Letter": `
<div style="font-weight: bold; margin-bottom: 20px; font-size: 13px;">
  <p style="margin: 0;">To,</p>
  <p style="margin: 0;">Ms./Mr. {{FullName}}</p>
  <p style="margin: 0;">Employee ID - {{CandidateId}}</p>
  <p style="margin: 0;">Designation - {{Designation}}</p>
</div>

<p style="font-weight: bold; text-decoration: underline; margin-bottom: 20px; text-align: center; font-size: 14px;">
  Subject: Notice of Termination of Employment
</p>

<p style="margin-bottom: 15px;">Dear Ms./Mr. {{FullName}},</p>
<p style="text-align: justify; margin-bottom: 15px;">This letter serves as formal notification that your employment with <strong>{{CompanyName}}</strong> is terminated, effective <strong>{{LastWorkingDate}}</strong>.</p>
<p style="text-align: justify; margin-bottom: 15px;">This decision was made after careful consideration of recent events and your failure to adhere to company policies, despite prior warnings and opportunities for improvement.</p>
<p style="text-align: justify; margin-bottom: 15px;">You are required to return all company property, including but not limited to your ID card, laptop, and any other company documents or assets in your possession, immediately.</p>
<p style="text-align: justify; margin-bottom: 30px;">Your full and final settlement will be processed in accordance with company policy, subject to clearance from all respective departments.</p>

<p style="margin-bottom: 50px;">Sincerely,</p>
<p style="font-weight: bold;">Authorized Signatory</p>
`
};

export const parseTemplate = (templateHtml: string, tokens: Record<string, string>) => {
  let result = templateHtml;
  for (const [key, value] of Object.entries(tokens)) {
    // Replace all instances of {{Key}} with value
    const regex = new RegExp("\\{\\{" + key + "\\}\\}", 'g');
    result = result.replace(regex, value || "");
  }
  return result.trim();
};
