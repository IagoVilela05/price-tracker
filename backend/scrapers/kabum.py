import json
import re
from scrapers.base_scraper import BaseScraper

class KabumScraper(BaseScraper):
    def scrape(self) -> dict:
        soup = self.get_soup_with_playwright()
        
        name = None
        price = 0.0
        available = True
        
        # Método 1: JSON-LD (Altamente recomendado e robusto)
        json_ld_tags = soup.find_all("script", type="application/ld+json")
        for tag in json_ld_tags:
            if not tag.string:
                continue
            try:
                data = json.loads(tag.string)
                # O JSON-LD pode ser um dicionário direto ou uma lista de dicionários
                items = data if isinstance(data, list) else [data]
                
                for item in items:
                    if item.get("@type") == "Product":
                        name = item.get("name")
                        offers = item.get("offers", {})
                        
                        # Extrai preço do JSON-LD
                        price_val = offers.get("price")
                        if price_val:
                            price = float(price_val)
                            
                        # Extrai disponibilidade do JSON-LD
                        availability = offers.get("availability")
                        if availability and "InStock" not in availability:
                            available = False
                        break
            except Exception:
                pass
                
        # Método 2: Fallback via Seletores CSS
        if not name:
            # Kabum costuma usar apenas um H1 para o título do produto
            h1_el = soup.select_one("h1")
            if h1_el:
                name = h1_el.get_text().strip()
            else:
                name_meta = soup.find("meta", property="og:title")
                if name_meta:
                    name = name_meta["content"]
                    
        if price == 0.0:
            price_str = None
            
            # Seletores conhecidos para preço à vista na Kabum
            price_selectors = [
                ".finalPrice",
                "[class*='finalPrice']",
                ".regularPrice",
                "[class*='regularPrice']",
                "h4.priceCard"
            ]
            
            for selector in price_selectors:
                price_el = soup.select_one(selector)
                if price_el:
                    price_str = price_el.get_text().strip()
                    break
                    
            if price_str:
                price = self.clean_price(price_str)
                
        # Preço parcelado/regular
        price_installments = 0.0
        
        # 1. Procurar via seletores CSS específicos
        inst_selectors = [
            ".regularPrice",
            "[class*='regularPrice']",
            ".oldPrice",
            "[class*='oldPrice']"
        ]
        for selector in inst_selectors:
            inst_el = soup.select_one(selector)
            if inst_el:
                inst_str = inst_el.get_text().strip()
                if inst_str:
                    val = self.clean_price(inst_str)
                    if val > price:
                        price_installments = val
                        break
                        
        # 2. Procurar via busca textual robusta (evitando blocos de recomendações)
        if price_installments == 0.0:
            for el in soup.find_all(["b", "span", "div", "p"]):
                if self.is_recommendation(el):
                    continue
                # Evita tags de preço antigo / riscado
                if el.name in ["del", "s"] or el.find_parent(["del", "s"]):
                    continue
                classes = " ".join(el.get("class", [])).lower() if el.get("class") else ""
                if "strike" in classes or "old" in classes or "strikethrough" in classes:
                    continue
                    
                txt = el.get_text().strip()
                parent_text = el.parent.get_text() if el.parent else ""
                full_text = txt + " | " + parent_text
                
                if ("em até" in full_text.lower() or "sem juros" in full_text.lower() or "no cartão" in full_text.lower() or "a prazo" in full_text.lower()) and "R$" in txt:
                    match = re.search(r"R\$\s*[\d\.,\s]+", txt)
                    if match:
                        val = self.clean_price(match.group(0))
                        # Queremos o menor valor parcelado válido que seja maior que o preço Pix
                        if val > price and (price_installments == 0.0 or val < price_installments):
                            price_installments = val
                            
        if price_installments <= 0.0 or price_installments < price:
            price_installments = price

        return {
            "name": name or "Produto Kabum",
            "price": price,
            "price_installments": price_installments,
            "available": available and price > 0
        }
