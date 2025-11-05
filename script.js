// 전역 변수
let csvData = [];
let loadComparisonChart = null;
let batteryChart = null;

// DOM 요소
const csvUpload = document.getElementById('csv-upload');
const fileName = document.getElementById('file-name');
const uploadSection = document.getElementById('upload-section');
const dashboardSection = document.getElementById('dashboard-section');
const datePicker = document.getElementById('date-picker');
const loadingOverlay = document.getElementById('loading');
const resetBtn = document.getElementById('reset-btn');

// 로딩 표시/숨김
function showLoading() {
    loadingOverlay.classList.add('active');
}

function hideLoading() {
    loadingOverlay.classList.remove('active');
}

// CSV 파일 업로드 처리
csvUpload.addEventListener('change', function(event) {
    const file = event.target.files[0];
    if (!file) return;

    fileName.textContent = `${file.name}`;
    showLoading();

    Papa.parse(file, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        complete: function(results) {
            csvData = results.data;
            
            // 헤더 공백 제거
            csvData = csvData.map(row => {
                const cleanRow = {};
                Object.keys(row).forEach(key => {
                    cleanRow[key.trim()] = row[key];
                });
                return cleanRow;
            });

            // 필수 컬럼 확인
            if (csvData.length === 0 || !csvData[0].timestamp || 
                csvData[0].load_kW === undefined || 
                csvData[0].G_kW === undefined ||
                csvData[0].P_c_kW === undefined || 
                csvData[0].P_d_kW === undefined) {
                alert('CSV 파일에 필수 컬럼(timestamp, load_kW, G_kW, P_c_kW, P_d_kW)이 없습니다.');
                hideLoading();
                return;
            }

            initializeDashboard();
            hideLoading();
        },
        error: function(error) {
            alert('CSV 파일을 읽는 중 오류가 발생했습니다: ' + error.message);
            hideLoading();
        }
    });
});

// 대시보드 초기화
function initializeDashboard() {
    // 날짜 추출 및 정렬
    const dates = [...new Set(csvData.map(row => {
        const date = new Date(row.timestamp);
        return date.toISOString().split('T')[0];
    }))].sort();

    // 날짜 선택기 채우기
    datePicker.innerHTML = dates.map(date => 
        `<option value="${date}">${date}</option>`
    ).join('');

    // 업로드 섹션 숨기고 대시보드 표시
    uploadSection.style.display = 'none';
    dashboardSection.style.display = 'block';

    // 첫 번째 날짜로 차트 생성
    updateCharts(dates[0]);

    // 날짜 변경 이벤트
    datePicker.addEventListener('change', function() {
        updateCharts(this.value);
    });
}

