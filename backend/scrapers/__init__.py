from typing import Type
from scrapers.base_scraper import BaseScraper
from scrapers.amazon import AmazonScraper
from scrapers.mercadolivre import MercadoLivreScraper
from scrapers.kabum import KabumScraper
from scrapers.pichau import PichauScraper
from scrapers.terabyte import TerabyteScraper

def get_scraper_class_for_url(url: str) -> Type[BaseScraper]:
    """
    Retorna a classe do scraper correspondente com base no domínio da URL.
    Lança ValueError se a loja não for suportada.
    """
    url_lower = url.lower()
    
    if "amazon.com" in url_lower:
        return AmazonScraper
    elif "mercadolivre.com" in url_lower or "mercadolivre.com.br" in url_lower:
        return MercadoLivreScraper
    elif "kabum.com" in url_lower or "kabum.com.br" in url_lower:
        return KabumScraper
    elif "pichau.com" in url_lower or "pichau.com.br" in url_lower:
        return PichauScraper
    elif "terabyteshop.com" in url_lower or "terabyteshop.com.br" in url_lower:
        return TerabyteScraper
    else:
        raise ValueError("Desculpe, o domínio fornecido não é suportado no momento.")
