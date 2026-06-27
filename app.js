'use strict';

// =============================================================================
// KONFIGURASI GLOBAL
// =============================================================================
const CONFIG = Object.freeze({
    THRESHOLD: {
        CRITICAL_LOW: 30,
        SATURATED_HIGH: 100
    },
    COLOR: {
        CRITICAL:  { bar: 'rgba(244,63,94,0.8)',   border: '#f43f5e' },
        OPTIMAL:   { bar: 'rgba(20,184,166,0.8)',  border: '#14b8a6' },
    },
    REQUIRED_HEADERS: [
        'kabupaten_kota', 'jumlah_puskesmas_2024', 'total_seluruh_nakes',
        'rasio_nakes_per_puskesmas', 'jumlah_perawat', 'jumlah_bidan',
        'jumlah_kesmas', 'jumlah_kesling', 'jumlah_gizi'
    ],
    // 5 PROFESI TERPISAH sesuai kolom CSV
    PROFESI: [
        { key: 'perawat', label: 'Perawat',                color: 'bg-blue-500',    glow: 'rgba(59,130,246,0.5)',   chart: 'rgba(59,130,246,0.85)',  border: 'rgba(59,130,246,1)'  },
        { key: 'bidan',   label: 'Bidan',                  color: 'bg-purple-500',  glow: 'rgba(168,85,247,0.5)',   chart: 'rgba(168,85,247,0.85)',  border: 'rgba(168,85,247,1)'  },
        { key: 'kesmas',  label: 'Kesmas',                 color: 'bg-amber-500',   glow: 'rgba(245,158,11,0.5)',   chart: 'rgba(245,158,11,0.85)',  border: 'rgba(245,158,11,1)'  },
        { key: 'kesling', label: 'Kesling',                color: 'bg-emerald-500', glow: 'rgba(16,185,129,0.5)',   chart: 'rgba(16,185,129,0.85)',  border: 'rgba(16,185,129,1)'  },
        { key: 'gizi',    label: 'Gizi',                   color: 'bg-rose-500',    glow: 'rgba(244,63,94,0.5)',    chart: 'rgba(244,63,94,0.85)',   border: 'rgba(244,63,94,1)'   },
    ]
});

// =============================================================================
// UTILITIES / ANIMATION HELPERS
// =============================================================================
function animateNumber(element, targetValue, isFloat = false, suffix = '', formatLocal = false) {
    const duration = 650; // ms
    const start = performance.now();
    const currentValueText = element.textContent.replace(/[^\d.-]/g, '');
    const startValue = parseFloat(currentValueText) || 0;
    const diff = targetValue - startValue;

    if (diff === 0) {
        let finalValue;
        if (isFloat) {
            finalValue = targetValue.toFixed(2);
        } else if (formatLocal) {
            finalValue = targetValue.toLocaleString('id-ID');
        } else {
            finalValue = targetValue.toString();
        }
        element.textContent = `${finalValue}${suffix}`;
        return;
    }

    function update(timestamp) {
        const elapsed = timestamp - start;
        const progress = Math.min(elapsed / duration, 1);
        const ease = progress * (2 - progress); // easeOutQuad
        const val = startValue + diff * ease;

        let displayValue;
        if (isFloat) {
            displayValue = val.toFixed(2);
        } else if (formatLocal) {
            displayValue = Math.round(val).toLocaleString('id-ID');
        } else {
            displayValue = Math.round(val).toString();
        }
        element.textContent = `${displayValue}${suffix}`;

        if (progress < 1) {
            requestAnimationFrame(update);
        } else {
            let finalValue;
            if (isFloat) {
                finalValue = targetValue.toFixed(2);
            } else if (formatLocal) {
                finalValue = targetValue.toLocaleString('id-ID');
            } else {
                finalValue = targetValue.toString();
            }
            element.textContent = `${finalValue}${suffix}`;
        }
    }
    requestAnimationFrame(update);
}

// =============================================================================
// STATE
// =============================================================================
const State = {
    records: [],
    activeIndex: 0,
};

