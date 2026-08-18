import { useState, useEffect, useCallback } from "react";
import { api } from "../services/api";
import {
  Settings, UserPlus, Search, Loader2, Pencil, Trash2, X,
  CheckCircle, AlertCircle, ShieldCheck
} from "lucide-react";
import { cn } from "../lib/utils";

const ROLE_OPTIONS = ["Staf", "HOD", "Admin"];
const COMPANY_OPTIONS = ["Pmmpl", "Purab", "Refrasynth", "Refratech", "Rkl", "Pasmin Llp"];

type UserRow = {
  employeeId: string;
  name?: string;
  designation?: string;
  companyName?: string;
  role?: string;
  cl?: string;
  el?: string;
  ml?: string;
  hod?: string;
  hasPassword?: boolean;
  _row?: number;
};

type UserForm = {
  employeeId: string;
  password: string;
  name: string;
  designation: string;
  companyName: string;
  role: string;
  cl: string;
  el: string;
  ml: string;
  hod: string;
};

const emptyForm: UserForm = {
  employeeId: "", password: "", name: "", designation: "",
  companyName: "Pmmpl", role: "Staf", cl: "", el: "", ml: "", hod: "",
};

const presentEmpId = (r: any) => (r.pmmplAc || r.employeeId || r.employeeCode || "").toString().trim();
const presentEmpName = (r: any) => (r.nameAsPerAadhar || r.employeeName || r.name || "").toString().trim();

const roleBadgeClass = (role?: string) => {
  if (role === "Admin") return "bg-pink-100 text-pink-700 border-pink-200";
  if (role === "HOD") return "bg-amber-100 text-amber-700 border-amber-200";
  return "bg-slate-100 text-slate-600 border-slate-200";
};

