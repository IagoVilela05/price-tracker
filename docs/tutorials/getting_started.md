# Tutorial: Primeiros Passos com o PriceTracker

Bem-vindo ao **PriceTracker**! Este tutorial foi desenvolvido para levar você do zero absoluto até o monitoramento do seu primeiro hardware de forma prática e descomplicada.

---

## Pré-requisitos

Antes de iniciar, certifique-se de que você possui o seguinte instalado em seu sistema Linux (Ubuntu 24.04 ou posterior):
- **Node.js** (versão 18 ou superior)
- **Python** (versão 3.10 ou superior)
- **Git**

---

## Passo 1: Obter o Código do Projeto

Abra o terminal do seu computador e faça o clone ou navegue até a pasta do projeto:

```bash
cd /home/iago/Documentos/Pessoal/price-tracker
```

---

## Passo 2: Configurar o Back-end (Python)

Utilizaremos um ambiente isolado do Python (virtualenv) para evitar conflitos de pacotes em seu computador.

1. **Crie e ative o ambiente virtual:**
   ```bash
   python3 -m venv .venv
   source .venv/bin/activate
   ```

2. **Instale os pacotes necessários:**
   ```bash
   pip install --upgrade pip
   pip install -r requirements.txt
   ```

3. **Configure as ferramentas de navegação automatizada (Playwright):**
   *Como você está em um sistema moderno, usaremos um atalho de compatibilidade de plataforma para o instalador:*
   ```bash
   PLAYWRIGHT_HOST_PLATFORM_OVERRIDE=ubuntu24.04-x64 .venv/bin/playwright install chromium
   ```

---

## Passo 3: Configurar Variáveis de Ambiente

Crie o arquivo `.env` na raiz do seu projeto contendo as credenciais de notificação (você pode usar valores fictícios se estiver testando localmente):

```ini
TELEGRAM_TOKEN=insira_seu_token_aqui
TELEGRAM_CHAT_ID=insira_seu_chat_id_aqui
```

---

## Passo 4: Compilar o Front-end (React)

Compilaremos os arquivos visuais para que o servidor back-end possa entregá-los de forma veloz.

1. **Navegue até a pasta frontend:**
   ```bash
   cd frontend
   ```

2. **Instale as dependências visuais:**
   ```bash
   npm install
   ```

3. **Gere os arquivos compilados:**
   ```bash
   npm run build
   ```

4. **Retorne para a pasta principal:**
   ```bash
   cd ..
   ```

---

## Passo 5: Rodar a Aplicação

Com tudo pronto, inicie o servidor web central do PriceTracker:

```bash
.venv/bin/uvicorn backend.api:app --host 127.0.0.1 --port 8000 --reload
```

Abra o seu navegador e acesse **http://localhost:8000**. Você será recebido pelo painel do seu monitor de hardware!

---

## Passo 6: Monitorar seu Primeiro Link

1. No painel lateral esquerdo (**Novo Link para Monitorar**), cole o link de uma placa de vídeo ou processador de uma das lojas parceiras (como KaBuM! ou Pichau).
2. Defina o seu **Preço Alvo** desejado (ex: se o Pix atual é R$ 1.500,00, defina R$ 1.300,00).
3. (Opcional) Digite um nome de coleção como `Placa de Vídeo`.
4. Clique em **Iniciar Rastreamento**. O sistema acessará o site em tempo real para obter o nome e o preço atual!

Parabéns! O seu hardware agora está na grade ativa de rastreamento. Você pode clicar em **Sincronizar Agora** no cabeçalho superior para re-verificar os valores sempre que desejar.