// =============================================================================
// DOM REGISTRY
// =============================================================================
let DOM = {};
function buildDOMRegistry() {
    DOM = {
        dropZone:        document.getElementById('dropZone'),
        fileInput:       document.getElementById('csvFileInput'),
        uploadPrompt:    document.getElementById('uploadPrompt'),
        uploadLoading:   document.getElementById('uploadLoading'),
        progressBar:     document.getElementById('progressBar'),
        errorMessage:    document.getElementById('errorMessage'),
        dashboardContent:document.getElementById('dashboardContent'),
        kpiWilayah:      document.getElementById('kpiWilayah'),
        kpiRasioRendah:  document.getElementById('kpiRasioRendah'),
        kpiNamaRendah:   document.getElementById('kpiNamaRendah'),
        kpiRasioTinggi:  document.getElementById('kpiRasioTinggi'),
        kpiNamaTinggi:   document.getElementById('kpiNamaTinggi'),
        kpiTotalNakes:   document.getElementById('kpiTotalNakes'),
        wilayahSelect:   document.getElementById('wilayahSelect'),
        searchWilayah:   document.getElementById('searchWilayah'),
        detailPuskesmas: document.getElementById('detailPuskesmas'),
        detailTotalNakes:document.getElementById('detailTotalNakes'),
        detailRasio:     document.getElementById('detailRasio'),
        detailStatusBadge: document.getElementById('detailStatusBadge'),
        profesiBreakdown:document.getElementById('profesiBreakdown'),
        profesiDoughnutChart: document.getElementById('profesiDoughnutChart'),
        wilayahRadarChart:    document.getElementById('wilayahRadarChart'),
        insightDisparitas: document.getElementById('insightDisparitas'),
        insightDominasi:   document.getElementById('insightDominasi'),
        btnExportChart:  document.getElementById('btnExportChart'),
        rasioLineChart:  document.getElementById('rasioLineChart'),
        btnExportLineChart: document.getElementById('btnExportLineChart'),
        profileGranularPanel: document.getElementById('profileGranularPanel'),
    };
}

// =============================================================================
// ERROR HANDLER
// =============================================================================
const ErrorHandler = {
    show(message) {
        DOM.uploadLoading.classList.add('hidden');
        DOM.uploadPrompt.classList.remove('hidden');
        DOM.errorMessage.textContent = `⚠️ ${message}`;
        DOM.errorMessage.classList.remove('hidden');
    },
    clear() {
        DOM.errorMessage.classList.add('hidden');
        DOM.errorMessage.textContent = '';
    }
};

// =============================================================================
// DATA PIPELINE
// =============================================================================
const DataPipeline = {
    validateHeaders(fields) {
        return CONFIG.REQUIRED_HEADERS.every(h => fields.includes(h));
    },

    mapRow(row) {
        return {
            nama:      row['kabupaten_kota'],
            puskesmas: parseInt(row['jumlah_puskesmas_2024']) || 0,
            total:     parseInt(row['total_seluruh_nakes'])   || 0,
            rasio:     parseFloat(row['rasio_nakes_per_puskesmas']) || 0,
            perawat:   parseInt(row['jumlah_perawat']) || 0,
            bidan:     parseInt(row['jumlah_bidan'])   || 0,
            kesmas:    parseInt(row['jumlah_kesmas'])  || 0,
            kesling:   parseInt(row['jumlah_kesling']) || 0,
            gizi:      parseInt(row['jumlah_gizi'])    || 0,
        };
    },

    processFile(file) {
        ErrorHandler.clear();
        DOM.uploadPrompt.classList.add('hidden');
        DOM.uploadLoading.classList.remove('hidden');
        DOM.progressBar.style.width = '30%';

        Papa.parse(file, {
            header: true,
            dynamicTyping: true,
            skipEmptyLines: true,
            complete: (results) => {
                DOM.progressBar.style.width = '70%';

                if (!this.validateHeaders(results.meta.fields)) {
                    ErrorHandler.show('Skema CSV tidak valid. Pastikan kolom sesuai struktur ekspor Supabase.');
                    return;
                }

                State.records = results.data
                    .map(row => this.mapRow(row))
                    .sort((a, b) => a.rasio - b.rasio);

                // Menyimpan data ke localStorage agar tidak hilang saat refresh
                try {
                    localStorage.setItem('dashboard_records', JSON.stringify(State.records));
                } catch (e) {
                    console.warn('Gagal menyimpan data ke localStorage:', e);
                }

                DOM.progressBar.style.width = '100%';

                setTimeout(() => {
                    DOM.uploadLoading.classList.add('hidden');
                    DOM.uploadPrompt.classList.remove('hidden');
                    Dashboard.boot();
                }, 400);
            },
            error: () => {
                ErrorHandler.show('Gagal membaca berkas. Pastikan file tidak rusak.');
            }
        });
    }
};

