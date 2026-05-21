# 🎯 PreçoAlvo AI - Monitorador Inteligente de Preços de Hardware

O **PreçoAlvo AI** é um sistema completo, robusto e de altíssima fidelidade projetado para monitorar preços de componentes de hardware em tempo real, cobrindo as maiores varejistas brasileiras. O sistema é capaz de diferenciar preços **À Vista (Pix/Boleto)** de preços **Parcelados (Cartão de Crédito)**, gerar gráficos estatísticos interativos de evolução histórica de preços e enviar alertas instantâneos de descontos direto para o seu celular via Telegram.

Desenvolvido com uma arquitetura moderna e desacoplada em **React (Vite)** e **Python (FastAPI)**, o projeto roda de forma 100% autônoma em segundo plano (como serviços de sistema daemon) na sua máquina Linux.

---

## ✨ Principais Recursos

* **🔌 Raspagem Híbrida Multi-Lojas**: Motores de extração especializados para **Amazon Brasil**, **Mercado Livre**, **KaBuM!**, **Pichau** e **TerabyteShop** utilizando Playwright e BeautifulSoup4.
* **🛡️ Evasão de Bloqueios (Anti-Bot Bypass)**: Configurações de Chromium otimizadas (parâmetro `AutomationControlled` desativado, user-agents realistas e cabeçalhos de localização em português) para mitigar bloqueios de CAPTCHAs na Amazon e Mercado Livre.
* **💳 Rastreamento de Preço Duplo**: Primeira aplicação da categoria a mapear e registrar no banco de dados tanto o preço promocional Pix/Boleto quanto as condições de parcelamento no cartão.
* **🧠 Filtro de Recomendação Inteligente**: Algoritmo que ignora vitrines de "Produtos recomendados", "Quem viu também comprou" ou banners patrocinados, capturando estritamente o preço real do produto alvo.
* **📈 Histórico com Linha do Tempo e Gráficos**: Banco SQLite que armazena leituras sucessivas. O painel web exibe um gráfico de linhas dinâmico com **Chart.js** contendo uma linha tracejada com a sua meta de preço e uma curva de evolução para preços parcelados.
* **🕒 Timezone Sincronizado**: Conversão automática de datas de UTC no banco para o fuso horário local do seu sistema operacional na renderização dos gráficos.
* **🤖 Bot do Telegram de Duas Vias**: Controle remoto completo por chat. Adicione links, visualize itens cadastrados, mude apelidos dos produtos, delete monitoramentos e force varreduras de qualquer lugar do mundo pelo celular.
* **🎨 Painel Web Moderno (UX/UI Premium)**: Interface responsiva e moderna em modo escuro (*glassmorphism*), cartões de KPIs dinâmicos, notificações Toast instantâneas de sucesso e controle intuitivo.
* **🚀 Pronto para Implantação Local (Systemd)**: Scripts de serviço Systemd prontos para registrar o Web App, o Bot e o Agendador como daemons que iniciam sozinhos no boot do Linux.

---

## 🛠️ Arquitetura do Projeto

O código-fonte está estruturado de forma modular e altamente legível:

```text
price-tracker/
├── api.py                       # Servidor RESTful FastAPI que serve a API e a build do React
├── config.py                    # Configurações globais (BD, timeouts, thresholds de promoções)
├── database/
│   └── db_manager.py            # Gerenciador do SQLite, tabelas, consultas e migrações estruturadas
├── frontend/                    # Single Page Application desenvolvida em React + Vite
│   ├── src/
│   │   ├── components/          # Componentes modulares (ProductCard, HistoryChartModal, KPIStats, etc.)
│   │   ├── index.css            # Folha de estilos premium em dark mode com tokens modernos
│   │   └── App.jsx              # Orquestrador de estado e requisições do front-end
│   └── vite.config.js           # Configurações de build e Proxy reverso de desenvolvimento (/api)
├── main.py                      # Orquestrador CLI de terminal com Rich e spinner de progresso
├── precotracker-*.service       # Arquivos de configuração de daemons locais para o Systemd
├── requirements.txt             # Dependências Python gerenciadas pelo `uv`
├── scheduler.py                 # Daemon de contagem regressiva em console para varreduras periódicas
├── scrapers/                    # Mecanismo Playwright estruturado em classes abstratas
│   ├── base_scraper.py          # Classe-mãe abstrata, limpeza monetária, CEP e lógica de bypass
│   ├── amazon.py / pichau.py... # Raspadores de páginas específicos por loja
│   └── __init__.py              # Fábrica dinâmica que roteia URLs para a classe certa
├── telegram_bot.py              # Long-polling do Bot do Telegram, tratamento de comandos e segurança
└── utils/
    └── notifier.py              # Utilitário de formatação de mensagens ricas em HTML para o Telegram
```

---

## 🚀 Como Configurar e Rodar o Projeto

