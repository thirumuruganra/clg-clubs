const fs = require('fs');

let file = fs.readFileSync('../frontend/src/pages/AdminDashboard.jsx', 'utf8');

const anchor = "const sideNavItems = [";
const insertion = `
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const monthName = currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();

  const calendarDays = [];
  const prevMonthDays = new Date(year, month, 0).getDate();
  for (let i = firstDayOfWeek - 1; i >= 0; i--) calendarDays.push({ day: prevMonthDays - i, current: false });
  for (let d = 1; d <= daysInMonth; d++) calendarDays.push({ day: d, current: true });
  const remaining = 42 - calendarDays.length;
  for (let d = 1; d <= remaining; d++) calendarDays.push({ day: d, current: false });

  const getDayEvents = (day, current) => {
    if (!current) return [];
    return allEvents.filter(e => {
        if (!e.start_time) return false;
        const eventDate = new Date(e.start_time);
        return eventDate.getDate() === day && eventDate.getMonth() === month && eventDate.getFullYear() === year;
    });
  };

`;

if (!file.includes("const calendarDays = [];")) {
  file = file.replace(anchor, insertion + "\n  " + anchor);
}

fs.writeFileSync('../frontend/src/pages/AdminDashboard.jsx', file);
