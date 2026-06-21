import os
import sys
import time
import json
import urllib.request
from dotenv import load_dotenv

# Garante que o diretório do projeto esteja no PATH do Python
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from config import TELEGRAM_TOKEN, TELEGRAM_CHAT_ID
from database.db_manager import (
    init_db, add_product, get_all_products, get_product,
    delete_product, add_price_reading, get_last_price, get_price_stats,
    update_product_name, get_last_price_installments
)
from scrapers import get_scraper_class_for_url
from main import run_price_check

# Carrega variáveis de ambiente
load_dotenv()

# Validação inicial de credenciais
if not TELEGRAM_TOKEN or not TELEGRAM_CHAT_ID:
    print("❌ Erro: TELEGRAM_TOKEN ou TELEGRAM_CHAT_ID não definidos no arquivo .env")
    sys.exit(1)

API_URL = f"https://api.telegram.org/bot{TELEGRAM_TOKEN}"

def escape_html(text: str) -> str:
    """Escapa caracteres HTML reservados para a API do Telegram."""
    if not text:
        return ""
    return text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")

def send_message(chat_id: int, text: str, parse_mode: str = "HTML") -> bool:
    """Envia uma mensagem de resposta via API do Telegram."""
    url = f"{API_URL}/sendMessage"
    payload = {
        "chat_id": chat_id,
        "text": text,
        "parse_mode": parse_mode,
        "disable_web_page_preview": True
    }
    try:
        data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(
            url,
            data=data,
            headers={"Content-Type": "application/json"}
        )
        with urllib.request.urlopen(req, timeout=15) as response:
            res_data = json.loads(response.read().decode("utf-8"))
            return res_data.get("ok", False)
    except Exception as e:
        print(f"⚠️ Erro ao enviar mensagem para {chat_id}: {e}")
        return False

def get_updates(offset: int = None, timeout: int = 30) -> list:
    """Obtém atualizações pendentes via Long Polling."""
    url = f"{API_URL}/getUpdates"
    payload = {"timeout": timeout}
    if offset:
        payload["offset"] = offset

    try:
        data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(
            url,
            data=data,
            headers={"Content-Type": "application/json"}
        )
        with urllib.request.urlopen(req, timeout=timeout + 10) as response:
            res_data = json.loads(response.read().decode("utf-8"))
            if res_data.get("ok"):
                return res_data.get("result", [])
    except Exception as e:
        print(f"⚠️ Erro ao buscar atualizações (offset={offset}): {e}")
        # Pequeno delay em caso de erro de rede para evitar loop frenético
        time.sleep(5)
    return []

def handle_start(chat_id: int):
    """Responde ao comando /start ou /ajuda."""
    help_text = (
        "👋 <b>Bem-vindo ao PriceTracker!</b>\n\n"
        "Eu sou o seu robô monitorador de preços local. Através de mim você pode gerenciar seus produtos e receber alertas em tempo real!\n\n"
        "📋 <b>Comandos Disponíveis:</b>\n"
        "🔹 /list - Lista todos os produtos sendo monitorados atualmente.\n"
        "🔹 /check - Dispara uma verificação imediata de todos os preços.\n"
        "🔹 /add <code>[URL] [PREÇO_ALVO]</code> - Cadastra um novo produto para monitoramento.\n"
        "🔹 /delete <code>[ID]</code> - Remove um produto da lista de monitoramento.\n"
        "🔹 /rename <code>[ID] [NOVO NOME]</code> - Define um apelido/nome personalizado para o produto.\n"
        "🔹 /ajuda - Exibe esta mensagem de ajuda novamente.\n\n"
        "<i>Exemplo de cadastro:</i>\n"
        "<code>/add https://www.kabum.com.br/produto/123456 1200.00</code>"
    )
    send_message(chat_id, help_text)