### 1. Pré-Requisitos
Certifique-se de ter instalado em sua máquina:
* Python 3.10 ou superior (Recomendado utilizar o gerenciador de pacotes rápido [**`uv`**](https://github.com/astral-sh/uv))
* Node.js v18+ e NPM (para compilação do painel web)
* Navegadores do Playwright instalados (`playwright install chromium`)

### 2. Clonagem e Configuração do Ambiente
Abra o terminal na pasta do projeto e configure o ambiente virtual Python:
```bash
# Criar e ativar o ambiente virtual rapidamente com uv
uv venv
source .venv/bin/activate

# Instalar dependências Python
uv pip install -r requirements.txt

# Instalar o navegador Chromium headless para raspagem
playwright install chromium
```

### 3. Configurar Variáveis de Ambiente
Crie um arquivo `.env` na raiz do projeto com as chaves de conexão do seu robô no Telegram:
```env
TELEGRAM_TOKEN="SEU_TOKEN_TELEGRAM_BOT"
TELEGRAM_CHAT_ID="SEU_CHAT_ID_DO_TELEGRAM"

# Limiares de descontos percentuais para as notificações (opcional)
PROMO_THRESHOLD_INTERESTING=10.0
PROMO_THRESHOLD_SUPER=20.0
PROMO_THRESHOLD_INSANE=35.0
```
*(Caso não possua o Bot ou Chat ID do Telegram, você pode rodar o assistente interativo contido no repositório local executando `uv run .system_generated/tasks/test_telegram.py` se disponível, para criá-lo em 2 minutos).*

### 4. Compilar o Front-end para Produção
Navegue até a pasta `frontend`, instale as dependências npm e compile os arquivos que o FastAPI servirá:
```bash
cd frontend
npm install
npm run build
cd ..
```

---

## 💻 Modos de Execução

Você tem três opções para rodar o **PreçoAlvo AI** no seu computador:

### Opção A: Execução Local Unificada (Manual)
Para testar a API REST e a interface web juntas de forma simples:
```bash
# Iniciar servidor FastAPI (servindo a API e a build do React unificados)
.venv/bin/uvicorn api:app --host 127.0.0.1 --port 8000
```
Acesse o sistema no seu navegador: **[http://localhost:8000](http://localhost:8000)**.

### Opção B: Desenvolvimento Separado (Com Recarregamento Automático)
Se desejar fazer alterações rápidas no visual em tempo real:
```bash
# 1. Em um terminal, inicie o backend:
.venv/bin/uvicorn api:app --host 127.0.0.1 --port 8000

# 2. Em outro terminal, inicie o servidor de desenvolvimento do Vite (porta 5173):
cd frontend
npm run dev
```
Acesse a interface dinâmica em **[http://localhost:5173](http://localhost:5173)** (todas as requisições de `/api` serão automaticamente redirecionadas para o backend de desenvolvimento).

### Opção C: Implantação Automatizada em Background (Recomendado para Uso Diário)
Para que o monitorador funcione silenciosamente sem requerer terminais abertos e inicie sozinho com o computador, registre os serviços Systemd no seu Linux:

```bash
# 1. Crie os links simbólicos dos serviços locais para o diretório do Systemd
sudo ln -sf /home/iago/Documents/Pessoal/price-tracker/precotracker-web.service /etc/systemd/system/
sudo ln -sf /home/iago/Documents/Pessoal/price-tracker/precotracker-bot.service /etc/systemd/system/
sudo ln -sf /home/iago/Documents/Pessoal/price-tracker/precotracker-scheduler.service /etc/systemd/system/

# 2. Atualize o gerenciador de daemons
sudo systemctl daemon-reload

# 3. Habilite todos para inicializarem no boot
sudo systemctl enable precotracker-web.service precotracker-bot.service precotracker-scheduler.service

# 4. Inicie todos os serviços imediatamente
sudo systemctl start precotracker-web.service precotracker-bot.service precotracker-scheduler.service
```

Acompanhe os status e logs a qualquer momento:
```bash
# Ver status geral de execução
sudo systemctl status precotracker-web precotracker-bot precotracker-scheduler

# Ver logs vivos das varreduras em segundo plano
journalctl -u precotracker-scheduler -f
```

---

## 📱 Comandos Disponíveis no Telegram

Graças ao bot bidirecional nativo seguro, você pode controlar tudo mandando mensagens para o robô:
* `/ajuda` ou `/start`: Exibe o painel interativo de instruções de comandos.
* `/list`: Retorna todos os hardwares cadastrados, preços atuais Pix e Cartão, metas e alertas.
* `/check` ou `/sincronizar`: Inicia uma varredura instantânea em background e envia um relatório detalhado.
* `/add <URL> <PREÇO_ALVO>`: Insere um novo monitoramento diretamente no SQLite.
* `/rename <ID> <NOVO_APELIDO>`: Muda o nome de exibição de um componente.
* `/delete <ID>`: Remove o produto e limpa todo o seu histórico do banco.

---

## 🎨 Contribuição e Licença

Este projeto foi construído para uso pessoal de monitoramento de hardware. Sinta-se livre para clonar, criar issues, sugerir novos scrapers de lojas regionais e submeter Pull Requests!
