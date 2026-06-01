# Guia de Como Fazer: Criar e Configurar o Bot do Telegram

Este guia fornece os passos detalhados para criar o seu próprio robô privado no Telegram e capturar as credenciais necessárias para que a de-duplicação e o disparo automático de ofertas funcionem.

---

## Passo 1: Criar o Bot no Telegram

1. Abra o aplicativo do Telegram e busque pelo contato oficial `@BotFather`.
2. Envie o comando `/newbot` no chat.
3. Escolha um nome legível para o seu bot (ex: `Price Tracker Bot`).
4. Escolha um nome de usuário único que obrigatoriamente termine em `bot` ou `_bot` (ex: `iago_price_tracker_bot`).
5. O `@BotFather` responderá com uma mensagem de parabéns contendo o seu **HTTP API Token** (uma string longa de números e letras parecida com `123456789:ABCdefGhIJKlmNoPQRsTuvwxyZ`).
6. Copie este Token. Ele será a sua variável `TELEGRAM_TOKEN`.

---

## Passo 2: Descobrir o seu Chat ID Privado

O bot do PriceTracker é estritamente de uso privado e só responderá a você (bloqueando qualquer acesso não autorizado). Para isso, você precisa descobrir o seu identificador numérico pessoal de chat:

1. Busque pelo contato do robô `@userinfobot` no Telegram.
2. Dê `/start` no chat.
3. O robô responderá com as suas informações, exibindo o campo **`Id`** (um número de 9 a 10 dígitos, ex: `987654321`).
4. Copie este número. Ele será a sua variável `TELEGRAM_CHAT_ID`.

---

## Passo 3: Iniciar a Conversa com o Seu Bot

Antes de ligar o serviço do robô, você **precisa** mandar uma mensagem inicial no chat dele, para que o Telegram permita que ele envie mensagens espontâneas para você.

1. Abra o link do bot gerado pelo `@BotFather` (ex: `t.me/iago_price_tracker_bot`).
2. Clique em **Começar** (ou envie o comando `/start`).

---

## Passo 4: Salvar as Configurações no Arquivo `.env`

Abra o arquivo `.env` localizado na raiz do projeto `price-tracker` e cole as credenciais correspondentes:

```ini
TELEGRAM_TOKEN=123456789:ABCdefGhIJKlmNoPQRsTuvwxyZ
TELEGRAM_CHAT_ID=987654321
```

Sempre que alterar o `.env`, reinicie o daemon correspondente no terminal Linux para que o bot carregue as credenciais novas:

```bash
sudo systemctl restart precotracker-bot.service precotracker-scheduler.service
```
