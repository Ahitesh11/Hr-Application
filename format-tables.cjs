const fs = require('fs');
const path = require('path');
const dir = 'src/components';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.tsx'));

files.forEach(f => {
  let content = fs.readFileSync(path.join(dir, f), 'utf8');
  let original = content;

  // 1. Table Wrapper
  content = content.replace(/bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden/g, 'bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden');
  
  // 2. Thead
  content = content.replace(/<thead className=\"sticky top-0 z-10\".*?>/g, '<thead className=\"sticky top-0 z-20 bg-slate-50 border-b border-slate-200\">');
  content = content.replace(/<thead className=\"sticky top-0 z-20 bg-white\">/g, '<thead className=\"sticky top-0 z-20 bg-slate-50 border-b border-slate-200\">');
  
  // 3. Th
  content = content.replace(/px-4 py-3\.5 text-\[10px\] font-extrabold/g, 'px-4 py-3 text-[11px] font-bold');
  content = content.replace(/px-4 py-3 text-\[10px\] font-black/g, 'px-4 py-3 text-[11px] font-bold tracking-wider');
  
  // 4. Tr hover
  content = content.replace(/hover:bg-blue-50\/40/g, 'hover:bg-pink-50/40 transition-colors duration-200');
  content = content.replace(/hover:bg-slate-50\/50 transition-colors/g, 'hover:bg-pink-50/40 transition-colors duration-200');
  content = content.replace(/hover:bg-slate-50\/50/g, 'hover:bg-pink-50/40 transition-colors duration-200');
  
  // 5. Tbody
  content = content.replace(/<tbody className=\"divide-y divide-slate-100\">/g, '<tbody className=\"divide-y divide-slate-100 bg-white\">');

  if (content !== original) {
    fs.writeFileSync(path.join(dir, f), content);
    console.log('Updated ' + f);
  }
});
