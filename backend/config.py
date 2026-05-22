import os
# pyrefly: ignore [missing-import]
from dotenv import load_dotenv

# Carrega variáveis do arquivo .env
load_dotenv()

# Caminho do banco de dados SQLite
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATABASE_PATH = os.path.join(BASE_DIR, "price_tracker.db")

# Configurações globais de Request/Scraping
DEFAULT_USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
)

# Configurações regionais (CEP padrão para cálculo de preço regional/frete se necessário)
# O CEP pode ser alterado pelo usuário no painel/CLI
DEFAULT_CEP = "35900738"  

# Configurações do Playwright
PLAYWRIGHT_HEADLESS = True
PLAYWRIGHT_TIMEOUT = 30000  # 30 segundos

# Configurações do Telegram
TELEGRAM_TOKEN = os.getenv("TELEGRAM_TOKEN")
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID")

# Gatilhos de queda percentual para detecção de promoções
PROMO_THRESHOLD_INTERESTING = float(os.getenv("PROMO_THRESHOLD_INTERESTING", 10.0))
PROMO_THRESHOLD_SUPER = float(os.getenv("PROMO_THRESHOLD_SUPER", 20.0))
PROMO_THRESHOLD_INSANE = float(os.getenv("PROMO_THRESHOLD_INSANE", 35.0))