def handle_list(chat_id: int):
    """Lista todos os produtos monitorados."""
    products = get_all_products()
    if not products:
        send_message(chat_id, "📭 <b>Nenhum produto cadastrado para monitoramento ainda.</b>\nUse o comando /add para cadastrar o primeiro!")
        return

    message = "📋 <b>Produtos Monitorados:</b>\n\n"
    for prod in products:
        prod_id = prod["id"]
        last_price = get_last_price(prod_id)
        last_price_inst = get_last_price_installments(prod_id)
        target = prod["target_price"]
        store = prod["store"].upper()
        
        if last_price and target is not None and last_price <= target:
            status_str = "🎯 <b>Preço Alvo Atingido!</b>"
        elif last_price and target is not None:
            diff = last_price - target
            status_str = f"⏳ Aguardando queda (+R$ {diff:.2f})"
        elif last_price:
            status_str = "🔍 Monitorando promoções"
        else:
            status_str = "❓ Sem leituras ainda"

        if last_price:
            if last_price_inst and last_price_inst > last_price:
                price_str = f"R$ {last_price:.2f} (à vista) / R$ {last_price_inst:.2f} (parcelado)"
            else:
                price_str = f"R$ {last_price:.2f}"
        else:
            price_str = "Sem leituras"
        
        collection_str = f"\n📁 <b>Coleção:</b> {escape_html(prod['collection'])}" if prod.get('collection') else ""
        
        message += (
            f"🆔 <b>ID:</b> {prod_id}\n"
            f"📦 <b>Nome:</b> {escape_html(prod['name'])}{collection_str}\n"
            f"🏢 <b>Loja:</b> {store}\n"
            f"💰 <b>Preço Atual:</b> <b>{price_str}</b>\n"
            f"🎯 <b>Preço Alvo:</b> {f'R$ {target:.2f}' if target is not None else 'Opcional/Sem alvo'}\n"
            f"📊 <b>Status:</b> {status_str}\n"
            f"🔗 <a href=\"{prod['url']}\">Link do Produto</a>\n"
            f"───────────────────\n"
        )
    
    send_message(chat_id, message)

def handle_check(chat_id: int):
    """Dispara uma checagem de preço imediata e envia os resultados."""
    send_message(chat_id, "🔄 <b>Iniciando varredura e atualização de preços...</b>\n<i>Isso pode levar alguns segundos devido ao Playwright. Aguarde.</i>")
    
    try:
        # Roda a função nativa de varredura que também dispara os alertas automáticos de Telegram se achar ofertas
        run_price_check(non_interactive=True)
        
        # Após a varredura, monta um resumo para enviar ao usuário
        products = get_all_products()
        if not products:
            send_message(chat_id, "✅ <b>Varredura concluída!</b> Mas não há produtos cadastrados.")
            return

        resumo = "📊 <b>Resumo da Varredura Realizada:</b>\n\n"
        for prod in products:
            prod_id = prod["id"]
            last_price = get_last_price(prod_id)
            last_price_inst = get_last_price_installments(prod_id)
            target = prod["target_price"]
            store = prod["store"].upper()

            if last_price and target is not None and last_price <= target:
                status = "🎯 <b>ALVO ATINGIDO!</b>"
            elif last_price and target is not None:
                diff = last_price - target
                status = f"⏳ Aguardando queda (+R$ {diff:.2f})"
            elif last_price:
                status = "🔍 Monitorando"
            else:
                status = "❓ Sem leitura"

            if last_price:
                if last_price_inst and last_price_inst > last_price:
                    price_str = f"R$ {last_price:.2f} (à vista) / R$ {last_price_inst:.2f} (parcelado)"
                else:
                    price_str = f"R$ {last_price:.2f}"
            else:
                price_str = "Sem leitura"
            resumo += (
                f"📦 <b>{escape_html(prod['name'][:40])}...</b>\n"
                f"🏢 <b>{store}</b> | 💰 <b>{price_str}</b> (Alvo: {f'R$ {target:.2f}' if target is not None else 'Sem alvo'})\n"
                f"📝 Status: {status}\n\n"
            )
        
        send_message(chat_id, resumo)

    except Exception as e:
        send_message(chat_id, f"❌ <b>Ocorreu um erro ao realizar a varredura:</b>\n<code>{escape_html(str(e))}</code>")

