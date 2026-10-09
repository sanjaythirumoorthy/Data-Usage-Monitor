# Daily Data Usage Monitoring & Analytics

> **A Complete College Data Science Project & Interactive Web Dashboard**  
> Developed using **Python, Flask, Pandas, NumPy, Matplotlib, Chart.js, HTML5, CSS3, and JavaScript**.

---

## 1. Project Overview

**Daily Data Usage Monitoring & Analytics** is a full-stack Data Science application designed to monitor, preprocess, analyze, and visualize daily mobile and broadband internet data consumption. 

In today's connected world, broadband and mobile plans operate under daily Fair Usage Policies (FUP) or high-speed bandwidth limits. Exceeding these limits often leads to throttled speeds or additional charges. This project applies foundational **Data Science methodologies**—data ingestion, cleaning, statistical analysis, hypothesis testing, anomaly detection, and exploratory data visualization—to provide actionable insights into user bandwidth consumption.

The system features an automated **Pandas data cleaning pipeline**, high-performance vectorized numerical computation using **NumPy**, interactive browser visualizations with **Chart.js**, and an academic statistical visualization engine powered by server-side **Matplotlib**.

---

## 2. Key Features

- **Dynamic KPI Metrics**:
  - Automatically computes **Total Usage**, **Average Daily Usage**, **Maximum Usage**, and **Minimum Usage** via NumPy.
  - Calculates advanced statistical indicators: **Median Usage**, **Standard Deviation ($\sigma$)**, and threshold violation frequency.
- **Automated Pandas Data Cleaning Pipeline**:
  - Detects duplicate records (`drop_duplicates()`).
  - Coerces and normalizes malformed dates (`pd.to_datetime(errors='coerce')`).
  - Cleans non-numeric and negative values (`pd.to_numeric(errors='coerce')`).
  - Strips whitespace and normalizes column headers.
  - Displays a live **Data Quality Summary**: Total Raw Rows, Duplicates Removed, Missing Values Handled, Clean Rows Processed.
- **Configurable Daily Quota & Limit Anomaly Detection**:
  - Configure daily limits (e.g., 2.0 GB, 3.0 GB, 4.0 GB, 5.0 GB) with instant re-calculation.
  - Non-intrusive alert notification card highlighting threshold violations and the peak offending day.
- **High-Usage Days Section**:
  - Dedicated table isolating days where consumption exceeded the configured quota with exact excess bandwidth calculations.
- **Automated Data Science Inferences & Insights**:
  - Generates plain-English statistical observations dynamically: peak/minimum dates, standard deviation volatility analysis, quota adherence rates, and weekly peak consumption periods.
- **Four Interactive Chart.js Visualizations**:
  1. **Chart 1 — Daily Usage Trend**: Time-series line chart with threshold limit indicator.
  2. **Chart 2 — Daily Usage Comparison**: Bar chart color-coded by status (Low, Normal, High).
  3. **Chart 3 — Usage Distribution**: Doughnut chart illustrating percentage of Low, Normal, and High usage days.
  4. **Chart 4 — Weekly Aggregated Usage**: Weekly grouped totals calculated via Pandas `groupby()`.
- **Academic Matplotlib Statistical EDA Plot**:
  - Server-side Python Matplotlib endpoint generating a distribution histogram with mean/median lines and a quartile boxplot for outlier detection.
- **Searchable, Sortable & Paginated Records Table**:
  - Full-text search by date or status.
  - Column sorting (Date and Usage asc/desc).
  - Status classification badges (`Low < 2 GB`, `Normal 2–4 GB`, `High > 4 GB`).
  - Client-side pagination (10 entries per page).
- **Date Range Filtering**:
  - Filter analytics between custom `From Date` and `To Date` or quick presets (*Last 7 Days*, *Last 14 Days*, *All Time*).
- **CSV Import & Export**:
  - Drag-and-drop CSV upload with instant validation.
  - One-click export of processed and classified datasets with excess usage calculations (`/api/export`).
- **Modern Responsive Design & Dark Mode**:
  - Sleek data dashboard built with Bootstrap 5 and custom CSS.
  - Seamless light/dark mode toggle with local storage persistence.

---

## 3. Technology Stack

| Layer | Technologies |
|---|---|
| **Backend Framework** | Python 3, Flask |
| **Data Processing & Preprocessing** | Pandas |
| **Numerical & Statistical Analysis** | NumPy |
| **Statistical Visualization (Backend)** | Matplotlib (Agg backend) |
| **Interactive Visualization (Frontend)** | Chart.js 4.4 |
| **Frontend UI & Styling** | HTML5, CSS3, Bootstrap 5.3, Font Awesome 6 |
| **Data Storage / Formats** | CSV (Comma-Separated Values) |

---

## 4. Academic Data Science Concepts Demonstrated

This project is tailored for academic evaluation, showcasing the core stages of the **Data Science Lifecycle**:

```
Raw CSV Dataset
      │
      ▼
┌────────────────────────────────────────────────────────┐
│  1. Data Ingestion & Loading (pd.read_csv)             │
└────────────────────────────────────────────────────────┘
      │
      ▼
┌────────────────────────────────────────────────────────┐
│  2. Data Cleaning & Preprocessing                      │
│     - Handling missing values (dropna)                 │
│     - Deduplication (drop_duplicates)                  │
│     - Type conversion & date coercion (to_datetime)   │
└────────────────────────────────────────────────────────┘
      │
      ▼
┌────────────────────────────────────────────────────────┐
│  3. Numerical & Statistical Modeling                   │
│     - Central Tendency: np.mean(), np.median()         │
│     - Dispersion: np.std(), np.min(), np.max()         │
│     - Vectorized thresholding: np.where(), np.select() │
│     - Time-series grouping: pd.groupby('Week')         │
└────────────────────────────────────────────────────────┘
      │
      ▼
┌────────────────────────────────────────────────────────┐
│  4. Data Visualization & Exploratory Data Analysis     │
│     - Interactive time-series trends (Chart.js)        │
│     - Frequency distribution & Boxplots (Matplotlib)   │
└────────────────────────────────────────────────────────┘
      │
      ▼
┌────────────────────────────────────────────────────────┐
│  5. Automated Insight Generation & Interpretation      │
└────────────────────────────────────────────────────────┘
```

