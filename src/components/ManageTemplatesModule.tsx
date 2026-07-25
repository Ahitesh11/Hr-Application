import React, { useState, useEffect } from "react";
import { Save, RotateCcw, AlertTriangle, FileText, CheckCircle } from "lucide-react";
import { cn } from "../lib/utils";
import { DEFAULT_TEMPLATES } from "../lib/templates";

const DOCUMENT_TYPES = [
  "Offer Letter",
  "Appointment Letter",
  "Probation Extension Letter",
  "Resignation Acceptance Letter",
  "Regret Letter",
  "Relieving Letter",
  "Termination Letter"
];

export const ManageTemplatesModule = () => {
  const [selectedType, setSelectedType] = useState<string>("Offer Letter");
  const [templateContent, setTemplateContent] = useState<string>("");
  const [isSaved, setIsSaved] = useState(false);
  const editorRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load from LocalStorage or fallback to default
    const savedTemplates = JSON.parse(localStorage.getItem("pasmin_document_templates") || "{}");
    let content = "";
    if (savedTemplates[selectedType]) {
      content = savedTemplates[selectedType];
    } else {
      content = DEFAULT_TEMPLATES[selectedType] || "";
    }
    setTemplateContent(content);
    if (editorRef.current) {
      editorRef.current.innerHTML = content;
    }
    setIsSaved(false);
  }, [selectedType]);

  const handleSave = () => {
    const savedTemplates = JSON.parse(localStorage.getItem("pasmin_document_templates") || "{}");
    // Get the HTML from the editor ref
    const finalHtml = editorRef.current?.innerHTML || templateContent;
    savedTemplates[selectedType] = finalHtml;
    localStorage.setItem("pasmin_document_templates", JSON.stringify(savedTemplates));
    setTemplateContent(finalHtml);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handleReset = () => {
    if (window.confirm("Are you sure you want to reset this template to its original default? All your custom changes will be lost.")) {
      const savedTemplates = JSON.parse(localStorage.getItem("pasmin_document_templates") || "{}");
      delete savedTemplates[selectedType];
      localStorage.setItem("pasmin_document_templates", JSON.stringify(savedTemplates));
      const defaultHtml = DEFAULT_TEMPLATES[selectedType] || "";
      setTemplateContent(defaultHtml);
      if (editorRef.current) {
        editorRef.current.innerHTML = defaultHtml;
      }
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
    }
  };

  return (
    <div className="h-full bg-slate-50 flex flex-col relative overflow-hidden">
      {/* Header */}
      <div className="bg-white px-6 py-4 border-b flex justify-between items-center shadow-sm z-10 shrink-0">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Manage Templates</h1>
          <p className="text-sm text-slate-500">Edit and save default templates for your documents</p>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-6xl mx-auto flex gap-6">
          
          {/* Left Panel: Selection and Edit */}
          <div className="w-2/3 flex flex-col gap-4">
            <div className="bg-white p-4 rounded-xl border shadow-sm">
              <label className="block text-sm font-medium text-slate-700 mb-2">Select Document Type</label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-slate-50"
              >
                {DOCUMENT_TYPES.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            <div className="bg-white p-4 rounded-xl border shadow-sm flex-1 flex flex-col">
              <div className="flex justify-between items-center mb-4">
                <label className="block text-sm font-medium text-slate-700">Template HTML (Edit below)</label>
                <div className="flex gap-2">
                  <button
                    onClick={handleReset}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg border border-red-200 transition-colors"
                  >
                    <RotateCcw className="w-4 h-4" /> Reset Default
                  </button>
                  <button
                    onClick={handleSave}
                    className={cn(
                      "flex items-center gap-2 px-4 py-1.5 text-sm rounded-lg border transition-colors",
                      isSaved ? "bg-green-500 text-white border-green-600" : "bg-blue-600 text-white border-blue-700 hover:bg-blue-700"
                    )}
                  >
                    {isSaved ? <CheckCircle className="w-4 h-4" /> : <Save className="w-4 h-4" />} 
                    {isSaved ? "Saved!" : "Save Template"}
                  </button>
                </div>
              </div>
              
              <div className="bg-blue-50 text-blue-800 p-3 rounded-lg text-sm mb-4 border border-blue-100 flex gap-2 items-start">
                <AlertTriangle className="w-5 h-5 shrink-0 text-blue-600" />
                <div>
                  <strong>Important:</strong> Do not delete the words inside the double brackets like <code>{`{{FullName}}`}</code> or <code>{`{{MonthlySalary}}`}</code>. These will be automatically replaced with actual data. You can format the text below directly like MS Word!
                </div>
              </div>

              {/* Formatting Toolbar */}
              <div className="flex gap-2 mb-2 p-2 bg-slate-100 rounded-lg border border-slate-200">
                <button onClick={() => document.execCommand('bold', false)} className="px-3 py-1 bg-white border rounded hover:bg-slate-50 font-bold">B</button>
                <button onClick={() => document.execCommand('italic', false)} className="px-3 py-1 bg-white border rounded hover:bg-slate-50 italic">I</button>
                <button onClick={() => document.execCommand('underline', false)} className="px-3 py-1 bg-white border rounded hover:bg-slate-50 underline">U</button>
                <button onClick={() => document.execCommand('insertUnorderedList', false)} className="px-3 py-1 bg-white border rounded hover:bg-slate-50">• List</button>
                <button onClick={() => document.execCommand('insertOrderedList', false)} className="px-3 py-1 bg-white border rounded hover:bg-slate-50">1. List</button>
              </div>

              <div
                ref={editorRef}
                contentEditable
                className="w-full flex-1 min-h-[500px] p-4 border rounded-lg bg-slate-50 focus:ring-2 focus:ring-blue-500 overflow-y-auto prose prose-sm max-w-none"
                style={{ outline: 'none' }}
                onBlur={(e) => setTemplateContent(e.currentTarget.innerHTML)}
              />
            </div>
          </div>

          {/* Right Panel: Live Preview */}
          <div className="w-1/3 flex flex-col gap-4 hidden">
            {/* Kept hidden if we don't need double preview, since the editor is visual now */}
          </div>

        </div>
      </div>
    </div>
  );
};
