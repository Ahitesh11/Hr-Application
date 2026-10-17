import { useEffect, useMemo, useState } from "react";
import { Building2, Users, Briefcase, Loader2, RefreshCw, Search } from "lucide-react";
import { api } from "../services/api";
import { cn } from "../lib/utils";

type RecordData = Record<string, unknown>;
type Staff = { company: string; designation: string; location: string };
const textValue = (row: RecordData, keys: string[]) => keys.map(key => String(row[key] ?? "").trim()).find(Boolean) || "";
const employeeId = (row: RecordData) => textValue(row, ["pmmplAc", "employeeId", "employeeCode"]).toLowerCase();
const groupKey = (value: string) => value.trim().replace(/\s+/g, " ").toLowerCase();
const countGroups = (staff: Staff[], field: "company" | "designation") => {
  const groups = new Map<string, { key: string; label: string; count: number }>();
  staff.forEach(row => {
    const key = groupKey(row[field]);
    const group = groups.get(key);
    if (group) group.count++;
    else groups.set(key, { key, label: row[field], count: 1 });
  });
  return [...groups.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
};

export function WorkforceOverview() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reload, setReload] = useState(0);
  const [company, setCompany] = useState("");
  const [location, setLocation] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    api.getWorkforceOverview(reload > 0).then(({ employees, exits }) => {
      const exited = new Set(exits.map(employeeId).filter(Boolean));
      const seen = new Set<string>();
      const records = employees.filter(row => {
        const id = employeeId(row);
        if (id && (exited.has(id) || seen.has(id))) return false;
        const name = textValue(row, ["employeeName", "nameAsPerAadhar", "name"]);
        if (!id && !name) return false;
        if (id) seen.add(id);
        return true;
      }).map(row => ({
        company: textValue(row, ["company", "joiningCompanyName", "companyName"]) || "Unassigned company",
        designation: textValue(row, ["designation", "employeeDesignation"]) || "Unassigned designation",
        location: textValue(row, ["location", "joiningPlace", "employeeLocation"]) || "Unassigned location",
      }));
      if (!cancelled) setStaff(records);
    }).catch(() => { if (!cancelled) setError(true); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [reload]);

  const companies = useMemo(() => countGroups(staff, "company"), [staff]);
  const locations = useMemo(() => [...new Map(staff.map(row => [groupKey(row.location), row.location])).entries()].sort((a, b) => a[1].localeCompare(b[1])), [staff]);
  const selectedStaff = useMemo(() => staff.filter(row => (!company || groupKey(row.company) === company) && (!location || groupKey(row.location) === location)), [staff, company, location]);
  const designations = useMemo(() => countGroups(selectedStaff, "designation"), [selectedStaff]);
  const shownDesignations = designations.filter(row => row.label.toLowerCase().includes(search.trim().toLowerCase()));
  const visibleCompanies = countGroups(selectedStaff, "company");
  const matrix = useMemo(() => {
    const counts = new Map<string, Map<string, number>>();
    selectedStaff.forEach(row => {
      const key = groupKey(row.designation);
      const countsByCompany = counts.get(key) || new Map<string, number>();
      const companyKey = groupKey(row.company);
      countsByCompany.set(companyKey, (countsByCompany.get(companyKey) || 0) + 1);
      counts.set(key, countsByCompany);
    });
    return counts;
  }, [selectedStaff]);
  const controlClass = "rounded-xl border border-pink-100 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-pink-400";

  return (
    <section aria-label="Workforce overview" className="overflow-hidden rounded-3xl border border-pink-100 bg-white shadow-sm">
      <div className="bg-gradient-to-br from-pink-50 to-white p-6 md:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-pink-600 p-3 text-white"><Users className="h-6 w-6" /></div>
            <div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-pink-600">People at a glance</p><h2 className="text-2xl font-bold text-slate-900">Workforce Overview</h2><p className="mt-1 text-xs text-slate-500">Company aur designation ke hisaab se present staff ki counting</p></div>
          </div>
          <button disabled={loading} onClick={() => setReload(value => value + 1)} className={cn(controlClass, "flex items-center gap-2 font-bold disabled:opacity-50")}><RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />Refresh</button>
        </div>
        {loading ? <div role="status" className="flex items-center justify-center gap-3 py-16 text-slate-500"><Loader2 className="h-5 w-5 animate-spin" />Loading staff counts...</div> : error ? <div role="alert" className="py-10 text-center text-red-600">Staff counts could not be loaded. Please refresh to try again.</div> : <>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {[
              { label: "Total Present Staff", value: staff.length, icon: Users },
              { label: "Companies", value: companies.length, icon: Building2 },
              { label: "Designations", value: countGroups(staff, "designation").length, icon: Briefcase },
            ].map(item => <div key={item.label} className="flex items-center justify-between rounded-2xl border border-pink-100 bg-white p-5"><div><p className="text-xs font-semibold text-slate-500">{item.label}</p><p className="mt-2 text-3xl font-extrabold tabular-nums text-slate-900">{item.value}</p></div><item.icon className="h-7 w-7 text-pink-500" /></div>)}
          </div>
          <div className="mt-6 flex flex-wrap items-end gap-3">
            <label className="flex min-w-[180px] flex-1 flex-col gap-1.5 text-xs font-bold text-slate-600">Company<select className={controlClass} value={company} onChange={event => setCompany(event.target.value)}><option value="">All companies</option>{companies.map(item => <option key={item.key} value={item.key}>{item.label} ({item.count})</option>)}</select></label>
            <label className="flex min-w-[180px] flex-1 flex-col gap-1.5 text-xs font-bold text-slate-600">Employee location<select className={controlClass} value={location} onChange={event => setLocation(event.target.value)}><option value="">All locations</option>{locations.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
            {(company || location || search) && <button className={cn(controlClass, "text-pink-600 font-bold")} onClick={() => { setCompany(""); setLocation(""); setSearch(""); }}>Clear filters</button>}
          </div>
        </>}
      </div>
      {!loading && !error && (staff.length === 0 ? <p className="p-8 text-center text-slate-500">No present employee records available.</p> : <div className="space-y-6 p-6 md:p-8">
        <div>
          <h3 className="mb-3 text-base font-bold text-slate-900">Company-wise Staff</h3>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {companies.map(item => <button key={item.key} aria-pressed={company === item.key} onClick={() => setCompany(current => current === item.key ? "" : item.key)} className={cn("rounded-2xl border p-4 text-left transition-colors focus-visible:outline-2 focus-visible:outline-pink-600", company === item.key ? "border-pink-600 bg-pink-50" : "border-slate-100 hover:border-pink-300")}><div className="flex items-center justify-between gap-3"><span className="font-bold text-slate-700">{item.label}</span><span className="text-2xl font-extrabold tabular-nums text-pink-700">{item.count}</span></div><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-pink-50"><div className="h-full rounded-full bg-pink-500" style={{ width: `${item.count / staff.length * 100}%` }} /></div><p className="mt-2 text-[10px] text-slate-500">{Math.round(item.count / staff.length * 100)}% of total staff · Click to filter</p></button>)}
          </div>
        </div>
        <div>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-base font-bold text-slate-900">Designation-wise Staff</h3><p className="text-xs text-slate-500">{selectedStaff.length} staff across {designations.length} designations in selected companies and locations</p></div><label className="relative"><span className="sr-only">Search designation</span><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search designation..." className={cn(controlClass, "pl-9")} /></label></div>
          {shownDesignations.length === 0 ? <p className="rounded-xl bg-pink-50 p-8 text-center text-sm text-slate-500">No designations match these filters.</p> : <div className="max-h-[520px] overflow-auto rounded-2xl border border-pink-100">
            <table className="w-full text-left text-sm"><caption className="sr-only">Staff count by designation and company, with totals</caption><thead className="sticky top-0 bg-pink-50 text-xs text-pink-700"><tr><th scope="col" className="min-w-[220px] px-5 py-4">Designation</th>{visibleCompanies.map(item => <th scope="col" key={item.key} className="min-w-[120px] px-5 py-4 text-center">{item.label}</th>)}<th scope="col" className="px-5 py-4 text-right">Total Staff</th></tr></thead><tbody className="divide-y divide-pink-50">{shownDesignations.map(item => <tr key={item.key} className="hover:bg-pink-50/50"><th scope="row" className="px-5 py-3.5 font-medium text-slate-700">{item.label}</th>{visibleCompanies.map(comp => <td key={comp.key} className="px-5 py-3.5 text-center tabular-nums text-slate-600">{matrix.get(item.key)?.get(comp.key) || 0}</td>)}<td className="px-5 py-3.5 text-right text-base font-extrabold tabular-nums text-pink-700">{item.count}</td></tr>)}</tbody><tfoot className="border-t border-pink-100 bg-pink-50 font-bold text-slate-800"><tr><th scope="row" className="px-5 py-4">{search ? "Matching designations total" : "Total Staff"}</th>{visibleCompanies.map(comp => <td key={comp.key} className="px-5 py-4 text-center tabular-nums">{shownDesignations.reduce((sum, item) => sum + (matrix.get(item.key)?.get(comp.key) || 0), 0)}</td>)}<td className="px-5 py-4 text-right tabular-nums">{shownDesignations.reduce((sum, item) => sum + item.count, 0)}</td></tr></tfoot></table>
          </div>}
        </div>
        <p className="text-[11px] text-slate-400">Source: Present Employees · Exited employees excluded · Company cards show overall totals; the table follows your filters.</p>
      </div>)}
    </section>
  );
}