---

## 5. Project Directory Structure

```
daily-data-monitoring/
│
├── app.py                     # Flask application, Pandas pipeline & REST endpoints
├── requirements.txt           # Python dependency specifications
│
├── data/
│   ├── data.csv               # Default 35-day realistic sample dataset
│   ├── sample_dataset_with_issues.csv # Messy dataset for testing data cleaning
│   └── active_data.csv        # Current active working dataset
│
├── templates/
│   └── index.html             # Responsive Data Science Dashboard template
│
├── static/
│   ├── css/
│   │   └── style.css          # Custom dashboard styles & dark mode definitions
│   └── js/
│       └── script.js          # Chart.js renderers, filtering & API controller
│
└── README.md                  # Comprehensive academic documentation
```

---

## 6. Installation & Setup Instructions

### Prerequisites
- Python 3.10+ installed on your operating system.
- `pip` package manager.

### Step 1: Clone or Navigate to the Project Folder
Open your terminal or command prompt:
```bash
cd "d:\New folder"
```

### Step 2: Install Required Dependencies
Run the following command:
```bash
pip install -r requirements.txt
```

*Installed libraries:*
- `Flask>=3.0.0`
- `pandas>=2.0.0`
- `numpy>=1.24.0`
- `matplotlib>=3.7.0`

### Step 3: Run the Application
Start the Flask development server:
```bash
python app.py
```

You should see output similar to:
```
Starting Daily Data Usage Monitoring & Analytics Server...
Access the dashboard at http://127.0.0.1:5000
 * Serving Flask app 'app'
 * Debug mode: on
 * Running on http://127.0.0.1:5000
```

### Step 4: Open in Web Browser
Open your browser and navigate to:
```
http://127.0.0.1:5000
```

---

## 7. Sample CSV Dataset Format

The application comes pre-loaded with a 35-day sample dataset located at `data/data.csv`.

If uploading your own CSV dataset, ensure it follows this standard structure:

```csv
Date,Data_Usage_GB
2026-09-01,2.5
2026-09-02,3.2
2026-09-03,1.8
2026-09-04,4.1
2026-09-05,3.7
2026-09-06,5.2
2026-09-07,2.9
2026-09-08,3.5
2026-09-09,4.8
2026-09-10,2.1
```

### Testing Data Cleaning
A test dataset containing intentionally corrupted entries (missing values, duplicate rows, non-numeric strings) is included at `data/sample_dataset_with_issues.csv`.
You can upload this file directly from the dashboard to observe the cleaning pipeline clean 30 raw rows into 27 valid entries while reporting 2 missing values and 1 duplicate.

---

## 8. REST API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/` | Serves the main HTML dashboard |
| `GET` | `/api/data` | Returns computed summary metrics, chart series, and insights (supports `limit`, `start_date`, `end_date`) |
| `POST` | `/api/upload` | Uploads and preprocesses custom CSV datasets |
| `POST` | `/api/reset` | Resets active dataset back to the default 35-day sample |
| `GET` | `/api/export` | Downloads filtered and classified dataset as CSV (`Date,Data_Usage_GB,Status,Limit,Excess_Usage`) |
| `GET` | `/api/download-dirty-sample` | Downloads the messy CSV sample for demonstration |
| `GET` | `/api/matplotlib-chart` | Generates dynamic statistical distribution and boxplot image |

---

## 9. Usage Classification Rules

| Status | Consumption Range | Color Code | Interpretation |
|---|---|---|---|
| **Low** | $< 2.0\text{ GB}$ | Green (`#10b981`) | Light browsing, text messaging, background sync |
| **Normal** | $2.0\text{ GB} \le \text{Usage} \le 4.0\text{ GB}$ | Blue (`#2563eb`) | Regular streaming, web browsing, standard workflow |
| **High** | $> 4.0\text{ GB}$ | Red (`#ef4444`) | Heavy 4K streaming, large file downloads, online gaming |

---

## 10. Future Enhancements

- **Machine Learning Integration**: Implement ARIMA / Prophet time-series forecasting to predict future 7-day data consumption.
- **Anomaly Detection Algorithms**: Integrate Scikit-Learn `IsolationForest` or Z-Score anomaly detectors for statistical outlier identification.
- **Per-Application Breakdown**: Expand dataset schema to track per-app usage (e.g. YouTube, Netflix, Zoom, Steam).
- **Automated Email/SMS Alerts**: Integration with Twilio or SendGrid to send alert notifications when 90% of daily quota is consumed.

---

## 11. Academic Evaluation Summary

- **Pandas**: Used in `app.py` for file I/O, column renaming, duplicate detection, date parsing, missing value handling, sorting, and time-based grouping (`groupby()`).
- **NumPy**: Used in `app.py` for vectorized array operations (`np.sum`, `np.mean`, `np.max`, `np.min`, `np.median`, `np.std`, `np.where`, `np.select`).
- **Matplotlib**: Used for backend server-side statistical exploratory data analysis (EDA) visualizations.
- **Chart.js**: Powers responsive, interactive client-side charts with tooltips and gradient fills.
- **Flask**: Serves the REST API and coordinates the data flow between data science algorithms and the frontend user interface.
