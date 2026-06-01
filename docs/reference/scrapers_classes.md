# Referência Técnica: Classes de Extração (Scrapers)

Esta referência técnica detalha formalmente a estrutura das classes de extração e os seletores de elementos HTML utilizados para navegar e ler os preços e disponibilidades de hardware das lojas integradas.

---

## 1. Classe Abstrata Base: `BaseScraper`
Caminho: [backend/scrapers/base_scraper.py](file:///home/iago/Documentos/Pessoal/price-tracker/backend/scrapers/base_scraper.py).

Todas as classes de raspagem estendem `BaseScraper` e devem implementar obrigatoriamente o método abstrato `scrape`.

### Assinaturas de Métodos Comuns

#### `__init__(self, url: str)`
* **Parâmetros:** `url` (string correspondente à página do produto).
* **Ação:** Instancia o scraper definindo a URL alvo em `self.url`.

#### `clean_price(self, price_str: str) -> float`
* **Parâmetros:** `price_str` (string de preço bruta com símbolos monetários).
* **Retorno:** Valor numérico float limpo e formatado (ex: `"R$ 1.500,90"` -> `1500.90`).
* **Tratamento:** Resolve dinamicamente separadores de milhar e centavos no padrão nacional e internacional.

#### `get_soup_with_playwright(self) -> BeautifulSoup`
* **Retorno:** Objeto `BeautifulSoup` (LXML) contendo o HTML renderizado após execução de scripts JS na página.
* **Táticas Stealth:** Desativa `--disable-blink-features=AutomationControlled` e define cabeçalhos HTTP extra-suaves para evitar detecção bot.

---

## 2. Classes de Scraping por Loja

### `AmazonScraper` (Amazon Brasil)
* **Classe:** `AmazonScraper` estende `BaseScraper`.
* **Seletores de Preço Pix:** `#corePrice_feature_div .a-offscreen`, `#corePriceDisplay_desktop_feature_div .a-offscreen`, `.a-price .a-offscreen`.
* **Seletores de Preço Parcelado:** `#best-offer-string-cc`, `.best-offer-name`, `[id^='best-offer-string-']`.
* **Filtros de Indisponibilidade:** Div `#outOfStock` e meta tag `availability`.

### `MercadoLivreScraper` (Mercado Livre)
* **Classe:** `MercadoLivreScraper` estende `BaseScraper`.
* **Mapeamento de Metas (JSON-LD):** Prioriza a leitura de tags `product:price:amount` e `application/ld+json` de produtos do catálogo.
* **Seletores de Preço Pix:** `.ui-pdp-price__part .andes-money-amount__fraction` + `.andes-money-amount__cents`.
* **Seletores de Preço Parcelado:** Análise regex em elementos secundários de `.ui-pdp-price` buscando chaves "sem juros" e parcelas "x".

### `KabumScraper` (KaBuM!)
* **Classe:** `KabumScraper` estende `BaseScraper`.
* **Estratégia Principal:** Leitura e decodificação do bloco `application/ld+json` (JSON-LD) para extração limpa de nome, preço Pix e estoque em stock.
* **Seletores de Preço regular (Parcelado):** `.regularPrice`, `[class*='regularPrice']`, `.oldPrice`.

### `PichauScraper` (Pichau)
* **Classe:** `PichauScraper` estende `BaseScraper`.
* **Seletores de Preço Pix:** Elementos com classes contendo `price_vista`, meta tag `product:price:amount`, `div[class*='priceSales']`.
* **Seletores de Preço Parcelado:** Elementos com classes contendo `price_total`, `div[class*='priceRegular']`.

### `TerabyteScraper` (TerabyteShop)
* **Classe:** `TerabyteScraper` estende `BaseScraper`.
* **Seletores de Preço Pix:** `#valoraVistaprd` (Preço à vista Pix), `p.prod-new-price`.
* **Seletores de Preço Parcelado:** `.val-parc`, `#valParcprd`, `.preco-prazo`.
