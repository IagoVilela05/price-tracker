import urllib.request
import json
from config import TELEGRAM_TOKEN, TELEGRAM_CHAT_ID

def escape_html(text: str) -> str:
    """Escapa caracteres HTML reservados para a API do Telegram."""
    if not text:
        return ""
    return text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")

def send_telegram_alert(
    product_name: str, 
    store: str, 
    current_price: float, 
    target_price: float = 0.0, 
    url: str = "",
    is_promo: bool = False,
    drop_percentage: float = 0.0,
    ref_price: float = 0.0,
    is_new_low: bool = False,
    promo_category: str = "",
    price_installments: float = None
) -> bool:
    """
    Envia uma notificação HTML formatada para o chat do Telegram configurado.
    Suporta alertas tradicionais de preço-alvo e alertas dinâmicos de promoção por faixas.
    Retorna True se enviado com sucesso, False caso contrário.
    """
    if not TELEGRAM_TOKEN or not TELEGRAM_CHAT_ID:
        print("\n[yellow]⚠️ TELEGRAM_TOKEN ou TELEGRAM_CHAT_ID ausentes no arquivo .env.[/yellow]")
        return False
        
    if "insira" in TELEGRAM_TOKEN or "insira" in TELEGRAM_CHAT_ID:
        print("\n[yellow]⚠️ Configure suas credenciais reais do Telegram no arquivo .env.[/yellow]")
        return False

    # Define a linha de preço suportando preço duplo se houver diferença relevante
    if price_installments and price_installments > current_price:
        price_line = f"💰 <b>Preço Atual</b>: <b>R$ {current_price:.2f} à vista</b> / R$ {price_installments:.2f} parcelado\n"
    else:
        price_line = f"💰 <b>Preço Atual</b>: <b>R$ {current_price:.2f}</b>\n"

    # Monta a mensagem formatada em HTML
    if is_promo:
        if promo_category == "PRECO_INSANO":
            message = (
                "🚨 <b>SIRENE DE PREÇO INSANO ATIVADA!</b> 🚨\n\n"
                f"O produto <b>{escape_html(product_name)}</b> despencou de preço! Possível bug ou queima de estoque!\n\n"
                f"🏢 <b>Loja</b>: {escape_html(store.upper())}\n"
                + price_line +
                f"📊 <b>Média Recente</b>: R$ {ref_price:.2f} (<b>-{drop_percentage:.1f}% de queda!</b> 😱📉)\n"
            )
        elif promo_category == "SUPER_DESCONTO":
            message = (
                "💥 <b>SUPER DESCONTO DETECTADO!</b> 💥\n\n"
                f"O produto <b>{escape_html(product_name)}</b> está com um preço excelente!\n\n"
                f"🏢 <b>Loja</b>: {escape_html(store.upper())}\n"
                + price_line +
                f"📊 <b>Média Recente</b>: R$ {ref_price:.2f} (<b>-{drop_percentage:.1f}% de economia!</b> 🔥📉)\n"
            )
        else: # OFERTA
            message = (
                "🏷️ <b>OFERTA INTERESSANTE!</b> 🏷️\n\n"
                f"O produto <b>{escape_html(product_name)}</b> está com desconto!\n\n"
                f"🏢 <b>Loja</b>: {escape_html(store.upper())}\n"
                + price_line +
                f"📊 <b>Média Recente</b>: R$ {ref_price:.2f} (<b>-{drop_percentage:.1f}% de desconto!</b> 📉)\n"
            )
            
        if is_new_low:
            message += "\n🏆 <b>Menor preço histórico registrado para este item!</b>\n"
            
        # Alerta se o preço alvo também foi superado durante a promoção
        if target_price > 0.0 and current_price <= target_price:
            diff = target_price - current_price
            if diff > 0:
                message += f"\n🎯 <b>Preço Alvo Superado!</b> (Alvo: R$ {target_price:.2f} | Economia extra de <b>R$ {diff:.2f}</b>!)\n"
            else:
                message += f"\n🎯 <b>Preço Alvo Atingido!</b> (Alvo: R$ {target_price:.2f})\n"
    else:
        diff = target_price - current_price
        message = (
            "🚨 <b>ALERTA DE PREÇO ALVO ATINGIDO!</b> 🚨\n\n"
            f"O produto <b>{escape_html(product_name)}</b> atingiu o valor desejado!\n\n"
            f"🏢 <b>Loja</b>: {escape_html(store.upper())}\n"
            + price_line +
            f"🎯 <b>Preço Alvo</b>: R$ {target_price:.2f}\n"
        )
        
        if diff > 0:
            message += f"📉 <b>Economia de</b>: <b>R$ {diff:.2f}</b>!\n"
        elif diff == 0:
            message += "🎯 <b>Valor Exato Alvo Atingido!</b>\n"
            
        if is_new_low:
            message += "\n🏆 <b>Menor preço histórico registrado para este item!</b>\n"
         
    message += f"\n🔗 <a href=\"{url}\">Clique aqui para comprar agora</a>"

    # Endpoint da API do Telegram
    api_url = f"https://api.telegram.org/bot{TELEGRAM_TOKEN}/sendMessage"
    
    # Payload
    payload = {
        "chat_id": TELEGRAM_CHAT_ID,
        "text": message,
        "parse_mode": "HTML",
        "disable_web_page_preview": False
    }
    
    try:
        data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(
            api_url, 
            data=data, 
            headers={"Content-Type": "application/json"}
        )
        
        with urllib.request.urlopen(req, timeout=10) as response:
            res_data = json.loads(response.read().decode("utf-8"))
            return res_data.get("ok", False)
            
    except Exception as e:
        print(f"\nErro ao enviar notificação do Telegram: {e}")
        return False
