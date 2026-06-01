import os
import sys
from typing import List
# pyrefly: ignore [missing-import]
from fastapi import FastAPI, HTTPException, BackgroundTasks, status
# pyrefly: ignore [missing-import]
from fastapi.middleware.cors import CORSMiddleware
# pyrefly: ignore [missing-import]
from fastapi.staticfiles import StaticFiles
# pyrefly: ignore [missing-import]
from pydantic import BaseModel

# Adiciona o diretório do projeto ao PATH para importação de módulos locais
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database.db_manager import (
    init_db, add_product, get_all_products, get_product,
    delete_product, add_price_reading, get_last_price, get_price_history,
    get_price_stats, update_product_name, get_last_price_installments,
    update_product_collection
)
from scrapers import get_scraper_class_for_url
from main import run_price_check

# Inicializa o banco de dados antes da API expor rotas
init_db()

app = FastAPI(
    title="Price Tracker API",
    description="API para gerenciar o monitoramento de hardware da Pichau, Terabyte, Kabum, Amazon e Mercado Livre",
    version="1.0.0"
)

# Habilita o CORS para integração com o front-end React na porta local 5173
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Permite requisições de qualquer origem (ideal para desenvolvimento local)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Estado de varredura global na memória
IS_SCANNING = False

class ProductCreate(BaseModel):
    url: str
    target_price: float
    collection: str | None = None

class ProductNameUpdate(BaseModel):
    name: str

class ProductCollectionUpdate(BaseModel):
    collection: str | None = None

class ProductResponse(BaseModel):
    id: int
    name: str
    store: str
    url: str
    target_price: float
    created_at: str
    collection: str | None = None
    last_price: float = None
    last_price_installments: float = None
    stats: dict = None

def execute_background_price_check():
    global IS_SCANNING
    try:
        run_price_check(non_interactive=True)
    finally:
        IS_SCANNING = False

@app.get("/api/products", response_model=List[ProductResponse])
def list_products():
    """Retorna todos os produtos com seu preço atualizado e estatísticas de histórico."""
    products = get_all_products()
    results = []
    
    for prod in products:
        prod_id = prod["id"]
        last_price = get_last_price(prod_id)
        last_price_installments = get_last_price_installments(prod_id)
        stats = get_price_stats(prod_id)
        
        # Converte o formato do Row/Dicionário do SQLite
        results.append(ProductResponse(
            id=prod_id,
            name=prod["name"],
            store=prod["store"],
            url=prod["url"],
            target_price=prod["target_price"],
            created_at=prod["created_at"],
            collection=prod.get("collection"),
            last_price=last_price,
            last_price_installments=last_price_installments,
            stats=stats
        ))
        
    return results

@app.get("/api/products/check-status")
def check_immediate_price_sync_status():
    """Retorna o estado atual da varredura na memória."""
    global IS_SCANNING
    return {"is_scanning": IS_SCANNING}

# DEPRECATED/INACTIVE: Esta rota GET individual de produto não é consumida pelo React SPA 
# nem pelas operações do Bot do Telegram, sendo mantida inativa e documentada para 
# otimização de segurança e superfície de endpoints.
# @app.get("/api/products/{product_id}", response_model=ProductResponse)
# def get_single_product(product_id: int):
#     """Retorna um produto específico pelo ID."""
#     prod = get_product(product_id)
#     if not prod:
#         raise HTTPException(status_code=404, detail="Produto não encontrado.")
#         
#     last_price = get_last_price(product_id)
#     last_price_installments = get_last_price_installments(product_id)
#     stats = get_price_stats(product_id)
#     
#     return ProductResponse(
#         id=prod["id"],
#         name=prod["name"],
#         store=prod["store"],
#         url=prod["url"],
#         target_price=prod["target_price"],
#         created_at=prod["created_at"],
#         collection=prod.get("collection"),
#         last_price=last_price,
#         last_price_installments=last_price_installments,
#         stats=stats
#     )

@app.post("/api/products", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
def create_product(payload: ProductCreate):
    """
    Cadastra um novo produto.
    Valida o link, extrai os dados atuais via Playwright e insere no banco.
    """
    url_str = str(payload.url)
    
    try:
        # 1. Valida se a URL é suportada pelas classes de scrapers
        scraper_cls = get_scraper_class_for_url(url_str)
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
        
    try:
        # 2. Executa a extração em tempo real para obter nome, disponibilidade e primeiro preço
        scraper = scraper_cls(url_str)
        res = scraper.scrape()
        
        if not res or not res.get("name") or res.get("price") == 0.0:
            raise HTTPException(
                status_code=400, 
                detail="Não foi possível obter dados para este link. Verifique se o produto está indisponível ou se a URL está correta."
            )
            
        # 3. Insere o produto no SQLite
        prod_id = add_product(
            name=res["name"],
            store=scraper_cls.__name__.replace("Scraper", ""),
            url=url_str,
            target_price=payload.target_price,
            collection=payload.collection
        )
        
        # 4. Grava a leitura inicial do preço
        price_inst = res.get("price_installments", res["price"])
        add_price_reading(prod_id, res["price"], price_inst)
        
        # Retorna o produto recém-cadastrado
        return ProductResponse(
            id=prod_id,
            name=res["name"],
            store=scraper_cls.__name__.replace("Scraper", "").lower(),
            url=url_str,
            target_price=payload.target_price,
            created_at=str(os.environ.get("CURRENT_TIME", "Agora")),
            collection=payload.collection,
            last_price=res["price"],
            last_price_installments=price_inst,
            stats={"avg_price": res["price"], "min_price": res["price"], "count": 1}
        )
        
    except HTTPException as http_ex:
        raise http_ex
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Ocorreu um erro interno de conexão ou extração: {str(e)}"
        )