// =============================================================================
// CHART MANAGER — Bar & Line Charts
// =============================================================================
const ChartManager = {
    instanceBar: null,
    instanceLine: null,

    render(records) {
        this.renderBar(records);
        this.renderLine(records);
    },

    renderBar(records) {
        const canvas = document.getElementById('rasioChart');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        if (this.instanceBar) {
            this.instanceBar.destroy();
            this.instanceBar = null;
        }

        const labels   = records.map(r => r.nama.replace('Kabupaten ', 'Kab. ').replace('Kota ', ''));
        const dataRasio = records.map(r => r.rasio);

        const gradOptimal  = ctx.createLinearGradient(0, 0, 0, 350);
        gradOptimal.addColorStop(0, 'rgba(20,184,166,0.85)');
        gradOptimal.addColorStop(1, 'rgba(13,148,136,0.1)');

        const gradCritical = ctx.createLinearGradient(0, 0, 0, 350);
        gradCritical.addColorStop(0, 'rgba(244,63,94,0.85)');
        gradCritical.addColorStop(1, 'rgba(225,29,72,0.1)');

        const bgColors     = records.map(r => r.rasio < CONFIG.THRESHOLD.CRITICAL_LOW ? gradCritical : gradOptimal);
        const borderColors = records.map(r => r.rasio < CONFIG.THRESHOLD.CRITICAL_LOW ? CONFIG.COLOR.CRITICAL.border : CONFIG.COLOR.OPTIMAL.border);

        const isMobile = window.innerWidth < 640;

        this.instanceBar = new Chart(canvas, {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    data: dataRasio,
                    backgroundColor: bgColors,
                    borderColor: borderColors,
                    borderWidth: 1.5,
                    borderRadius: 6,
                    hoverBackgroundColor: borderColors,
                    hoverBorderWidth: 2,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: isMobile ? 'y' : 'x',
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        padding: 12,
                        backgroundColor: '#020617',
                        titleFont: { size: 12, weight: 'bold', family: 'Plus Jakarta Sans' },
                        bodyFont:  { size: 12, family: 'Plus Jakarta Sans' },
                        borderColor: '#1e293b',
                        borderWidth: 1,
                        cornerRadius: 8,
                        displayColors: false,
                        callbacks: {
                            label: ctx => ` Rasio: ${ctx.parsed.x ?? ctx.parsed.y} Nakes / Puskesmas`
                        }
                    }
                },
                scales: {
                    x: { grid: { display: false }, ticks: { color: '#94a3b8', font: { family: 'Plus Jakarta Sans', size: 10 } } },
                    y: { grid: { color: '#1e293b' }, ticks: { color: '#94a3b8', font: { family: 'Plus Jakarta Sans' } } }
                },
                onClick: (_event, activeElements) => {
                    if (activeElements.length > 0) {
                        DetailRenderer.render(activeElements[0].index);
                    }
                }
            }
        });
    },

    renderLine(records) {
        const canvas = document.getElementById('rasioLineChart');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        if (this.instanceLine) {
            this.instanceLine.destroy();
            this.instanceLine = null;
        }

        const labels   = records.map(r => r.nama.replace('Kabupaten ', 'Kab. ').replace('Kota ', ''));
        const dataRasio = records.map(r => r.rasio);

        const gradLine = ctx.createLinearGradient(0, 0, 0, 350);
        gradLine.addColorStop(0, 'rgba(20,184,166,0.3)');
        gradLine.addColorStop(1, 'rgba(20,184,166,0)');

        this.instanceLine = new Chart(canvas, {
            type: 'line',
            data: {
                labels,
                datasets: [{
                    label: 'Tren Rasio Nakes',
                    data: dataRasio,
                    backgroundColor: gradLine,
                    borderColor: '#14b8a6',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.35,
                    pointBackgroundColor: '#14b8a6',
                    pointBorderColor: '#020617',
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    pointHoverBackgroundColor: '#ffffff',
                    pointHoverBorderColor: '#14b8a6',
                    pointHoverBorderWidth: 3,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        padding: 12,
                        backgroundColor: '#020617',
                        titleFont: { size: 12, weight: 'bold', family: 'Plus Jakarta Sans' },
                        bodyFont:  { size: 12, family: 'Plus Jakarta Sans' },
                        borderColor: '#1e293b',
                        borderWidth: 1,
                        cornerRadius: 8,
                        displayColors: false,
                        callbacks: {
                            label: ctx => ` Rasio: ${ctx.parsed.y} Nakes / Puskesmas`
                        }
                    }
                },
                scales: {
                    x: { grid: { display: false }, ticks: { color: '#94a3b8', font: { family: 'Plus Jakarta Sans', size: 10 } } },
                    y: { grid: { color: '#1e293b' }, ticks: { color: '#94a3b8', font: { family: 'Plus Jakarta Sans' } } }
                },
                onClick: (_event, activeElements) => {
                    if (activeElements.length > 0) {
                        DetailRenderer.render(activeElements[0].index);
                    }
                }
            }
        });
    },

    exportPNG() {
        if (!this.instanceBar) return;
        const link = document.createElement('a');
        link.download = 'matriks-disparitas-nakes-aceh.png';
        link.href = this.instanceBar.toBase64Image();
        link.click();
    },

    exportLinePNG() {
        if (!this.instanceLine) return;
        const link = document.createElement('a');
        link.download = 'tren-rasio-nakes-aceh.png';
        link.href = this.instanceLine.toBase64Image();
        link.click();
    }
};

