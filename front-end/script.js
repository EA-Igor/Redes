document.addEventListener('DOMContentLoaded', () => {
    const URL_API = 'http://localhost:3002';
    const INTERVALO_PESQUISA = 1000;
    const MAX_PONTOS = 60;

    const valorRx = document.getElementById('rx-value');
    const unidadeRx = document.getElementById('rx-unit');
    const valorTx = document.getElementById('tx-value');
    const unidadeTx = document.getElementById('tx-unit');
    const textoStatus = document.getElementById('status-text');
    const ultimaAtualizacao = document.getElementById('last-update-time');
    const botaoToggle = document.getElementById('toggle-button');
    const nomeHost = document.getElementById('hostname');
    const nomeInterface = document.getElementById('interface-name');

    let intervaloTrafego;
    let pausado = false;
    let grafico;

    function formatarTaxa(bits) {
        if (bits < 1000) return { valor: bits.toFixed(0), unidade: 'bps' };
        if (bits < 1000000) return { valor: (bits / 1000).toFixed(2), unidade: 'Kbps' };
        if (bits < 1000000000) return { valor: (bits / 1000000).toFixed(2), unidade: 'Mbps' };
        return { valor: (bits / 1000000000).toFixed(2), unidade: 'Gbps' };
    }

    async function buscarDadosTrafego() {
        try {
            const resposta = await fetch(`${URL_API}/api/traffic`);
            const dados = await resposta.json();

            if (dados.error || dados.message.includes("Primeira coleta")) {
                textoStatus.textContent = "Aguardando dados...";
                return;
            }

            atualizarInterface(dados);

        } catch (erro) {
            console.error("Erro ao buscar tráfego:", erro);
            definirStatus('Erro', 'red');
            pararMonitoramento();
        }
    }

    async function buscarInfoInterface() {
        try {
            const respostaNome = await fetch(`${URL_API}/api/interface-name`);
            const dadosNome = await respostaNome.json();
            nomeInterface.textContent = `Interface: ${dadosNome.name}`;

            const respostaConfig = await fetch(`${URL_API}/`);
            const textoConfig = await respostaConfig.text();
            const ipEncontrado = textoConfig.match(/IP=([\d.]+)/);
            nomeHost.textContent = `IP/Hostname: ${ipEncontrado ? ipEncontrado[1] : '--'}`;
        } catch {
            nomeInterface.textContent = "Interface: Erro";
            nomeHost.textContent = "IP/Hostname: Erro";
        }
    }

    function atualizarInterface(dados) {
        const rx = formatarTaxa(dados.inBitsPerSecond);
        const tx = formatarTaxa(dados.outBitsPerSecond);

        valorRx.textContent = rx.valor;
        unidadeRx.textContent = rx.unidade;
        valorTx.textContent = tx.valor;
        unidadeTx.textContent = tx.unidade;

        definirStatus('Conectado', '#4caf50');
        ultimaAtualizacao.textContent = new Date().toLocaleTimeString();

        const timestamp = new Date().toLocaleTimeString();
        adicionarAoGrafico(timestamp, dados.inBitsPerSecond / 1000, dados.outBitsPerSecond / 1000);
    }

    function adicionarAoGrafico(rotulo, dadoRx, dadoTx) {
        grafico.data.labels.push(rotulo);
        grafico.data.datasets[0].data.push(dadoRx); // Download (Rx)
        grafico.data.datasets[1].data.push(dadoTx); // Upload (Tx)

        if (grafico.data.labels.length > MAX_PONTOS) {
            grafico.data.labels.shift();
            grafico.data.datasets.forEach(ds => ds.data.shift());
        }

        grafico.update();
    }

    function definirStatus(texto, cor) {
        textoStatus.textContent = texto;
        textoStatus.style.color = cor;
    }

    function inicializarGrafico() {
        const contexto = document.getElementById('trafficChart').getContext('2d');
        grafico = new Chart(contexto, {
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

    function iniciarMonitoramento() {
        if (intervaloTrafego) clearInterval(intervaloTrafego);
        buscarDadosTrafego();
        intervaloTrafego = setInterval(buscarDadosTrafego, INTERVALO_PESQUISA);
    }

    function pararMonitoramento() {
        clearInterval(intervaloTrafego);
    }

    function alternarPausa() {
        pausado = !pausado;
        if (pausado) {
            pararMonitoramento();
            botaoToggle.textContent = 'Retomar';
            definirStatus('Pausado', 'orange');
        } else {
            iniciarMonitoramento();
            botaoToggle.textContent = 'Pausar';
            definirStatus('Conectado', '#4caf50');
        }
    }

    inicializarGrafico();
    buscarInfoInterface();
    iniciarMonitoramento();
    botaoToggle.addEventListener('click', alternarPausa);
});
