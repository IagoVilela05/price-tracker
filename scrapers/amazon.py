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
        
        return {
            "name": name or "Produto Amazon",
            "price": price,
            "price_installments": price,
            "available": available and price > 0
        }
