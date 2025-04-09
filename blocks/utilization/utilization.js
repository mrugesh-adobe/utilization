function decorate(block) {
  // Extract relevant data from block
  const startDateStr = block.querySelector('p:nth-of-type(1)').textContent.split(':')[1].trim();
  const endDateStr = block.querySelector('p:nth-of-type(2)').textContent.split(':')[1].trim();
  const holidaysStr = block.querySelector('p:nth-of-type(3)').textContent.split(':')[1].trim(); // Extract holiday dates

  const startDate = new Date(startDateStr);
  const endDate = new Date(endDateStr);
  const holidays = holidaysStr.split(',').map(dateStr => new Date(dateStr.trim()));

  // Initialize Customer Facing Target %
  let customerFacingTargetPercent = parseFloat(localStorage.getItem('customerFacingTargetPercent')) || 100;

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

    const storedHours = parseFloat(localStorage.getItem(`week-${weekNumber}-customerFacingHours`)) || 0;
    const storedHoursTarget = 40 - (holidayCount * 8);

    weeks.push({
      weekNumber: weekNumber,
      weekRange: `${formatDate(startOfWeek)} to ${formatDate(endOfWeek)}`,
      startOfWeek: startOfWeek,
      endOfWeek: endOfWeek,
      customerFacingHours: storedHours, // Load from localStorage
      customerFacingHoursTarget: storedHoursTarget,
      customerFacingTargetPercent: customerFacingTargetPercent,
      customerFacingTargetAchievementPercent: calculateAchievementPercent(storedHours, storedHoursTarget, customerFacingTargetPercent),
      isCurrentWeek: today >= startOfWeek && today <= endOfWeek
    });

    weekNumber++;
    currentDate.setDate(currentDate.getDate() + 7);
  }

  // Calculate Customer Facing Target Achievement %
  function calculateAchievementPercent(hours, target, percent) {
    const effectiveTarget = target * (percent / 100);
    return Math.round((hours / effectiveTarget) * 100);
  }

  // Update a specific cell in the table
  function updateCell(weekIndex, key, value) {
    const tableRows = block.querySelectorAll('tr');
    const rowCells = tableRows[weekIndex + 1].querySelectorAll('td'); // +1 to skip header row
    const cellIndex = ['weekNumber', 'weekRange', 'customerFacingHours', 'customerFacingHoursTarget', 'customerFacingTargetPercent', 'customerFacingTargetAchievementPercent'].indexOf(key);
    rowCells[cellIndex].textContent = value;
  }

  // Create container for details
  const detailsContainer = document.createElement('div');
  detailsContainer.className = 'details-container';
  detailsContainer.innerHTML = `
    <p>Quarter Start Date: ${formatDate(startDate)}</p>
    <p>Quarter End Date: ${formatDate(endDate)}</p>
    <p>Current Week: ${weeks.find(week => week.isCurrentWeek).weekNumber} : ${formatDate(today)}</p>
  `;

  // Create input element for Customer Facing Target %
  const inputTargetPercent = document.createElement('input');
  inputTargetPercent.type = 'number';
  inputTargetPercent.placeholder = 'Enter Customer Facing Target %';
  inputTargetPercent.value = customerFacingTargetPercent;
  inputTargetPercent.maxLength = 3; // Set max length
  inputTargetPercent.addEventListener('input', function () {
    customerFacingTargetPercent = parseFloat(this.value) || 100; // Default to 100 if input is invalid
    localStorage.setItem('customerFacingTargetPercent', customerFacingTargetPercent); // Persist to localStorage
    weeks.forEach((week, index) => {
      week.customerFacingTargetPercent = customerFacingTargetPercent;
      week.customerFacingTargetAchievementPercent = calculateAchievementPercent(week.customerFacingHours, week.customerFacingHoursTarget, customerFacingTargetPercent);
      updateCell(index, 'customerFacingTargetPercent', week.customerFacingTargetPercent);
      updateCell(index, 'customerFacingTargetAchievementPercent', week.customerFacingTargetAchievementPercent);
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
          inputHours.maxLength = 3; // Set max length
          inputHours.addEventListener('input', function () {
            week.customerFacingHours = parseFloat(this.value) || 0;
            localStorage.setItem(`week-${week.weekNumber}-customerFacingHours`, week.customerFacingHours); // Persist to localStorage
            week.customerFacingTargetAchievementPercent = calculateAchievementPercent(week.customerFacingHours, week.customerFacingHoursTarget, week.customerFacingTargetPercent);
            updateCell(index, 'customerFacingTargetAchievementPercent', week.customerFacingTargetAchievementPercent);
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
    block.appendChild(detailsContainer);
    block.appendChild(inputTargetPercent);
    block.appendChild(table);
  }

  renderTable();
}

export default decorate;
