function decorate(block) {
  // Extract relevant data from block
  const startDateStr = block.querySelector('p:nth-of-type(1)').textContent.split(':')[1].trim();
  const endDateStr = block.querySelector('p:nth-of-type(2)').textContent.split(':')[1].trim();
  const holidaysStr = block.querySelector('p:nth-of-type(3)').textContent.split(':')[1].trim(); // Extract holiday dates

  const startDate = new Date(startDateStr);
  const endDate = new Date(endDateStr);
  const holidays = holidaysStr.split(',').map(dateStr => new Date(dateStr.trim()));

  // Initialize Customer Facing Target %
  let customerFacingTargetPercent = 100;

  // Calculate weeks between dates
  const weeks = [];
  let currentDate = new Date(startDate);
  let weekNumber = 1;
  const today = new Date();

  function formatDate(date) {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  }

  while (currentDate <= endDate) {
    const startOfWeek = new Date(currentDate);
    const endOfWeek = new Date(currentDate);
    endOfWeek.setDate(endOfWeek.getDate() + 6);

    if (endOfWeek > endDate) {
      endOfWeek.setDate(endDate.getDate());
    }

    const holidayCount = holidays.filter(holiday => holiday >= startOfWeek && holiday <= endOfWeek).length;

    weeks.push({
      weekNumber: weekNumber,
      weekRange: `${formatDate(startOfWeek)} to ${formatDate(endOfWeek)}`,
      startOfWeek: startOfWeek,
      endOfWeek: endOfWeek,
      customerFacingHours: 0, // Editable by user
      customerFacingHoursTarget: 40 - (holidayCount * 8),
      customerFacingTargetPercent: customerFacingTargetPercent,
      customerFacingTargetAchievementPercent: 0,
      isCurrentWeek: today >= startOfWeek && today <= endOfWeek
    });

    weekNumber++;
    currentDate.setDate(currentDate.getDate() + 7);
  }

  // Update a specific cell in the table
  function updateCell(weekIndex, key, value) {
    const tableRows = block.querySelectorAll('tr');
    const rowCells = tableRows[weekIndex + 1].querySelectorAll('td'); // +1 to skip header row
    const cellIndex = ['weekNumber', 'weekRange', 'customerFacingHours', 'customerFacingHoursTarget', 'customerFacingTargetPercent', 'customerFacingTargetAchievementPercent'].indexOf(key);
    rowCells[cellIndex].textContent = value;
  }

  // Create input element for Customer Facing Target %
  const inputTargetPercent = document.createElement('input');
  inputTargetPercent.type = 'number';
  inputTargetPercent.placeholder = 'Enter Customer Facing Target %';
  inputTargetPercent.value = customerFacingTargetPercent;
  inputTargetPercent.addEventListener('input', function () {
    customerFacingTargetPercent = parseFloat(this.value) || 100; // Default to 100 if input is invalid
    weeks.forEach((week, index) => {
      week.customerFacingTargetPercent = customerFacingTargetPercent;
      week.customerFacingTargetAchievementPercent = (week.customerFacingHours / week.customerFacingHoursTarget) * customerFacingTargetPercent;
      updateCell(index, 'customerFacingTargetPercent', week.customerFacingTargetPercent);
      updateCell(index, 'customerFacingTargetAchievementPercent', week.customerFacingTargetAchievementPercent.toFixed(2));
    });
  });

  // Render table
  function renderTable() {
    const table = document.createElement('table');
    const headerRow = document.createElement('tr');

    ['Week Number', 'Week Date Range', 'Customer Facing Hours', 'Customer Facing Hours Target', 'Customer Facing Target %', 'Customer Facing Target Achievement %'].forEach(header => {
      const th = document.createElement('th');
      th.textContent = header;
      headerRow.appendChild(th);
    });

    table.appendChild(headerRow);

    weeks.forEach((week, index) => {
      const row = document.createElement('tr');
      if (week.isCurrentWeek) {
        row.classList.add('current-week');
      }
      ['weekNumber', 'weekRange', 'customerFacingHours', 'customerFacingHoursTarget', 'customerFacingTargetPercent', 'customerFacingTargetAchievementPercent'].forEach(key => {
        const td = document.createElement('td');
        if (key === 'customerFacingHours') {
          const inputHours = document.createElement('input');
          inputHours.type = 'number';
          inputHours.value = week[key];
          inputHours.addEventListener('input', function () {
            week.customerFacingHours = parseFloat(this.value) || 0;
            week.customerFacingTargetAchievementPercent = (week.customerFacingHours / week.customerFacingHoursTarget) * week.customerFacingTargetPercent;
            updateCell(index, 'customerFacingTargetAchievementPercent', week.customerFacingTargetAchievementPercent.toFixed(2));
          });
          td.appendChild(inputHours);
        } else {
          td.textContent = week[key];
        }
        row.appendChild(td);
      });
      table.appendChild(row);
    });

    block.innerHTML = '';
    block.appendChild(inputTargetPercent);
    block.appendChild(table);
  }

  renderTable();
}

export default decorate;
