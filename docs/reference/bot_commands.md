# Referência Técnica: Comandos do Telegram Bot

Esta referência técnica detalha rigorosamente a sintaxe, os argumentos aceitos, o roteamento e a formatação de mensagens utilizados pelo daemon do bot interativo em [backend/telegram_bot.py](file:///home/iago/Documentos/Pessoal/price-tracker/backend/telegram_bot.py).

---

## 1. Regras de Segurança e Acesso

O bot opera exclusivamente por **Long Polling** via protocolo HTTPS seguro direcionado à API do Telegram: `https://api.telegram.org/bot{TELEGRAM_TOKEN}/getUpdates`.

### Filtro de Chat ID
Toda mensagem recebida pelo método `process_message(message)` passa por uma verificação de segurança estrita:
```python
# telegram_bot.py
if str(chat_id) != str(TELEGRAM_CHAT_ID):
    send_message(chat_id, "🚫 Acesso Não Autorizado.")
    return
```
Qualquer outra conta do Telegram que tentar interagir com o bot receberá uma mensagem de bloqueio imediato, protegendo os seus links e dados de rastreamento.

---

## 2. Dicionário de Comandos

O bot reconhece e processa os seguintes comandos textuais:

### `/start` ou `/ajuda`
* **Argumentos:** Nenhum.
* **Ação:** Envia o painel de boas-vindas com a lista de comandos explicada e exemplos práticos em HTML.

### `/list`
* **Argumentos:** Nenhum.
* **Ação:** Retorna todos os produtos monitorados sob a forma de cards de texto formatados em HTML, incluindo ID, apelido do produto, loja parceira, preço atual (Pix e parcelado), coleção (se houver), preço-alvo e status do alvo.

### `/check` ou `/sincronizar`
* **Argumentos:** Nenhum.
* **Ação:** Executa a varredura assíncrona imediata (`run_price_check()`) no back-end. Após a conclusão, envia uma mensagem de confirmação contendo o resumo atualizado dos preços e status de todos os produtos ativos.

### `/add [URL] [PREÇO_ALVO]`
* **Argumentos:**
  - `URL` (string contendo o link do e-commerce parceiro).
  - `PREÇO_ALVO` (float decimal positivo delimitando o valor desejado).
* **Sintaxe Regex de Validação:** Remove vírgulas por pontos decimais automáticos.
* **Exemplo:** `/add https://www.kabum.com.br/produto/123456 1200.00`
* **Retorno:** Retorna o ID gerado, apelido limpo, preços Pix/parcelado iniciais e confirmação de rastreamento ativo.

### `/delete [ID]`
* **Argumentos:** `ID` (número inteiro correspondente à chave estrangeira primária do produto).
* **Exemplo:** `/delete 5`
* **Retorno:** Mensagem confirmando a exclusão definitiva do produto e histórico no banco SQLite.

### `/rename [ID] [NOVO_APELIDO]`
* **Argumentos:**
  - `ID` (número inteiro).
  - `NOVO_APELIDO` (string de texto livre).
* **Exemplo:** `/rename 5 RTX 4060 Ti`
* **Retorno:** Confirmação da atualização do nome personalizado.
