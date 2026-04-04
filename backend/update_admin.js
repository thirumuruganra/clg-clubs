const fs = require('fs');

let file = fs.readFileSync('../frontend/src/pages/AdminDashboard.jsx', 'utf8');

// Replace activeTab default
file = file.replace("useState('events')", "useState('dashboard')");

if (!file.includes("const [showCreateModal, setShowCreateModal] = useState(false);")) {
  file = file.replace(
    "const [creating, setCreating] = useState(false);",
    "const [creating, setCreating] = useState(false);\n  const [showCreateModal, setShowCreateModal] = useState(false);"
  );
}

if (!file.includes("const [currentMonth, setCurrentMonth] = useState(new Date());")) {
  file = file.replace(
    "const [editing, setEditing] = useState(false);",
    "const [editing, setEditing] = useState(false);\n  const [currentMonth, setCurrentMonth] = useState(new Date());\n  const prevMonth = () => setCurrentMonth(d => new Date(d.getFullYear(), d.getMonth() - 1, 1));\n  const nextMonth = () => setCurrentMonth(d => new Date(d.getFullYear(), d.getMonth() + 1, 1));\n  const isToday = (day) => {\n    const today = new Date();\n    return day === today.getDate() && currentMonth.getMonth() === today.getMonth() && currentMonth.getFullYear() === today.getFullYear();\n  };"
  );
}

fs.writeFileSync('../frontend/src/pages/AdminDashboard.jsx', file);
