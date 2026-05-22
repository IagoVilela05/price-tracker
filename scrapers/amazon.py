from scrapers.base_scraper import BaseScraper

class AmazonScraper(BaseScraper):
    def scrape(self) -> dict:
        soup = self.get_soup_with_playwright()
        
        # 1. Nome do produto
        name = None
        name_el = soup.select_one("#productTitle")
        if name_el:
            name = name_el.get_text().strip()
            
        if not name:
            name_meta = soup.find("meta", property="og:title")
            if name_meta:
                name = name_meta["content"].strip()
                
        # 2. Preço
        price_str = None
        
        # Seletores de preço conhecidos na Amazon Brasil
        price_selectors = [
            "#corePrice_feature_div .a-offscreen",
            "#corePriceDisplay_desktop_feature_div .a-offscreen",
            "#price_inside_buybox",
            ".a-price .a-offscreen",
            "#priceblock_ourprice",
            "#priceblock_dealprice"
        ]
        
        for selector in price_selectors:
            price_el = soup.select_one(selector)
            if price_el:
                val = price_el.get_text().strip()
                if val:
                    price_str = val
                    break
                    
        # Fallback para inteiros e decimais separados
        if not price_str:
            whole_el = soup.select_one(".a-price-whole")
            fraction_el = soup.select_one(".a-price-fraction")
            if whole_el:
                price_str = whole_el.get_text().strip()
                if fraction_el:
                    price_str += f",{fraction_el.get_text().strip()}"
                    
        # 3. Disponibilidade
        available = True
        
        # Verifica se o container de fora de estoque está visível
        out_of_stock_el = soup.select_one("#outOfStock")
        if out_of_stock_el and "indisponível" in out_of_stock_el.get_text().lower():
            available = False
            
        availability_meta = soup.find("meta", itemprop="availability")
        if availability_meta and "instock" not in availability_meta["content"].lower():
            available = False
            
        price = self.clean_price(price_str) if price_str else 0.0
        
        # Extração de preço parcelado
        price_installments = 0.0
        import re
        
        # 1. Tenta buscar em seletores específicos de melhor oferta de parcelamento
        best_offer_selectors = [
            "#best-offer-string-cc",
            ".best-offer-name",
            "[id^='best-offer-string-']"
        ]
        for sel in best_offer_selectors:
            el = soup.select_one(sel)
            if el:
                txt = el.get_text().replace("\xa0", " ").strip()
                if "R$" in txt:
                    # Encontra o valor total após "ou R$"
                    match = re.search(r"ou\s*R\$\s*([\d\.,]+)", txt)
                    if match:
                        val = self.clean_price(match.group(1))
                        if val > price:
                            price_installments = val
                            break
                    # Calcula o valor total a partir do parcelamento (ex: 10x de R$ 135,32)
                    match_calc = re.search(r"(\d+)\s*x\s*(?:de\s*)?R\$\s*([\d\.,]+)", txt)
                    if match_calc:
                        qty = int(match_calc.group(1))
                        val_unit = self.clean_price(match_calc.group(2))
                        calc_val = qty * val_unit
                        if calc_val > price:
                            price_installments = calc_val
                            break
                            
        # 2. Varredura geral no corpo para buscar padrões folha como "sem juros" ou "em até"
        if price_installments == 0.0:
            for el in soup.find_all(["span", "p", "b", "strong", "div"]):
                if self.is_recommendation(el):
                    continue
                txt = el.get_text().replace("\xa0", " ").strip()
                if len(txt) < 300 and ("sem juros" in txt.lower() or "no cartão" in txt.lower() or "a prazo" in txt.lower() or "parcelado" in txt.lower() or "em até" in txt.lower() or "ou R$" in txt) and "R$" in txt:
                    match = re.search(r"ou\s*R\$\s*([\d\.,]+)", txt)
                    if match:
                        val = self.clean_price(match.group(1))
                        if val > price:
                            price_installments = val
                            break
                    match_calc = re.search(r"(\d+)\s*x\s*(?:de\s*)?R\$\s*([\d\.,]+)", txt)
                    if match_calc:
                        qty = int(match_calc.group(1))
                        val_unit = self.clean_price(match_calc.group(2))
                        calc_val = qty * val_unit
                        if calc_val > price:
                            price_installments = calc_val
                            break
                            
        if price_installments <= 0.0 or price_installments < price:
            price_installments = price
            
        return {
            "name": name or "Produto Amazon",
            "price": price,
            "price_installments": price_installments,
            "available": available and price > 0
        }
