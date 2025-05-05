const balance = document.getElementById('balance');
    const summary = document.getElementById('summary');
    const list = document.getElementById('list');
    const monthFilter = document.getElementById('month-filter');
    const searchBar = document.getElementById('search-bar');
    const toast = document.getElementById('toast');
    const confirmationDialog = document.getElementById('confirmation-dialog');
    const chartContainer = document.getElementById('chart-container');
    const incomeChartCanvas = document.getElementById('incomeChart');
    const expenseChartCanvas = document.getElementById('expenseChart');
    const incomeChartWrapper = document.getElementById('income-chart-wrapper');
    const expenseChartWrapper = document.getElementById('expense-chart-wrapper');
    let incomeChart = null;
    let expenseChart = null;

    let transactions = JSON.parse(localStorage.getItem('transactions')) || [];
    let currentMonth = 'all';

    document.getElementById('income-form').addEventListener('submit', e => addTransaction(e, true));
    document.getElementById('expense-form').addEventListener('submit', e => addTransaction(e, false));

    function showToast(msg) {
      toast.textContent = msg;
      toast.className = "show";
      setTimeout(() => toast.className = "", 3000);
    }

    function toggleTheme() {
      const html = document.documentElement;
      const current = html.getAttribute('data-theme') || 'light';
      const next = current === 'dark' ? 'light' : 'dark';
      html.setAttribute('data-theme', next);
      
      const themeBtn = document.querySelector('.toggle-theme');
      themeBtn.textContent = next === 'dark' ? '🌙 Dark Mode' : '☀️ Light Mode';
      showToast(`Switched to ${next} mode`);
      
      // Update chart colors when theme changes
      if (incomeChart) updateChartColors(incomeChart);
      if (expenseChart) updateChartColors(expenseChart);
    }

    function quickAdd(text, amount) {
      const today = new Date().toISOString().split('T')[0];
      const transaction = {
        id: Date.now(),
        text: text,
        amount: amount,
        date: today,
        note: ""
      };

      transactions.push(transaction);
      updateLocalStorage();
      init();
      showToast(`Added: ${text} ₹${Math.abs(amount)}`);
    }

    function addTransaction(e, isIncome) {
      e.preventDefault();
      const text = document.getElementById(isIncome ? 'income-text' : 'expense-text');
      const amount = document.getElementById(isIncome ? 'income-amount' : 'expense-amount');
      const date = document.getElementById(isIncome ? 'income-date' : 'expense-date');
      const note = document.getElementById(isIncome ? 'income-note' : 'expense-note');

      if (!text.value || !amount.value || !date.value) {
        alert("Please fill all required fields");
        return;
      }

      const transaction = {
        id: Date.now(),
        text: text.value,
        amount: isIncome ? +amount.value : -Math.abs(amount.value),
        date: date.value,
        note: note.value || ""
      };

      transactions.push(transaction);
      updateLocalStorage();
      text.value = amount.value = date.value = note.value = '';
      resetFilters();
      showToast(`${isIncome ? 'Income' : 'Expense'} added successfully`);
    }

    function removeTransaction(id) {
      transactions = transactions.filter(t => t.id !== id);
      updateLocalStorage();
      init();
      showToast("Transaction removed");
    }

    function addTransactionDOM(transaction) {
      const li = document.createElement('li');
      li.className = transaction.amount < 0 ? 'minus' : 'plus';
      
      const noteIndicator = transaction.note ? '<span class="note-indicator"></span>' : '';
      
      li.innerHTML = `
        <div>
          ${transaction.text} ${noteIndicator}<small>${transaction.date}</small>
          ${transaction.note ? `<div class="transaction-note">${transaction.note}</div>` : ''}
        </div>
        <span>${transaction.amount < 0 ? '-' : '+'}₹${Math.abs(transaction.amount).toFixed(2)}</span>
        <button class="delete-btn" onclick="removeTransaction(${transaction.id})">×</button>
      `;
      
      // Add touch event listeners for swipe to delete
      li.addEventListener('touchstart', handleTouchStart, false);
      li.addEventListener('touchmove', handleTouchMove, false);
      li.addEventListener('touchend', handleTouchEnd, false);
      li.addEventListener('touchcancel', handleTouchCancel, false);
      
      list.appendChild(li);
    }

    let touchStartX = 0;
    let touchEndX = 0;
    let currentSwipedItem = null;

    function handleTouchStart(e) {
      touchStartX = e.changedTouches[0].screenX;
      if (currentSwipedItem && currentSwipedItem !== e.target.closest('li')) {
        currentSwipedItem.classList.remove('swiped');
      }
      currentSwipedItem = e.target.closest('li');
    }

    function handleTouchMove(e) {
      if (!currentSwipedItem) return;
      touchEndX = e.changedTouches[0].screenX;
      const diff = touchEndX - touchStartX;
      if (diff < -30) { // Swipe left
        currentSwipedItem.classList.add('swiped');
      } else if (diff > 30) { // Swipe right
        currentSwipedItem.classList.remove('swiped');
      }
    }

    function handleTouchEnd() {
      if (!currentSwipedItem) return;
      setTimeout(() => {
        if (currentSwipedItem.classList.contains('swiped')) {
          currentSwipedItem.classList.remove('swiped');
        }
      }, 3000);
    }

    function handleTouchCancel() {
      if (currentSwipedItem) {
        currentSwipedItem.classList.remove('swiped');
      }
    }

    function updateValues(filtered) {
      const amounts = filtered.map(t => t.amount);
      const total = amounts.reduce((a, b) => a + b, 0);
      const income = amounts.filter(a => a > 0).reduce((a, b) => a + b, 0);
      const expense = amounts.filter(a => a < 0).reduce((a, b) => a + b, 0);

      balance.textContent = `₹${total.toFixed(2)}`;
      summary.innerHTML = '';
      if (income > 0) summary.innerHTML += `<div><h4>Income</h4><p class="money plus">+₹${income.toFixed(2)}</p></div>`;
      if (expense < 0) summary.innerHTML += `<div><h4>Expense</h4><p class="money minus">-₹${Math.abs(expense).toFixed(2)}</p></div>`;
    }

    function updatePieCharts(filtered) {
      const incomeCategories = {};
      const expenseCategories = {};
      
      filtered.forEach(t => {
        if (t.amount > 0) {
          incomeCategories[t.text] = (incomeCategories[t.text] || 0) + t.amount;
        } else {
          expenseCategories[t.text] = (expenseCategories[t.text] || 0) + Math.abs(t.amount);
        }
      });
      
      const backgroundColors = [
        '#4CAF50', '#2196F3', '#FFC107', '#FF5722', '#9C27B0',
        '#00BCD4', '#8BC34A', '#607D8B', '#795548', '#E91E63'
      ];
      
      // Update visibility of chart container
      chartContainer.classList.toggle('visible', filtered.length > 0);
      
      // Income Chart
      const incomeLabels = Object.keys(incomeCategories);
      const incomeData = Object.values(incomeCategories);
      
      // Reset income chart wrapper to ensure canvas is present
      incomeChartWrapper.innerHTML = '<canvas id="incomeChart"></canvas>';
      const newIncomeChartCanvas = document.getElementById('incomeChart');
      
      if (incomeChart) incomeChart.destroy();
      
      if (incomeLabels.length > 0) {
        incomeChart = new Chart(newIncomeChartCanvas, {
          type: 'pie',
          data: {
            labels: incomeLabels,
            datasets: [{
              label: 'Income Categories',
              data: incomeData,
              backgroundColor: backgroundColors.slice(0, incomeLabels.length),
              borderColor: document.documentElement.getAttribute('data-theme') === 'dark' ? '#333' : '#fff',
              borderWidth: 1
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                position: 'bottom',
                labels: {
                  color: getComputedStyle(document.body).getPropertyValue('--text-color')
                }
              },
              title: {
                display: true,
                text: 'Income Categories',
                color: getComputedStyle(document.body).getPropertyValue('--text-color'),
                padding: {
                  top: 10,
                  bottom: 10
                }
              },
              tooltip: {
                callbacks: {
                  label: function(context) {
                    return `${context.label}: ₹${context.raw.toFixed(2)}`;
                  }
                }
              }
            }
          }
        });
      } else {
        incomeChartWrapper.innerHTML = '<p>No income data available</p>';
      }
      
      // Expense Chart
      const expenseLabels = Object.keys(expenseCategories);
      const expenseData = Object.values(expenseCategories);
      
      // Reset expense chart wrapper to ensure canvas is present
      expenseChartWrapper.innerHTML = '<canvas id="expenseChart"></canvas>';
      const newExpenseChartCanvas = document.getElementById('expenseChart');
      
      if (expenseChart) expenseChart.destroy();
      
      if (expenseLabels.length > 0) {
        expenseChart = new Chart(newExpenseChartCanvas, {
          type: 'pie',
          data: {
            labels: expenseLabels,
            datasets: [{
              label: 'Expense Categories',
              data: expenseData,
              backgroundColor: backgroundColors.slice(0, expenseLabels.length),
              borderColor: document.documentElement.getAttribute('data-theme') === 'dark' ? '#333' : '#fff',
              borderWidth: 1
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                position: 'bottom',
                labels: {
                  color: getComputedStyle(document.body).getPropertyValue('--text-color')
                }
              },
              title: {
                display: true,
                text: 'Expense Categories',
                color: getComputedStyle(document.body).getPropertyValue('--text-color'),
                padding: {
                  top: 10,
                  bottom: 10
                }
              },
              tooltip: {
                callbacks: {
                  label: function(context) {
                    return `${context.label}: ₹${context.raw.toFixed(2)}`;
                  }
                }
              }
            }
          }
        });
      } else {
        expenseChartWrapper.innerHTML = '<p>No expense data available</p>';
      }
    }

    function updateChartColors(chart) {
      if (!chart) return;
      const textColor = getComputedStyle(document.body).getPropertyValue('--text-color');
      const borderColor = document.documentElement.getAttribute('data-theme') === 'dark' ? '#333' : '#fff';
      
      chart.options.plugins.legend.labels.color = textColor;
      chart.options.plugins.title.color = textColor;
      
      chart.data.datasets.forEach(dataset => {
        dataset.borderColor = borderColor;
      });
      
      chart.update();
    }

    function updateLocalStorage() {
      localStorage.setItem('transactions', JSON.stringify(transactions));
    }

    function getMonth(dateStr) {
      return dateStr.slice(0, 7);
    }

    function updateMonthFilter() {
      const months = [...new Set(transactions.map(t => getMonth(t.date)))].sort().reverse();
      monthFilter.innerHTML = `<option value="all">View All</option>` +
        months.map(m => `<option value="${m}" ${currentMonth === m ? 'selected' : ''}>${m}</option>`).join('');
    }

    function filterByMonth() {
      currentMonth = monthFilter.value;
      if (currentMonth === 'all') {
        monthFilter.classList.remove('active-filter');
      } else {
        monthFilter.classList.add('active-filter');
      }
      init();
    }

    function resetFilters() {
      currentMonth = 'all';
      monthFilter.value = 'all';
      monthFilter.classList.remove('active-filter');
      searchBar.value = '';
      init();
      showToast("Filters reset");
    }

    function init() {
      list.innerHTML = '';
      updateMonthFilter();
      
      let filtered = [...transactions];
      
      // Apply month filter
      if (currentMonth !== 'all') {
        filtered = filtered.filter(t => getMonth(t.date) === currentMonth);
      }
      
      // Apply search filter
      const searchTerm = searchBar.value.toLowerCase();
      if (searchTerm) {
        filtered = filtered.filter(t => 
          t.text.toLowerCase().includes(searchTerm) || 
          t.date.includes(searchTerm) ||
          t.amount.toString().includes(searchTerm) ||
          (t.note && t.note.toLowerCase().includes(searchTerm))
        );
      }
      
      filtered.forEach(addTransactionDOM);
      updateValues(filtered);
      updatePieCharts(filtered);
    }

    function downloadCSV(filter = 'all') {
      let filtered = transactions;
      if (filter === 'income') filtered = transactions.filter(t => t.amount > 0);
      if (filter === 'expense') filtered = transactions.filter(t => t.amount < 0);
      if (filtered.length === 0) return showToast("No transactions to export");

      const csv = `ID,Text,Amount,Date,Note\n` + 
        filtered.map(t => `${t.id},"${t.text}",${t.amount},${t.date},"${t.note}"`).join('\n');
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `transactions_${filter}.csv`;
      a.click();
      showToast(`Exported ${filter} data`);
    }

    function showClearConfirmation() {
      if (transactions.length === 0) {
        showToast("No transactions to clear");
        return;
      }
      confirmationDialog.classList.add('active');
    }

    function hideClearConfirmation() {
      confirmationDialog.classList.remove('active');
    }

    function clearHistory() {
      transactions = [];
      updateLocalStorage();
      resetFilters();
      hideClearConfirmation();
      showToast("All transactions cleared");
    }

    // Initialize with light mode
    document.addEventListener('DOMContentLoaded', () => {
      document.querySelector('.toggle-theme').textContent = '🌓 Toggle Theme';
      init();
    });
  