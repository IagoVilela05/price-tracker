import re
import json
from scrapers.base_scraper import BaseScraper

class MercadoLivreScraper(BaseScraper):
    def scrape(self) -> dict:
        is_already_translated = "translate.google.com" in self.url
        soup = self.get_soup_with_playwright()
        res = self._extract_from_soup(soup)
        
        # Detecção de bloqueio/redirecionamento para login
        is_blocked = (
            not is_already_translated and (
                res["price"] == 0.0 or 
                res["name"] == "Produto Mercado Livre" or 
                (soup.title and "Mercado Libre" in soup.title.string) or
                "Para continuar, acesse" in (soup.body.get_text() if soup.body else "")
            )
        )
        
        if is_blocked:
            translate_url = f"https://translate.google.com/translate?sl=en&tl=pt&u={self.url}"
            orig_url = self.url
            self.url = translate_url
            try:
                soup_trans = self.get_soup_with_playwright()
                res_trans = self._extract_from_soup(soup_trans)
                if res_trans["price"] > 0.0:
                    res = res_trans
            except Exception:
                pass
            finally:
                self.url = orig_url
        return res

    def _extract_from_soup(self, soup) -> dict:
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

        # Extração de preço parcelado
        price_installments = 0.0
        
        # 1. Procurar no container de preço principal do Mercado Livre
        main_price_selectors = [
            "#price", 
            ".ui-pdp-price", 
            ".ui-pdp-price__main-container", 
            ".ui-pdp-price__second-line"
        ]
        for sel in main_price_selectors:
            container = soup.select_one(sel)
            if container:
                for el in container.find_all(["span", "p", "div"]):
                    raw_txt = el.get_text().replace("\xa0", " ").strip()
                    # Normaliza múltiplos espaços e quebras de linha
                    txt = " ".join(raw_txt.split())
                    # Junta dígitos separados por vírgula ou ponto (ex: "77 , 26" -> "77,26")
                    txt = re.sub(r"(\d+)\s*([.,])\s*(\d+)", r"\1\2\3", txt)
                    
                    if len(txt) < 300 and ("sem juros" in txt.lower() or "em até" in txt.lower() or "x" in txt.lower()) and "R$" in txt:
                        match_total = re.search(r"ou\s*R\$\s*([\d\.,]+)", txt)
                        if match_total:
                            val = self.clean_price(match_total.group(1))
                            if val > price and (price_installments == 0.0 or val > price_installments):
                                price_installments = val
                        # Usa lookbehind negativo (?<![\d\.,]) para impedir que dígitos de preços anteriores colados sem espaço 
                        # sejam incorporados como a quantidade de parcelas (ex: R$764,1010x -> evita extrair 010x ou 10x bugado)
                        match_calc = re.search(r"(?<![\d\.,])(\d+)\s*x\s*(?:de\s*)?R\$\s*([\d\.,]+)", txt)
                        if match_calc:
                            qty = int(match_calc.group(1))
                            if qty <= 24: # Limite seguro para evitar lixo de concatenação
                                val_unit = self.clean_price(match_calc.group(2))
                                calc_val = qty * val_unit
                                if calc_val > price and (price_installments == 0.0 or calc_val > price_installments):
                                    price_installments = calc_val
                if price_installments > 0.0:
                    break
                    
        # 2. Se não encontrado, fazer busca textual geral excluindo outros vendedores e recomendações
        if price_installments == 0.0:
            for el in soup.find_all(["span", "p", "b", "strong", "div"]):
                # Evita recomendações, carrosséis, patrocinados e outros vendedores
                if self.is_recommendation(el):
                    continue
                # Verifica classes de outros vendedores
                parent = el
                is_other_seller = False
                while parent:
                    parent_classes = " ".join(parent.get("class", [])).lower() if parent.get("class") else ""
                    if any(x in parent_classes for x in ["other-sellers", "sellers", "vendedores", "sponsored", "patrocinados"]):
                        is_other_seller = True
                        break
                    parent = parent.parent
                if is_other_seller:
                    continue
                    
                raw_txt = el.get_text().replace("\xa0", " ").strip()
                # Normaliza múltiplos espaços e quebras de linha
                txt = " ".join(raw_txt.split())
                # Junta dígitos separados por vírgula ou ponto (ex: "77 , 26" -> "77,26")
                txt = re.sub(r"(\d+)\s*([.,])\s*(\d+)", r"\1\2\3", txt)
                
                if len(txt) < 300 and ("sem juros" in txt.lower() or "no cartão" in txt.lower() or "a prazo" in txt.lower() or "parcelado" in txt.lower() or "em até" in txt.lower() or "ou R$" in txt) and "R$" in txt:
                    match_total = re.search(r"ou\s*R\$\s*([\d\.,]+)", txt)
                    if match_total:
                        val = self.clean_price(match_total.group(1))
                        if val > price and (price_installments == 0.0 or val > price_installments):
                            price_installments = val
                    match_calc = re.search(r"(?<![\d\.,])(\d+)\s*x\s*(?:de\s*)?R\$\s*([\d\.,]+)", txt)
                    if match_calc:
                        qty = int(match_calc.group(1))
                        if qty <= 24:
                            val_unit = self.clean_price(match_calc.group(2))
                            calc_val = qty * val_unit
                            if calc_val > price and (price_installments == 0.0 or calc_val > price_installments):
                                price_installments = calc_val
                            
        if price_installments <= 0.0 or price_installments < price:
            price_installments = price
            
        return {
            "name": name or "Produto Mercado Livre",
            "price": price,
            "price_installments": price_installments,
            "available": available and price > 0.0
        }
