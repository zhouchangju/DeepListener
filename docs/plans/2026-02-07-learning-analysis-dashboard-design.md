# Learning Analysis & Visualization Dashboard Design

## Overview
This document outlines the upgrade plan for the DeepListener dashboard, transforming it into a comprehensive "Learning Brain" that provides deep insights into memory health, review workload, and study behavior using FSRS-based metrics and advanced visualizations.

## 1. Architectural Changes

### 1.1 Data Aggregation Layer
To support complex visualizations without overloading the frontend, we will implement server-side aggregation in `src/app/dashboard/page.tsx` or dedicated API routes:
- **FSRS Analytics**: Aggregating `ReviewItem` states (stability, difficulty).
- **Retention Calculation**: Processing `ReviewLog` to calculate True Retention over time.
- **Workload Forecasting**: Projecting future review dates based on current card states.
- **Study Sessions**: Aggregating `StudySession` durations for the heatmap.

### 1.2 Frontend Structure
The dashboard will be organized into three specialized tabs:
1. **Overview**: Key progress indicators, TOEFL countdown, and summary charts.
2. **Memory Brain**: FSRS stability distribution, retention trends, and "Leech" (difficult items) monitoring.
3. **Behavior & Content**: Study heatmap, content mastery radar, and time-efficiency metrics.

## 2. Component Specifications

### 2.1 Memory Health (FSRS)
- **StabilityDistributionChart**:
  - Type: Bar/Pie chart.
  - Groups: New, Short-term (<7d), Mid-term (7-30d), Long-term (30-365d), Mature (>1y).
  - Insight: Shows the "age" and depth of the knowledge base.
- **RetentionTrendChart**:
  - Type: Line chart with a reference area.
  - Metrics: Daily True Retention (Successful Reviews / Total Reviews).
  - Reference: 90% target line.
- **LeechMonitor**:
  - Type: Table or List.
  - Logic: Filters items with `difficulty > 8` and `lapse > 5`.

### 2.2 Workload & Forecasting
- **OverdueBacklogChart**:
  - Type: Stacked Bar.
  - Segments: Due today, Overdue 1-3d, Overdue 4-7d, Overdue 1w+.
- **RatingDistributionChart**:
  - Type: Doughnut chart.
  - Metrics: % of Again, Hard, Good, Easy ratings.
  - Insight: High "Again/Hard" percentage indicates excessive cognitive load.
- **FutureWorkloadWave**:
  - Type: Area chart.
  - Metrics: Projected reviews for the next 30-90 days.

### 2.3 Behavior & Content Insights
- **StudyHeatmap**:
  - Type: Custom SVG Calendar (GitHub style).
  - Metric: Total minutes per day.
  - Interactivity: Toggle between Listening, Shadowing, and Review time.
- **ContentMasteryRadar**:
  - Type: Radar Chart.
  - Axes: Average Accuracy, Stability, Completion %, Frequency.
  - Grouping: `trackType` (Lecture, Conversation, etc.).
- **EfficiencyMetrics**:
  - Data Card: "Stability gained per Hour" or "Sentences mastered per Hour".

## 3. Data Flow & Performance
- **Optimization**: Use Prisma `groupBy` for status and type counts. Use `count()` for volume metrics.
- **Caching**: Leverage Next.js `revalidatePath` to refresh data after reviews.
- **Client-side Rendering**: Charts will continue to use `recharts` with the `ChartWrapper` to prevent SSR hydration issues.

## 4. Implementation Plan
1. **Phase 1: Data Model Expansion** (if needed) - Current schema seems sufficient.
2. **Phase 2: Backend Aggregation Logic** - Implement the math for True Retention and Stability groups.
3. **Phase 3: Core Visualizations** - Build the Memory Health and Workload charts.
4. **Phase 4: Advanced Visualizations** - Build the Heatmap and Radar charts.
5. **Phase 5: Tabbed Interface** - Reorganize the dashboard UI.

## 5. Verification
- Validate Retention calculation against known `ReviewLog` samples.
- Ensure the Heatmap correctly aggregates across different `StudySession` types.
- Verify chart responsiveness on mobile devices.