def handle_add(chat_id: int, text: str):
    """Cadastra um novo produto."""
    parts = text.split(maxsplit=2)
    if len(parts) < 2:
        send_message(
            chat_id, 
            "⚠️ <b>Formato inválido!</b>\n"
            "Use o comando da seguinte forma:\n"
            "<code>/add [URL] [PREÇO_ALVO (opcional)]</code>\n\n"
            "<i>Exemplo:</i>\n"
            "<code>/add https://www.amazon.com.br/dp/B0883N8SDF</code>\n"
            "<code>/add https://www.amazon.com.br/dp/B0883N8SDF 150.00</code>"
        )
        return

    url = parts[1].strip()
    target_price = None

    if len(parts) >= 3:
        price_str = parts[2].strip().replace(",", ".")
        try:
            target_price = float(price_str)
            if target_price <= 0:
                raise ValueError()
        except ValueError:
            send_message(chat_id, "⚠️ <b>Preço Alvo inválido!</b> Por favor, digite um número decimal positivo ou omita-o.")
            return

    send_message(chat_id, "🔄 <b>Conectando à loja e testando o link do produto...</b>\n<i>Isso pode demorar alguns segundos.</i>")

    try:
        scraper_cls = get_scraper_class_for_url(url)
        scraper = scraper_cls(url)
        res = scraper.scrape()

        if not res or not res.get("name") or res.get("price") == 0.0:
            send_message(chat_id, "❌ <b>Erro:</b> Não foi possível extrair as informações da página do produto. Verifique a URL.")
            return

        store_name = scraper_cls.__name__.replace("Scraper", "")
        prod_id = add_product(res['name'], store_name, url, target_price)
        price_inst = res.get("price_installments", res['price'])
        add_price_reading(prod_id, res['price'], price_inst)

        success_msg = (
            "🎉 <b>Produto Cadastrado com Sucesso!</b> 🎉\n\n"
            f"🆔 <b>ID Gerado:</b> {prod_id}\n"
            f"📦 <b>Nome:</b> {escape_html(res['name'])}\n"
            f"🏢 <b>Loja:</b> {store_name.upper()}\n"
            f"💰 <b>Preço À Vista:</b> R$ {res['price']:.2f}\n"
            f"💳 <b>Preço Parcelado:</b> R$ {price_inst:.2f}\n"
            f"🎯 <b>Preço Alvo Definido:</b> {f'R$ {target_price:.2f}' if target_price is not None else 'Opcional/Não definido'}\n\n"
            "📈 O monitoramento contínuo já está ativo para este item!"
        )
        send_message(chat_id, success_msg)

    except ValueError as ve:
        send_message(chat_id, f"❌ <b>Erro de validação:</b>\n{escape_html(str(ve))}")
    except Exception as e:
        send_message(chat_id, f"❌ <b>Erro ao processar cadastro:</b>\n<code>{escape_html(str(e))}</code>")

def handle_delete(chat_id: int, text: str):
    """Remove um produto do monitoramento."""
    parts = text.split()
    if len(parts) < 2:
        send_message(chat_id, "⚠️ <b>ID ausente!</b>\nUse: <code>/delete [ID]</code>\nExemplo: <code>/delete 5</code>")
        return

    id_str = parts[1].strip()
    try:
        prod_id = int(id_str)
    except ValueError:
        send_message(chat_id, "⚠️ <b>ID inválido!</b> O ID deve ser um número inteiro.")
        return

    prod = get_product(prod_id)
    if not prod:
        send_message(chat_id, f"❌ <b>ID {prod_id} não encontrado</b> na lista de produtos monitorados.")
        return

    try:
        delete_product(prod_id)
        send_message(chat_id, f"🗑️ <b>Produto removido com sucesso!</b>\n📦 Item: <i>{escape_html(prod['name'])}</i>")
    except Exception as e:
        send_message(chat_id, f"❌ <b>Erro ao excluir produto:</b>\n<code>{escape_html(str(e))}</code>")

