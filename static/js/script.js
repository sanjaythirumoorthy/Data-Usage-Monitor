/**
 * Daily Data Usage Monitoring & Analytics
 * Frontend Controller & Chart.js Visualizations
 */

document.addEventListener('DOMContentLoaded', () => {
    // --- Application State ---
    const state = {
        currentLimit: 4.0,
        startDate: '',
        endDate: '',
        minDate: '',
        maxDate: '',
        allRecords: [],
        filteredRecords: [],
        currentPage: 1,
        pageSize: 10,
        sortColumn: 'date',
        sortDirection: 'asc',
        theme: localStorage.getItem('app_theme') || 'light'
    };

    // --- Chart References ---
    let dailyTrendChartInstance = null;
    let dailyBarChartInstance = null;
    let distributionChartInstance = null;
    let weeklyBarChartInstance = null;

    // --- DOM Elements ---
    const elements = {
        // Theme
        themeToggleBtn: document.getElementById('themeToggleBtn'),
        themeIcon: document.getElementById('themeIcon'),
        themeText: document.getElementById('themeText'),

        // Alerts
        alertContainer: document.getElementById('alertContainer'),

        // Quality
        qualityTotalRows: document.getElementById('qualityTotalRows'),
        qualityDuplicates: document.getElementById('qualityDuplicates'),
        qualityMissing: document.getElementById('qualityMissing'),
        qualityCleanRows: document.getElementById('qualityCleanRows'),

        // KPIs
        kpiTotalUsage: document.getElementById('kpiTotalUsage'),
        kpiAverageUsage: document.getElementById('kpiAverageUsage'),
        kpiMaxUsage: document.getElementById('kpiMaxUsage'),
        kpiMinUsage: document.getElementById('kpiMinUsage'),
        kpiDayCount: document.getElementById('kpiDayCount'),
        kpiPeakDate: document.getElementById('kpiPeakDate'),
        kpiMinDate: document.getElementById('kpiMinDate'),
        kpiMedianUsage: document.getElementById('kpiMedianUsage'),
        kpiStdUsage: document.getElementById('kpiStdUsage'),
        kpiCurrentLimit: document.getElementById('kpiCurrentLimit'),
        kpiHighDaysSummary: document.getElementById('kpiHighDaysSummary'),

        // Limit & Monitoring
        limitForm: document.getElementById('limitForm'),
        limitInput: document.getElementById('limitInput'),
        limitPresetBtns: document.querySelectorAll('.limit-preset-btn'),
        monitoringAlertCard: document.getElementById('monitoringAlertCard'),
        monitoringAlertContent: document.getElementById('monitoringAlertContent'),

        // Date Filter
        dateFilterForm: document.getElementById('dateFilterForm'),
        startDateInput: document.getElementById('startDateInput'),
        endDateInput: document.getElementById('endDateInput'),
        resetFilterBtn: document.getElementById('resetFilterBtn'),
        last7DaysBtn: document.getElementById('last7DaysBtn'),
        last14DaysBtn: document.getElementById('last14DaysBtn'),

        // Insights & High Usage
        insightsContainer: document.getElementById('insightsContainer'),
        highUsageCounterBadge: document.getElementById('highUsageCounterBadge'),
        highUsageTableBody: document.getElementById('highUsageTableBody'),

        // Table
        tableSearchInput: document.getElementById('tableSearchInput'),
        statusFilterSelect: document.getElementById('statusFilterSelect'),
        dataTableBody: document.getElementById('dataTableBody'),
        sortDateTh: document.getElementById('sortDateTh'),
        sortUsageTh: document.getElementById('sortUsageTh'),
        paginationInfo: document.getElementById('paginationInfo'),
        paginationControls: document.getElementById('paginationControls'),

        // Upload & Actions
        uploadForm: document.getElementById('uploadForm'),
        csvFileInput: document.getElementById('csvFileInput'),
        browseFileBtn: document.getElementById('browseFileBtn'),
        analyzeFileBtn: document.getElementById('analyzeFileBtn'),
        dropzoneArea: document.getElementById('dropzoneArea'),
        selectedFileName: document.getElementById('selectedFileName'),
        resetDataBtn: document.getElementById('resetDataBtn'),
        exportCsvBtn: document.getElementById('exportCsvBtn'),
        tableExportBtn: document.getElementById('tableExportBtn'),

        // Matplotlib Modal
        openMatplotlibBtn: document.getElementById('openMatplotlibBtn'),
        matplotlibModalEl: document.getElementById('matplotlibModal'),
        matplotlibImage: document.getElementById('matplotlibImage'),
        matplotlibLoading: document.getElementById('matplotlibLoading'),
        downloadMatplotlibBtn: document.getElementById('downloadMatplotlibBtn')
    };

    const matplotlibModal = new bootstrap.Modal(elements.matplotlibModalEl);

    // =========================================================================
    // Theme Management
    // =========================================================================
    function applyTheme(theme) {
        state.theme = theme;
        document.documentElement.setAttribute('data-bs-theme', theme);
        localStorage.setItem('app_theme', theme);

        if (theme === 'dark') {
            elements.themeIcon.className = 'fa-solid fa-sun';
            elements.themeText.textContent = 'Light';
        } else {
            elements.themeIcon.className = 'fa-solid fa-moon';
            elements.themeText.textContent = 'Dark';
        }

        // Re-render charts with theme colors if already initialized
        if (dailyTrendChartInstance) {
            updateChartsTheme();
        }
    }

    elements.themeToggleBtn.addEventListener('click', () => {
        const newTheme = state.theme === 'light' ? 'dark' : 'light';
        applyTheme(newTheme);
    });

    applyTheme(state.theme);

    // =========================================================================
    // Alert Notification System
    // =========================================================================
    function showAlert(message, type = 'info', timeout = 5000) {
        const iconMap = {
            success: 'fa-circle-check',
            danger: 'fa-circle-exclamation',
            warning: 'fa-triangle-exclamation',
            info: 'fa-circle-info'
        };
        const icon = iconMap[type] || 'fa-bell';

        const alertEl = document.createElement('div');
        alertEl.className = `alert alert-${type} alert-dismissible fade show d-flex align-items-center gap-2 shadow-sm`;
        alertEl.role = 'alert';
        alertEl.innerHTML = `
            <i class="fa-solid ${icon}"></i>
            <div class="flex-grow-1 fs-sm">${message}</div>
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        `;

        elements.alertContainer.innerHTML = '';
        elements.alertContainer.appendChild(alertEl);

        if (timeout > 0) {
            setTimeout(() => {
                if (alertEl.parentNode) {
                    const bsAlert = new bootstrap.Alert(alertEl);
                    bsAlert.close();
                }
            }, timeout);
        }
    }

    // =========================================================================
    // API Data Fetching & Dashboard Refresh
    // =========================================================================
    async function fetchDashboardData() {
        try {
            const params = new URLSearchParams();
            params.append('limit', state.currentLimit);
            if (state.startDate) params.append('start_date', state.startDate);
            if (state.endDate) params.append('end_date', state.endDate);

            const response = await fetch(`/api/data?${params.toString()}`);
            const result = await response.json();

            if (!result.success) {
                showAlert(result.error || 'Failed to load dashboard data.', 'danger');
                return;
            }

            const { quality, data } = result;

            // 1. Update Data Quality Banner
            updateQualityBanner(quality);

            // 2. Update KPI Cards & Secondary Metrics
            updateKPICards(data.summary, data.table_records);

            // 3. Update Monitoring Notification Card
            updateMonitoringAlert(data.summary);

            // 4. Update Insights
            updateInsights(data.insights);

            // 5. Update High Usage Table
            updateHighUsageTable(data.high_usage_records, data.summary);

            // 6. Update Chart.js Visualizations
            renderCharts(data.charts);

            // 7. Update Table Records
            state.allRecords = data.table_records;
            applyTableFiltersAndRender();

            // 8. Update Date Filter Inputs
            if (data.date_bounds) {
                state.minDate = data.date_bounds.min_date;
                state.maxDate = data.date_bounds.max_date;
                elements.startDateInput.min = state.minDate;
                elements.startDateInput.max = state.maxDate;
                elements.endDateInput.min = state.minDate;
                elements.endDateInput.max = state.maxDate;

                if (!state.startDate) elements.startDateInput.value = data.date_bounds.selected_start;
                if (!state.endDate) elements.endDateInput.value = data.date_bounds.selected_end;
            }

            // 9. Update Export Links
            updateExportLinks();

        } catch (error) {
            console.error('Error fetching dashboard data:', error);
            showAlert('Network or server error while loading dashboard data.', 'danger');
        }
    }

    // =========================================================================
    // Component Renderers
    // =========================================================================
    function updateQualityBanner(quality) {
        if (!quality) return;
        elements.qualityTotalRows.textContent = quality.total_rows;
        elements.qualityDuplicates.textContent = quality.duplicates_count;
        elements.qualityMissing.textContent = quality.missing_values_count;
        elements.qualityCleanRows.textContent = quality.clean_rows;
    }

    function updateKPICards(summary, records) {
        if (!summary) return;

        elements.kpiTotalUsage.textContent = summary.total_usage.toFixed(2);
        elements.kpiAverageUsage.textContent = summary.mean_usage.toFixed(2);
        elements.kpiMaxUsage.textContent = summary.max_usage.toFixed(2);
        elements.kpiMinUsage.textContent = summary.min_usage.toFixed(2);

        elements.kpiDayCount.textContent = summary.count;
        elements.kpiMedianUsage.textContent = `${summary.median_usage.toFixed(2)} GB`;
        elements.kpiStdUsage.textContent = `${summary.std_usage.toFixed(2)} GB`;
        elements.kpiCurrentLimit.textContent = `${summary.daily_limit.toFixed(2)} GB`;
        elements.kpiHighDaysSummary.textContent = `${summary.high_usage_count} days (${summary.high_usage_pct}%)`;

        // Find peak and min dates
        if (records && records.length > 0) {
            const maxRec = records.find(r => Math.abs(r.usage - summary.max_usage) < 0.001);
            const minRec = records.find(r => Math.abs(r.usage - summary.min_usage) < 0.001);
            elements.kpiPeakDate.textContent = maxRec ? maxRec.date : '-';
            elements.kpiMinDate.textContent = minRec ? minRec.date : '-';
        }
    }

    function updateMonitoringAlert(summary) {
        const card = elements.monitoringAlertCard;
        const container = elements.monitoringAlertContent;

        if (summary.high_usage_count > 0 && summary.worst_day) {
            card.className = 'card border-0 shadow-sm h-100 alert-card-warning';
            container.innerHTML = `
                <div class="d-flex align-items-start gap-3">
                    <div class="fs-2 text-warning">
                        <i class="fa-solid fa-triangle-exclamation"></i>
                    </div>
                    <div class="flex-grow-1">
                        <div class="d-flex justify-content-between align-items-center mb-1">
                            <h5 class="fw-bold mb-0">High Data Usage Detected</h5>
                            <span class="badge bg-danger rounded-pill px-2 py-1">${summary.high_usage_count} Days Exceeded</span>
                        </div>
                        <p class="mb-2 fs-sm">
                            Internet consumption surpassed the configured limit of <strong>${summary.daily_limit} GB</strong> on <strong>${summary.high_usage_count} day(s)</strong> (${summary.high_usage_pct}% of the monitored duration).
                        </p>
                        <div class="p-2 rounded bg-body-tertiary border d-flex flex-wrap justify-content-between align-items-center gap-2 fs-xs">
                            <div>
                                <strong class="text-body">Peak Overuse Date:</strong> 
                                <span class="badge bg-secondary ms-1">${summary.worst_day.date}</span>
                            </div>
                            <div>
                                <span>Recorded: <strong>${summary.worst_day.usage} GB</strong></span>
                                <span class="mx-1">|</span>
                                <span>Limit: <strong>${summary.worst_day.limit} GB</strong></span>
                                <span class="mx-1">|</span>
                                <span class="text-danger fw-bold">Excess: +${summary.worst_day.excess} GB</span>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        } else {
            card.className = 'card border-0 shadow-sm h-100 alert-card-success';
            container.innerHTML = `
                <div class="d-flex align-items-center gap-3">
                    <div class="fs-2 text-success">
                        <i class="fa-solid fa-circle-check"></i>
                    </div>
                    <div>
                        <h5 class="fw-bold mb-1">Usage Under Control</h5>
                        <p class="mb-0 fs-sm">
                            All <strong>${summary.count}</strong> monitored days strictly adhered to your configured daily quota of <strong>${summary.daily_limit} GB</strong>. No threshold violations detected.
                        </p>
                    </div>
                </div>
            `;
        }
    }

    function updateInsights(insights) {
        if (!insights || insights.length === 0) {
            elements.insightsContainer.innerHTML = '<p class="text-muted fs-sm">No insights available for this period.</p>';
            return;
        }

        const icons = [
            'fa-solid fa-chart-line text-primary',
            'fa-solid fa-fire text-danger',
            'fa-solid fa-snowflake text-info',
            'fa-solid fa-shield-halved text-warning',
            'fa-solid fa-wave-square text-purple',
            'fa-solid fa-calendar-week text-success',
            'fa-solid fa-pie-chart text-secondary'
        ];

        elements.insightsContainer.innerHTML = insights.map((text, idx) => {
            const icon = icons[idx % icons.length];
            return `
                <div class="insight-item">
                    <i class="${icon}"></i>
                    <span>${text}</span>
                </div>
            `;
        }).join('');
    }

    function updateHighUsageTable(highRecords, summary) {
        elements.highUsageCounterBadge.textContent = `${summary.high_usage_count} High Usage Days`;

        if (!highRecords || highRecords.length === 0) {
            elements.highUsageTableBody.innerHTML = `
                <tr>
                    <td colspan="4" class="text-center text-muted py-4 fs-sm">
                        <i class="fa-solid fa-check-circle text-success me-1"></i> No days exceeded the ${summary.daily_limit} GB limit.
                    </td>
                </tr>
            `;
            return;
        }

        elements.highUsageTableBody.innerHTML = highRecords.map(rec => `
            <tr>
                <td class="fw-semibold">${rec.Date}</td>
                <td class="text-end fw-bold text-body">${rec.Data_Usage_GB.toFixed(2)} GB</td>
                <td class="text-end text-muted">${rec.Limit.toFixed(2)} GB</td>
                <td class="text-end text-danger fw-bold">+${rec.Excess_Usage.toFixed(2)} GB</td>
            </tr>
        `).join('');
    }

    function updateExportLinks() {
        const params = new URLSearchParams();
        params.append('limit', state.currentLimit);
        if (state.startDate) params.append('start_date', state.startDate);
        if (state.endDate) params.append('end_date', state.endDate);

        const exportUrl = `/api/export?${params.toString()}`;
        elements.exportCsvBtn.href = exportUrl;
        elements.tableExportBtn.href = exportUrl;
    }

    // =========================================================================
    // Chart.js Visualizations Implementation
    // =========================================================================
    function getChartThemeColors() {
        const isDark = state.theme === 'dark';
        return {
            textColor: isDark ? '#94a3b8' : '#64748b',
            gridColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
            tooltipBg: isDark ? '#1e293b' : '#0f172a',
            tooltipText: '#ffffff'
        };
    }

    function renderCharts(chartsData) {
        if (!chartsData) return;
        const theme = getChartThemeColors();

        // -------------------------------------------------------------
        // Chart 1: Daily Usage Trend (Line Chart)
        // -------------------------------------------------------------
        const trendCtx = document.getElementById('dailyTrendChart').getContext('2d');
        if (dailyTrendChartInstance) dailyTrendChartInstance.destroy();

        // Create gradient fill
        const gradient = trendCtx.createLinearGradient(0, 0, 0, 300);
        gradient.addColorStop(0, 'rgba(37, 99, 235, 0.35)');
        gradient.addColorStop(1, 'rgba(37, 99, 235, 0.00)');

        dailyTrendChartInstance = new Chart(trendCtx, {
            type: 'line',
            data: {
                labels: chartsData.daily.labels,
                datasets: [
                    {
                        label: 'Daily Usage (GB)',
                        data: chartsData.daily.values,
                        borderColor: '#2563eb',
                        backgroundColor: gradient,
                        fill: true,
                        tension: 0.35,
                        borderWidth: 2.5,
                        pointRadius: 3.5,
                        pointHoverRadius: 6,
                        pointBackgroundColor: '#2563eb',
                        pointBorderColor: '#ffffff',
                        pointBorderWidth: 1.5
                    },
                    {
                        label: `Limit (${state.currentLimit} GB)`,
                        data: chartsData.daily.limits,
                        borderColor: '#ef4444',
                        borderDash: [6, 4],
                        borderWidth: 2,
                        pointRadius: 0,
                        fill: false
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                        labels: { color: theme.textColor, font: { family: 'Inter', size: 11 } }
                    },
                    tooltip: {
                        backgroundColor: theme.tooltipBg,
                        titleColor: theme.tooltipText,
                        bodyColor: theme.tooltipText,
                        callbacks: {
                            label: (ctx) => ` ${ctx.dataset.label}: ${ctx.raw} GB`
                        }
                    }
                },
                scales: {
                    x: {
                        ticks: { color: theme.textColor, font: { size: 10 } },
                        grid: { color: theme.gridColor }
                    },
                    y: {
                        beginAtZero: true,
                        ticks: {
                            color: theme.textColor,
                            font: { size: 10 },
                            callback: (val) => `${val} GB`
                        },
                        grid: { color: theme.gridColor }
                    }
                }
            }
        });

        // -------------------------------------------------------------
        // Chart 2: Daily Usage Comparison (Bar Chart with status colors)
        // -------------------------------------------------------------
        const barCtx = document.getElementById('dailyBarChart').getContext('2d');
        if (dailyBarChartInstance) dailyBarChartInstance.destroy();

        // Color bars based on usage status
        const barColors = chartsData.daily.values.map(val => {
            if (val > state.currentLimit) return 'rgba(239, 68, 68, 0.85)'; // High exceed
            if (val < 2.0) return 'rgba(16, 185, 129, 0.85)';               // Low
            return 'rgba(37, 99, 235, 0.85)';                              // Normal
        });

        dailyBarChartInstance = new Chart(barCtx, {
            type: 'bar',
            data: {
                labels: chartsData.daily.labels,
                datasets: [{
                    label: 'Daily Usage (GB)',
                    data: chartsData.daily.values,
                    backgroundColor: barColors,
                    borderRadius: 4,
                    borderSkipped: false
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: theme.tooltipBg,
                        callbacks: {
                            label: (ctx) => ` Usage: ${ctx.raw} GB`
                        }
                    }
                },
                scales: {
                    x: {
                        ticks: { color: theme.textColor, font: { size: 9 } },
                        grid: { display: false }
                    },
                    y: {
                        beginAtZero: true,
                        ticks: {
                            color: theme.textColor,
                            callback: (val) => `${val} GB`
                        },
                        grid: { color: theme.gridColor }
                    }
                }
            }
        });

        // -------------------------------------------------------------
        // Chart 3: Usage Distribution (Doughnut Chart)
        // -------------------------------------------------------------
        const distCtx = document.getElementById('distributionChart').getContext('2d');
        if (distributionChartInstance) distributionChartInstance.destroy();

        const dist = chartsData.distribution;
        const totalDist = dist.low + dist.normal + dist.high;

        distributionChartInstance = new Chart(distCtx, {
            type: 'doughnut',
            data: {
                labels: ['Low (<2 GB)', 'Normal (2-4 GB)', 'High (>4 GB)'],
                datasets: [{
                    data: [dist.low, dist.normal, dist.high],
                    backgroundColor: [
                        '#10b981', // green
                        '#2563eb', // blue
                        '#ef4444'  // red
                    ],
                    borderWidth: 2,
                    borderColor: state.theme === 'dark' ? '#1e293b' : '#ffffff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '68%',
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: theme.tooltipBg,
                        callbacks: {
                            label: (ctx) => {
                                const count = ctx.raw;
                                const pct = totalDist > 0 ? ((count / totalDist) * 100).toFixed(1) : 0;
                                return ` ${ctx.label}: ${count} days (${pct}%)`;
                            }
                        }
                    }
                }
            }
        });

        // -------------------------------------------------------------
        // Chart 4: Weekly Usage (Grouped Bar Chart)
        // -------------------------------------------------------------
        const weeklyCtx = document.getElementById('weeklyBarChart').getContext('2d');
        if (weeklyBarChartInstance) weeklyBarChartInstance.destroy();

        weeklyBarChartInstance = new Chart(weeklyCtx, {
            type: 'bar',
            data: {
                labels: chartsData.weekly.labels,
                datasets: [{
                    label: 'Total Weekly Bandwidth (GB)',
                    data: chartsData.weekly.values,
                    backgroundColor: 'rgba(124, 58, 237, 0.85)',
                    hoverBackgroundColor: 'rgba(124, 58, 237, 1)',
                    borderRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                        labels: { color: theme.textColor, font: { size: 11 } }
                    },
                    tooltip: {
                        backgroundColor: theme.tooltipBg,
                        callbacks: {
                            label: (ctx) => ` Total: ${ctx.raw} GB`
                        }
                    }
                },
                scales: {
                    x: {
                        ticks: { color: theme.textColor, font: { size: 10 } },
                        grid: { display: false }
                    },
                    y: {
                        beginAtZero: true,
                        ticks: {
                            color: theme.textColor,
                            callback: (val) => `${val} GB`
                        },
                        grid: { color: theme.gridColor }
                    }
                }
            }
        });
    }

    function updateChartsTheme() {
        const theme = getChartThemeColors();
        const charts = [dailyTrendChartInstance, dailyBarChartInstance, distributionChartInstance, weeklyBarChartInstance];

        charts.forEach(chart => {
            if (!chart) return;
            if (chart.options.scales) {
                if (chart.options.scales.x) {
                    chart.options.scales.x.ticks.color = theme.textColor;
                    if (chart.options.scales.x.grid) chart.options.scales.x.grid.color = theme.gridColor;
                }
                if (chart.options.scales.y) {
                    chart.options.scales.y.ticks.color = theme.textColor;
                    if (chart.options.scales.y.grid) chart.options.scales.y.grid.color = theme.gridColor;
                }
            }
            if (chart.options.plugins && chart.options.plugins.legend) {
                chart.options.plugins.legend.labels.color = theme.textColor;
            }
            chart.update();
        });
    }

    // =========================================================================
    // Dataset Table Management (Search, Sort, Pagination)
    // =========================================================================
    function applyTableFiltersAndRender() {
        const query = elements.tableSearchInput.value.trim().toLowerCase();
        const statusFilter = elements.statusFilterSelect.value;

        // Filter records
        state.filteredRecords = state.allRecords.filter(rec => {
            const matchesQuery = !query || rec.date.toLowerCase().includes(query) || rec.status.toLowerCase().includes(query);
            const matchesStatus = statusFilter === 'ALL' || rec.status === statusFilter;
            return matchesQuery && matchesStatus;
        });

        // Sort records
        state.filteredRecords.sort((a, b) => {
            let valA = a[state.sortColumn];
            let valB = b[state.sortColumn];
            if (state.sortColumn === 'usage') {
                valA = Number(valA);
                valB = Number(valB);
            }
            if (valA < valB) return state.sortDirection === 'asc' ? -1 : 1;
            if (valA > valB) return state.sortDirection === 'asc' ? 1 : -1;
            return 0;
        });

        // Reset to page 1 if current page is out of bounds
        const totalPages = Math.ceil(state.filteredRecords.length / state.pageSize) || 1;
        if (state.currentPage > totalPages) state.currentPage = 1;

        renderTablePage();
    }

    function renderTablePage() {
        const total = state.filteredRecords.length;
        const totalPages = Math.ceil(total / state.pageSize) || 1;
        const startIdx = (state.currentPage - 1) * state.pageSize;
        const endIdx = Math.min(startIdx + state.pageSize, total);
        const pageItems = state.filteredRecords.slice(startIdx, endIdx);

        // Update Info
        elements.paginationInfo.textContent = total > 0
            ? `Showing ${startIdx + 1} to ${endIdx} of ${total} entries`
            : 'No matching records found';

        // Render Rows
        if (pageItems.length === 0) {
            elements.dataTableBody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center text-muted py-4">
                        <i class="fa-solid fa-magnifying-glass me-1"></i> No records match your criteria.
                    </td>
                </tr>
            `;
        } else {
            elements.dataTableBody.innerHTML = pageItems.map(row => {
                let badgeClass = 'badge-status-normal';
                if (row.status === 'Low') badgeClass = 'badge-status-low';
                else if (row.status === 'High') badgeClass = 'badge-status-high';

                const excessText = row.excess > 0 ? `+${row.excess.toFixed(2)} GB` : '-';
                const excessClass = row.excess > 0 ? 'text-danger fw-bold' : 'text-muted';

                return `
                    <tr>
                        <td class="fw-semibold">${row.date}</td>
                        <td class="text-end fw-bold text-body">${row.usage.toFixed(2)} GB</td>
                        <td class="text-center">
                            <span class="badge ${badgeClass} px-2 py-1 rounded-pill">${row.status}</span>
                        </td>
                        <td class="text-end text-muted">${row.limit.toFixed(2)} GB</td>
                        <td class="text-end ${excessClass}">${excessText}</td>
                    </tr>
                `;
            }).join('');
        }

        // Render Pagination Controls
        renderPaginationButtons(totalPages);
    }

    function renderPaginationButtons(totalPages) {
        let html = '';

        // Previous
        html += `
            <li class="page-item ${state.currentPage === 1 ? 'disabled' : ''}">
                <button class="page-link" data-page="${state.currentPage - 1}" aria-label="Previous">
                    &laquo;
                </button>
            </li>
        `;

        // Numeric pages
        for (let p = 1; p <= totalPages; p++) {
            if (p === 1 || p === totalPages || (p >= state.currentPage - 1 && p <= state.currentPage + 1)) {
                html += `
                    <li class="page-item ${p === state.currentPage ? 'active' : ''}">
                        <button class="page-link" data-page="${p}">${p}</button>
                    </li>
                `;
            } else if (p === state.currentPage - 2 || p === state.currentPage + 2) {
                html += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
            }
        }

        // Next
        html += `
            <li class="page-item ${state.currentPage === totalPages ? 'disabled' : ''}">
                <button class="page-link" data-page="${state.currentPage + 1}" aria-label="Next">
                    &raquo;
                </button>
            </li>
        `;

        elements.paginationControls.innerHTML = html;

        // Attach page clicks
        elements.paginationControls.querySelectorAll('button[data-page]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const targetPage = parseInt(e.currentTarget.getAttribute('data-page'), 10);
                if (targetPage >= 1 && targetPage <= totalPages && targetPage !== state.currentPage) {
                    state.currentPage = targetPage;
                    renderTablePage();
                }
            });
        });
    }

    // Table Event Listeners
    elements.tableSearchInput.addEventListener('input', () => {
        state.currentPage = 1;
        applyTableFiltersAndRender();
    });

    elements.statusFilterSelect.addEventListener('change', () => {
        state.currentPage = 1;
        applyTableFiltersAndRender();
    });

    elements.sortDateTh.addEventListener('click', () => {
        if (state.sortColumn === 'date') {
            state.sortDirection = state.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            state.sortColumn = 'date';
            state.sortDirection = 'asc';
        }
        applyTableFiltersAndRender();
    });

    elements.sortUsageTh.addEventListener('click', () => {
        if (state.sortColumn === 'usage') {
            state.sortDirection = state.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            state.sortColumn = 'usage';
            state.sortDirection = 'desc';
        }
        applyTableFiltersAndRender();
    });

    // =========================================================================
    // Limit Configuration Form & Presets
    // =========================================================================
    elements.limitForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const newLimit = parseFloat(elements.limitInput.value);
        if (isNaN(newLimit) || newLimit <= 0) {
            showAlert('Please specify a positive numerical limit in GB.', 'warning');
            return;
        }

        state.currentLimit = newLimit;
        elements.limitPresetBtns.forEach(btn => {
            btn.classList.toggle('active', parseFloat(btn.dataset.limit) === newLimit);
        });

        showAlert(`Daily usage limit updated to ${newLimit.toFixed(1)} GB.`, 'info', 3000);
        fetchDashboardData();
    });

    elements.limitPresetBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const preset = parseFloat(btn.dataset.limit);
            elements.limitInput.value = preset;
            state.currentLimit = preset;
            elements.limitPresetBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            showAlert(`Daily usage limit updated to ${preset.toFixed(1)} GB.`, 'info', 3000);
            fetchDashboardData();
        });
    });

    // =========================================================================
    // Date Filtering Events
    // =========================================================================
    elements.dateFilterForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const start = elements.startDateInput.value;
        const end = elements.endDateInput.value;

        if (start && end && start > end) {
            showAlert('From Date cannot be later than To Date.', 'warning');
            return;
        }

        state.startDate = start;
        state.endDate = end;
        showAlert(`Filter applied for period: ${start || 'Beginning'} to ${end || 'End'}.`, 'info', 3000);
        fetchDashboardData();
    });

    elements.resetFilterBtn.addEventListener('click', () => {
        state.startDate = '';
        state.endDate = '';
        elements.startDateInput.value = state.minDate;
        elements.endDateInput.value = state.maxDate;
        showAlert('Date filter reset to all-time.', 'info', 3000);
        fetchDashboardData();
    });

    elements.last7DaysBtn.addEventListener('click', () => {
        if (!state.maxDate) return;
        const maxD = new Date(state.maxDate);
        const startD = new Date(maxD);
        startD.setDate(startD.getDate() - 6);

        state.startDate = startD.toISOString().split('T')[0];
        state.endDate = state.maxDate;
        elements.startDateInput.value = state.startDate;
        elements.endDateInput.value = state.endDate;
        fetchDashboardData();
    });

    elements.last14DaysBtn.addEventListener('click', () => {
        if (!state.maxDate) return;
        const maxD = new Date(state.maxDate);
        const startD = new Date(maxD);
        startD.setDate(startD.getDate() - 13);

        state.startDate = startD.toISOString().split('T')[0];
        state.endDate = state.maxDate;
        elements.startDateInput.value = state.startDate;
        elements.endDateInput.value = state.endDate;
        fetchDashboardData();
    });

    // =========================================================================
    // CSV File Upload & Drag-and-Drop
    // =========================================================================
    elements.browseFileBtn.addEventListener('click', () => {
        elements.csvFileInput.click();
    });

    elements.csvFileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            elements.selectedFileName.textContent = `Selected: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
            elements.analyzeFileBtn.disabled = false;
        }
    });

    // Drag & Drop
    ['dragenter', 'dragover'].forEach(evt => {
        elements.dropzoneArea.addEventListener(evt, (e) => {
            e.preventDefault();
            elements.dropzoneArea.classList.add('dragover');
        });
    });

    ['dragleave', 'drop'].forEach(evt => {
        elements.dropzoneArea.addEventListener(evt, (e) => {
            e.preventDefault();
            elements.dropzoneArea.classList.remove('dragover');
        });
    });

    elements.dropzoneArea.addEventListener('drop', (e) => {
        const file = e.dataTransfer.files[0];
        if (file) {
            if (!file.name.toLowerCase().endsWith('.csv')) {
                showAlert('Please drop a valid .csv file.', 'warning');
                return;
            }
            elements.csvFileInput.files = e.dataTransfer.files;
            elements.selectedFileName.textContent = `Selected: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
            elements.analyzeFileBtn.disabled = false;
        }
    });

    elements.uploadForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const file = elements.csvFileInput.files[0];
        if (!file) {
            showAlert('Please select a CSV file first.', 'warning');
            return;
        }

        const formData = new FormData();
        formData.append('file', file);

        elements.analyzeFileBtn.disabled = true;
        elements.analyzeFileBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Processing...';

        try {
            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });
            const result = await response.json();

            if (result.success) {
                showAlert(result.message, 'success', 6000);
                elements.selectedFileName.textContent = '';
                elements.csvFileInput.value = '';
                // Reset date filters and reload data
                state.startDate = '';
                state.endDate = '';
                fetchDashboardData();
            } else {
                showAlert(result.error || 'Failed to upload and clean dataset.', 'danger');
            }
        } catch (error) {
            console.error('Upload error:', error);
            showAlert('Error uploading CSV file to server.', 'danger');
        } finally {
            elements.analyzeFileBtn.disabled = false;
            elements.analyzeFileBtn.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles me-1"></i> Analyze Dataset';
        }
    });

    // =========================================================================
    // Reset Dataset
    // =========================================================================
    elements.resetDataBtn.addEventListener('click', async () => {
        try {
            const response = await fetch('/api/reset', { method: 'POST' });
            const result = await response.json();
            if (result.success) {
                showAlert(result.message, 'success', 4000);
                state.startDate = '';
                state.endDate = '';
                state.currentLimit = 4.0;
                elements.limitInput.value = 4.0;
                fetchDashboardData();
            } else {
                showAlert(result.error || 'Failed to reset dataset.', 'danger');
            }
        } catch (error) {
            showAlert('Failed to contact server to reset dataset.', 'danger');
        }
    });

    // =========================================================================
    // Academic Matplotlib Modal
    // =========================================================================
    elements.openMatplotlibBtn.addEventListener('click', () => {
        const params = new URLSearchParams();
        params.append('limit', state.currentLimit);
        if (state.startDate) params.append('start_date', state.startDate);
        if (state.endDate) params.append('end_date', state.endDate);
        params.append('t', Date.now()); // cache buster

        const chartUrl = `/api/matplotlib-chart?${params.toString()}`;

        elements.matplotlibLoading.classList.remove('d-none');
        elements.matplotlibImage.classList.add('d-none');
        elements.downloadMatplotlibBtn.href = chartUrl;

        elements.matplotlibImage.onload = () => {
            elements.matplotlibLoading.classList.add('d-none');
            elements.matplotlibImage.classList.remove('d-none');
        };

        elements.matplotlibImage.src = chartUrl;
        matplotlibModal.show();
    });

    // =========================================================================
    // Initial Load
    // =========================================================================
    fetchDashboardData();
});