// 차트 업데이트
function updateCharts(selectedDate) {
    showLoading();

    // 선택된 날짜 데이터 필터링
    const filteredData = csvData.filter(row => {
        const date = new Date(row.timestamp);
        return date.toISOString().split('T')[0] === selectedDate;
    });

    // 시간대별로 데이터 그룹화
    const hourlyData = {};
    
    filteredData.forEach(row => {
        const date = new Date(row.timestamp);
        const hour = date.getHours();
        
        if (!hourlyData[hour]) {
            hourlyData[hour] = {
                loadBefore: [],  // ESS 도입 전 (load_kW)
                loadAfter: [],   // ESS 도입 후 (G_kW)
                charging: [],
                discharging: [],
                idle: 0
            };
        }
        
        hourlyData[hour].loadBefore.push(row.load_kW || 0);
        hourlyData[hour].loadAfter.push(row.G_kW || 0);
        hourlyData[hour].charging.push(row.P_c_kW || 0);
        hourlyData[hour].discharging.push(row.P_d_kW || 0);
        
        // 대기 상태: 충전도 방전도 아닌 경우
        if ((row.P_c_kW || 0) === 0 && (row.P_d_kW || 0) === 0) {
            hourlyData[hour].idle++;
        }
    });

    // 0~23시까지 레이블 생성
    const hours = Array.from({length: 24}, (_, i) => i);
    const labels = hours.map(h => `${String(h).padStart(2, '0')}:00`);

    // 시간대별 평균 계산
    const avgLoadBefore = hours.map(h => {
        const data = hourlyData[h]?.loadBefore || [];
        return data.length > 0 ? data.reduce((a, b) => a + b, 0) / data.length : 0;
    });

    const avgLoadAfter = hours.map(h => {
        const data = hourlyData[h]?.loadAfter || [];
        return data.length > 0 ? data.reduce((a, b) => a + b, 0) / data.length : 0;
    });

    const avgCharging = hours.map(h => {
        const data = hourlyData[h]?.charging || [];
        return data.length > 0 ? data.reduce((a, b) => a + b, 0) / data.length : 0;
    });

    const avgDischarging = hours.map(h => {
        const data = hourlyData[h]?.discharging || [];
        return data.length > 0 ? data.reduce((a, b) => a + b, 0) / data.length : 0;
    });

    const idleCount = hours.map(h => hourlyData[h]?.idle || 0);

    // 피크값 계산
    const peakBefore = Math.max(...avgLoadBefore);
    const peakAfter = Math.max(...avgLoadAfter);

    // ESS 도입 전후 비교 차트 (Line Chart with Peak Lines)
    createLoadComparisonChart(labels, avgLoadBefore, avgLoadAfter, peakBefore, peakAfter);

    // 배터리 상태 차트 (Bar Chart)
    createBatteryChart(labels, avgCharging, avgDischarging, idleCount);

    hideLoading();
}

// ESS 도입 전후 비교 Line Chart 생성 (피크 가로선 추가)
function createLoadComparisonChart(labels, loadBefore, loadAfter, peakBefore, peakAfter) {
    const ctx = document.getElementById('load-comparison-chart').getContext('2d');

    if (loadComparisonChart) {
        loadComparisonChart.destroy();
    }

    loadComparisonChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'ESS 도입 전 (load_kW)',
                    data: loadBefore,
                    borderColor: '#FF3B30',
                    backgroundColor: 'rgba(255, 59, 48, 0.1)',
                    borderWidth: 2.5,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 3,
                    pointHoverRadius: 6,
                    pointBackgroundColor: '#FF3B30',
                    pointBorderColor: '#FFFFFF',
                    pointBorderWidth: 2
                },
                {
                    label: 'ESS 도입 후 (G_kW)',
                    data: loadAfter,
                    borderColor: '#007AFF',
                    backgroundColor: 'rgba(0, 122, 255, 0.1)',
                    borderWidth: 2.5,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 3,
                    pointHoverRadius: 6,
                    pointBackgroundColor: '#007AFF',
                    pointBorderColor: '#FFFFFF',
                    pointBorderWidth: 2
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    align: 'start',
                    labels: {
                        usePointStyle: true,
                        padding: 16,
                        font: {
                            size: 13,
                            weight: '500'
                        }
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    padding: 12,
                    titleFont: {
                        size: 14,
                        weight: '600'
                    },
                    bodyFont: {
                        size: 13
                    },
                    cornerRadius: 8,
                    displayColors: true,
                    callbacks: {
                        label: function(context) {
                            return `${context.dataset.label}: ${context.parsed.y.toFixed(2)} kW`;
                        }
                    }
                },
                annotation: {
                    annotations: {
                        peakBeforeLine: {
                            type: 'line',
                            yMin: peakBefore,
                            yMax: peakBefore,
                            borderColor: '#FF3B30',
                            borderWidth: 2,
                            borderDash: [8, 4],
                            label: {
                                display: true,
                                content: `도입 전 피크: ${peakBefore.toFixed(2)} kW`,
                                position: 'end',
                                backgroundColor: '#FF3B30',
                                color: '#FFFFFF',
                                font: {
                                    size: 11,
                                    weight: '600'
                                },
                                padding: 6,
                                borderRadius: 4
                            }
                        },
                        peakAfterLine: {
                            type: 'line',
                            yMin: peakAfter,
                            yMax: peakAfter,
                            borderColor: '#007AFF',
                            borderWidth: 2,
                            borderDash: [8, 4],
                            label: {
                                display: true,
                                content: `도입 후 피크: ${peakAfter.toFixed(2)} kW`,
                                position: 'start',
                                backgroundColor: '#007AFF',
                                color: '#FFFFFF',
                                font: {
                                    size: 11,
                                    weight: '600'
                                },
                                padding: 6,
                                borderRadius: 4
                            }
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)',
                        drawBorder: false
                    },
                    ticks: {
                        font: {
                            size: 12
                        },
                        callback: function(value) {
                            return value.toFixed(0) + ' kW';
                        }
                    },
                    title: {
                        display: true,
                        text: '부하 (kW)',
                        font: {
                            size: 13,
                            weight: '600'
                        },
                        padding: {
                            top: 10
                        }
                    }
                },
                x: {
                    grid: {
                        display: false,
                        drawBorder: false
                    },
                    ticks: {
                        font: {
                            size: 12
                        }
                    },
                    title: {
                        display: true,
                        text: '시간',
                        font: {
                            size: 13,
                            weight: '600'
                        },
                        padding: {
                            top: 10
                        }
                    }
                }
            }
        }
    });
}

