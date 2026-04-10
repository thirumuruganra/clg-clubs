import fs from 'node:fs';

const filePath = '/home/thiru/Desktop/clg-clubs/frontend/src/pages/AdminDashboard.jsx';
let code = fs.readFileSync(filePath, 'utf-8');

code = code.replace(
  '<div className="flex items-center justify-between px-4 lg:px-8 py-4 border-b border-[#e5e7eb] dark:border-[#233648] bg-white dark:bg-[#111a22]">',
  "<div className={`items-center justify-between px-4 lg:px-8 py-4 border-b border-[#e5e7eb] dark:border-[#233648] bg-white dark:bg-[#111a22] ${activeTab === 'events' ? 'flex lg:hidden' : 'flex'}`}>",
);

fs.writeFileSync(filePath, code);