// =============================================================================
// DOUGHNUT CHART MANAGER — 5 Profesi Terpisah
// =============================================================================
const ProfesiDoughnutManager = {
    instance: null,

    render(record) {
        const canvas = DOM.profesiDoughnutChart;
        if (!canvas) return;

        const data = CONFIG.PROFESI.map(p => record[p.key]);
        const labels = CONFIG.PROFESI.map(p => p.label);

        if (this.instance) {
            this.instance.data.datasets[0].data = data;
            this.instance.update();
            return;
        }

        const ctx = canvas.getContext('2d');
        const colors = CONFIG.PROFESI.map(p => p.chart);
        const borders = CONFIG.PROFESI.map(p => p.border);

        this.instance = new Chart(canvas, {
            type: 'doughnut',
            data: {
                labels,
                datasets: [{
                    data,
                    backgroundColor: colors,
                    borderColor: borders,
                    borderWidth: 2,
                    hoverOffset: 8,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '65%',
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: '#94a3b8',
                            font: { family: 'Plus Jakarta Sans', size: 10 },
                            padding: 12,
                            usePointStyle: true,
                            pointStyle: 'circle',
                        }
                    },
                    tooltip: {
                        padding: 10,
                        backgroundColor: '#020617',
                        titleFont: { size: 11, weight: 'bold', family: 'Plus Jakarta Sans' },
                        bodyFont: { size: 11, family: 'Plus Jakarta Sans' },
                        borderColor: '#1e293b',
                        borderWidth: 1,
                        cornerRadius: 8,
                        callbacks: {
                            label: (ctx) => {
                                const val = ctx.parsed;
                                const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                                const pct = total > 0 ? ((val / total) * 100).toFixed(1) : 0;
                                return ` ${ctx.label}: ${val.toLocaleString('id-ID')} Org (${pct}%)`;
                            }
                        }
                    }
                },
                animation: {
                    animateScale: true,
                    animateRotate: true,
                    duration: 600,
                }
            }
        });
    }
};

