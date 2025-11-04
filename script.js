window.addEventListener('DOMContentLoaded', () => {
    loadDefaultCSV();
});

function loadDefaultCSV() {
    showLoading();
    Papa.parse("ansan_hospital_2024.csv", {
        download: true,
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        complete: (results) => {
            processCSVData(results.data);
            hideLoading();
        },
        error: (error) => {
            console.error('CSV 로드 오류:', error);
            alert('CSV 파일을 불러오지 못했습니다.');
            hideLoading();
        }
    });
}


// 전역 변수
let allData = [];
let filteredData = [];
let hourlyData = [];
let availableDates = [];
let selectedDate = '';
let charts = {};

// DOM 요소
const fileInput = document.getElementById('fileInput');
const uploadScreen = document.getElementById('uploadScreen');
const dashboardScreen = document.getElementById('dashboardScreen');
const loadingScreen = document.getElementById('loadingScreen');
const dateSelect = document.getElementById('dateSelect');
const reuploadBtn = document.getElementById('reuploadBtn');

// 파일 업로드 이벤트
fileInput.addEventListener('change', handleFileUpload);
reuploadBtn.addEventListener('click', () => {
    fileInput.click();
});

// 탭 전환 이벤트
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const tabId = btn.dataset.tab;
        switchTab(tabId);
    });
});

// 날짜 선택 이벤트
dateSelect.addEventListener('change', (e) => {
    selectedDate = e.target.value;
    updateDashboard();
});

// 파일 업로드 핸들러
function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    showLoading();
    
    const reader = new FileReader();
    reader.onload = (e) => {
        const csvContent = e.target.result;
        processCSVData(csvContent);
    };
    reader.onerror = () => {
        hideLoading();
        alert('파일 읽기 오류가 발생했습니다.');
    };
    reader.readAsText(file);
}

// CSV 데이터 처리
function processCSVData(csvContent) {
    try {
        console.log('CSV 파싱 시작...');
        
        Papa.parse(csvContent, {
            header: true,
            dynamicTyping: true,
            skipEmptyLines: true,
            complete: (results) => {
                console.log('파싱 완료:', results.data.length, '행');
                
                // 데이터 변환
                allData = results.data.map((row, index) => {
                    // timestamp 파싱
                    const timestamp = new Date(row.timestamp);
                    
                    if (isNaN(timestamp.getTime())) {
                        console.warn('잘못된 timestamp:', row);
                        return null;
                    }

                    return {
                        ...row,
                        index,
                        timestamp: timestamp,
                        hour: timestamp.getHours(),
                        minute: timestamp.getMinutes(),
                        day: timestamp.getDate(),
                        monthNum: timestamp.getMonth() + 1,
                        year: timestamp.getFullYear(),
                        dateStr: timestamp.toISOString().split('T')[0],
                        timeLabel: `${timestamp.getHours().toString().padStart(2, '0')}:${timestamp.getMinutes().toString().padStart(2, '0')}`,
                        // 충전 상태 판단
                        isCharging: row.P_c_kW > 0,
                        isDischarging: row.P_d_kW > 0,
                        batteryAction: row.P_c_kW > 0 ? 'charging' : row.P_d_kW > 0 ? 'discharging' : 'idle'
                    };
                }).filter(row => row !== null);

                console.log('처리된 데이터:', allData.length, '행');

                // date 컬럼 기준으로 날짜 목록 생성
                availableDates = [...new Set(allData.map(d => d.date))].sort();
                console.log('날짜 범위:', availableDates[0], '~', availableDates[availableDates.length - 1]);
                console.log('총 날짜 수:', availableDates.length);

                // 날짜 선택 옵션 생성
                dateSelect.innerHTML = '';
                availableDates.forEach(date => {
                    const option = document.createElement('option');
                    option.value = date;
                    option.textContent = `${formatDate(date)} (${date})`;
                    dateSelect.appendChild(option);
                });

                // 첫 번째 날짜 선택
                selectedDate = availableDates[0];
                dateSelect.value = selectedDate;

                // 대시보드 표시
                hideLoading();
                dashboardScreen.style.display = 'block';

                // 대시보드 업데이트
                updateDashboard();
            },
            error: (error) => {
                console.error('파싱 오류:', error);
                hideLoading();
                alert('CSV 파일 파싱 중 오류가 발생했습니다.');
            }
        });
    } catch (error) {
        console.error('데이터 처리 오류:', error);
        hideLoading();
        alert('데이터 처리 중 오류가 발생했습니다.');
    }
}