export const SettingsModule = () => {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [presentEmployees, setPresentEmployees] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState("");

  const [editTarget, setEditTarget] = useState<UserRow | null>(null); // null = add mode when modal open
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<UserForm>(emptyForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [deleteTarget, setDeleteTarget] = useState<UserRow | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await api.getUsers();
      setUsers(Array.isArray(res) ? res : []);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
    api.getPresentEmployees().then(res => setPresentEmployees(Array.isArray(res) ? res : []));
  }, [loadUsers]);

  // Employee IDs from "Present Employees" that don't already have a login account.
  const existingUserIds = new Set(users.map(u => (u.employeeId || "").toString().trim()));
  const employeeOptions = presentEmployees
    .map(r => ({ id: presentEmpId(r), name: presentEmpName(r), raw: r }))
    .filter((r, idx, arr) => r.id && !existingUserIds.has(r.id) && arr.findIndex(x => x.id === r.id) === idx);

  const openAdd = () => {
    setEditTarget(null);
    setForm(emptyForm);
    setErrorMsg("");
    setShowModal(true);
  };

  const handleEmployeeIdSelect = (id: string) => {
    const match = employeeOptions.find(e => e.id === id)?.raw;
    setForm(f => ({
      ...f,
      employeeId: id,
      name: match ? presentEmpName(match) : f.name,
      designation: match?.designation || f.designation,
      companyName: match?.companyName || match?.joiningCompanyName || f.companyName,
    }));
  };

  const openEdit = (u: UserRow) => {
    setEditTarget(u);
    setForm({
      employeeId: u.employeeId || "",
      password: "",
      name: u.name || "",
      designation: u.designation || "",
      companyName: u.companyName || "Pmmpl",
      role: u.role || "Staf",
      cl: u.cl?.toString() || "",
      el: u.el?.toString() || "",
      ml: u.ml?.toString() || "",
      hod: u.hod || "",
    });
    setErrorMsg("");
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditTarget(null);
    setForm(emptyForm);
    setErrorMsg("");
  };

  const handleSubmit = async () => {
    if (!form.employeeId.trim()) { setErrorMsg("Employee ID is required"); return; }
    if (!editTarget && !form.password.trim()) { setErrorMsg("Password is required"); return; }

    setIsSubmitting(true);
    setErrorMsg("");
    try {
      const res = editTarget ? await api.updateUser(form) : await api.addUser(form);
      if (res.ok) {
        await loadUsers();
        closeModal();
      } else {
        setErrorMsg(res.error || "Failed to save");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await api.deleteUser(deleteTarget.employeeId);
      if (res.ok) {
        await loadUsers();
        setDeleteTarget(null);
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const filtered = users.filter(u => {
    if (!search) return true;
    const q = search.toLowerCase();
    return [u.employeeId, u.name, u.designation, u.companyName, u.role]
      .some(v => (v || "").toString().toLowerCase().includes(q));
  });

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="bg-white rounded-3xl border border-pink-100 shadow-sm p-6 flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-pink-600 rounded-2xl">
            <Settings className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">Settings</h2>
            <p className="text-sm text-slate-400">Manage user accounts &amp; roles (User sheet)</p>
          </div>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2.5 bg-pink-600 text-white text-sm font-bold rounded-xl hover:bg-pink-700 transition-all shadow-lg shadow-pink-100"
        >
          <UserPlus className="w-4 h-4" /> Add User
        </button>
      </div>

      {/* ── Table ── */}
      <div className="bg-white rounded-3xl border border-pink-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-pink-50 flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search users..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-xl outline-none focus:border-pink-400"
            />
          </div>
          <span className="text-xs text-slate-400 font-medium ml-auto">{filtered.length} user(s)</span>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-pink-600" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-sm text-slate-400">No users found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-pink-50 bg-pink-50/40">
                  {["#", "Employee ID", "Name", "Designation", "Company", "Role", "CL / EL / ML", "HOD", ""].map(h => (
                    <th key={h} className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-pink-50">
                {filtered.map((u, idx) => (
                  <tr key={u.employeeId + idx} className="hover:bg-pink-50/40 transition-colors">
                    <td className="px-4 py-3.5 text-xs text-slate-400 font-bold">{idx + 1}</td>
                    <td className="px-4 py-3.5 text-xs font-bold text-pink-700 whitespace-nowrap">{u.employeeId}</td>
                    <td className="px-4 py-3.5 text-xs font-medium text-slate-700 whitespace-nowrap">{u.name || "—"}</td>
                    <td className="px-4 py-3.5 text-xs text-slate-600 whitespace-nowrap">{u.designation || "—"}</td>
                    <td className="px-4 py-3.5 text-xs text-slate-600 whitespace-nowrap">{u.companyName || "—"}</td>
                    <td className="px-4 py-3.5">
                      <span className={cn("px-2 py-1 rounded-lg text-[10px] font-bold border", roleBadgeClass(u.role))}>
                        {u.role || "Staf"}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-600 whitespace-nowrap">
                      {u.cl || 0} / {u.el || 0} / {u.ml || 0}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-600 whitespace-nowrap">{u.hod || "—"}</td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEdit(u)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold text-pink-600 bg-pink-50 border border-pink-100 rounded-lg hover:bg-pink-100 transition-all"
                        >
                          <Pencil className="w-3 h-3" /> Edit
                        </button>
                        <button
                          onClick={() => setDeleteTarget(u)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold text-red-600 bg-red-50 border border-red-100 rounded-lg hover:bg-red-100 transition-all"
                        >
                          <Trash2 className="w-3 h-3" /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Add / Edit Modal ── */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[80] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-pink-50 flex items-center justify-between sticky top-0 bg-white z-10">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-pink-600" />
                <h3 className="text-lg font-bold text-slate-900">{editTarget ? "Edit User" : "Add User"}</h3>
              </div>
              <button onClick={closeModal} className="p-2 hover:bg-pink-100 rounded-xl transition-colors">
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {errorMsg && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-xs font-bold text-red-600 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" /> {errorMsg}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-bold text-slate-500 mb-1.5">Employee ID *</label>
                  {editTarget ? (
                    <input
                      type="text"
                      value={form.employeeId}
                      disabled
                      className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl outline-none bg-slate-50 text-slate-400"
                    />
                  ) : (
                    <select
                      value={form.employeeId}
                      onChange={e => handleEmployeeIdSelect(e.target.value)}
                      className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl outline-none focus:border-pink-400 bg-white"
                    >
                      <option value="">Select from Present Employees...</option>
                      {employeeOptions.map(e => (
                        <option key={e.id} value={e.id}>{e.id}{e.name ? ` — ${e.name}` : ""}</option>
                      ))}
                    </select>
                  )}
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-bold text-slate-500 mb-1.5">
                    Password {editTarget ? "(leave blank to keep unchanged)" : "*"}
                  </label>
                  <input
                    type="password"
                    value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    placeholder={editTarget ? "••••••••" : "Set login password"}
                    className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl outline-none focus:border-pink-400"
                  />
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-bold text-slate-500 mb-1.5">Name</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl outline-none focus:border-pink-400"
                  />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-bold text-slate-500 mb-1.5">Designation</label>
                  <input
                    type="text"
                    value={form.designation}
                    onChange={e => setForm(f => ({ ...f, designation: e.target.value }))}
                    className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl outline-none focus:border-pink-400"
                  />
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-bold text-slate-500 mb-1.5">Company</label>
                  <select
                    value={form.companyName}
                    onChange={e => setForm(f => ({ ...f, companyName: e.target.value }))}
                    className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl outline-none focus:border-pink-400 bg-white"
                  >
                    {COMPANY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-bold text-slate-500 mb-1.5">Role</label>
                  <select
                    value={form.role}
                    onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                    className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl outline-none focus:border-pink-400 bg-white"
                  >
                    {ROLE_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5">CL</label>
                  <input
                    type="number"
                    value={form.cl}
                    onChange={e => setForm(f => ({ ...f, cl: e.target.value }))}
                    className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl outline-none focus:border-pink-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5">EL</label>
                  <input
                    type="number"
                    value={form.el}
                    onChange={e => setForm(f => ({ ...f, el: e.target.value }))}
                    className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl outline-none focus:border-pink-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5">ML</label>
                  <input
                    type="number"
                    value={form.ml}
                    onChange={e => setForm(f => ({ ...f, ml: e.target.value }))}
                    className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl outline-none focus:border-pink-400"
                  />
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-bold text-slate-500 mb-1.5">HOD (Employee ID)</label>
                  <input
                    type="text"
                    value={form.hod}
                    onChange={e => setForm(f => ({ ...f, hod: e.target.value }))}
                    placeholder="e.g. PMMPL-7"
                    className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl outline-none focus:border-pink-400"
                  />
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-pink-50 flex items-center justify-end gap-3 sticky bottom-0 bg-white">
              <button
                onClick={closeModal}
                className="px-4 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-50 rounded-xl transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex items-center gap-2 px-5 py-2.5 bg-pink-600 text-white text-sm font-bold rounded-xl hover:bg-pink-700 disabled:opacity-50 transition-all"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                {editTarget ? "Save Changes" : "Add User"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirm ── */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[80] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-red-50 rounded-xl">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Delete User</h3>
            </div>
            <p className="text-sm text-slate-500 mb-6">
              Remove <span className="font-bold text-slate-800">{deleteTarget.name || deleteTarget.employeeId}</span> ({deleteTarget.employeeId}) from the User sheet? This cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-50 rounded-xl transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex items-center gap-2 px-5 py-2.5 bg-red-600 text-white text-sm font-bold rounded-xl hover:bg-red-700 disabled:opacity-50 transition-all"
              >
                {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
