import os
import io
import pandas as pd
import numpy as np
import matplotlib
matplotlib.use('Agg')  # Use non-interactive backend for server-side plotting
import matplotlib.pyplot as plt
from flask import Flask, render_template, request, jsonify, send_file, Response

app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # Max 16MB file upload

BASE_DIR = os.path.abspath(os.path.dirname(__file__))
DEFAULT_DATA_PATH = os.path.join(BASE_DIR, 'data', 'data.csv')
ACTIVE_DATA_PATH = os.path.join(BASE_DIR, 'data', 'active_data.csv')
DIRTY_SAMPLE_PATH = os.path.join(BASE_DIR, 'data', 'sample_dataset_with_issues.csv')

# Ensure active_data.csv exists initially by copying default data
if not os.path.exists(ACTIVE_DATA_PATH) and os.path.exists(DEFAULT_DATA_PATH):
    import shutil
    shutil.copyfile(DEFAULT_DATA_PATH, ACTIVE_DATA_PATH)


def load_and_preprocess_data(filepath_or_buffer):
    """
    Data Science Preprocessing Pipeline using Pandas:
    1. Loads dataset using pd.read_csv()
    2. Identifies Date and Usage columns
    3. Detects duplicate records and missing values
    4. Handles invalid dates with pd.to_datetime(errors='coerce')
    5. Converts usage to numeric with pd.to_numeric(errors='coerce')
    6. Removes null rows with dropna() and duplicates with drop_duplicates()
    7. Sorts data chronologically using sort_values()
    Returns: (cleaned_df, quality_metrics, error_msg)
    """
    try:
        # Load raw dataset using Pandas
        raw_df = pd.read_csv(filepath_or_buffer)
        if raw_df.empty:
            return None, None, "The uploaded CSV file is empty."
        
        # Normalize column names (strip whitespace and lower case mapping)
        col_map = {}
        for col in raw_df.columns:
            cleaned_col = col.strip()
            lower_col = cleaned_col.lower()
            if 'date' in lower_col:
                col_map[col] = 'Date'
            elif any(k in lower_col for k in ['usage', 'gb', 'data']):
                col_map[col] = 'Data_Usage_GB'
        
        raw_df = raw_df.rename(columns=col_map)
        
        if 'Date' not in raw_df.columns or 'Data_Usage_GB' not in raw_df.columns:
            return None, None, "CSV must contain 'Date' and 'Data_Usage_GB' (or similar) columns."

        total_rows = len(raw_df)
        
        # Track duplicate rows
        duplicates_count = int(raw_df.duplicated().sum())
        deduped_df = raw_df.drop_duplicates()
        
        # Convert Date to datetime and Data_Usage_GB to numeric, coercing invalid values to NaN
        cleaned_df = deduped_df.copy()
        cleaned_df['Date_dt'] = pd.to_datetime(cleaned_df['Date'], errors='coerce')
        cleaned_df['Data_Usage_GB'] = pd.to_numeric(cleaned_df['Data_Usage_GB'], errors='coerce')
        
        # Count missing or invalid entries
        missing_date_count = int(cleaned_df['Date_dt'].isna().sum())
        missing_usage_count = int(cleaned_df['Data_Usage_GB'].isna().sum())
        missing_values_count = missing_date_count + missing_usage_count
        
        # Drop rows with NaN values in crucial columns (Data Cleaning)
        cleaned_df = cleaned_df.dropna(subset=['Date_dt', 'Data_Usage_GB'])
        
        # Filter out negative usage values if any
        cleaned_df = cleaned_df[cleaned_df['Data_Usage_GB'] >= 0]
        
        # Sort chronologically by Date
        cleaned_df = cleaned_df.sort_values(by='Date_dt').reset_index(drop=True)
        
        # Format Date back to string YYYY-MM-DD for standard presentation
        cleaned_df['Date'] = cleaned_df['Date_dt'].dt.strftime('%Y-%m-%d')
        
        clean_rows = len(cleaned_df)
        if clean_rows == 0:
            return None, None, "No valid data rows found after cleaning."

        quality_metrics = {
            'total_rows': total_rows,
            'duplicates_count': duplicates_count,
            'missing_values_count': missing_values_count,
            'clean_rows': clean_rows
        }
        
        return cleaned_df, quality_metrics, None

    except Exception as e:
        return None, None, f"Error processing CSV: {str(e)}"


