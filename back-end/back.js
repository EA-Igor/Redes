const express = require('express');
const snmp = require('net-snmp');
const cors = require('cors');


// --- Configurações ---
const config = {
    port: 3002,
    mikrotikIp: process.env.MIKROTIK_IP || '192.168.90.2',
    snmpCommunity: process.env.SNMP_COMMUNITY || 'public',
    interfaceIndex: process.env.INTERFACE_INDEX || '4',
};

const OIDs = {
    inOctets: `1.3.6.1.2.1.2.2.1.10.${config.interfaceIndex}`,
    outOctets: `1.3.6.1.2.1.2.2.1.16.${config.interfaceIndex}`,
    interfaceDescr: `1.3.6.1.2.1.2.2.1.2.${config.interfaceIndex}`,
};

const MAX_COUNTER64 = BigInt("18446744073709551615");

let lastStats = {
    in: BigInt(0),
    out: BigInt(0),
    timestamp: 0,
    initialized: false
};

// --- SNMP Service ---
const snmpService = {
    fetchTraffic: () => {
        return new Promise((resolve, reject) => {
            const session = snmp.createSession(config.mikrotikIp, config.snmpCommunity);
            session.get([OIDs.inOctets, OIDs.outOctets], (error, varbinds) => {
                session.close();
                if (error) return reject(error);
                resolve({
                    in: BigInt(varbinds[0].value),
                    out: BigInt(varbinds[1].value),
                    timestamp: Date.now()
                });
            });
        });
    },

    fetchInterfaceName: () => {
        return new Promise((resolve) => {
            const session = snmp.createSession(config.mikrotikIp, config.snmpCommunity);
            session.get([OIDs.interfaceDescr], (error, varbinds) => {
                session.close();
                if (error || !varbinds[0]?.value) {
                    resolve("Desconhecida");
                } else {
                    resolve(varbinds[0].value.toString());
                }
            });
        });
    }
};

// --- Inicialização do Express ---
const app = express();
app.use(cors());
app.use(express.json());

// --- Rotas ---
app.get('/api/traffic', async (req, res) => {
    try {
        const current = await snmpService.fetchTraffic();
        const deltaTime = (current.timestamp - lastStats.timestamp) / 1000;
        let result = {
            inBitsPerSecond: 0,
            outBitsPerSecond: 0,
            inBytesPerSecond: 0,
            outBytesPerSecond: 0,
            error: null,
            message: ""
        };

        if (lastStats.initialized && deltaTime > 0) {
            let deltaIn = current.in - lastStats.in;
            let deltaOut = current.out - lastStats.out;

            if (deltaIn < 0) deltaIn = MAX_COUNTER64 - lastStats.in + current.in;
            if (deltaOut < 0) deltaOut = MAX_COUNTER64 - lastStats.out + current.out;

            const inBytesPerSec = Number(deltaIn) / deltaTime;
            const outBytesPerSec = Number(deltaOut) / deltaTime;

            result = {
                ...result,
                inBytesPerSecond: Math.round(inBytesPerSec),
                outBytesPerSecond: Math.round(outBytesPerSec),
                inBitsPerSecond: Math.round(inBytesPerSec * 8),
                outBitsPerSecond: Math.round(outBytesPerSec * 8)
            };
        } else {
            result.message = "Primeira coleta. Taxas serão exibidas na próxima requisição.";
            lastStats.initialized = true;
        }

        lastStats = { ...lastStats, ...current };
        res.json(result);

    } catch (err) {
        console.error("Erro ao obter dados SNMP:", err);
        res.status(500).json({
            inBitsPerSecond: 0,
            outBitsPerSecond: 0,
            inBytesPerSecond: 0,
            outBytesPerSecond: 0,
            error: err.message,
            message: "Falha ao obter dados do MikroTik."
        });
    }
});

app.get('/api/interface-name', async (req, res) => {
    const name = await snmpService.fetchInterfaceName();
    res.json({ name });
});

app.get('/', (req, res) => {
    res.send(`
        <h2>Servidor de Monitoramento SNMP MikroTik</h2>
        <p>Use <code>/api/traffic</code> para dados de tráfego.</p>
        <p>Configuração: IP=${config.mikrotikIp}, Comunidade=${config.snmpCommunity}, Interface=${config.interfaceIndex}</p>
    `);
});

// --- Inicializa servidor ---
app.listen(config.port, () => {
    console.log(`Servidor disponível em http://localhost:${config.port}`);
    console.log(`Conectando ao MikroTik: ${config.mikrotikIp}`);
    console.log(`Comunidade SNMP: ${config.snmpCommunity}, Interface Index: ${config.interfaceIndex}`);
    console.warn("Nota: O net-snmp pode retornar valores como Number. Para grandes contadores (Counter64), isso pode afetar a precisão.");
});
