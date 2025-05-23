function decorate(block) {
  // Extract relevant data from block
  const paragraphs = block.querySelectorAll('p');
  let startDateStr = '';
  let endDateStr = '';
  let holidaysStr = '';
  let yearStr = '';
  let quarterStr = '';

  // Validate and extract the required data
  paragraphs.forEach(paragraph => {
    const textContent = paragraph.textContent.trim();
    if (textContent.startsWith('Start-date:')) {
      startDateStr = textContent.split(':')[1].trim();
    } else if (textContent.startsWith('End-date:')) {
      endDateStr = textContent.split(':')[1].trim();
    } else if (textContent.startsWith('Holiday-dates:')) {
      holidaysStr = textContent.split(':')[1].trim();
    } else if (textContent.startsWith('Year:')) {
      yearStr = textContent.split(':')[1].trim();
    } else if (textContent.startsWith('Quarter:')) {
      quarterStr = textContent.split(':')[1].trim();
    }
  });

  // Check if all required data is present
  if (!startDateStr || !endDateStr || !holidaysStr || !yearStr || !quarterStr) {
    console.error('Missing required information in the block content.');
    return; // Exit the function if validation fails
  }

  const startDate = new Date(startDateStr);
  const endDate = new Date(endDateStr);
  const holidays = holidaysStr.split(',').map(dateStr => new Date(dateStr.trim()));
  const yearValue = parseInt(yearStr, 10);
  const quarterValue = quarterStr.toLowerCase(); // Normalize quarter value (e.g., "q2" -> "q2")

  // Validate Year and Quarter
  if (isNaN(yearValue) || !['q1', 'q2', 'q3', 'q4'].includes(quarterValue)) {
    console.error('Invalid Year or Quarter value.');
    return; // Exit the function if validation fails
  }

  // Update all localStorage keys to include yearValue and quarterValue as a prefix
  const storagePrefix = `${yearValue}-${quarterValue.toUpperCase()}`;

  // Initialize Customer Facing Target %
  let customerFacingTargetPercent = parseFloat(localStorage.getItem(`${storagePrefix}-customerFacingTargetPercent`)) || 87;

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

  function formatToDate(date) {
    const day = String(date.getDate()).padStart(2, '0');
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = monthNames[date.getMonth()];
    return `${day} ${month}`;
  }

  while (currentDate <= endDate) {
    const startOfWeek = new Date(currentDate);
    startOfWeek.setHours(0, 0, 0, 0); // Normalize

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(endOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999); // Normalize to end of day

    if (endOfWeek > endDate) {
      endOfWeek.setTime(endDate.getTime());
      endOfWeek.setHours(23, 59, 59, 999); // Also normalize
    }

    const todayNormalized = new Date();
    todayNormalized.setHours(0, 0, 0, 0); // Only compare date

    const isCurrentWeek = todayNormalized >= startOfWeek && todayNormalized <= endOfWeek;

    const holidayCount = holidays.filter(holiday => holiday >= startOfWeek && holiday <= endOfWeek).length;
    const hoursTarget = 40 - (holidayCount * 8);

    const storedHoursKey = `${storagePrefix}-week-${weekNumber}-customerFacingHours`;
    const storedHours = parseFloat(localStorage.getItem(storedHoursKey)) || 0;
    const customerFacingHoursTarget = calculateHoursTarget(hoursTarget, customerFacingTargetPercent);
    const gapToTarget = storedHours - customerFacingHoursTarget;

    weeks.push({
      weekNumber: weekNumber,
      weekRange: `${formatToDate(startOfWeek)} to ${formatToDate(endOfWeek)}`,
      startOfWeek: startOfWeek,
      endOfWeek: endOfWeek,
      customerFacingHours: storedHours, // Load from localStorage
      availableHours: hoursTarget,
      customerFacingHoursTarget: customerFacingHoursTarget,
      customerFacingTargetPercent: customerFacingTargetPercent,
      customerFacingTargetAchievementPercent: calculateAchievementPercent(storedHours, hoursTarget, customerFacingTargetPercent),
      gapToTarget: gapToTarget,
      isCurrentWeek: isCurrentWeek,
    });

    weekNumber++;
    currentDate.setDate(currentDate.getDate() + 7);
  }

  // Calculate Customer Facing Hours Target and round to nearest whole number
  function calculateHoursTarget(availableHours, percent) {
    return Math.round(availableHours * (percent / 100));
  }

  // Calculate Customer Facing Achievement %
  function calculateAchievementPercent(hours, target, percent) {
    const effectiveTarget = target * (percent / 100);
    return Math.round((hours / effectiveTarget) * 100);
  }

  // Add a new function to calculate achievement percentage and gap up to the current date
  function calculateAchievementAndGapToDate() {
    let totalHoursToDate = 0;
    let totalTargetHoursToDate = 0;
    let totalGapToDate = 0;

    weeks.forEach(week => {
      if (week.endOfWeek <= today) { // Only include weeks up to the current date
        totalHoursToDate += week.customerFacingHours;
        totalTargetHoursToDate += week.customerFacingHoursTarget;
        totalGapToDate += week.gapToTarget;
      }
    });

    const achievementPercentToDate = totalTargetHoursToDate > 0
      ? Math.round((totalHoursToDate / totalTargetHoursToDate) * 100)
      : 0;

    return {
      achievementPercentToDate,
      totalGapToDate
    };
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

  // Update recalculateSummaryRow to include the new calculation
  function recalculateSummaryRow() {
    let totalWeeks = 0;
    let totalHours = 0;
    let totalTargets = 0;
    let totalGaps = 0;
    let totalAvailableHours = 0;
  
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
    });
  
    // Correctly calculate summary achievement %
    const achievementPercent = totalTargets > 0
      ? Math.round((totalHours / totalTargets) * 100)
      : 0;
  
    // Update summary row cells by class name
    const summaryRow = document.querySelector('.summary-row');
    if (summaryRow) {
      summaryRow.querySelector('.summary-weekNumber').textContent = totalWeeks;
      summaryRow.querySelector('.summary-weekRange').textContent = `${formatToDate(startDate)} to ${formatToDate(endDate)}`;
      summaryRow.querySelector('.summary-customerFacingTargetPercent').textContent = customerFacingTargetPercent;
      summaryRow.querySelector('.summary-customerFacingHours').textContent = totalHours;
      summaryRow.querySelector('.summary-customerFacingTargetAchievementPercent').textContent = achievementPercent;
      summaryRow.querySelector('.summary-gapToTarget').textContent = totalGaps;
      summaryRow.querySelector('.summary-customerFacingHoursTarget').textContent = totalTargets;
      summaryRow.querySelector('.summary-availableHours').textContent = totalAvailableHours;
    }

    // Calculate the average Customer Facing Achievement % and total Gap to Target up to the current week
    let totalAchievementPercent = 0;
    let processedWeeks = 0;

    for (const week of weeks) {
      if (week.isCurrentWeek) break; // Stop calculations when current week is reached
      totalAchievementPercent += week.customerFacingTargetAchievementPercent;
      processedWeeks++;
    }

    // Calculate total Gap to Target utilization
    let totalGapUtilization = 0;
    for (const week of weeks) {
      totalGapUtilization += week.gapToTarget;
    }

    // Calculate weeks left in the quarter
    const weeksLeftInQuarter = weeks.filter(week => week.endOfWeek >= today).length;

    // Calculate achievement and gap up to the current date
    const { achievementPercentToDate, totalGapToDate } = calculateAchievementAndGapToDate();

    // Update summary section for To Date Achievement
    const summarySection = document.querySelector('.summary-target-achievement');
    
    if (currentWeek) {
      const { achievementPercentToDate, totalGapToDate } = calculateAchievementAndGapToDate();
      summarySection.innerHTML = `
        <h4>${quarterStr.toUpperCase()} Summary</h4>
        <h5>📈 Achievement (To Date):</h5>
        <p class="summary-achievement-value">${achievementPercentToDate}%</p>
        <h5>📊 Gap Utilization (To Date):</h5>
        <p class="summary-gap-value">${totalGapToDate} Hours</p>
        <h5>📅 Weeks Left in Quarter:</h5>
        <p class="summary-weeks-left-value">${weeks.filter(week => week.endOfWeek >= today).length}</p>
      `;
    } else {
      summarySection.innerHTML = `
        <h4>${quarterStr.toUpperCase()} Summary</h4>
        <h5>📈 Achievement:</h5>
        <p class="summary-achievement-value">${achievementPercent}%</p>
        <h5>📊 Gap Utilization:</h5>
        <p class="summary-gap-value">${totalGaps} Hours</p>
        <h5>📅 Weeks Left in Quarter:</h5>
        <p class="summary-weeks-left-value">${weeks.filter(week => week.endOfWeek >= today).length}</p>
      `;
    }
  }

  // Create container for details
  const currentWeek = weeks.find(week => week.isCurrentWeek);
  const currentWeekNumber = currentWeek ? currentWeek.weekNumber : weeks.length; // Fallback to last week if not found
  const detailsContainer = document.createElement('div');
  detailsContainer.className = 'details-container';
  detailsContainer.innerHTML = `
  <h4>${quarterStr.toUpperCase()} Details</h4>
    <h5>📅 Quarter: </h5><p></strong> ${formatDate(startDate)} <span class="black">TO</span> ${formatDate(endDate)}</strong></p>
    <h5>🔢 Current Week: </h5><p></strong> ${currentWeekNumber} </strong></p>
    <h5>📍 Today's Date: </h5><p><strong>${formatDate(today)}</strong></p>
  `;

  // Create input element for Customer Facing Target %
  const inputWrapper = document.createElement('div');
  inputWrapper.className = 'input-wrapper';

  // Create label
  const label = document.createElement('label');
  label.htmlFor = 'cf-target';
  label.textContent = '🎯 Customer Facing Target %';

  // Create input field
  const inputTargetPercent = document.createElement('input');
  inputTargetPercent.type = 'number';
  inputTargetPercent.id = 'cf-target';
  inputTargetPercent.placeholder = 'Enter %';
  inputTargetPercent.value = customerFacingTargetPercent || '';
  inputTargetPercent.maxLength = 3; // Not strictly valid for type="number", use pattern or validation if needed
  inputTargetPercent.style.width = '100px'; // Just to enforce inline if needed

  inputWrapper.appendChild(label);
  inputWrapper.appendChild(inputTargetPercent);

  // Update Customer Facing Target % input field
  inputTargetPercent.addEventListener('input', function () {
    customerFacingTargetPercent = parseFloat(this.value) || 87; // Default to 87 if input is invalid
    localStorage.setItem(`${storagePrefix}-customerFacingTargetPercent`, customerFacingTargetPercent); // Persist to localStorage
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
    ['Week Number', 'Week Date Range', 'Customer Facing Target', 'Customer Facing Hours', 'Customer Facing Achievement', 'Gap to Target', 'Customer Facing Hours Target', 'Available Hours'].forEach(header => {
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
            localStorage.setItem(`${storagePrefix}-week-${week.weekNumber}-customerFacingHours`, week.customerFacingHours); // Persist to localStorage
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
    
    // Create summary section for To Date Achievement and Gap Utilization
    const summarySection = document.createElement('div');
    summarySection.className = 'summary-target-achievement';
    summarySection.innerHTML = `
      <h5>📈 Achievement:</h4>
      <p class="summary-achievement-value">0%</p>
      <h5>📊 Gap Utilization:</h4>
      <p class="summary-gap-value">0 Hours</p>
      <h5>📅 Weeks Left in Quarter:</h4>
      <p class="summary-weeks-left-value">0</p>
    `;
    block.appendChild(summarySection);
    block.appendChild(detailsContainer);
    block.appendChild(inputWrapper);
    block.appendChild(table);

    // Render holiday list dynamically
    const holidayListContainer = document.createElement('div');
    holidayListContainer.className = 'holiday-list-container';
    holidayListContainer.innerHTML = `
      <h3>📅 Holidays (${holidays.length})</h3>
      <ul class="holiday-list">
        ${holidays.map(holiday => {
          const dayName = holiday.toLocaleDateString('en-US', { weekday: 'long' });
          return `<li>
            <span class="holiday-date">${formatToDate(holiday)}</span>
            <span class="day">(${dayName})</span>
          </li>`;
        }).join('')}
      </ul>
    `;
    block.appendChild(holidayListContainer);

    recalculateSummaryRow(); // Initial calculation
  }

  renderTable();
}

export default decorate;