def perform_statistical_analysis(df, daily_limit=4.0, start_date=None, end_date=None):
    """
    Numerical & Statistical Analysis Pipeline using NumPy and Pandas:
    1. Filters data by date range
    2. Calculates central tendencies & dispersion using NumPy (np.sum, np.mean, np.max, np.min, np.median, np.std)
    3. Categorizes usage (Low < 2GB, Normal 2-4GB, High > 4GB)
    4. Computes limit exceedance using NumPy condition masking
    5. Aggregates weekly totals using Pandas groupby()
    6. Formulates data science insights dynamically
    """
    # Create working copy
    analysis_df = df.copy()
    
    # Date filtering
    if start_date:
        analysis_df = analysis_df[analysis_df['Date'] >= start_date]
    if end_date:
        analysis_df = analysis_df[analysis_df['Date'] <= end_date]
        
    if analysis_df.empty:
        return None, "No data matches the selected date range filter."
        
    # Extract usage array for NumPy vectorized operations
    usage_np = analysis_df['Data_Usage_GB'].to_numpy()
    
    # 1. NumPy Statistical Calculations
    total_usage = float(np.sum(usage_np))
    mean_usage = float(np.mean(usage_np))
    max_usage = float(np.max(usage_np))
    min_usage = float(np.min(usage_np))
    median_usage = float(np.median(usage_np))
    std_usage = float(np.std(usage_np))
    count = int(len(usage_np))
    
    # 2. Daily Status Categorization
    # Low: < 2 GB, Normal: 2 - 4 GB, High: > 4 GB
    conditions = [
        analysis_df['Data_Usage_GB'] < 2.0,
        (analysis_df['Data_Usage_GB'] >= 2.0) & (analysis_df['Data_Usage_GB'] <= 4.0),
        analysis_df['Data_Usage_GB'] > 4.0
    ]
    choices = ['Low', 'Normal', 'High']
    analysis_df['Status'] = np.select(conditions, choices, default='Normal')
    
    # 3. Limit Monitoring using NumPy
    analysis_df['Limit'] = daily_limit
    limit_mask = usage_np > daily_limit
    analysis_df['Excess_Usage'] = np.where(limit_mask, np.round(usage_np - daily_limit, 2), 0.0)
    
    high_usage_count = int(np.sum(limit_mask))
    high_usage_pct = (high_usage_count / count * 100) if count > 0 else 0.0
    
    # Worst offending day calculation
    worst_day = None
    if high_usage_count > 0:
        max_excess_idx = int(np.argmax(analysis_df['Excess_Usage'].to_numpy()))
        worst_row = analysis_df.iloc[max_excess_idx]
        worst_day = {
            'date': worst_row['Date'],
            'usage': round(float(worst_row['Data_Usage_GB']), 2),
            'limit': round(float(daily_limit), 2),
            'excess': round(float(worst_row['Excess_Usage']), 2)
        }
    
    # Filter high-usage records
    high_usage_df = analysis_df[analysis_df['Excess_Usage'] > 0].copy()
    high_usage_records = high_usage_df[['Date', 'Data_Usage_GB', 'Limit', 'Excess_Usage']].to_dict(orient='records')
    for rec in high_usage_records:
        rec['Data_Usage_GB'] = round(float(rec['Data_Usage_GB']), 2)
        rec['Excess_Usage'] = round(float(rec['Excess_Usage']), 2)
    
    # 4. Status Distribution
    low_count = int(np.sum(usage_np < 2.0))
    normal_count = int(np.sum((usage_np >= 2.0) & (usage_np <= 4.0)))
    high_count = int(np.sum(usage_np > 4.0))
    
    # 5. Weekly Usage Grouping with Pandas
    # Extract ISO calendar week / formatted week representation
    analysis_df['Week_Period'] = analysis_df['Date_dt'].dt.to_period('W').astype(str)
    # Group by Week_Period to calculate weekly total consumption
    weekly_grouped = analysis_df.groupby('Week_Period', sort=False)['Data_Usage_GB'].agg(['sum', 'mean', 'count']).reset_index()
    weekly_labels = []
    weekly_totals = []
    for idx, row in weekly_grouped.iterrows():
        # Clean week label: e.g. "Week 36 (2026-09-01)"
        weekly_labels.append(f"Week {idx + 1} ({row['Week_Period']})")
        weekly_totals.append(round(float(row['sum']), 2))
        
    # 6. Peak and Minimum Usage Dates
    max_idx = int(np.argmax(usage_np))
    min_idx = int(np.argmin(usage_np))
    max_date = analysis_df.iloc[max_idx]['Date']
    min_date = analysis_df.iloc[min_idx]['Date']
    
    # 7. Formulate Dynamic Data Science Insights
    insights = []
    insights.append(f"Average daily data consumption is {mean_usage:.2f} GB across {count} monitored days.")
    insights.append(f"Peak usage reached {max_usage:.2f} GB on {max_date}, while minimum recorded usage was {min_usage:.2f} GB on {min_date}.")
    insights.append(f"Cumulative total consumption across this period is {total_usage:.2f} GB with a median consumption of {median_usage:.2f} GB.")
    
    # Limit insight
    if high_usage_count > 0:
        insights.append(f"Configured limit of {daily_limit:.1f} GB was exceeded on {high_usage_count} day(s) ({high_usage_pct:.1f}% of monitored days), with maximum excess of {worst_day['excess']:.2f} GB.")
    else:
        insights.append(f"Excellent adherence: No days exceeded the configured daily threshold of {daily_limit:.1f} GB.")
        
    # Variability insight
    if std_usage > 1.2:
        insights.append(f"Standard deviation is {std_usage:.2f} GB, indicating high day-to-day volatility in network usage.")
    elif std_usage > 0.6:
        insights.append(f"Standard deviation is {std_usage:.2f} GB, indicating moderate variability in daily data consumption.")
    else:
        insights.append(f"Standard deviation is {std_usage:.2f} GB, reflecting consistent and steady daily usage habits.")
        
    # Weekly comparison insight
    if len(weekly_totals) >= 2:
        first_week = weekly_totals[0]
        peak_week_val = max(weekly_totals)
        peak_week_idx = weekly_totals.index(peak_week_val)
        peak_week_name = weekly_labels[peak_week_idx]
        insights.append(f"Weekly analysis indicates maximum bandwidth utilization in {peak_week_name} totaling {peak_week_val:.2f} GB.")
        
    # Category insight
    norm_pct = (normal_count / count) * 100
    insights.append(f"{norm_pct:.1f}% of days ({normal_count}/{count}) fall within the normal consumption bracket (2.0 - 4.0 GB).")
    
    # Structure summary payload
    summary = {
        'total_usage': round(total_usage, 2),
        'mean_usage': round(mean_usage, 2),
        'max_usage': round(max_usage, 2),
        'min_usage': round(min_usage, 2),
        'median_usage': round(median_usage, 2),
        'std_usage': round(std_usage, 2),
        'count': count,
        'daily_limit': round(daily_limit, 2),
        'high_usage_count': high_usage_count,
        'high_usage_pct': round(high_usage_pct, 1),
        'worst_day': worst_day
    }
    
    charts_data = {
        'daily': {
            'labels': analysis_df['Date'].tolist(),
            'values': [round(x, 2) for x in analysis_df['Data_Usage_GB'].tolist()],
            'limits': [round(daily_limit, 2)] * count,
            'statuses': analysis_df['Status'].tolist()
        },
        'weekly': {
            'labels': weekly_labels,
            'values': weekly_totals
        },
        'distribution': {
            'low': low_count,
            'normal': normal_count,
            'high': high_count
        }
    }
    
    # Table records
    table_records = []
    for _, r in analysis_df.iterrows():
        table_records.append({
            'date': r['Date'],
            'usage': round(float(r['Data_Usage_GB']), 2),
            'status': r['Status'],
            'limit': round(float(r['Limit']), 2),
            'excess': round(float(r['Excess_Usage']), 2)
        })
        
    date_bounds = {
        'min_date': df['Date'].min(),
        'max_date': df['Date'].max(),
        'selected_start': start_date or analysis_df['Date'].min(),
        'selected_end': end_date or analysis_df['Date'].max()
    }
    
    return {
        'summary': summary,
        'charts': charts_data,
        'high_usage_records': high_usage_records,
        'table_records': table_records,
        'insights': insights,
        'date_bounds': date_bounds
    }, None


