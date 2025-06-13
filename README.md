# Monitor SNMP MikroTik

Este projeto consiste em um sistema de monitoramento de tráfego de rede para dispositivos MikroTik usando SNMP. Ele é composto por um back-end em Node.js que coleta os dados do roteador e um front-end em HTML, CSS e JavaScript que exibe esses dados em tempo real, incluindo um gráfico.

## Visão Geral

O back-end ([back-end/back.js](back-end/back.js)) utiliza a biblioteca `net-snmp` para se comunicar com o dispositivo MikroTik, buscando informações de tráfego (octetos de entrada e saída) e o nome da interface monitorada. Ele expõe duas rotas de API:
- `/api/traffic`: Retorna os dados de tráfego em bits por segundo e bytes por segundo.
- `/api/interface-name`: Retorna o nome da interface de rede monitorada.

O front-end ([front-end/index.html](front-end/index.html), [front-end/style.css](front-end/style.css), [front-end/script.js](front-end/script.js)) consome essas APIs para exibir as informações de tráfego, o nome do host/IP, o nome da interface e um gráfico de linha (usando Chart.js) mostrando o histórico recente das taxas de download e upload.

## Funcionalidades

- **Monitoramento em Tempo Real:** Exibe as taxas de download (Rx) e upload (Tx) atualizadas periodicamente.
- **Gráfico de Tráfego:** Visualização gráfica do histórico de tráfego.
- **Informações do Dispositivo:** Mostra o IP/Hostname do MikroTik e o nome da interface monitorada.
- **Pausar/Retomar:** Permite pausar e retomar a coleta de dados.
- **Configurável:** O IP do MikroTik, a comunidade SNMP e o índice da interface podem ser configurados via variáveis de ambiente no back-end.

## Estrutura do Projeto

```
.
├── back-end/
│   ├── back.js         # Lógica do servidor Node.js e coleta SNMP
│   └── package.json    # Dependências e scripts do back-end
├── front-end/
│   ├── index.html      # Estrutura da página de monitoramento
│   ├── script.js       # Lógica do cliente para buscar e exibir dados
│   └── style.css       # Estilização da página
├── .gitignore          # Arquivos e pastas a serem ignorados pelo Git
└── README.md           # Este arquivo
```

## Pré-requisitos

- Node.js e npm (ou yarn) instalados.
- Um dispositivo MikroTik com SNMP habilitado e acessível pela máquina que executará o back-end.

## Configuração do Back-end

1.  **Navegue até a pasta `back-end`:**
    ```bash
    cd back-end
    ```
2.  **Instale as dependências:**
    ```bash
    npm init -y
    npm install express net-snmp cors
    ```
3.  **Configuração SNMP (Opcional - Padrão):**
    O back-end ([back-end/back.js](back-end/back.js)) usa as seguintes variáveis de ambiente para configuração. Você pode defini-las no seu sistema ou criar um arquivo `.env` na pasta `back-end` (lembre-se de adicionar `.env` ao seu `.gitignore` se ainda não estiver lá).
    - `MIKROTIK_IP`: O endereço IP do seu dispositivo MikroTik (padrão: `192.168.90.2`).
    - `SNMP_COMMUNITY`: A comunidade SNMP configurada no seu MikroTik (padrão: `public`).
    - `INTERFACE_INDEX`: O índice numérico da interface de rede que você deseja monitorar (padrão: `4`). Você pode descobrir o índice da interface no seu MikroTik (geralmente via WinBox ou terminal em `/interface print`).

    Exemplo de arquivo `.env`:
    ```
    MIKROTIK_IP=192.168.1.1
    SNMP_COMMUNITY=minhacomunidade
    INTERFACE_INDEX=2
    ```

## Configuração do Front-end

Nenhuma configuração específica é necessária para o front-end, além de garantir que o back-end esteja em execução e acessível. O front-end ([front-end/script.js](front-end/script.js)) tentará se conectar ao back-end em `http://localhost:3002` por padrão.

## Executando a Aplicação

1.  **Inicie o Back-end:**
    Na pasta `back-end`, execute:
    ```bash
    node back.js
    ```
    Você deverá ver mensagens no console indicando que o servidor está rodando e tentando se conectar ao MikroTik.

2.  **Abra o Front-end:**
    Abra o arquivo [front-end/index.html](front-end/index.html) em seu navegador web.

A página deverá carregar e começar a exibir os dados de tráfego da interface MikroTik configurada.

## Observações

- O script do back-end ([back-end/back.js](back-end/back.js)) lida com o rollover de contadores SNMP de 64 bits (`MAX_COUNTER64`).
- O front-end ([front-end/script.js](front-end/script.js)) atualiza os dados a cada 5 segundos (`INTERVALO_ATUALIZACAO`) e mantém um histórico de 60 pontos no gráfico (`MAX_PONTOS`).