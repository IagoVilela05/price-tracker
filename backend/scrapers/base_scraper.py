from abc import ABC, abstractmethod
import re
from bs4 import BeautifulSoup
from playwright.sync_api import sync_playwright
from config import PLAYWRIGHT_HEADLESS, PLAYWRIGHT_TIMEOUT, DEFAULT_USER_AGENT, DEFAULT_CEP, PLAYWRIGHT_PROXY

class BaseScraper(ABC):
    def __init__(self, url: str):
        self.url = url
        
    @abstractmethod
    def scrape(self) -> dict:
        """
        Executa a extração dos dados da página.
        Deve retornar um dicionário com:
        {
            "name": str (nome do produto),
            "price": float (preço atual à vista),
            "price_installments": float (preço atual parcelado),
            "available": bool (se está em estoque)
        }
        """
        pass

    def clean_price(self, price_str: str) -> float:
        """
        Sanitiza a string do preço, limpando caracteres monetários,
        separadores e convertendo para float.
        Ex: 'R$ 1.250,90' -> 1250.90
        """
        if not price_str:
            return 0.0
            
        # Remove R$, espaços e pontos de milhar
        cleaned = price_str.replace("R$", "").replace("\xa0", "").strip()
        
        # Se contiver vírgula e ponto, ex: 1,250.90 ou 1.250,90
        if "," in cleaned and "." in cleaned:
            # Posição da vírgula e do ponto para entender a formatação
            if cleaned.rfind(",") > cleaned.rfind("."):
                # Formato brasileiro: 1.250,90
                cleaned = cleaned.replace(".", "").replace(",", ".")
            else:
                # Formato americano com separador: 1,250.90
                cleaned = cleaned.replace(",", "")
        elif "," in cleaned:
            # Apenas vírgula: se for 2 decimais ex: 1250,90 -> 1250.90
            parts = cleaned.split(",")
            if len(parts[-1]) == 2:
                cleaned = cleaned.replace(",", ".")
            else:
                # Caso onde usam vírgula como milhar ex: 1,250 -> 1250.00
                cleaned = cleaned.replace(",", "")
                
        # Remove caracteres indesejados mantendo apenas dígitos, pontos e sinal de menos
        cleaned = re.sub(r"[^\d.-]", "", cleaned)
        
        try:
            return float(cleaned)
        except ValueError:
            return 0.0

    def get_soup_with_playwright(
        self, 
        setup_cep: bool = False, 
        cep_selector: str = None, 
        cep_input_selector: str = None, 
        cep_submit_selector: str = None
    ) -> BeautifulSoup:
        """
        Navega até a URL usando Playwright, opcionalmente preenche o CEP para regionalizar,
        e retorna o objeto BeautifulSoup com o HTML renderizado.
        """
        with sync_playwright() as p:
            # Desativa o sinalizador de automação para evitar bloqueio por robôs (Amazon/Mercado Livre)
            launch_kwargs = {
                "headless": PLAYWRIGHT_HEADLESS,
                "args": ["--disable-blink-features=AutomationControlled"]
            }
            if PLAYWRIGHT_PROXY:
                launch_kwargs["proxy"] = {"server": PLAYWRIGHT_PROXY}
                
            browser = p.chromium.launch(**launch_kwargs)
            context = browser.new_context(
                user_agent=DEFAULT_USER_AGENT,
                viewport={"width": 1280, "height": 720},
                extra_http_headers={
                    "accept-language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7"
                }
            )
            
            page = context.new_page()
            page.set_default_timeout(PLAYWRIGHT_TIMEOUT)
            
            # Navega até a URL
            page.goto(self.url, wait_until="domcontentloaded")
            
            # Detecção de tela de desafio JS (ex: Akamai/Anubis do Mercado Livre)
            # Se presente, aguarda a execução do desafio e o redirecionamento automático
            html_init = page.content()
            if "micro-landing-container" in html_init or "noscript-message" in html_init or "continue-button" in html_init or "snoopy-script" in html_init:
                page.wait_for_timeout(5000)
            
            # Preenchimento de CEP opcional
            if setup_cep and DEFAULT_CEP and cep_selector and cep_input_selector and cep_submit_selector:
                try:
                    # Aguarda o elemento de CEP
                    page.wait_for_selector(cep_selector, timeout=5000)
                    page.click(cep_selector)
                    
                    # Aguarda o input
                    page.wait_for_selector(cep_input_selector, timeout=5000)
                    page.fill(cep_input_selector, DEFAULT_CEP)
                    
                    # Envia
                    page.click(cep_submit_selector)
                    page.wait_for_load_state("networkidle", timeout=5000)
                except Exception as e:
                    # Continua mesmo se falhar a definição do CEP
                    pass
            
            html = page.content()
            browser.close()
            
            return BeautifulSoup(html, "lxml")

    def is_recommendation(self, el) -> bool:
        """
        Retorna True se o elemento pertencer a um bloco de recomendações,
        vitrines, carrosséis ou outros blocos que não sejam o produto principal.
        """
        curr = el
        while curr:
            classes = " ".join(curr.get("class", [])).lower() if curr.get("class") else ""
            elem_id = (curr.get("id") or "").lower()
            if any(x in classes or x in elem_id for x in [
                "carrossel", "carousel", "vitrine", "recomendacao", "relacionado", 
                "relacionados", "recomenda", "similar", "related", "prod-card", 
                "item-prod", "item_prod", "product-item", "products-grid", "prod-destaque",
                "slick-slide", "owl-item", "recommendation", "vitrine-prod", "product-card"
            ]):
                return True
            curr = curr.parent
        return False