# --- FLASK ROUTES ---

@app.route('/')
def index():
    """Serves the main Data Science Dashboard UI."""
    return render_template('index.html')


@app.route('/api/data', methods=['GET'])
def get_dashboard_data():
    """
    Main API endpoint:
    Returns preprocessed dataset statistics, KPI values, chart series, 
    and data quality metrics. Accepts query params: limit, start_date, end_date.
    """
    daily_limit = float(request.args.get('limit', 4.0))
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    
    # Load and clean data
    filepath = ACTIVE_DATA_PATH if os.path.exists(ACTIVE_DATA_PATH) else DEFAULT_DATA_PATH
    df, quality_metrics, err = load_and_preprocess_data(filepath)
    if err:
        return jsonify({'success': False, 'error': err}), 400
        
    analysis_results, err = perform_statistical_analysis(df, daily_limit=daily_limit, start_date=start_date, end_date=end_date)
    if err:
        return jsonify({'success': False, 'error': err}), 400
        
    return jsonify({
        'success': True,
        'quality': quality_metrics,
        'data': analysis_results
    })


@app.route('/api/upload', methods=['POST'])
def upload_csv():
    """
    API endpoint for dataset uploading:
    Validates CSV, applies Pandas cleaning pipeline, updates active dataset,
    and returns fresh statistics and data quality metrics.
    """
    if 'file' not in request.files:
        return jsonify({'success': False, 'error': 'No file part in the request.'}), 400
        
    file = request.files['file']
    if file.filename == '':
        return jsonify({'success': False, 'error': 'No file selected.'}), 400
        
    if not file.filename.lower().endswith('.csv'):
        return jsonify({'success': False, 'error': 'Invalid file format. Please upload a .csv file.'}), 400

    try:
        # Read stream
        file_bytes = file.read()
        buffer = io.BytesIO(file_bytes)
        
        # Test clean with pipeline
        cleaned_df, quality_metrics, err = load_and_preprocess_data(buffer)
        if err:
            return jsonify({'success': False, 'error': err}), 400
            
        # Save cleaned dataset as active dataset
        cleaned_df[['Date', 'Data_Usage_GB']].to_csv(ACTIVE_DATA_PATH, index=False)
        
        # Return success with quality summary
        return jsonify({
            'success': True,
            'message': f'Dataset successfully uploaded and cleaned! Processed {quality_metrics["clean_rows"]} valid records.',
            'quality': quality_metrics
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': f'Failed to parse uploaded CSV: {str(e)}'}), 500


@app.route('/api/reset', methods=['POST'])
def reset_to_sample():
    """Resets dataset to the initial 35-day sample dataset."""
    try:
        import shutil
        shutil.copyfile(DEFAULT_DATA_PATH, ACTIVE_DATA_PATH)
        return jsonify({'success': True, 'message': 'Dataset reset to default 35-day sample dataset.'})
    except Exception as e:
        return jsonify({'success': False, 'error': f'Failed to reset dataset: {str(e)}'}), 500


@app.route('/api/export', methods=['GET'])
def export_processed_csv():
    """
    API endpoint:
    Exports the current filtered dataset with computed Status and Excess Usage as CSV.
    """
    daily_limit = float(request.args.get('limit', 4.0))
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    
    filepath = ACTIVE_DATA_PATH if os.path.exists(ACTIVE_DATA_PATH) else DEFAULT_DATA_PATH
    df, _, err = load_and_preprocess_data(filepath)
    if err:
        return Response(f"Error: {err}", status=400, mimetype='text/plain')
        
    if start_date:
        df = df[df['Date'] >= start_date]
    if end_date:
        df = df[df['Date'] <= end_date]
        
    # Vectorized classifications
    usage_np = df['Data_Usage_GB'].to_numpy()
    conditions = [
        df['Data_Usage_GB'] < 2.0,
        (df['Data_Usage_GB'] >= 2.0) & (df['Data_Usage_GB'] <= 4.0),
        df['Data_Usage_GB'] > 4.0
    ]
    choices = ['Low', 'Normal', 'High']
    df['Status'] = np.select(conditions, choices, default='Normal')
    df['Limit'] = daily_limit
    df['Excess_Usage'] = np.where(usage_np > daily_limit, np.round(usage_np - daily_limit, 2), 0.0)
    
    export_df = df[['Date', 'Data_Usage_GB', 'Status', 'Limit', 'Excess_Usage']]
    
    output = io.StringIO()
    export_df.to_csv(output, index=False)
    
    return Response(
        output.getvalue(),
        mimetype='text/csv',
        headers={'Content-Disposition': 'attachment; filename=daily_data_usage_analysis.csv'}
    )


@app.route('/api/download-dirty-sample', methods=['GET'])
def download_dirty_sample():
    """Allows user to download a sample messy CSV with missing & duplicate rows to test data cleaning."""
    if os.path.exists(DIRTY_SAMPLE_PATH):
        return send_file(DIRTY_SAMPLE_PATH, as_attachment=True, download_name='sample_with_data_issues.csv')
    return jsonify({'error': 'File not found'}), 404


@app.route('/api/matplotlib-chart', methods=['GET'])
def generate_matplotlib_chart():
    """
    Academic Matplotlib Endpoint:
    Generates server-side exploratory statistical analysis visualizations:
    1. Distribution histogram with mean & median indicators
    2. Boxplot highlighting quartiles, IQR, and potential outliers
    3. Chronological moving average trend
    Returns dynamic PNG image.
    """
    filepath = ACTIVE_DATA_PATH if os.path.exists(ACTIVE_DATA_PATH) else DEFAULT_DATA_PATH
    df, _, err = load_and_preprocess_data(filepath)
    if err:
        return Response("Error loading data for plot", status=400)

    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    daily_limit = float(request.args.get('limit', 4.0))

    if start_date:
        df = df[df['Date'] >= start_date]
    if end_date:
        df = df[df['Date'] <= end_date]

    usage = df['Data_Usage_GB'].to_numpy()
    
    # Create Matplotlib Figure
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(11, 4.5), dpi=120)
    fig.patch.set_facecolor('#f8fafc')

    # Subplot 1: Histogram with stats
    ax1.set_facecolor('#ffffff')
    n, bins, patches = ax1.hist(usage, bins=10, color='#3b82f6', edgecolor='#1e40af', alpha=0.75, rwidth=0.85)
    mean_val = np.mean(usage)
    median_val = np.median(usage)
    
    ax1.axvline(mean_val, color='#ef4444', linestyle='--', linewidth=2, label=f'Mean ({mean_val:.2f} GB)')
    ax1.axvline(median_val, color='#10b981', linestyle=':', linewidth=2, label=f'Median ({median_val:.2f} GB)')
    ax1.axvline(daily_limit, color='#f59e0b', linestyle='-', linewidth=2, label=f'Limit ({daily_limit:.1f} GB)')
    
    ax1.set_title('Usage Distribution & Central Tendency', fontsize=12, fontweight='bold', color='#1e293b')
    ax1.set_xlabel('Daily Data Usage (GB)', fontsize=10, color='#475569')
    ax1.set_ylabel('Frequency (Days)', fontsize=10, color='#475569')
    ax1.grid(True, linestyle='--', alpha=0.3)
    ax1.legend(fontsize=9, loc='upper right')

    # Subplot 2: Boxplot for Dispersion & Outlier Detection
    ax2.set_facecolor('#ffffff')
    box = ax2.boxplot(usage, vert=True, patch_artist=True,
                      boxprops=dict(facecolor='#93c5fd', color='#1d4ed8', linewidth=1.5),
                      medianprops=dict(color='#dc2626', linewidth=2),
                      whiskerprops=dict(color='#1e293b', linewidth=1.2),
                      capprops=dict(color='#1e293b', linewidth=1.2),
                      flierprops=dict(marker='o', color='#ef4444', markersize=6))
    
    ax2.axhline(daily_limit, color='#f59e0b', linestyle='--', linewidth=1.5, label=f'Limit ({daily_limit:.1f} GB)')
    ax2.set_title('Quartile Spread & Outlier Analysis (Boxplot)', fontsize=12, fontweight='bold', color='#1e293b')
    ax2.set_ylabel('Data Usage (GB)', fontsize=10, color='#475569')
    ax2.set_xticks([1])
    ax2.set_xticklabels(['Daily Usage (GB)'], fontsize=10, color='#475569')
    ax2.grid(True, linestyle='--', alpha=0.3)
    ax2.legend(fontsize=9, loc='upper right')

    plt.tight_layout()

    # Save to IO buffer
    buf = io.BytesIO()
    fig.savefig(buf, format='png', bbox_inches='tight')
    plt.close(fig)
    buf.seek(0)

    return Response(buf.getvalue(), mimetype='image/png')


if __name__ == '__main__':
    # Run development server on port 5000
    print("Starting Daily Data Usage Monitoring & Analytics Server...")
    print("Access the dashboard at http://127.0.0.1:5000")
    app.run(debug=True, host='0.0.0.0', port=5000)
