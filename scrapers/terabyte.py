import json
from scrapers.base_scraper import BaseScraper

class TerabyteScraper(BaseScraper):
    def scrape(self) -> dict:
        soup = self.get_soup_with_playwright()
        
        name = None
        price = 0.0
        available = True
        
        # Método 1: JSON-LD (Altamente recomendado e padronizado)
        json_ld_tags = soup.find_all("script", type="application/ld+json")
        for tag in json_ld_tags:
            if not tag.string:
                continue
            try:
                data = json.loads(tag.string)
                items = data if isinstance(data, list) else [data]
                
                for item in items:
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
                                
                            # Disponibilidade
                            availability = offers.get("availability")
                            if availability:
                                if any(x in availability for x in ["OutOfStock", "SoldOut", "Unavailable"]):
                                    available = False
                            break
            except Exception:
                pass
                
        # Método 2: Tags Meta
        if not name:
            name_meta = soup.find("meta", property="og:title") or soup.find("meta", attrs={"name": "twitter:title"})
            if name_meta:
                name = name_meta.get("content", "").strip()
                
        if price == 0.0:
            price_meta = (
                soup.find("meta", property="product:price:amount") or 
                soup.find("meta", property="og:price:amount")
            )
            if price_meta:
                try:
                    price = float(price_meta.get("content", "0"))
                except ValueError:
                    pass

        # Método 3: Seletores CSS Clássicos (Extremamente consistentes na Terabyte)
        if not name:
            h1_el = soup.select_one("h1.tit-prod") or soup.select_one("h1")
            if h1_el:
                name = h1_el.get_text().strip()
                
        if price == 0.0:
            # O ID #valoraVistaprd é o preço à vista principal na Terabyte há muitos anos
            price_selectors = [
                "#valoraVistaprd",
                "span[id='valoraVistaprd']",
                ".preco-vista",
                "#valParc",
                "p.prod-new-price",
                ".val-prod"
            ]
            
            for selector in price_selectors:
                price_el = soup.select_one(selector)
                if price_el:
                    price_str = price_el.get_text().strip()
                    if price_str:
                        price = self.clean_price(price_str)
                        if price > 0.0:
                            break

        # Verificação de estoque na Terabyte
        page_text = soup.get_text().lower()
        
        # Elementos comuns de indisponibilidade
        unavailable_selectors = [
            ".sem-estoque",
            "#btn-indisponivel",
            ".indisponivel",
            ".prod-esgotado",
            ".btn-avise"
        ]
        
        for selector in unavailable_selectors:
            if soup.select_one(selector):
                available = False
                break
                
        # Validação extra por textos chaves de falta de estoque
        unavailable_texts = [
            "produto indisponível", 
            "avise-me quando chegar", 
            "produto esgotado", 
            "sem estoque",
            "avise-me quando estiver disponível"
        ]
        
        if any(indicator in page_text for indicator in unavailable_texts):
            available = False
            
        # Adicionalmente, se o botão de comprar do ID classic não estiver presente e "avise" estiver na página
        buy_btn = soup.select_one("#btn-comprar")
        if not buy_btn and "avise-me" in page_text:
            available = False

        # Preço parcelado na Terabyte
        price_installments = 0.0
        inst_selectors = [
            ".val-parc",
            ".valParc",
            "#valParc",
            "span[id='valParc']",
            ".preco-prazo",
            ".prod-parc",
            "#valParcprd"
        ]
        
        for selector in inst_selectors:
            inst_el = soup.select_one(selector)
            if inst_el:
                inst_str = inst_el.get_text().strip()
                if inst_str:
                    # Isola apenas a parte com R$ e números para evitar '10x' etc.
                    import re
                    match = re.search(r"R\$\s*[\d\.,]+", inst_str)
                    val_str = match.group(0) if match else inst_str
                    val = self.clean_price(val_str)
                    if val > 0:
                        price_installments = val
                        break
                        
        # Se não encontrou por seletores, busca por texto contendo "no cartão" ou similar
        if price_installments <= 0.0:
            import re
            for el in soup.find_all(["span", "div", "p"]):
                if self.is_recommendation(el):
                    continue
                # Evita selecionar preços riscados / antigos
                if el.name == "del" or el.find_parent("del") or el.name == "s" or el.find_parent("s"):
                    continue
                classes = " ".join(el.get("class", [])).lower() if el.get("class") else ""
                if "strike" in classes or "old" in classes:
                    continue
                txt = el.get_text()
                if "de:" in txt.lower() and "por:" in txt.lower():
                    continue
                if ("no cartão" in txt.lower() or "a prazo" in txt.lower() or "sem juros" in txt.lower() or "parcelado" in txt.lower()) and "R$" in txt:
                    match = re.search(r"R\$\s*[\d\.,]+", txt)
                    if match:
                        val = self.clean_price(match.group(0))
                        if val > price:
                            price_installments = val
                            break
                            
        if price_installments <= 0.0 or price_installments < price:
            price_installments = price

        return {
            "name": name or "Produto Terabyte",
            "price": price,
            "price_installments": price_installments,
            "available": available and price > 0.0
        }
