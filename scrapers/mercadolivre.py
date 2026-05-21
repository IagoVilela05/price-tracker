from scrapers.base_scraper import BaseScraper

class MercadoLivreScraper(BaseScraper):
    def scrape(self) -> dict:
        soup = self.get_soup_with_playwright()
        
        # Método 1: Meta Tags (Super robusto contra mudanças de layout)
        name_meta = soup.find("meta", property="og:title")
        price_meta = soup.find("meta", property="product:price:amount") or soup.find("meta", itemprop="price")
        
        name = name_meta["content"] if name_meta else None
        price_str = price_meta["content"] if price_meta else None
        
        # Método 2: Seletores CSS clássicos (fallback)
        if not name:
            name_el = soup.select_one(".ui-pdp-title")
            if name_el:
                name = name_el.get_text().strip()
                
        if not price_str:
            # Procura o preço no container principal do Mercado Livre
            price_el = soup.select_one(".ui-pdp-price__part .andes-money-amount__fraction")
            if price_el:
                price_str = price_el.get_text().strip()
                # Adiciona centavos se existirem
                cents_el = soup.select_one(".ui-pdp-price__part .andes-money-amount__cents")
                if cents_el:
                    price_str += f",{cents_el.get_text().strip()}"
        
        # Verificação de disponibilidade
        available = True
        stock_el = soup.select_one(".ui-pdp-stock-info")
        if stock_el and "sem estoque" in stock_el.get_text().lower():
            available = False
            
        availability_meta = soup.find("meta", itemprop="availability")
        if availability_meta and "instock" not in availability_meta["content"].lower():
            available = False

        price = self.clean_price(price_str) if price_str else 0.0
        
        return {
            "name": name or "Produto Mercado Livre",
            "price": price,
            "price_installments": price,
            "available": available and price > 0
        }
