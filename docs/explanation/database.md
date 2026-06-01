# Explicação Conceitual: Estrutura do Banco de Dados e Migrações

Este documento explica conceitualmente o modelo relacional do **PriceTracker**, os mecanismos de integridade referencial adotados e como funciona a arquitetura de migração autônoma de tabelas na inicialização da aplicação.

---

## 1. O Modelo Relacional do PriceTracker

O banco de dados utiliza o motor **SQLite3**. A escolha do SQLite justifica-se pela ausência de dependências externas complexas de rede (como instâncias PostgreSQL ou MySQL), facilidade de backup (um único arquivo `.db` em disco) e consumo irrisório de CPU/Memória, ideal para ambientes locais.

A modelagem é simplificada e divide-se em duas entidades principais:

```mermaid
erDiagram
    products {
        integer id PK
        text name
        text store
        text url UNIQUE
        real target_price
        text collection
        timestamp created_at
    }
    price_history {
        integer id PK
        integer product_id FK
        real price
        real price_installments
        timestamp checked_at
    }
    products ||--o{ price_history : "possui (1:N)"
```

### Integridade Referencial e Deleção em Cascata (`ON DELETE CASCADE`)
A chave estrangeira `product_id` na tabela `price_history` possui a restrição `ON DELETE CASCADE`. 
Isso significa que, se você decidir remover um hardware do monitoramento, o banco de dados deletará automaticamente todos os registros de histórico e preços associados de forma instantânea. Isso mantém o banco limpo e livre de registros órfãos.

---

## 2. Inicialização e Migrações Autônomas

Para evitar que o usuário precise rodar comandos manuais de migração (como alembic, knex, ou scripts SQL avulsos) a cada atualização de versão do software, o PriceTracker implementa a lógica de **Auto-Migração na Inicialização**.

### Como funciona?
Sempre que a API (`api.py`), o bot (`telegram_bot.py`) ou o scheduler (`scheduler.py`) são iniciados, o método `init_db()` do [db_manager.py](file:///home/iago/Documentos/Pessoal/price-tracker/backend/database/db_manager.py#L11) é executado:

1. **Criação de Tabelas:** Executa `CREATE TABLE IF NOT EXISTS` para as estruturas fundamentais.
2. **Inspeção de Colunas (Pragmas):** Executa o comando `PRAGMA table_info(tabela)` no SQLite para extrair a lista exata de colunas ativas em tempo real.
3. **Injeção de Colunas Ausentes (Alter Table):**
   - Se a coluna `price_installments` estiver ausente no histórico, o banco executa `ALTER TABLE price_history ADD COLUMN price_installments REAL`.
   - Se a coluna `collection` estiver ausente nos produtos, executa `ALTER TABLE products ADD COLUMN collection TEXT`.
4. **Sanitização de Nomes:** Varre todos os registros de hardware salvos e executa uma limpeza automatizada de caracteres redundantes (remover marcas de preço do nome lido, remover nomes de lojas duplicados no final da string, etc.).

Essa arquitetura de inicialização dinâmica reduz o débito técnico de suporte e garante a resiliência do sistema diante de mudanças estruturais na modelagem relacional.
