# Guia de Como Fazer: Registrar e Configurar os Serviços no Systemd

Este guia prático fornece as instruções necessárias para implantar os 3 serviços em segundo plano (daemons) do PriceTracker em um sistema Linux utilizando o gerenciador do sistema **Systemd**.

Isso garante que o painel web, o bot do Telegram e o agendador de preços iniciem automaticamente com o sistema e se recuperem sozinhos em caso de falhas.

---

## Estrutura de Serviços

O PriceTracker utiliza 3 daemons distintos:
1. `precotracker-web.service`: Gerencia a API FastAPI e o servidor de arquivos estáticos.
2. `precotracker-bot.service`: Mantém o bot do Telegram escutando comandos em tempo real.
3. `precotracker-scheduler.service`: Executa a varredura automática de preços no intervalo configurado.

---

## Passo 1: Copiar os Arquivos de Serviço

Os arquivos de configuração padrão estão localizados em `/home/iago/Documentos/Pessoal/price-tracker/services/`. Copie-os para o diretório de sistema do systemd:

```bash
sudo cp /home/iago/Documentos/Pessoal/price-tracker/services/precotracker-*.service /etc/systemd/system/
```

---

## Passo 2: Recarregar o Daemon do Systemd

Sempre que adicionar ou modificar arquivos de serviço, avise o systemd para atualizar sua lista interna:

```bash
sudo systemctl daemon-reload
```

---

## Passo 3: Habilitar a Inicialização Automática

Ative os serviços para que eles iniciem automaticamente ao ligar o computador:

```bash
sudo systemctl enable precotracker-web.service precotracker-bot.service precotracker-scheduler.service
```

---

## Passo 4: Iniciar os Serviços

Inicie a execução dos daemons imediatamente:

```bash
sudo systemctl start precotracker-web.service precotracker-bot.service precotracker-scheduler.service
```

---

## Passo 5: Como Gerenciar e Depurar

Aqui estão as tarefas diárias comuns para gerenciamento dos serviços:

### Verificar o Status de um Serviço
Para verificar se tudo está rodando sem problemas:
```bash
systemctl status precotracker-web.service
```

### Reiniciar os Serviços
Sempre que fizer alterações nos arquivos `.py` do back-end, aplique-as reiniciando os serviços:
```bash
sudo systemctl restart precotracker-web.service precotracker-bot.service precotracker-scheduler.service
```

### Visualizar Logs de Erro e Saída
O systemd captura todas as saídas de terminal dos scripts. Utilize o `journalctl` com a tag `-f` para ler em tempo real:
```bash
# Ver mensagens e execuções de scraping do agendador
journalctl -u precotracker-scheduler.service -f -n 100

# Ver requisições HTTP chegando no servidor web
journalctl -u precotracker-web.service -f

# Ver comandos enviados pelo bot
journalctl -u precotracker-bot.service -f
```