// 배터리 상태 Bar Chart 생성
function createBatteryChart(labels, charging, discharging, idle) {
    const ctx = document.getElementById('battery-chart').getContext('2d');

    if (batteryChart) {
        batteryChart.destroy();
    }

    batteryChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: '충전 (kW)',
                    data: charging,
                    backgroundColor: '#34C759',
                    borderColor: '#34C759',
                    borderWidth: 0,
                    borderRadius: 6
                },
                {
                    label: '방전 (kW)',
                    data: discharging,
                    backgroundColor: '#FF9500',
                    borderColor: '#FF9500',
                    borderWidth: 0,
                    borderRadius: 6
                },
                {
                    label: '대기 (횟수)',
                    data: idle,
                    backgroundColor: '#8E8E93',
                    borderColor: '#8E8E93',
                    borderWidth: 0,
                    borderRadius: 6
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    align: 'start',
                    labels: {
                        usePointStyle: true,
                        padding: 16,
                        font: {
                            size: 13,
                            weight: '500'
                        }
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    padding: 12,
                    titleFont: {
                        size: 14,
                        weight: '600'
                    },
                    bodyFont: {
                        size: 13
                    },
                    cornerRadius: 8,
                    displayColors: true,
                    callbacks: {
                        label: function(context) {
                            const label = context.dataset.label || '';
                            const value = context.parsed.y;
                            if (label.includes('대기')) {
                                return `${label}: ${value}회`;
                            }
                            return `${label}: ${value.toFixed(2)} kW`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)',
                        drawBorder: false
                    },
                    ticks: {
                        font: {
                            size: 12
                        }
                    },
                    title: {
                        display: true,
                        text: 'kW / 횟수',
                        font: {
                            size: 13,
                            weight: '600'
                        },
                        padding: {
                            top: 10
                        }
                    }
                },
                x: {
                    grid: {
                        display: false,
                        drawBorder: false
                    },
                    ticks: {
                        font: {
                            size: 12
                        }
                    },
                    title: {
                        display: true,
                        text: '시간',
                        font: {
                            size: 13,
                            weight: '600'
                        },
                        padding: {
                            top: 10
                        }
                    }
                }
            }
        }
    });
}

// 리셋 버튼
resetBtn.addEventListener('click', function() {
    // 차트 파괴
    if (loadComparisonChart) loadComparisonChart.destroy();
    if (batteryChart) batteryChart.destroy();
    
    // 데이터 초기화
    csvData = [];
    csvUpload.value = '';
    fileName.textContent = '';
    
    // UI 초기화
    dashboardSection.style.display = 'none';
    uploadSection.style.display = 'block';
});