// =============================================================================
// RADAR CHART MANAGER — 5 Dimensi Profesi
// =============================================================================
const WilayahRadarManager = {
    instance: null,
    currentRecord: null,
    currentAvg: null,

    render(record, allRecords) {
        const canvas = DOM.wilayahRadarChart;
        if (!canvas || !allRecords || allRecords.length === 0) return;

        const keys = CONFIG.PROFESI.map(p => p.key);
        const labels = CONFIG.PROFESI.map(p => p.label);

        // Hitung rata-rata provinsi untuk 5 profesi + rasio
        const avg = {};
        keys.forEach(key => {
            avg[key] = allRecords.reduce((s, r) => s + r[key], 0) / allRecords.length;
        });
        avg.rasio = allRecords.reduce((s, r) => s + r.rasio, 0) / allRecords.length;

        const normalize = (val, avgVal) => {
            if (avgVal === 0) return 50;
            const ratio = val / avgVal;
            return Math.min(100, Math.max(0, 50 + (ratio - 1) * 50));
        };

        const dataWilayah = keys.map(key => normalize(record[key], avg[key]));
        const dataAvg = [50, 50, 50, 50, 50];

        this.currentRecord = record;
        this.currentAvg = avg;

        if (this.instance) {
            this.instance.data.datasets[0].label = record.nama;
            this.instance.data.datasets[0].data = dataWilayah;
            this.instance.update();
            return;
        }

        this.instance = new Chart(canvas, {
            type: 'radar',
            data: {
                labels,
                datasets: [
                    {
                        label: record.nama,
                        data: dataWilayah,
                        backgroundColor: 'rgba(20,184,166,0.15)',
                        borderColor: '#14b8a6',
                        pointBackgroundColor: '#14b8a6',
                        pointBorderColor: '#0f172a',
                        pointHoverBackgroundColor: '#fff',
                        pointHoverBorderColor: '#14b8a6',
                        borderWidth: 2,
                        pointRadius: 4,
                        pointHoverRadius: 6,
                    },
                    {
                        label: 'Rata-rata Provinsi',
                        data: dataAvg,
                        backgroundColor: 'rgba(100,116,139,0.08)',
                        borderColor: 'rgba(100,116,139,0.5)',
                        pointBackgroundColor: 'rgba(100,116,139,0.5)',
                        pointBorderColor: '#0f172a',
                        pointHoverBackgroundColor: '#fff',
                        pointHoverBorderColor: 'rgba(100,116,139,0.8)',
                        borderWidth: 1.5,
                        borderDash: [5, 5],
                        pointRadius: 3,
                        pointHoverRadius: 5,
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        padding: 10,
                        backgroundColor: '#020617',
                        titleFont: { size: 11, weight: 'bold', family: 'Plus Jakarta Sans' },
                        bodyFont: { size: 11, family: 'Plus Jakarta Sans' },
                        borderColor: '#1e293b',
                        borderWidth: 1,
                        cornerRadius: 8,
                        callbacks: {
                            label: (ctx) => {
                                const label = ctx.dataset.label;
                                const idx = ctx.dataIndex;
                                const key = keys[idx];
                                if (label === 'Rata-rata Provinsi') {
                                    return ` Rata-rata: ${WilayahRadarManager.currentAvg[key].toFixed(1)}`;
                                }
                                return ` ${label}: ${WilayahRadarManager.currentRecord[key].toLocaleString('id-ID')}`;
                            }
                        }
                    }
                },
                scales: {
                    r: {
                        min: 0,
                        max: 100,
                        ticks: { display: false, stepSize: 25 },
                        grid: { color: 'rgba(30,41,59,0.6)' },
                        angleLines: { color: 'rgba(30,41,59,0.4)' },
                        pointLabels: {
                            color: '#94a3b8',
                            font: { family: 'Plus Jakarta Sans', size: 10, weight: '500' },
                        }
                    }
                },
                animation: { duration: 700, easing: 'easeOutQuart' }
            }
        });
    }
};

// =============================================================================
// DROPDOWN MANAGER
// =============================================================================
const DropdownManager = {
    populate(records) {
        DOM.wilayahSelect.innerHTML = '';
        records.forEach((row, i) => {
            const opt = document.createElement('option');
            opt.value = State.records.indexOf(row);
            opt.textContent = row.nama;
            DOM.wilayahSelect.appendChild(opt);
        });
    },

    filter(keyword) {
        const term = keyword.toLowerCase().trim();
        const filtered = term
            ? State.records.filter(r => r.nama.toLowerCase().includes(term))
            : State.records;
        this.populate(filtered);

        if (filtered.length > 0) {
            const firstIndex = State.records.indexOf(filtered[0]);
            DetailRenderer.render(firstIndex);
        }
    }
};

