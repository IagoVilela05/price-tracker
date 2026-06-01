# Referência Técnica: Endpoints da API (REST)

Esta referência técnica detalha de forma estrita a assinatura de todas as rotas HTTP expostas pelo servidor back-end do **PriceTracker** em [backend/api.py](file:///home/iago/Documentos/Pessoal/price-tracker/backend/api.py).

---

## 1. Esquemas de Dados (Pydantic Models)

### ProductCreate (Payload de Inserção)
Enviado no corpo da requisição `POST /api/products`.
```json
{
  "url": "string (URL da página do hardware)",
  "target_price": "float (Preço alvo desejado)",
  "collection": "string | null (Nome da coleção ou grupo - opcional)"
}
```

### ProductResponse (Modelo de Resposta)
Retornado na listagem de produtos.
```json
{
  "id": "integer (ID autogerado no banco)",
  "name": "string (Nome limpo e formatado do hardware)",
  "store": "string (Nome da loja em minúsculo)",
  "url": "string (URL monitorada)",
  "target_price": "float (Preço alvo desejado)",
  "created_at": "string (Carimbo de data/hora de criação)",
  "collection": "string | null (Coleção associada)",
  "last_price": "float (Último preço Pix lido)",
  "last_price_installments": "float (Último preço parcelado lido)",
  "stats": {
    "avg_price": "float (Média aritmética histórica)",
    "min_price": "float (Mínimo histórico lido)",
    "count": "integer (Total de leituras salvas)"
  }
}
```

---

## 2. Roteamento de API (REST API)

| Rota | Verbo | Descrição | Status Code |
| :--- | :---: | :--- | :---: |
| `/api/products` | `GET` | Retorna uma lista de todos os produtos cadastrados com seus preços mais recentes e estatísticas. | `200 OK` |
| `/api/products` | `POST` | Valida o link, executa uma raspagem inicial e cadastra o novo hardware no banco de dados. | `201 Created` |
| `/api/products/{product_id}` | `DELETE` | Remove permanentemente o produto informado e todo o seu histórico de preços (CASCADE). | `200 OK` |
| `/api/products/{product_id}/name` | `PATCH` | Atualiza o nome / apelido personalizado de exibição do hardware. | `200 OK` |
| `/api/products/{product_id}/collection` | `PATCH` | Associa, altera ou remove a coleção de um produto monitorado. | `200 OK` |
| `/api/products/{product_id}/history` | `GET` | Retorna o histórico de preços cronológico (limite 100) formatado para renderização de gráficos. | `200 OK` |
| `/api/products/check` | `POST` | Aciona a varredura assíncrona de preços de todos os itens em segundo plano (*BackgroundTasks*). | `200 OK` |
| `/api/products/check-status` | `GET` | Retorna se o scraper está rodando em segundo plano no momento. | `200 OK` |
| `/api/stats` | `GET` | Retorna métricas gerais consolidadas do dashboard (total, atingidos, maior desconto). | `200 OK` |

---

## 3. Especificações dos Endpoints de Edição (Patch)

### Atualizar Apelido (PATCH `/api/products/{id}/name`)
* **Payload JSON:**
  ```json
  {
    "name": "RTX 4060 Ti Master"
  }
  ```
* **Retorno JSON (Exemplo):**
  ```json
  {
    "message": "Nome do produto atualizado com sucesso.",
    "name": "RTX 4060 Ti Master"
  }
  ```

### Atualizar Coleção (PATCH `/api/products/{id}/collection`)
* **Payload JSON:**
  ```json
  {
    "collection": "Placa de Video"
  }
  ```
  *(Definir como `null` ou string vazia `""` removerá o produto de qualquer coleção)*
* **Retorno JSON (Exemplo):**
  ```json
  {
    "message": "Coleção do produto atualizada com sucesso.",
    "collection": "Placa de Video"
  }
  ```
