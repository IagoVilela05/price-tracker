from scrapers.base_scraper import BaseScraper

class MercadoLivreScraper(BaseScraper):
    def scrape(self) -> dict:
        soup = self.get_soup_with_playwright()
        
        # 1. Extração do Nome
        name = None
        name_meta = soup.find("meta", property="og:title")
        if name_meta:
            name = name_meta.get("content", "").strip()
            
        if not name:
            name_el = soup.select_one(".ui-pdp-title") or soup.select_one("h1")
            if name_el:
                name = name_el.get_text().strip()

        # 2. Extração do Preço via Meta Tags (Super robusto contra mudanças de layout)
        price_str = None
        price_meta = (
            soup.find("meta", property="product:price:amount") or 
            soup.find("meta", itemprop="price") or
            soup.find("meta", property="og:price:amount")
        )
        if price_meta:
            price_str = price_meta.get("content", "").strip()
            
        price = self.clean_price(price_str) if price_str else 0.0

        # 3. Extração via JSON-LD (Altamente estruturado e comum em páginas de catálogo e normais)
        if not name or price == 0.0:
            import json
            json_ld_tags = soup.find_all("script", type="application/ld+json")
            for tag in json_ld_tags:
                if not tag.string:
                    continue
                try:
                    data = json.loads(tag.string)
                    items = data if isinstance(data, list) else [data]
                    for item in items:
                        if isinstance(item, dict) and item.get("@type") == "Product":
                            if not name:
                                name = item.get("name")
                            if price == 0.0:
                                offers = item.get("offers", {})
                                if isinstance(offers, list):
                                    offers = offers[0] if offers else {}
                                price_val = offers.get("price")
                                if price_val:
                                    price = float(price_val)
                                    break
                except Exception:
                    pass

        # 4. Fallback via Seletores CSS clássicos
        if price == 0.0:
            # Procura o preço no container principal do Mercado Livre
            price_el = soup.select_one(".ui-pdp-price__part .andes-money-amount__fraction")
            if price_el:
                p_str = price_el.get_text().strip()
                # Adiciona centavos se existirem
                cents_el = soup.select_one(".ui-pdp-price__part .andes-money-amount__cents")
                if cents_el:
                    p_str += f",{cents_el.get_text().strip()}"
                val = self.clean_price(p_str)
                if val > 0:
                    price = val
                    
        # 5. Verificação de disponibilidade
        available = True
        stock_el = soup.select_one(".ui-pdp-stock-info")
        if stock_el and "sem estoque" in stock_el.get_text().lower():
            available = False
            
        availability_meta = soup.find("meta", itemprop="availability")
        if availability_meta and "instock" not in availability_meta.get("content", "").lower():
            available = False

        return {
            "name": name or "Produto Mercado Livre",
            "price": price,
            "price_installments": price,
            "available": available and price > 0.0
        }
