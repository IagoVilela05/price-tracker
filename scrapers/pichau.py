import json
from scrapers.base_scraper import BaseScraper

class PichauScraper(BaseScraper):
    def scrape(self) -> dict:
        soup = self.get_soup_with_playwright()
        
        name = None
        price = 0.0
        available = True
        
        # Método 1: JSON-LD (Robusto e padronizado para SEO/Shopping)
        json_ld_tags = soup.find_all("script", type="application/ld+json")
        for tag in json_ld_tags:
            if not tag.string:
                continue
            try:
                data = json.loads(tag.string)
                items = data if isinstance(data, list) else [data]
                
                for item in items:
                    # Pode ser um Product direto ou conter um Graph contendo Product
                    if isinstance(item, dict):
                        target_product = None
                        if item.get("@type") == "Product":
                            target_product = item
                        elif "@graph" in item:
                            for graph_item in item["@graph"]:
                                if graph_item.get("@type") == "Product":
                                    target_product = graph_item
                                    break
                                    
                        if target_product:
                            name = target_product.get("name")
                            offers = target_product.get("offers", {})
                            if isinstance(offers, list):
                                offers = offers[0] if offers else {}
                                
                            # Preço do JSON-LD
                            price_val = offers.get("price")
                            if price_val:
                                price = float(price_val)
                                
                            # Disponibilidade do JSON-LD
                            availability = offers.get("availability")
                            if availability:
                                if any(x in availability for x in ["OutOfStock", "SoldOut", "Unavailable"]):
                                    available = False
                            break
            except Exception:
                pass
                
        # Método 2: Tags Meta (Altamente resilientes na Pichau)
        if not name:
            name_meta = soup.find("meta", property="og:title") or soup.find("meta", attrs={"name": "twitter:title"})
            if name_meta:
                name = name_meta.get("content", "").strip()
                
        if price == 0.0:
            price_meta = (
                soup.find("meta", property="product:price:amount") or 
                soup.find("meta", property="og:price:amount") or
                soup.find("meta", attrs={"name": "twitter:price:amount"})
            )
            if price_meta:
                try:
                    price = float(price_meta.get("content", "0"))
                except ValueError:
                    pass

        # Método 3: Fallback via Seletores CSS
        if not name:
            h1_el = soup.select_one("h1")
            if h1_el:
                name = h1_el.get_text().strip()
                
        if price == 0.0:
            # Seletores comuns para o preço à vista ou parcelado em destaque na Pichau
            price_selectors = [
                "div[class*='priceSales']",
                ".price-sales",
                "span[class*='price-sales']",
                "[data-testid='price-value']",
                "div[class*='jXFpvt']",
                "div[class*='styled-components'] div.price",
                ".price-card .price"
            ]
            
            for selector in price_selectors:
                price_el = soup.select_one(selector)
                if price_el:
                    price_str = price_el.get_text().strip()
                    if price_str:
                        price = self.clean_price(price_str)
                        if price > 0.0:
                            break
                            
        # Se ainda assim o preço for 0, tenta achar qualquer texto com R$
        if price == 0.0:
            for el in soup.find_all(["span", "div", "p"], class_=True):
                if "price" in "".join(el.get("class", [])).lower() and "R$" in el.get_text():
                    price = self.clean_price(el.get_text())
                    if price > 0.0:
                        break

        # Verificação de estoque baseada em texto / classes na Pichau
        page_text = soup.get_text().lower()
        unavailable_indicators = [
            "produto indisponível", 
            "avise-me quando chegar", 
            "esgotado", 
            "sem estoque",
            "fora de estoque"
        ]
        
        if any(indicator in page_text for indicator in unavailable_indicators):
            available = False
            
        # Adicionalmente, se o botão de "comprar" não existir e "avise-me" existir
        buy_button = soup.select_one("button[class*='buy'], button[class*='comprar'], a[class*='comprar']")
        if not buy_button and "avise-me" in page_text:
            available = False

        # Preço parcelado na Pichau
        price_installments = 0.0
        inst_selectors = [
            "div[class*='priceRegular']",
            ".price-regular",
            "span[class*='price-regular']",
            "div[class*='price-regular']",
            "[data-testid='regular-price-value']",
            ".price-card .price-regular",
            "div[class*='regularPrice']"
        ]
        
        for selector in inst_selectors:
            inst_el = soup.select_one(selector)
            if inst_el:
                inst_str = inst_el.get_text().strip()
                if inst_str:
                    val = self.clean_price(inst_str)
                    if val > 0:
                        price_installments = val
                        break
                        
        # Se não encontrou por seletores, busca por texto contendo "no cartão" ou similar
        if price_installments <= 0.0:
            import re
            for el in soup.find_all(["span", "div", "p"]):
                if self.is_recommendation(el):
                    continue
                txt = el.get_text()
                if ("no cartão" in txt.lower() or "a prazo" in txt.lower() or "parcelado" in txt.lower() or "no pix" not in txt.lower()) and "R$" in txt:
                    match = re.search(r"R\$\s*[\d\.,\s]+", txt)
                    if match:
                        val = self.clean_price(match.group(0))
                        if val > price:
                            price_installments = val
                            break
                            
        if price_installments <= 0.0 or price_installments < price:
            price_installments = price

        return {
            "name": name or "Produto Pichau",
            "price": price,
            "price_installments": price_installments,
            "available": available and price > 0.0
        }
