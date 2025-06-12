document.addEventListener('DOMContentLoaded', () => {
    const API_URL_BASE = 'http://localhost:3002';
    const INTERVALO_ATUALIZACAO = 1000;
    const MAX_PONTOS = 60;

    const valorRx = document.getElementById('valor-rx');
    const unidadeRx = document.getElementById('unidade-rx');
    const valorTx = document.getElementById('valor-tx');
    const unidadeTx = document.getElementById('unidade-tx');
    const textoStatus = document.getElementById('texto-status');
    const ultimaAtualizacao = document.getElementById('ultima-atualizacao');
    const botaoToggle = document.getElementById('botao-alternar');
    const nomeHost = document.getElementById('nome-host');
    const nomeInterface = document.getElementById('nome-interface');

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
            const resposta = await fetch(`${API_URL_BASE}/api/traffic`);
            const dados = await resposta.json();

            if (dados.error || dados.message.includes("Primeira coleta")) {
                textoStatus.textContent = "Aguardando dados...";
                return;
            }

            atualizarUI(dados);

        } catch (erro) {
            console.error("Erro ao buscar tráfego:", erro);
            definirStatus('Erro', 'red');
            pararMonitoramento();
        }
    }

    async function buscarInfoInterface() {
        try {
            const respostaNome = await fetch(`${API_URL_BASE}/api/interface-name`);
            const dadosNome = await respostaNome.json();
            nomeInterface.textContent = `Interface: ${dadosNome.name}`;

            const respostaConfig = await fetch(`${API_URL_BASE}/`);
            const textoConfig = await respostaConfig.text();
            const ipEncontrado = textoConfig.match(/IP=([\d.]+)/);
            nomeHost.textContent = `IP/Hostname: ${ipEncontrado ? ipEncontrado[1] : '--'}`;
        } catch {
            nomeInterface.textContent = "Interface: Erro";
            nomeHost.textContent = "IP/Hostname: Erro";
        }
    }

    function atualizarUI(dados) {
        const rx = formatarTaxa(dados.inBitsPerSecond);
        const tx = formatarTaxa(dados.outBitsPerSecond);

        valorRx.textContent = rx.valor;
        unidadeRx.textContent = rx.unidade;
        valorTx.textContent = tx.valor;
        unidadeTx.textContent = tx.unidade;

        definirStatus('Conectado', '#4caf50');
        ultimaAtualizacao.textContent = new Date().toLocaleTimeString();

        const horario = new Date().toLocaleTimeString();
        adicionarNoGrafico(horario, dados.inBitsPerSecond / 1000, dados.outBitsPerSecond / 1000);
    }

    function adicionarNoGrafico(label, dadoRx, dadoTx) {
        grafico.data.labels.push(label);
        grafico.data.datasets[0].data.push(dadoRx);
        grafico.data.datasets[1].data.push(dadoTx);

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

    function iniciarGrafico() {
        const ctx = document.getElementById('grafico-trafego').getContext('2d');
        grafico = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [
                    {
                        label: 'Download (Rx) - Kbps',
                        data: [],
                        borderColor: '#38a169',
                        backgroundColor: 'rgba(56, 161, 105, 0.2)',
                        fill: true,
                        tension: 0.4
                    },
                    {
                        label: 'Upload (Tx) - Kbps',
                        data: [],
                        borderColor: '#3182ce',
                        backgroundColor: 'rgba(49, 130, 206, 0.2)',
                        fill: true,
                        tension: 0.4
                    }
                ]
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
        intervaloTrafego = setInterval(buscarDadosTrafego, INTERVALO_ATUALIZACAO);
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

    iniciarGrafico();
    buscarInfoInterface();
    iniciarMonitoramento();
    botaoToggle.addEventListener('click', alternarPausa);
});
