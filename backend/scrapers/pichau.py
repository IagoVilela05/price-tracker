import json
import re
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
                
        # Preço à vista (Pix)
        pix_price = 0.0
        
        # 1. Procurar elementos com classe contendo "price_vista"
        for el in soup.find_all(class_=re.compile(r"price_vista")):
            txt = el.get_text().strip()
            if "R$" in txt:
                val = self.clean_price(txt)
                if val > 0:
                    pix_price = val
                    break
                    
        # 2. Fallback para tag meta com name="product:price:amount"
        if pix_price == 0.0:
            meta_pix = soup.find("meta", attrs={"name": "product:price:amount"})
            if meta_pix:
                val = self.clean_price(meta_pix.get("content"))
                if val > 0:
                    pix_price = val
                    
        # 3. Fallback para outras tags meta de preço
        if pix_price == 0.0:
            price_meta = (
                soup.find("meta", property="product:price:amount") or 
                soup.find("meta", property="og:price:amount") or
                soup.find("meta", attrs={"name": "twitter:price:amount"})
            )
            if price_meta:
                val = self.clean_price(price_meta.get("content"))
                if val > 0:
                    pix_price = val
                    
        # 4. Fallback via seletores clássicos
        if pix_price == 0.0:
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
                    val = self.clean_price(price_el.get_text())
                    if val > 0:
                        pix_price = val
                        break
                        
        # 5. Se ainda assim for 0, tenta achar qualquer texto com R$ em classes de preço
        if pix_price == 0.0:
            for el in soup.find_all(["span", "div", "p"], class_=True):
                if "price" in "".join(el.get("class", [])).lower() and "R$" in el.get_text():
                    val = self.clean_price(el.get_text())
                    if val > 0:
                        pix_price = val
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
        installment_price = 0.0
        
        # 1. Procurar elementos com classe contendo "price_total"
        for el in soup.find_all(class_=re.compile(r"price_total")):
            txt = el.get_text().strip()
            if "R$" in txt:
                val = self.clean_price(txt)
                if val > 0:
                    installment_price = val
                    break
                    
        # 2. Fallback para JSON-LD (que na Pichau costuma ter o valor parcelado/regular)
        if installment_price == 0.0:
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
                                offers = target_product.get("offers", {})
                                if isinstance(offers, list):
                                    offers = offers[0] if offers else {}
                                price_val = offers.get("price")
                                if price_val:
                                    val = float(price_val)
                                    if val > pix_price:
                                        installment_price = val
                                        break
                except Exception:
                    pass

        # 3. Fallback para seletores conhecidos
        if installment_price == 0.0:
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
                    val = self.clean_price(inst_el.get_text())
                    if val > pix_price:
                        installment_price = val
                        break
                        
        # 4. Fallback via busca textual cuidadosa
        if installment_price == 0.0:
            for el in soup.find_all(["span", "div", "p"]):
                if self.is_recommendation(el):
                    continue
                # Evita tags de preço antigo / riscado
                if el.name in ["del", "s"] or el.find_parent(["del", "s"]):
                    continue
                classes = " ".join(el.get("class", [])).lower() if el.get("class") else ""
                if "strike" in classes or "old" in classes or "strikethrough" in classes:
                    continue
                txt = el.get_text()
                if ("no cartão" in txt.lower() or "a prazo" in txt.lower() or "sem juros" in txt.lower() or "parcelado" in txt.lower()) and "R$" in txt:
                    # Tenta capturar o R$ contido
                    match = re.search(r"R\$\s*[\d\.,\s]+", txt)
                    if match:
                        val = self.clean_price(match.group(0))
                        if val > pix_price:
                            installment_price = val
                            break
                            
        # Se não encontramos nada ou encontramos um valor menor que o pix (o que é incorreto)
        if installment_price <= 0.0 or installment_price < pix_price:
            installment_price = pix_price

        return {
            "name": name or "Produto Pichau",
            "price": pix_price,
            "price_installments": installment_price,
            "available": available and pix_price > 0.0
        }