def handle_rename(chat_id: int, text: str):
    """Atualiza o nome (apelido) de um produto monitorado."""
    parts = text.split(maxsplit=2)
    if len(parts) < 3:
        send_message(
            chat_id,
            "⚠️ <b>Formato inválido!</b>\n"
            "Use o comando da seguinte forma:\n"
            "<code>/rename [ID] [Novo Nome/Apelido]</code>\n\n"
            "<i>Exemplo:</i>\n"
            "<code>/rename 5 RTX 5060 Ti</code>"
        )
        return

    id_str = parts[1].strip()
    new_name = parts[2].strip()

    try:
        prod_id = int(id_str)
    except ValueError:
        send_message(chat_id, "⚠️ <b>ID inválido!</b> O ID deve ser um número inteiro.")
        return

    prod = get_product(prod_id)
    if not prod:
        send_message(chat_id, f"❌ <b>ID {prod_id} não encontrado</b> na lista de produtos monitorados.")
        return

    if not new_name:
        send_message(chat_id, "⚠️ <b>Nome inválido!</b> O nome/apelido não pode estar vazio.")
        return

    try:
        update_product_name(prod_id, new_name)
        send_message(
            chat_id,
            f"✍️ <b>Produto renomeado com sucesso!</b>\n"
            f"🆔 <b>ID:</b> {prod_id}\n"
            f"📦 <b>Novo Nome/Apelido:</b> <i>{escape_html(new_name)}</i>"
        )
    except Exception as e:
        send_message(chat_id, f"❌ <b>Erro ao renomear produto:</b>\n<code>{escape_html(str(e))}</code>")

def process_message(message: dict):
    """Processa uma mensagem recebida válida e autorizada."""
    chat = message.get("chat", {})
    chat_id = chat.get("id")
    text = message.get("text", "").strip()

    if not chat_id or not text:
        return

    # Verificação rígida de segurança por Chat ID
    if str(chat_id) != str(TELEGRAM_CHAT_ID):
        print(f"🔒 Bloqueada tentativa de acesso não autorizada do Chat ID: {chat_id}")
        send_message(chat_id, "🚫 <b>Acesso Não Autorizado.</b>\nEste bot é privado e configurado para uso exclusivo do seu proprietário.")
        return

    # Roteamento de comandos
    if text.startswith("/start") or text.startswith("/ajuda") or text.startswith("/help"):
        handle_start(chat_id)
    elif text.startswith("/list"):
        handle_list(chat_id)
    elif text.startswith("/check") or text.startswith("/sincronizar"):
        handle_check(chat_id)
    elif text.startswith("/add"):
        handle_add(chat_id, text)
    elif text.startswith("/delete"):
        handle_delete(chat_id, text)
    elif text.startswith("/rename") or text.startswith("/apelido"):
        handle_rename(chat_id, text)
    else:
        send_message(chat_id, "❓ <b>Comando não reconhecido.</b>\nUse /ajuda para ver a lista de comandos disponíveis.")

def main():
    # Inicializa o banco de dados se necessário
    init_db()
    
    print("🤖 Bot interativo do Telegram iniciado com sucesso!")
    print(f"🔒 Acesso restrito exclusivamente ao Chat ID: {TELEGRAM_CHAT_ID}")
    print("📡 Escutando comandos via Long Polling...")

    offset = None
    while True:
        try:
            updates = get_updates(offset=offset, timeout=30)
            for update in updates:
                update_id = update.get("update_id")
                offset = update_id + 1  # Confirma o recebimento desta atualização
                
                message = update.get("message")
                if message:
                    process_message(message)
                    
        except KeyboardInterrupt:
            print("\n🤖 Bot desligado pelo usuário. Até mais!")
            sys.exit(0)
        except Exception as e:
            print(f"⚠️ Ocorreu um erro no loop principal do bot: {e}")
            time.sleep(5)

if __name__ == "__main__":
    main()
