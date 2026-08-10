import React, { useState } from 'react';
import { FileText, Settings, Archive } from 'lucide-react';
import { DocumentGeneratorModule } from './DocumentGeneratorModule';
import { ManageTemplatesModule } from './ManageTemplatesModule';
import { DocumentRecordsModule } from './DocumentRecordsModule';
import { cn } from '../lib/utils';

export const FormatsModule: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'generate' | 'templates' | 'records'>('generate');

  return (
    <div className="h-full flex flex-col">
      <div className="bg-white border-b border-slate-200 px-6 py-4 shrink-0 flex gap-6">
        <button
          onClick={() => setActiveTab('generate')}
          className={`flex items-center gap-2 pb-4 -mb-4 font-bold text-sm border-b-2 transition-all ${
            activeTab === 'generate' ? 'border-pink-600 text-pink-600' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileText className="w-4 h-4" /> Generate Document
        </button>
        <button
          onClick={() => setActiveTab('templates')}
          className={`flex items-center gap-2 pb-4 -mb-4 font-bold text-sm border-b-2 transition-all ${
            activeTab === 'templates' ? 'border-pink-600 text-pink-600' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Settings className="w-4 h-4" /> Manage Templates
        </button>
        <button
          onClick={() => setActiveTab('records')}
          className={`flex items-center gap-2 pb-4 -mb-4 font-bold text-sm border-b-2 transition-all ${
            activeTab === 'records' ? 'border-pink-600 text-pink-600' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Archive className="w-4 h-4" /> Records
        </button>
      </div>

      <div className="flex-1 overflow-hidden p-6 bg-slate-50">
        {activeTab === 'generate' && <DocumentGeneratorModule />}
        {activeTab === 'templates' && <ManageTemplatesModule />}
        {activeTab === 'records' && <DocumentRecordsModule />}
      </div>
    </div>
  );
};
