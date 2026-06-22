import sqlite3
from datetime import datetime
from config import DATABASE_PATH

def get_connection():
    """Retorna uma conexão ativa com o banco SQLite."""
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row  # Permite acessar colunas por nome
    return conn

def init_db():
    """Inicializa o banco de dados e cria as tabelas necessárias se não existirem."""
    with get_connection() as conn:
        cursor = conn.cursor()
        
        # Tabela de produtos monitorados
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            store TEXT NOT NULL,
            url TEXT UNIQUE NOT NULL,
            target_price REAL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """)
        
        # Tabela de histórico de preços
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS price_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            product_id INTEGER NOT NULL,
            price REAL NOT NULL,
            checked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(product_id) REFERENCES products(id) ON DELETE CASCADE
        );
        """)
        
        # Criação de índices para otimização
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_price_history_product_id ON price_history(product_id);")
        
        conn.commit()
    
    # Roda a migração de nomes limpos para registros existentes
    migrate_clean_names()
    
    # Roda a migração para adicionar preço parcelado
    migrate_add_price_installments()

    # Roda a migração para adicionar coleções
    migrate_add_collection()

    # Roda a migração para tornar o preço alvo opcional
    migrate_target_price_nullable()

import re

def clean_product_name(name: str) -> str:
    """
    Sanitiza o nome do produto de forma automatizada, removendo marcas de preço redundantes,
    nomes de lojas anexados e códigos de lote estranhos no final.
    """
    if not name:
        return "Produto"
        
    # 1. Remove qualquer menção a preço no padrão R$ XXX,XX (com traços ou barras adjacentes)
    name = re.sub(r"[\s\-\|]*R\$\s*\d+([\.,]\d+)*\s*", "", name)
    
    # 2. Remove assinaturas de lojas comuns no final
    store_patterns = [
        r"\s*\|\s*Terabyte(Shop)?\s*",
        r"\s*\|\s*Pichau\s*",
        r"\s*\|\s*Kabum\s*",
        r"\s*[\-\|]\s*Mercado\s*Livre\s*",
        r"\s*[\-\|]\s*Amazon\s*"
    ]
    for pattern in store_patterns:
        name = re.sub(pattern, "", name, flags=re.IGNORECASE)
        
    # 3. Limpa códigos de série estranhos longos apenas se estiverem avulsos no final da string
    # (Procuramos sequências de 8 a 15 caracteres alfanuméricos isolados no final)
    name = re.sub(r"\s+[a-zA-Z0-9]{10,15}$", "", name)
    
    # 4. Remove múltiplos espaços, pontuações indesejadas no início/fim
    name = re.sub(r"\s+", " ", name).strip()
    name = name.strip(" -|/,;")
    
    return name

def migrate_clean_names():
    """Varre todos os produtos existentes no banco e normaliza seus nomes."""
    try:
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT id, name FROM products")
            products = cursor.fetchall()
            for prod in products:
                prod_id = prod["id"]
                old_name = prod["name"]
                new_name = clean_product_name(old_name)
                if new_name != old_name:
                    cursor.execute(
                        "UPDATE products SET name = ? WHERE id = ?",
                        (new_name, prod_id)
                    )
            conn.commit()
    except Exception as e:
        print(f"⚠️ Erro ao rodar migração de nomes: {e}")

def migrate_add_price_installments():
    """Verifica e adiciona a coluna price_installments na tabela price_history se não existir."""
    try:
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("PRAGMA table_info(price_history)")
            columns = [row["name"] for row in cursor.fetchall()]
            if "price_installments" not in columns:
                cursor.execute("ALTER TABLE price_history ADD COLUMN price_installments REAL")
                conn.commit()
                print("✅ Coluna 'price_installments' adicionada com sucesso no SQLite.")
    except Exception as e:
        print(f"⚠️ Erro ao rodar migração de preço parcelado: {e}")

