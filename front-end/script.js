document.addEventListener('DOMContentLoaded', () => {
    const API_BASE_URL = 'http://localhost:3002';
    const POLLING_INTERVAL = 1000; // agora é 1 segundo
    const MAX_DATA_POINTS = 60;

    const rxValueElem = document.getElementById('rx-value');
    const rxUnitElem = document.getElementById('rx-unit');
    const txValueElem = document.getElementById('tx-value');
    const txUnitElem = document.getElementById('tx-unit');
    const statusTextElem = document.getElementById('status-text');
    const lastUpdateTimeElem = document.getElementById('last-update-time');
    const toggleButton = document.getElementById('toggle-button');
    const hostnameElem = document.getElementById('hostname');
    const interfaceNameElem = document.getElementById('interface-name');

    let trafficInterval;
    let isPaused = false;
    let chart;

    function formatBitrate(bits) {
        if (bits < 1000) return { value: bits.toFixed(0), unit: 'bps' };
        if (bits < 1000000) return { value: (bits / 1000).toFixed(2), unit: 'Kbps' };
        if (bits < 1000000000) return { value: (bits / 1000000).toFixed(2), unit: 'Mbps' };
        return { value: (bits / 1000000000).toFixed(2), unit: 'Gbps' };
    }

    async function fetchTrafficData() {
        try {
            const response = await fetch(`${API_BASE_URL}/api/traffic`);
            const data = await response.json();

            if (data.error || data.message.includes("Primeira coleta")) {
                statusTextElem.textContent = "Aguardando dados...";
                return;
            }

            updateUI(data);

        } catch (err) {
            console.error("Erro ao buscar tráfego:", err);
            setStatus('Erro', 'red');
            stopMonitoring();
        }
    }

    async function fetchInterfaceInfo() {
        try {
            const nameRes = await fetch(`${API_BASE_URL}/api/interface-name`);
            const nameData = await nameRes.json();
            interfaceNameElem.textContent = `Interface: ${nameData.name}`;

            const configRes = await fetch(`${API_BASE_URL}/`);
            const configText = await configRes.text();
            const ipMatch = configText.match(/IP=([\d.]+)/);
            hostnameElem.textContent = `IP/Hostname: ${ipMatch ? ipMatch[1] : '--'}`;
        } catch {
            interfaceNameElem.textContent = "Interface: Erro";
            hostnameElem.textContent = "IP/Hostname: Erro";
        }
    }

    function updateUI(data) {
        const rx = formatBitrate(data.inBitsPerSecond);
        const tx = formatBitrate(data.outBitsPerSecond);

        rxValueElem.textContent = rx.value;
        rxUnitElem.textContent = rx.unit;
        txValueElem.textContent = tx.value;
        txUnitElem.textContent = tx.unit;

        setStatus('Conectado', '#4caf50');
        lastUpdateTimeElem.textContent = new Date().toLocaleTimeString();

        const timestamp = new Date().toLocaleTimeString();
        addDataToChart(timestamp, data.inBitsPerSecond / 1000, data.outBitsPerSecond / 1000);
    }

    function addDataToChart(label, rxData, txData) {
        chart.data.labels.push(label);
        chart.data.datasets[0].data.push(rxData); // Download (Rx)
        chart.data.datasets[1].data.push(txData); // Upload (Tx)

        if (chart.data.labels.length > MAX_DATA_POINTS) {
            chart.data.labels.shift();
            chart.data.datasets.forEach(ds => ds.data.shift());
        }

        chart.update();
    }

    function setStatus(text, color) {
        statusTextElem.textContent = text;
        statusTextElem.style.color = color;
    }

    function initializeChart() {
        const ctx = document.getElementById('trafficChart').getContext('2d');
        chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Download (Rx) - Kbps',
                    data: [],
                    borderColor: '#38a169',
                    backgroundColor: 'rgba(56, 161, 105, 0.2)',
                    fill: true,
                    tension: 0.4
                }, {
                    label: 'Upload (Tx) - Kbps',
                    data: [],
                    borderColor: '#3182ce',
                    backgroundColor: 'rgba(49, 130, 206, 0.2)',
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Taxa (Kbps)'
                        }
                    }
                },
                plugins: {
                    legend: { position: 'top' }
                }
            }
        });
    }

    function startMonitoring() {
        if (trafficInterval) clearInterval(trafficInterval);
        fetchTrafficData();
        trafficInterval = setInterval(fetchTrafficData, POLLING_INTERVAL);
    }

    function stopMonitoring() {
        clearInterval(trafficInterval);
    }

    function togglePause() {
        isPaused = !isPaused;
        if (isPaused) {
            stopMonitoring();
            toggleButton.textContent = 'Retomar';
            setStatus('Pausado', 'orange');
        } else {
            startMonitoring();
            toggleButton.textContent = 'Pausar';
            setStatus('Conectado', '#4caf50');
        }
    }

    initializeChart();
    fetchInterfaceInfo();
    startMonitoring();
    toggleButton.addEventListener('click', togglePause);
});
