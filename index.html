<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>전력 데이터 분석 대시보드</title>
    <link rel="stylesheet" href="style.css">
    <!-- Chart.js 라이브러리 -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.0/chart.umd.min.js"></script>
    <!-- PapaParse CSV 파싱 라이브러리 -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/PapaParse/5.4.1/papaparse.min.js"></script>
</head>
<body>
    <div class="container">
        <!-- 업로드 화면 -->
        <div id="uploadScreen" class="upload-screen">
            <div class="upload-box">
                <div class="upload-icon">📊</div>
                <h1>전력 데이터 분석 대시보드</h1>
                <p class="subtitle">CSV 파일을 업로드하여 전력 사용 패턴과 배터리 충전 상태를 분석하세요</p>
                
                <div class="file-upload-area">
                    <label for="fileInput" class="file-upload-btn">
                        📁 CSV 파일 선택
                    </label>
                    <input type="file" id="fileInput" accept=".csv" style="display: none;">
                    <p class="file-hint">result.csv 파일을 선택해주세요</p>
                </div>

                <div class="features-box">
                    <h3>📋 기능 안내</h3>
                    <ul>
                        <li>📅 날짜별 선택 및 독립적 분석</li>
                        <li>🔋 실시간 충전 상태 (충전중/방전중/대기)</li>
                        <li>🎨 색상 코드로 구분 (초록/주황/회색)</li>
                        <li>📊 일별 상세분석 및 배터리 상태</li>
                        <li>⏰ 24시간 시간대별 분석</li>
                        <li>🔗 부하-가격-배터리 상관관계</li>
                    </ul>
                </div>
            </div>
        </div>

        <!-- 대시보드 화면 -->
        <div id="dashboardScreen" class="dashboard-screen" style="display: none;">
            <div class="dashboard-header">
                <h1>전력 데이터 분석 대시보드</h1>
                <button id="reuploadBtn" class="reupload-btn">🔄 다른 파일 업로드</button>
            </div>

            <!-- 날짜 선택 영역 -->
            <div class="date-selector">
                <label>📅 분석 날짜:</label>
                <select id="dateSelect"></select>
                <span id="dateInfo" class="date-info"></span>
                <span id="periodInfo" class="period-info"></span>
            </div>

            <!-- 탭 메뉴 -->
            <div class="tabs">
                <button class="tab-btn active" data-tab="daily">📅 일별 상세분석</button>
                <button class="tab-btn" data-tab="battery">🔋 배터리 상태</button>
                <button class="tab-btn" data-tab="hourly">⏰ 시간대별 분석</button>
                <button class="tab-btn" data-tab="stats">📈 통계 요약</button>
            </div>

            <!-- 탭 콘텐츠 -->
            <div id="dailyTab" class="tab-content active">
                <div class="chart-container">
                    <h2>{날짜} 일별 전력 사용 패턴</h2>
                    <canvas id="dailyChart"></canvas>
                </div>
                <div class="chart-container">
                    <h2>시간대별 배터리 충/방전 상태</h2>
                    <canvas id="batteryAreaChart"></canvas>
                </div>
            </div>

            <div id="batteryTab" class="tab-content">
                <div class="battery-summary">
                    <div class="summary-card charging">
                        <div class="icon">🔋</div>
                        <div class="label">총 충전 시간</div>
                        <div class="value" id="chargingCount">0회</div>
                    </div>
                    <div class="summary-card discharging">
                        <div class="icon">⚡</div>
                        <div class="label">총 방전 시간</div>
                        <div class="value" id="dischargingCount">0회</div>
                    </div>
                    <div class="summary-card idle">
                        <div class="icon">⏸️</div>
                        <div class="label">대기 시간</div>
                        <div class="value" id="idleCount">0회</div>
                    </div>
                </div>
                <div class="chart-container">
                    <h2>배터리 상태 타임라인</h2>
                    <canvas id="batteryStatusChart"></canvas>
                </div>
                <div class="chart-container">
                    <h2>시간대별 배터리 운영 전략</h2>
                    <div id="batteryTable"></div>
                </div>
            </div>

            <div id="hourlyTab" class="tab-content">
                <div class="chart-container">
                    <h2>시간대별 전력 부하 및 가격 패턴</h2>
                    <canvas id="hourlyChart"></canvas>
                </div>
                <div class="chart-container">
                    <h2>시간대별 발전량 및 저장장치 운영</h2>
                    <canvas id="hourlyBarChart"></canvas>
                </div>
            </div>

            <div id="statsTab" class="tab-content">
                <div class="stats-grid">
                    <div class="stat-card">
                        <h3>📊 부하 통계</h3>
                        <div class="stat-row">
                            <span>최대 부하:</span>
                            <span id="maxLoad">-</span>
                        </div>
                        <div class="stat-row">
                            <span>최소 부하:</span>
                            <span id="minLoad">-</span>
                        </div>
                        <div class="stat-row">
                            <span>평균 부하:</span>
                            <span id="avgLoad">-</span>
                        </div>
                    </div>
                    <div class="stat-card">
                        <h3>💰 가격 정보</h3>
                        <div class="stat-row">
                            <span>저가 (87.3):</span>
                            <span>심야/새벽</span>
                        </div>
                        <div class="stat-row">
                            <span>중가 (109.8):</span>
                            <span>일반시간</span>
                        </div>
                        <div class="stat-row">
                            <span>고가 (140.5):</span>
                            <span>피크시간</span>
                        </div>
                    </div>
                    <div class="stat-card">
                        <h3>🔋 배터리 효율</h3>
                        <div class="stat-row">
                            <span>충전 전략:</span>
                            <span>저가 시간대</span>
                        </div>
                        <div class="stat-row">
                            <span>방전 전략:</span>
                            <span>고가 시간대</span>
                        </div>
                        <div class="stat-row">
                            <span>저장 용량:</span>
                            <span>100kW</span>
                        </div>
                    </div>
                </div>

                <div class="insights-box">
                    <h3>💡 주요 인사이트</h3>
                    <div class="insight-item">
                        <strong>🔥 피크 부하 시간대</strong>
                        <p>오전 8시-11시, 오후 1시-4시에 전력 부하가 높고 가격도 최고 수준을 보입니다.</p>
                    </div>
                    <div class="insight-item">
                        <strong>💡 에너지 효율</strong>
                        <p>발전량과 부하가 거의 일치하며, 저장장치를 통한 부하 평준화가 이뤄지고 있습니다.</p>
                    </div>
                    <div class="insight-item">
                        <strong>💰 가격 정책</strong>
                        <p>3단계 가격 체계로 수요 관리를 하고 있습니다.</p>
                    </div>
                </div>
            </div>

            <!-- 범례 -->
            <div class="legend-box">
                <h3>배터리 상태 범례</h3>
                <div class="legend-items">
                    <div class="legend-item">
                        <span class="legend-dot charging"></span>
                        <span><strong>🔋 충전중</strong> - 저가 시간대에 에너지 저장</span>
                    </div>
                    <div class="legend-item">
                        <span class="legend-dot discharging"></span>
                        <span><strong>⚡ 방전중</strong> - 고가 시간대에 에너지 공급</span>
                    </div>
                    <div class="legend-item">
                        <span class="legend-dot idle"></span>
                        <span><strong>⏸️ 대기</strong> - 충전/방전 없음</span>
                    </div>
                </div>
            </div>
        </div>

        <!-- 로딩 화면 -->
        <div id="loadingScreen" class="loading-screen" style="display: none;">
            <div class="spinner"></div>
            <div class="loading-text">데이터 로딩 중...</div>
            <div class="loading-subtext">CSV 파일을 처리하고 있습니다</div>
        </div>
    </div>

    <script src="script.js"></script>
</body>
</html>