def migrate_add_collection():
    """Verifica e adiciona a coluna collection na tabela products se não existir."""
    try:
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("PRAGMA table_info(products)")
            columns = [row["name"] for row in cursor.fetchall()]
            if "collection" not in columns:
                cursor.execute("ALTER TABLE products ADD COLUMN collection TEXT")
                conn.commit()
                print("✅ Coluna 'collection' adicionada com sucesso no SQLite.")
    except Exception as e:
        print(f"⚠️ Erro ao rodar migração de coleções: {e}")

def migrate_target_price_nullable():
    """Migra a coluna target_price para ser NULL (opcional) caso esteja como NOT NULL."""
    try:
        with get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("PRAGMA table_info(products)")
            columns = cursor.fetchall()
            target_price_col = next((col for col in columns if col["name"] == "target_price"), None)
            
            # Se a coluna existe e está configurada como NOT NULL (notnull == 1)
            if target_price_col and target_price_col["notnull"] == 1:
                print("⏳ Executando migração para tornar 'target_price' opcional (nullable)...")
                cursor.execute("PRAGMA foreign_keys=OFF;")
                
                # Criar nova tabela temporária com target_price REAL (sem NOT NULL)
                cursor.execute("""
                CREATE TABLE products_new (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    store TEXT NOT NULL,
                    url TEXT UNIQUE NOT NULL,
                    target_price REAL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    collection TEXT
                );
                """)
                
                # Copiar dados da antiga para a nova
                cursor.execute("""
                INSERT INTO products_new (id, name, store, url, target_price, created_at, collection)
                SELECT id, name, store, url, target_price, created_at, collection FROM products;
                """)
                
                # Dropar tabela antiga
                cursor.execute("DROP TABLE products;")
                
                # Renomear nova tabela para products
                cursor.execute("ALTER TABLE products_new RENAME TO products;")
                
                cursor.execute("PRAGMA foreign_keys=ON;")
                conn.commit()
                print("✅ Migração de 'target_price' nullable concluída com sucesso!")
    except Exception as e:
        print(f"⚠️ Erro ao rodar migração para target_price nullable: {e}")

def update_product_name(product_id: int, new_name: str):
    """Atualiza o nome (apelido) de um produto no banco de dados."""
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE products SET name = ? WHERE id = ?",
            (new_name.strip(), product_id)
        )
        conn.commit()

def update_product_collection(product_id: int, collection: str):
    """Atualiza a coleção associada a um produto no banco de dados."""
    val = collection.strip() if collection else None
    if val == "":
        val = None
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE products SET collection = ? WHERE id = ?",
            (val, product_id)
        )
        conn.commit()

def add_product(name: str, store: str, url: str, target_price: float | None = None, collection: str = None) -> int:
    """Cadastra um novo produto para monitoramento. Retorna o ID do produto criado."""
    # Aplica a limpeza de nome automaticamente antes de cadastrar no banco
    name = clean_product_name(name)
    coll_val = collection.strip() if collection else None
    if coll_val == "":
        coll_val = None
    
    with get_connection() as conn:
        cursor = conn.cursor()
        try:
            cursor.execute(
                "INSERT INTO products (name, store, url, target_price, collection) VALUES (?, ?, ?, ?, ?)",
                (name, store.lower(), url, target_price, coll_val)
            )
            conn.commit()
            return cursor.lastrowid
        except sqlite3.IntegrityError:
            # Produto já existe pela URL, vamos atualizar o preço alvo, o nome e a coleção (se informada)
            if coll_val:
                cursor.execute(
                    "UPDATE products SET name = ?, target_price = ?, collection = ? WHERE url = ?",
                    (name, target_price, coll_val, url)
                )
            else:
                cursor.execute(
                    "UPDATE products SET name = ?, target_price = ? WHERE url = ?",
                    (name, target_price, url)
                )
            cursor.execute("SELECT id FROM products WHERE url = ?", (url,))
            row = cursor.fetchone()
            conn.commit()
            return row["id"]

def get_all_products():
    """Retorna a lista de todos os produtos cadastrados."""
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM products ORDER BY created_at DESC")
        return [dict(row) for row in cursor.fetchall()]

def get_product(product_id: int):
    """Retorna um produto específico pelo seu ID."""
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM products WHERE id = ?", (product_id,))
        row = cursor.fetchone()
        return dict(row) if row else None