// 대시보드 업데이트
function updateDashboard() {
    // date 컬럼 기준으로 필터링
    filteredData = allData.filter(d => d.date === selectedDate);
    
    // 시간순으로 정렬
    filteredData.sort((a, b) => {
        if (a.hour !== b.hour) {
            return a.hour - b.hour;
        }
        return a.minute - b.minute;
    });
    
    console.log('필터된 데이터:', filteredData.length, '행');
    if (filteredData.length > 0) {
        console.log('첫 데이터:', filteredData[0]?.timeLabel, filteredData[0]?.date);
        console.log('마지막 데이터:', filteredData[filteredData.length-1]?.timeLabel, filteredData[filteredData.length-1]?.date);
    }

    // 시간대별 통계 계산
    calculateHourlyStats();

    // 정보 업데이트
    updateDateInfo();

    // 차트 업데이트
    updateAllCharts();

    // 테이블 업데이트
    updateBatteryTable();

    // 통계 업데이트
    updateStats();
}

// 시간대별 통계 계산
function calculateHourlyStats() {
    const hourlyStats = {};

    filteredData.forEach(row => {
        if (!hourlyStats[row.hour]) {
            hourlyStats[row.hour] = {
                hour: row.hour,
                loads: [],
                prices: [],
                generations: [],
                chargings: [],
                dischargings: []
            };
        }
        hourlyStats[row.hour].loads.push(row.load_kW);
        hourlyStats[row.hour].prices.push(row.price);
        hourlyStats[row.hour].generations.push(row.G_kW);
        hourlyStats[row.hour].chargings.push(row.P_c_kW);
        hourlyStats[row.hour].dischargings.push(row.P_d_kW);
    });

    hourlyData = Object.values(hourlyStats).map(stats => {
        const avgCharging = stats.chargings.reduce((a, b) => a + b, 0) / stats.chargings.length;
        const avgDischarging = stats.dischargings.reduce((a, b) => a + b, 0) / stats.dischargings.length;
        const dominantAction = avgCharging > 1 ? 'charging' : avgDischarging > 1 ? 'discharging' : 'idle';

        return {
            hour: stats.hour,
            hourLabel: `${stats.hour}시`,
            avgLoad: Math.round(stats.loads.reduce((a, b) => a + b, 0) / stats.loads.length),
            avgPrice: Math.round(stats.prices.reduce((a, b) => a + b, 0) / stats.prices.length * 10) / 10,
            avgGeneration: Math.round(stats.generations.reduce((a, b) => a + b, 0) / stats.generations.length),
            avgCharging: Math.round(avgCharging * 10) / 10,
            avgDischarging: Math.round(avgDischarging * 10) / 10,
            batteryStatus: dominantAction,
            statusIcon: dominantAction === 'charging' ? '🔋 충전중' : dominantAction === 'discharging' ? '⚡ 방전중' : '⏸️ 대기'
        };
    }).sort((a, b) => a.hour - b.hour);
}

// 날짜 정보 업데이트
function updateDateInfo() {
    document.getElementById('dateInfo').textContent = `선택된 날짜: ${filteredData.length.toLocaleString()}개 데이터 포인트`;
    document.getElementById('periodInfo').textContent = `전체 기간: ${formatDate(availableDates[0])} ~ ${formatDate(availableDates[availableDates.length - 1])}`;

    // 차트 제목 업데이트
    document.querySelectorAll('.chart-container h2').forEach(h2 => {
        if (h2.textContent.includes('{날짜}')) {
            h2.textContent = h2.textContent.replace('{날짜}', formatDate(selectedDate));
        }
    });
}

// 모든 차트 업데이트
function updateAllCharts() {
    updateDailyChart();
    updateBatteryAreaChart();
    updateBatteryStatusChart();
    updateHourlyChart();
    updateHourlyBarChart();
    updateBatterySummary();
}