// =============================================================================
// DETAIL RENDERER — 5 Profesi Terpisah Sesuai CSV
// =============================================================================
const DetailRenderer = {
    getStatus(rasio) {
        if (rasio < CONFIG.THRESHOLD.CRITICAL_LOW) {
            return { label: 'Kritis', cls: 'text-rose-400 bg-rose-500/10 border-rose-500/30' };
        }
        if (rasio >= CONFIG.THRESHOLD.SATURATED_HIGH) {
            return { label: 'Padat', cls: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' };
        }
        return { label: 'Sedang', cls: 'text-amber-400 bg-amber-500/10 border-amber-500/30' };
    },

    init() {
        DOM.profesiBreakdown.innerHTML = CONFIG.PROFESI.map(p => {
            return `
                <div id="profesi-item-${p.key}">
                    <div class="flex justify-between text-xs mb-1">
                        <span class="text-slate-400 font-medium">${p.label}</span>
                        <span class="font-bold text-white breakdown-count">0 Org</span>
                    </div>
                    <div class="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden border border-slate-800">
                        <div class="${p.color} h-full transition-all duration-500 ease-out breakdown-bar"
                             style="width: 0%; box-shadow: 0 0 8px ${p.glow}"></div>
                    </div>
                </div>
            `;
        }).join('');
    },

    render(index) {
        State.activeIndex = index;
        const record = State.records[index];
        if (!record) return;

        DOM.wilayahSelect.value = index;

        // Animate indicators
        animateNumber(DOM.detailPuskesmas, record.puskesmas, false, ' Unit', false);
        animateNumber(DOM.detailTotalNakes, record.total, false, ' Jiwa', true);
        animateNumber(DOM.detailRasio, record.rasio, true, '', false);

        const status = this.getStatus(record.rasio);
        DOM.detailStatusBadge.textContent  = status.label;
        DOM.detailStatusBadge.className    = `text-[10px] font-bold px-2 py-0.5 rounded-full border ${status.cls}`;

        // Trigger container pulse highlight animation
        if (DOM.profileGranularPanel) {
            DOM.profileGranularPanel.classList.remove('profile-card-animate');
            void DOM.profileGranularPanel.offsetWidth; // Force reflow
            DOM.profileGranularPanel.classList.add('profile-card-animate');
        }

        // 5 PROFESI TERPISAH sesuai CSV
        const total = record.total || 1;
        CONFIG.PROFESI.forEach(p => {
            const count = record[p.key];
            const pct   = ((count / total) * 100).toFixed(1);
            const container = document.getElementById(`profesi-item-${p.key}`);
            if (container) {
                const countElem = container.querySelector('.breakdown-count');
                const barElem   = container.querySelector('.breakdown-bar');
                animateNumber(countElem, count, false, ' Org', true);
                barElem.style.width = `${pct}%`;
            }
        });

        // Render visual charts
        ProfesiDoughnutManager.render(record);
        WilayahRadarManager.render(record, State.records);
    }
};

// =============================================================================
// INSIGHT ENGINE — 5 Profesi
// =============================================================================
const InsightEngine = {
    generate(records) {
        const lowest  = records[0];
        const highest = records[records.length - 1];
        const gapPct  = (((highest.rasio - lowest.rasio) / lowest.rasio) * 100).toFixed(0);

        const criticalCount = records.filter(r => r.rasio < CONFIG.THRESHOLD.CRITICAL_LOW).length;
        const saturatedCount = records.filter(r => r.rasio >= CONFIG.THRESHOLD.SATURATED_HIGH).length;

        DOM.insightDisparitas.innerHTML = `
            Data mendeteksi <span class="text-rose-400 font-bold">ketimpangan alokasi ekstrem</span> antar wilayah faskes dasar Provinsi Aceh.
            Rasio tertinggi ada di <span class="text-white font-semibold">${highest.nama}</span>
            sebesar <span class="text-emerald-400 font-bold">${highest.rasio} nakes/Puskesmas</span>,
            berbanding terbalik dengan <span class="text-white font-semibold">${lowest.nama}</span>
            yang hanya <span class="text-rose-400 font-bold">${lowest.rasio} nakes/unit</span>.
            Kesenjangan antar keduanya mencapai <span class="text-rose-400 font-bold">${gapPct}%</span>.
            Terdapat <strong class="text-rose-400">${criticalCount} wilayah kritis</strong>
            (rasio &lt; ${CONFIG.THRESHOLD.CRITICAL_LOW}) dan
            <strong class="text-emerald-400">${saturatedCount} wilayah padat</strong>
            (rasio ≥ ${CONFIG.THRESHOLD.SATURATED_HIGH}).
        `;

        // Hitung total per profesi (5 kategori)
        const totals = CONFIG.PROFESI.map(p => ({
            label: p.label,
            color: p.color.replace('bg-', 'text-'),
            total: records.reduce((sum, r) => sum + r[p.key], 0)
        })).sort((a, b) => b.total - a.total);

        const dominan  = totals[0];
        const runnerup = totals[1];

        DOM.insightDominasi.innerHTML = `
            Secara makro, struktur faskes dasar Aceh didominasi profesi
            <span class="${dominan.color} font-bold">${dominan.label}</span>
            dengan kontribusi kumulatif <span class="text-white font-semibold">${dominan.total.toLocaleString('id-ID')} jiwa</span>,
            disusul <span class="${runnerup.color} font-bold">${runnerup.label}</span>
            sebesar <span class="text-white font-semibold">${runnerup.total.toLocaleString('id-ID')} jiwa</span>.
            Rekomendasi: tahan penumpukan lebih lanjut pada profesi dominan dan prioritaskan
            pemenuhan kuota profesi penunjang klinis yang masih defisit untuk integrasi layanan yang merata.
        `;
    }
};

// =============================================================================
// KPI RENDERER
// =============================================================================
const KPIRenderer = {
    render(records) {
        const lowest  = records[0];
        const highest = records[records.length - 1];
        const total   = records.reduce((sum, r) => sum + r.total, 0);

        DOM.kpiWilayah.textContent      = records.length;
        DOM.kpiRasioRendah.textContent  = lowest.rasio;
        DOM.kpiNamaRendah.textContent   = lowest.nama;
        DOM.kpiRasioTinggi.textContent  = highest.rasio;
        DOM.kpiNamaTinggi.textContent   = highest.nama;
        DOM.kpiTotalNakes.textContent   = total.toLocaleString('id-ID');
    }
};

// =============================================================================
// DASHBOARD ORCHESTRATOR
// =============================================================================
const Dashboard = {
    boot() {
        const { records } = State;

        DetailRenderer.init();
        KPIRenderer.render(records);
        DropdownManager.populate(records);
        ChartManager.render(records);
        DetailRenderer.render(0);
        InsightEngine.generate(records);

        DOM.dashboardContent.classList.remove('hidden');
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                DOM.dashboardContent.classList.remove('is-hidden');
            });
        });
    }
};

