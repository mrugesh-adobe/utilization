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
    const hoursTarget = 40 - (holidayCount * 8);

    const storedHours = parseFloat(localStorage.getItem(`week-${weekNumber}-customerFacingHours`)) || 0;
    const customerFacingHoursTarget = calculateHoursTarget(hoursTarget, customerFacingTargetPercent);
    const gapToTarget = storedHours - customerFacingHoursTarget;

    weeks.push({
      weekNumber: weekNumber,
      weekRange: `${formatDate(startOfWeek)} to ${formatDate(endOfWeek)}`,
      startOfWeek: startOfWeek,
      endOfWeek: endOfWeek,
      customerFacingHours: storedHours, // Load from localStorage
      availableHours: hoursTarget,
      customerFacingHoursTarget: customerFacingHoursTarget,
      customerFacingTargetPercent: customerFacingTargetPercent,
      customerFacingTargetAchievementPercent: calculateAchievementPercent(storedHours, hoursTarget, customerFacingTargetPercent),
      gapToTarget: gapToTarget,
      isCurrentWeek: today >= startOfWeek && today <= endOfWeek
    });

    weekNumber++;
    currentDate.setDate(currentDate.getDate() + 7);
  }

  // Calculate Customer Facing Hours Target and round to nearest whole number
  function calculateHoursTarget(availableHours, percent) {
    return Math.round(availableHours * (percent / 100));
  }

  // Calculate Customer Facing Target Achievement %
  function calculateAchievementPercent(hours, target, percent) {
    const effectiveTarget = target * (percent / 100);
    return Math.round((hours / effectiveTarget) * 100);
  }

  // Update a specific cell in the table
  function updateCell(weekIndex, key, value) {
    const tableRows = block.querySelectorAll('tbody tr');
    const rowCells = tableRows[weekIndex].querySelectorAll('td');
    const cellIndex = ['weekNumber', 'weekRange', 'customerFacingTargetPercent', 'customerFacingHours', 'customerFacingTargetAchievementPercent', 'gapToTarget', 'customerFacingHoursTarget', 'availableHours'].indexOf(key);
    rowCells[cellIndex].textContent = value;

    if (key === 'customerFacingTargetAchievementPercent') {
      const gap = weeks[weekIndex].gapToTarget; // Ensure gap is calculated first
      const achievementCell = rowCells[cellIndex];
      achievementCell.classList.remove('red', 'green');
      if (gap < 0) {
        achievementCell.classList.add('red');
      } else {
        achievementCell.classList.add('green');
      }
    }
  }

  // Recalculate summary row values
  function recalculateSummaryRow() {
    let totalWeeks = 0;
    let totalHours = 0;
    let totalTargets = 0;
    let totalGaps = 0;
    let totalAvailableHours = 0;
    let totalAchievementPercent = 0;
  
    const rows = document.querySelectorAll('tbody tr');
    rows.forEach(row => {
      const cfHours = parseFloat(row.querySelector('.cf-hours input')?.value || 0);
      const cfTargetHours = parseFloat(row.querySelector('.cf-target-hours')?.textContent || 0);
      const availableHours = parseFloat(row.querySelector('.available-hours')?.textContent || 0);
      const gap = cfHours - cfTargetHours;
  
      totalWeeks++;
      totalHours += cfHours;
      totalTargets += cfTargetHours;
      totalGaps += gap;
      totalAvailableHours += availableHours;
  
      totalAchievementPercent += cfTargetHours > 0 ? (cfHours / cfTargetHours) * 100 : 0;
    });
  
    const avgAchievement = totalWeeks > 0 ? Math.round(totalAchievementPercent / totalWeeks) : 0;
  
    // Update summary row cells by their class name
    const summaryRow = document.querySelector('.summary-row');
    if (summaryRow) {
      summaryRow.querySelector('.summary-weekNumber').textContent = totalWeeks;
      summaryRow.querySelector('.summary-weekRange').textContent = `${formatDate(startDate)} to ${formatDate(endDate)}`;
      summaryRow.querySelector('.summary-customerFacingTargetPercent').textContent = customerFacingTargetPercent;
      summaryRow.querySelector('.summary-customerFacingHours').textContent = totalHours;
      summaryRow.querySelector('.summary-customerFacingTargetAchievementPercent').textContent = avgAchievement;
      summaryRow.querySelector('.summary-gapToTarget').textContent = totalGaps;
      summaryRow.querySelector('.summary-customerFacingHoursTarget').textContent = totalTargets;
      summaryRow.querySelector('.summary-availableHours').textContent = totalAvailableHours;
    }
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
      week.customerFacingHoursTarget = calculateHoursTarget(week.availableHours, customerFacingTargetPercent);
      week.customerFacingTargetAchievementPercent = calculateAchievementPercent(week.customerFacingHours, week.availableHours, customerFacingTargetPercent);
      week.gapToTarget = week.customerFacingHours - week.customerFacingHoursTarget;
      updateCell(index, 'customerFacingTargetPercent', week.customerFacingTargetPercent);
      updateCell(index, 'customerFacingHoursTarget', week.customerFacingHoursTarget);
      updateCell(index, 'customerFacingTargetAchievementPercent', week.customerFacingTargetAchievementPercent);
      updateCell(index, 'gapToTarget', week.gapToTarget);
    });
    recalculateSummaryRow();
  });

  // Render table
  function renderTable() {
    const table = document.createElement('table');
    const thead = document.createElement('thead');
    const tbody = document.createElement('tbody');
    
    // Main header row
    const headerRow = document.createElement('tr');
    ['Week Number', 'Week Date Range', 'Customer Facing Target %', 'Customer Facing Hours', 'Customer Facing Target Achievement %', 'Gap to Target', 'Customer Facing Hours Target', 'Available Hours'].forEach(header => {
      const th = document.createElement('th');
      th.textContent = header;
      headerRow.appendChild(th);
    });

    // Summary header row
    const summaryRow = document.createElement('tr');
    summaryRow.className = 'summary-row';
    ['weekNumber', 'weekRange', 'customerFacingTargetPercent', 'customerFacingHours', 'customerFacingTargetAchievementPercent', 'gapToTarget', 'customerFacingHoursTarget', 'availableHours'].forEach(key => {
      const th = document.createElement('th');
      th.className = `summary-${key}`;
      th.textContent = ''; // Initialize with empty text
      summaryRow.appendChild(th);
    });

    thead.appendChild(headerRow);
    thead.appendChild(summaryRow);
    table.appendChild(thead);

    weeks.forEach((week, index) => {
      const row = document.createElement('tr');
      if (week.isCurrentWeek) {
        row.classList.add('current-week');
      }
      ['weekNumber', 'weekRange', 'customerFacingTargetPercent', 'customerFacingHours', 'customerFacingTargetAchievementPercent', 'gapToTarget', 'customerFacingHoursTarget', 'availableHours'].forEach(key => {
        const td = document.createElement('td');
        td.className = key === 'customerFacingHours' ? 'cf-hours' : key === 'customerFacingHoursTarget' ? 'cf-target-hours' : key === 'availableHours' ? 'available-hours' : '';
        if (key === 'customerFacingHours') {
          const inputHours = document.createElement('input');
          inputHours.type = 'number';
          inputHours.value = week[key];
          inputHours.maxLength = 3; // Set max length
          inputHours.addEventListener('input', function () {
            week.customerFacingHours = parseFloat(this.value) || 0;
            localStorage.setItem(`week-${week.weekNumber}-customerFacingHours`, week.customerFacingHours); // Persist to localStorage
            week.customerFacingTargetAchievementPercent = calculateAchievementPercent(week.customerFacingHours, week.availableHours, week.customerFacingTargetPercent);
            week.gapToTarget = week.customerFacingHours - week.customerFacingHoursTarget;
            updateCell(index, 'customerFacingTargetAchievementPercent', week.customerFacingTargetAchievementPercent);
            updateCell(index, 'gapToTarget', week.gapToTarget);
            recalculateSummaryRow();
          });
          td.appendChild(inputHours);
        } else if (key === 'customerFacingTargetAchievementPercent') {
          td.textContent = week[key];
          td.classList.remove('red', 'green');
          if (week.gapToTarget < 0) {
            td.classList.add('red');
          } else {
            td.classList.add('green');
          }
        } else {
          td.textContent = week[key];
        }
        row.appendChild(td);
      });
      tbody.appendChild(row);
    });

    table.appendChild(tbody);
    block.innerHTML = '';
    block.appendChild(detailsContainer);
    block.appendChild(inputTargetPercent);
    block.appendChild(table);

    // Create and append holiday list
    const holidayListContainer = document.createElement('div');
    holidayListContainer.className = 'holiday-list-container';
    holidayListContainer.innerHTML = '<h3>List of Holidays:</h3>';
    const holidayList = document.createElement('ul');
    holidays.forEach(holiday => {
      const listItem = document.createElement('li');
      listItem.textContent = formatDate(holiday);
      holidayList.appendChild(listItem);
    });
    holidayListContainer.appendChild(holidayList);
    block.appendChild(holidayListContainer);

    recalculateSummaryRow(); // Initial calculation
  }

  renderTable();
}

export default decorate;
