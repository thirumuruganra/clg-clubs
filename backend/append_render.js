const fs = require('fs');
let file = fs.readFileSync('../frontend/src/pages/AdminDashboard.jsx', 'utf8');

if (!file.includes("const openCreateModalForDate")) {
  file = file.replace(
    "const handleCreateEvent = async (e) => {",
    `const openCreateModalForDate = (year, month, day) => {
    const d = new Date(year, month, day, 9, 0, 0); // default 9 AM
    setNewEvent({ title: '', description: '', keywords: '', location: '', start_time: d, end_time: new Date(d.getTime() + 60*60*1000), tag: 'TECH', image_url: '' });
    setShowCreateModal(true);
  };

  const handleCreateEvent = async (e) => {`
  );
  
  file = file.replace(
    "setNewEvent({ title: '', description: '', keywords: '', location: '', start_time: null, end_time: null, tag: 'TECH', image_url: '' });",
    "setNewEvent({ title: '', description: '', keywords: '', location: '', start_time: null, end_time: null, tag: 'TECH', image_url: '' });\n        setShowCreateModal(false);"
  );
}

fs.writeFileSync('../frontend/src/pages/AdminDashboard.jsx', file);