def delete_product(product_id: int):
    """Remove um produto e deleta seu histórico de preços (via CASCADE)."""
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM products WHERE id = ?", (product_id,))
        conn.commit()

def add_price_reading(product_id: int, price: float, price_installments: float = None):
    """Registra uma nova leitura de preço no histórico (à vista e a prazo)."""
    if price_installments is None or price_installments <= 0.0:
        price_installments = price
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO price_history (product_id, price, price_installments) VALUES (?, ?, ?)",
            (product_id, price, price_installments)
        )
        conn.commit()

def get_price_history(product_id: int, limit: int = 30):
    """Retorna o histórico de preços de um produto com a data/hora UTC original."""
    with get_connection() as conn:
        cursor = conn.cursor()
        try:
            cursor.execute(
                "SELECT id, product_id, price, price_installments, checked_at FROM price_history WHERE product_id = ? ORDER BY checked_at DESC LIMIT ?",
                (product_id, limit)
            )
            return [dict(row) for row in cursor.fetchall()]
        except sqlite3.OperationalError:
            # Fallback se a coluna price_installments não existir
            cursor.execute(
                "SELECT id, product_id, price, checked_at FROM price_history WHERE product_id = ? ORDER BY checked_at DESC LIMIT ?",
                (product_id, limit)
            )
            res = []
            for r in cursor.fetchall():
                d = dict(r)
                d["price_installments"] = d["price"]
                res.append(d)
            return res

def get_last_price(product_id: int) -> float:
    """Retorna o último preço à vista registrado para o produto, ou None se não houver registros."""
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT price FROM price_history WHERE product_id = ? ORDER BY checked_at DESC LIMIT 1",
            (product_id,)
        )
        row = cursor.fetchone()
        return row["price"] if row else None

def get_last_price_installments(product_id: int) -> float:
    """Retorna o último preço parcelado registrado para o produto, ou None se não houver registros."""
    with get_connection() as conn:
        cursor = conn.cursor()
        try:
            cursor.execute(
                "SELECT price_installments, price FROM price_history WHERE product_id = ? ORDER BY checked_at DESC LIMIT 1",
                (product_id,)
            )
            row = cursor.fetchone()
            if row:
                val = row["price_installments"]
                return val if val is not None else row["price"]
            return None
        except sqlite3.OperationalError:
            # Fallback se a coluna não existir ainda
            cursor.execute(
                "SELECT price FROM price_history WHERE product_id = ? ORDER BY checked_at DESC LIMIT 1",
                (product_id,)
            )
            row = cursor.fetchone()
            return row["price"] if row else None

def get_price_stats(product_id: int) -> dict:
    """Retorna estatísticas históricas de preço (média, mínimo, total de leituras, e histórico recente para sparkline)."""
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT AVG(price) as avg_price, MIN(price) as min_price, COUNT(price) as count "
            "FROM price_history WHERE product_id = ?",
            (product_id,)
        )
        row = cursor.fetchone()
        
        cursor.execute(
            "SELECT price FROM price_history WHERE product_id = ? ORDER BY checked_at DESC LIMIT 10",
            (product_id,)
        )
        recent_rows = cursor.fetchall()
        recent_prices = [r["price"] for r in recent_rows]
        recent_prices.reverse() # Cronológica: mais antiga para mais recente
        
        if row and row["count"] > 0:
            return {
                "avg_price": row["avg_price"],
                "min_price": row["min_price"],
                "count": row["count"],
                "recent_prices": recent_prices
            }
        return {"avg_price": 0.0, "min_price": 0.0, "count": 0, "recent_prices": []}

def get_latest_scan_time() -> str | None:
    """Retorna a data/hora UTC da última verificação de preços registrada no histórico."""
    with get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT MAX(checked_at) as last_scan FROM price_history")
        row = cursor.fetchone()
        if row and row["last_scan"]:
            # O formato padrão de timestamp do SQLite é "YYYY-MM-DD HH:MM:SS" (em UTC)
            utc_str = row["last_scan"]
            return utc_str.replace(" ", "T") + "Z"
        return None