// 일별 차트
function updateDailyChart() {
    const ctx = document.getElementById('dailyChart');
    if (!ctx) return;

    // 전체 데이터 사용
    const chartData = filteredData;

    if (charts.daily) {
        charts.daily.destroy();
    }

    charts.daily = new Chart(ctx, {
        type: 'line',
        data: {
            labels: chartData.map(d => d.timeLabel),
            datasets: [
                {
                    label: '전력 부하 (kW)',
                    data: chartData.map(d => d.load_kW),
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    tension: 0.4,
                    yAxisID: 'y',
                    pointRadius: 0,
                    borderWidth: 2
                },
                {
                    label: '발전량 (kW)',
                    data: chartData.map(d => d.G_kW),
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    tension: 0.4,
                    yAxisID: 'y',
                    pointRadius: 0,
                    borderWidth: 2
                },
                {
                    label: '전력 가격',
                    data: chartData.map(d => d.price),
                    borderColor: '#ef4444',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    stepped: true,
                    yAxisID: 'y1',
                    pointRadius: 0,
                    borderWidth: 2
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
                    position: 'top'
                },
                decimation: {
                    enabled: true,
                    algorithm: 'lttb',
                    samples: 500
                }
            },
            scales: {
                x: {
                    ticks: {
                        maxTicksLimit: 24,
                        autoSkip: true
                    }
                },
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: {
                        display: true,
                        text: '전력 (kW)'
                    }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: {
                        display: true,
                        text: '가격'
                    },
                    grid: {
                        drawOnChartArea: false
                    }
                }
            }
        }
    });
}

// 배터리 영역 차트
function updateBatteryAreaChart() {
    const ctx = document.getElementById('batteryAreaChart');
    if (!ctx) return;

    if (charts.batteryArea) {
        charts.batteryArea.destroy();
    }

    charts.batteryArea = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: hourlyData.map(d => d.hourLabel),
            datasets: [
                {
                    label: '충전 전력 (kW)',
                    data: hourlyData.map(d => d.avgCharging),
                    backgroundColor: 'rgba(16, 185, 129, 0.7)',
                    borderColor: '#10b981',
                    borderWidth: 1
                },
                {
                    label: '방전 전력 (kW)',
                    data: hourlyData.map(d => d.avgDischarging),
                    backgroundColor: 'rgba(245, 158, 11, 0.7)',
                    borderColor: '#f59e0b',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: '전력 (kW)'
                    }
                }
            }
        }
    });
}

// 배터리 상태 차트
function updateBatteryStatusChart() {
    const ctx = document.getElementById('batteryStatusChart');
    if (!ctx) return;

    const chartData = filteredData;

    if (charts.batteryStatus) {
        charts.batteryStatus.destroy();
    }

    // 배터리 상태별 색상
    const colors = chartData.map(d => {
        if (d.batteryAction === 'charging') return '#10b981';
        if (d.batteryAction === 'discharging') return '#f59e0b';
        return '#6b7280';
    });

    charts.batteryStatus = new Chart(ctx, {
        type: 'scatter',
        data: {
            datasets: [{
                label: '배터리 상태',
                data: chartData.map((d, idx) => ({
                    x: idx,
                    y: d.price
                })),
                backgroundColor: colors,
                pointRadius: 3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true
                },
                tooltip: {
                    callbacks: {
                        label: (context) => {
                            const dataPoint = chartData[context.dataIndex];
                            const status = dataPoint.batteryAction === 'charging' ? '🔋 충전중' :
                                         dataPoint.batteryAction === 'discharging' ? '⚡ 방전중' : '⏸️ 대기';
                            return [
                                `시간: ${dataPoint.timeLabel}`,
                                `가격: ${dataPoint.price}`,
                                `상태: ${status}`,
                                `부하: ${dataPoint.load_kW}kW`,
                                `충전: ${dataPoint.P_c_kW}kW`,
                                `방전: ${dataPoint.P_d_kW}kW`
                            ];
                        }
                    }
                },
                decimation: {
                    enabled: true,
                    algorithm: 'lttb'
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: '시간 순서'
                    },
                    ticks: {
                        maxTicksLimit: 24
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: '전력 가격'
                    }
                }
            }
        }
    });
}

// 시간대별 차트
function updateHourlyChart() {
    const ctx = document.getElementById('hourlyChart');
    if (!ctx) return;

    if (charts.hourly) {
        charts.hourly.destroy();
    }

    charts.hourly = new Chart(ctx, {
        type: 'line',
        data: {
            labels: hourlyData.map(d => d.hourLabel),
            datasets: [
                {
                    label: '전력 부하 (kW)',
                    data: hourlyData.map(d => d.avgLoad),
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    tension: 0.4,
                    yAxisID: 'y',
                    pointRadius: 5,
                    pointHoverRadius: 7
                },
                {
                    label: '전력 가격',
                    data: hourlyData.map(d => d.avgPrice),
                    borderColor: '#ef4444',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    tension: 0.4,
                    yAxisID: 'y1',
                    pointRadius: 5,
                    pointHoverRadius: 7
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                }
            },
            scales: {
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: {
                        display: true,
                        text: '전력 부하 (kW)'
                    }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: {
                        display: true,
                        text: '가격'
                    },
                    grid: {
                        drawOnChartArea: false
                    }
                }
            }
        }
    });
}