// =============================================================================
// EVENT BINDINGS
// =============================================================================
function bindEvents() {
    DOM.dropZone.addEventListener('click', (e) => {
        if (e.target.closest('button') || e.target === DOM.fileInput) return;
        DOM.fileInput.click();
    });

    DOM.fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) DataPipeline.processFile(e.target.files[0]);
    });

    DOM.dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        DOM.dropZone.classList.add('border-teal-500', 'bg-teal-500/5');
    });

    DOM.dropZone.addEventListener('dragleave', () => {
        DOM.dropZone.classList.remove('border-teal-500', 'bg-teal-500/5');
    });

    DOM.dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        DOM.dropZone.classList.remove('border-teal-500', 'bg-teal-500/5');
        const file = e.dataTransfer.files[0];
        if (file && (file.type === 'text/csv' || file.name.endsWith('.csv'))) {
            DataPipeline.processFile(file);
        } else {
            ErrorHandler.show('Hanya file .csv yang diterima.');
        }
    });

    DOM.wilayahSelect.addEventListener('change', (e) => {
        DetailRenderer.render(parseInt(e.target.value, 10));
    });

    DOM.searchWilayah.addEventListener('input', (e) => {
        DropdownManager.filter(e.target.value);
    });

    DOM.btnExportChart.addEventListener('click', () => ChartManager.exportPNG());
    DOM.btnExportLineChart.addEventListener('click', () => ChartManager.exportLinePNG());
}

// =============================================================================
// BOOTSTRAP
// =============================================================================
document.addEventListener('DOMContentLoaded', () => {
    buildDOMRegistry();
    bindEvents();

    // Memuat data dari localStorage jika ada
    const savedRecords = localStorage.getItem('dashboard_records');
    if (savedRecords) {
        try {
            State.records = JSON.parse(savedRecords);
            if (State.records && State.records.length > 0) {
                Dashboard.boot();
            }
        } catch (e) {
            console.error('Gagal memuat data tersimpan dari localStorage:', e);
            localStorage.removeItem('dashboard_records');
        }
    }
});
