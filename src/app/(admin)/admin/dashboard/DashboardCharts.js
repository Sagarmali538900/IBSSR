'use client';

import { useState } from 'react';

export default function DashboardCharts({ monthlyData, examAverages }) {
  const [hoveredBar, setHoveredBar] = useState(null);
  const [hoveredExam, setHoveredExam] = useState(null);

  // --- 1. Monthly Completions Chart Config ---
  const maxCompletions = Math.max(...monthlyData.map(d => d.count), 5);
  const chartHeight = 180;
  const chartWidth = 500;
  const padding = 40;
  
  const graphHeight = chartHeight - padding * 2;
  const graphWidth = chartWidth - padding * 2;

  // --- 2. Exam Averages Chart Config ---
  const maxScore = 100;
  const examChartHeight = 180;
  const examChartWidth = 500;
  const examPaddingLeft = 120;
  const examPaddingRight = 40;
  const examPaddingTopBottom = 20;

  const examGraphWidth = examChartWidth - examPaddingLeft - examPaddingRight;
  const examGraphHeight = examChartHeight - examPaddingTopBottom * 2;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem', marginTop: '2rem' }}>
      
      {/* Chart 1: Monthly Trend */}
      <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
        <h3 style={{ fontSize: '1.2rem', color: '#fff', marginBottom: '1.5rem', fontWeight: 600 }}>
          Monthly Test Completions
        </h3>
        
        <div style={{ position: 'relative', width: '100%', height: `${chartHeight}px`, overflow: 'visible' }}>
          <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} width="100%" height="100%" style={{ overflow: 'visible' }}>
            {/* Gradients */}
            <defs>
              <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#a78bfa" />
                <stop offset="100%" stopColor="#4f46e5" />
              </linearGradient>
            </defs>

            {/* Grid Lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
              const y = padding + graphHeight * (1 - ratio);
              const gridVal = Math.round(maxCompletions * ratio);
              return (
                <g key={i}>
                  <line 
                    x1={padding} 
                    y1={y} 
                    x2={chartWidth - padding} 
                    y2={y} 
                    stroke="rgba(255,255,255,0.06)" 
                    strokeWidth="1" 
                  />
                  <text 
                    x={padding - 10} 
                    y={y + 4} 
                    fill="var(--text-muted)" 
                    fontSize="10" 
                    textAnchor="end"
                  >
                    {gridVal}
                  </text>
                </g>
              );
            })}

            {/* Bars */}
            {monthlyData.map((item, index) => {
              const x = padding + (graphWidth / monthlyData.length) * index + (graphWidth / monthlyData.length) * 0.15;
              const barWidth = (graphWidth / monthlyData.length) * 0.7;
              
              const barHeight = (item.count / maxCompletions) * graphHeight;
              const y = chartHeight - padding - barHeight;

              const isHovered = hoveredBar === index;

              return (
                <g key={index}>
                  <rect
                    x={x}
                    y={y}
                    width={barWidth}
                    height={Math.max(barHeight, 2)}
                    rx="4"
                    fill="url(#barGradient)"
                    style={{
                      transition: 'all 0.2s ease',
                      opacity: hoveredBar === null || isHovered ? 1 : 0.7,
                      cursor: 'pointer'
                    }}
                    onMouseEnter={() => setHoveredBar(index)}
                    onMouseLeave={() => setHoveredBar(null)}
                  />
                  
                  {/* Month Label */}
                  <text
                    x={x + barWidth / 2}
                    y={chartHeight - padding + 18}
                    fill="var(--text-muted)"
                    fontSize="10"
                    textAnchor="middle"
                  >
                    {item.label.split(' ')[0]}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* Tooltip */}
          {hoveredBar !== null && (
            <div style={{
              position: 'absolute',
              top: '10px',
              left: '50%',
              transform: 'translateX(-50%)',
              backgroundColor: 'rgba(15, 23, 42, 0.95)',
              border: '1px solid var(--glass-border)',
              padding: '6px 12px',
              borderRadius: '6px',
              color: '#fff',
              fontSize: '0.8rem',
              pointerEvents: 'none',
              boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
              zIndex: 10
            }}>
              <strong>{monthlyData[hoveredBar].label}</strong>: {monthlyData[hoveredBar].count} completion(s)
            </div>
          )}
        </div>
      </div>

      {/* Chart 2: Exam Averages */}
      <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
        <h3 style={{ fontSize: '1.2rem', color: '#fff', marginBottom: '1.5rem', fontWeight: 600 }}>
          Average Score by Exam
        </h3>

        {examAverages.length === 0 ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            No exam results available for comparison.
          </div>
        ) : (
          <div style={{ position: 'relative', width: '100%', height: `${examChartHeight}px`, overflow: 'visible' }}>
            <svg viewBox={`0 0 ${examChartWidth} ${examChartHeight}`} width="100%" height="100%" style={{ overflow: 'visible' }}>
              <defs>
                <linearGradient id="examBarGradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#3b82f6" />
                  <stop offset="100%" stopColor="#06b6d4" />
                </linearGradient>
              </defs>

              {/* Grid Lines (Vertical) */}
              {[0, 25, 50, 75, 100].map((val, i) => {
                const x = examPaddingLeft + (val / maxScore) * examGraphWidth;
                return (
                  <g key={i}>
                    <line 
                      x1={x} 
                      y1={examPaddingTopBottom} 
                      x2={x} 
                      y2={examChartHeight - examPaddingTopBottom} 
                      stroke="rgba(255,255,255,0.06)" 
                      strokeWidth="1" 
                    />
                    <text 
                      x={x} 
                      y={examChartHeight - 5} 
                      fill="var(--text-muted)" 
                      fontSize="9" 
                      textAnchor="middle"
                    >
                      {val}%
                    </text>
                  </g>
                );
              })}

              {/* Horizontal Bars */}
              {examAverages.map((item, index) => {
                const rowHeight = examGraphHeight / examAverages.length;
                const y = examPaddingTopBottom + rowHeight * index + rowHeight * 0.15;
                const barHeight = rowHeight * 0.7;
                
                const barWidth = (item.avgScore / maxScore) * examGraphWidth;
                const isHovered = hoveredExam === index;

                // Truncate title if too long
                const shortTitle = item.title.length > 15 ? `${item.title.substring(0, 13)}...` : item.title;

                return (
                  <g key={item._id}>
                    {/* Exam Name Label */}
                    <text
                      x={examPaddingLeft - 10}
                      y={y + barHeight / 2 + 4}
                      fill="#fff"
                      fontSize="10"
                      textAnchor="end"
                      fontWeight="500"
                    >
                      {shortTitle}
                    </text>

                    {/* Background Bar */}
                    <rect
                      x={examPaddingLeft}
                      y={y}
                      width={examGraphWidth}
                      height={barHeight}
                      rx="3"
                      fill="rgba(255,255,255,0.03)"
                    />

                    {/* Progress Bar */}
                    <rect
                      x={examPaddingLeft}
                      y={y}
                      width={Math.max(barWidth, 2)}
                      height={barHeight}
                      rx="3"
                      fill="url(#examBarGradient)"
                      style={{
                        transition: 'all 0.2s ease',
                        opacity: hoveredExam === null || isHovered ? 1 : 0.7,
                        cursor: 'pointer'
                      }}
                      onMouseEnter={() => setHoveredExam(index)}
                      onMouseLeave={() => setHoveredExam(null)}
                    />

                    {/* Score Text Overlay inside/beside the bar */}
                    <text
                      x={examPaddingLeft + barWidth + 8}
                      y={y + barHeight / 2 + 4}
                      fill="var(--accent-cyan)"
                      fontSize="10"
                      fontWeight="bold"
                    >
                      {Math.round(item.avgScore)}%
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* Tooltip */}
            {hoveredExam !== null && (
              <div style={{
                position: 'absolute',
                top: '-5px',
                left: '50%',
                transform: 'translateX(-50%)',
                backgroundColor: 'rgba(15, 23, 42, 0.95)',
                border: '1px solid var(--glass-border)',
                padding: '6px 12px',
                borderRadius: '6px',
                color: '#fff',
                fontSize: '0.8rem',
                pointerEvents: 'none',
                boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                zIndex: 10
              }}>
                <strong>{examAverages[hoveredExam].title}</strong>: Average score of <strong>{Math.round(examAverages[hoveredExam].avgScore * 10) / 10}%</strong> ({examAverages[hoveredExam].count} completion(s))
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  );
}