// 시간대별 바 차트
function updateHourlyBarChart() {
    const ctx = document.getElementById('hourlyBarChart');
    if (!ctx) return;

    if (charts.hourlyBar) {
        charts.hourlyBar.destroy();
    }

    charts.hourlyBar = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: hourlyData.map(d => d.hourLabel),
            datasets: [
                {
                    label: '발전량 (kW)',
                    data: hourlyData.map(d => d.avgGeneration),
                    backgroundColor: 'rgba(16, 185, 129, 0.7)',
                    borderColor: '#10b981',
                    borderWidth: 1
                },
                {
                    label: '충전 전력 (kW)',
                    data: hourlyData.map(d => d.avgCharging),
                    backgroundColor: 'rgba(245, 158, 11, 0.7)',
                    borderColor: '#f59e0b',
                    borderWidth: 1
                },
                {
                    label: '방전 전력 (kW)',
                    data: hourlyData.map(d => d.avgDischarging),
                    backgroundColor: 'rgba(239, 68, 68, 0.7)',
                    borderColor: '#ef4444',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: '전력 (kW)'
                    }
                }
            }
        }
    });
}

// 배터리 요약 업데이트
function updateBatterySummary() {
    const chargingCount = filteredData.filter(d => d.batteryAction === 'charging').length;
    const dischargingCount = filteredData.filter(d => d.batteryAction === 'discharging').length;
    const idleCount = filteredData.filter(d => d.batteryAction === 'idle').length;

    document.getElementById('chargingCount').textContent = `${chargingCount}회`;
    document.getElementById('dischargingCount').textContent = `${dischargingCount}회`;
    document.getElementById('idleCount').textContent = `${idleCount}회`;
}

// 배터리 테이블 업데이트
function updateBatteryTable() {
    const tableDiv = document.getElementById('batteryTable');
    if (!tableDiv) return;

    let tableHTML = `
        <table>
            <thead>
                <tr>
                    <th>시간대</th>
                    <th>배터리 상태</th>
                    <th style="text-align: right;">충전 전력</th>
                    <th style="text-align: right;">방전 전력</th>
                    <th style="text-align: right;">전력 가격</th>
                    <th style="text-align: right;">전력 부하</th>
                </tr>
            </thead>
            <tbody>
    `;

    hourlyData.forEach(row => {
        tableHTML += `
            <tr>
                <td style="font-weight: 500;">${row.hourLabel}</td>
                <td>${row.statusIcon}</td>
                <td style="text-align: right;" class="${row.avgCharging > 0 ? 'charging-cell' : ''}">
                    ${row.avgCharging > 0 ? row.avgCharging + 'kW' : '-'}
                </td>
                <td style="text-align: right;" class="${row.avgDischarging > 0 ? 'discharging-cell' : ''}">
                    ${row.avgDischarging > 0 ? row.avgDischarging + 'kW' : '-'}
                </td>
                <td style="text-align: right; font-weight: 500;">${row.avgPrice}</td>
                <td style="text-align: right;">${row.avgLoad}kW</td>
            </tr>
        `;
    });

    tableHTML += '</tbody></table>';
    tableDiv.innerHTML = tableHTML;
}

// 통계 업데이트
function updateStats() {
    if (filteredData.length === 0) return;

    const loads = filteredData.map(d => d.load_kW);
    const maxLoad = Math.max(...loads);
    const minLoad = Math.min(...loads);
    const avgLoad = loads.reduce((a, b) => a + b, 0) / loads.length;

    document.getElementById('maxLoad').textContent = `${maxLoad.toFixed(0)}kW`;
    document.getElementById('minLoad').textContent = `${minLoad.toFixed(0)}kW`;
    document.getElementById('avgLoad').textContent = `${avgLoad.toFixed(0)}kW`;
}

// 탭 전환
function switchTab(tabId) {
    // 모든 탭 버튼 비활성화
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    // 모든 탭 콘텐츠 숨기기
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });

    // 선택된 탭 활성화
    document.querySelector(`[data-tab="${tabId}"]`).classList.add('active');
    document.getElementById(`${tabId}Tab`).classList.add('active');
}

// 날짜 포맷팅
function formatDate(dateStr) {
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}월 ${date.getDate()}일`;
}

// 로딩 표시
function showLoading() {
    loadingScreen.style.display = 'flex';
}

function hideLoading() {
    loadingScreen.style.display = 'none';
}

console.log('대시보드 스크립트 로드 완료!');