@app.delete("/api/products/{product_id}")
def delete_monitored_product(product_id: int):
    """Remove um produto e seu histórico de preços."""
    prod = get_product(product_id)
    if not prod:
        raise HTTPException(status_code=404, detail="Produto não encontrado.")
    delete_product(product_id)
    return {"message": f"Produto '{prod['name']}' removido com sucesso."}

@app.patch("/api/products/{product_id}/name")
def update_single_product_name(product_id: int, payload: ProductNameUpdate):
    """Atualiza o nome/apelido personalizado de um produto."""
    prod = get_product(product_id)
    if not prod:
        raise HTTPException(status_code=404, detail="Produto não encontrado.")
    
    new_name = payload.name.strip()
    if not new_name:
        raise HTTPException(status_code=400, detail="O nome não pode estar vazio.")
        
    update_product_name(product_id, new_name)
    return {"message": "Nome do produto atualizado com sucesso.", "name": new_name}

@app.patch("/api/products/{product_id}/collection")
def update_single_product_collection(product_id: int, payload: ProductCollectionUpdate):
    """Atualiza a coleção associada a um produto."""
    prod = get_product(product_id)
    if not prod:
        raise HTTPException(status_code=404, detail="Produto não encontrado.")
    
    new_collection = payload.collection.strip() if payload.collection else None
    if new_collection == "":
        new_collection = None
        
    update_product_collection(product_id, new_collection)
    return {"message": "Coleção do produto atualizada com sucesso.", "collection": new_collection}

@app.get("/api/products/{product_id}/history")
def get_product_price_chart_history(product_id: int):
    """
    Retorna o histórico cronológico de preços (do mais antigo para o mais recente).
    Formatado especialmente para gráficos de linhas (Recharts).
    """
    prod = get_product(product_id)
    if not prod:
        raise HTTPException(status_code=404, detail="Produto não encontrado.")
        
    history = get_price_history(product_id, limit=100)
    
    # Inverte para ordem cronológica crescente (antigo -> recente)
    history.reverse()
    
    # Formata campos de data simplificados para o eixo X do gráfico
    formatted_history = []
    for h in history:
        #checked_at: 2026-05-21 13:15:00
        raw_date = h["checked_at"]
        # Extrai apenas a hora ou o dia/mês
        short_date = raw_date
        if len(raw_date) >= 16:
            # Pega ex: "21/05 13:15"
            try:
                date_part = raw_date.split(" ")[0].split("-")
                time_part = raw_date.split(" ")[1][:5]
                short_date = f"{date_part[2]}/{date_part[1]} {time_part}"
            except Exception:
                pass
                
        formatted_history.append({
            "checked_at": h["checked_at"],
            "formatted_date": short_date,
            "price": h["price"],
            "price_installments": h.get("price_installments", h["price"])
        })
        
    return {
        "product_name": prod["name"],
        "target_price": prod["target_price"],
        "history": formatted_history
    }

@app.post("/api/products/check")
def trigger_immediate_price_sync(background_tasks: BackgroundTasks):
    """
    Aciona a atualização imediata dos preços de todos os produtos de forma assíncrona
    usando BackgroundTasks do FastAPI para evitar travamento da requisição HTTP.
    """
    global IS_SCANNING
    
    if IS_SCANNING:
        return {"status": "scanning", "message": "A varredura de preços já está em andamento."}
        
    IS_SCANNING = True
    background_tasks.add_task(execute_background_price_check)
    return {"status": "started", "message": "Varredura em segundo plano iniciada com sucesso."}


@app.get("/api/stats")
def get_dashboard_kpi_stats():
    """Retorna métricas gerais consolidadas para os cards do dashboard front-end."""
    products = get_all_products()
    total = len(products)
    below_target = 0
    max_discount_pct = 0.0
    
    for prod in products:
        prod_id = prod["id"]
        last_price = get_last_price(prod_id)
        target = prod["target_price"]
        stats = get_price_stats(prod_id)
        
        if last_price and last_price <= target:
            below_target += 1
            
        if stats and stats["avg_price"] > 0.0 and last_price:
            if last_price < stats["avg_price"]:
                diff_pct = ((stats["avg_price"] - last_price) / stats["avg_price"]) * 100
                if diff_pct > max_discount_pct:
                    max_discount_pct = diff_pct
                    
    return {
        "total_products": total,
        "below_target": below_target,
        "max_discount_pct": round(max_discount_pct, 1)
    }

# Monta a pasta de arquivos estáticos para servir o front-end compilado do React (SPA)
dist_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "frontend/dist")
if not os.path.exists(dist_dir):
    os.makedirs(dist_dir, exist_ok=True)
    with open(os.path.join(dist_dir, "index.html"), "w", encoding="utf-8") as f:
        f.write("<h1>Build do React pendente. Por favor, execute 'npm run build' na pasta frontend.</h1>")

app.mount("/", StaticFiles(directory=dist_dir, html=True), name="static")


