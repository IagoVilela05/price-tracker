# Guia de Como Fazer: Criar e Gerenciar Coleções no Painel Web

Este guia prático ensina a organizar os hardwares monitorados em grupos lógicos (ex: "Placas de Vídeo", "Abaixo de 1000") e operar os filtros virtuais em tempo real no dashboard React.

---

## Como Associar um Produto a uma Coleção

Você pode definir a coleção de um produto no momento do cadastro ou atualizar um produto existente sem perder o histórico de rastreamento.

### 1. No Cadastro (Novos Produtos)
1. No painel esquerdo (**Novo Link para Monitorar**), preencha a URL e o preço-alvo.
2. No campo **Coleção / Grupo (Opcional)**, digite a categoria desejada.
3. Se você já tiver criado categorias no passado, o campo fornecerá uma lista suspensa de **auto-complete inteligente** com as sugestões salvas. Basta selecionar uma delas ou digitar uma nova.
4. Clique em **Iniciar Rastreamento**.

### 2. Em Produtos Existentes (Edição Rápida)
1. Localize o produto que deseja categorizar na grade do dashboard.
2. No canto superior direito do cartão do produto, clique no ícone de pasta aberta (**Editar Coleção**).
3. Uma caixa de diálogo (*prompt*) aparecerá na tela contendo a coleção atual.
4. Digite a nova categoria ou deixe o campo totalmente vazio se desejar remover o produto de qualquer coleção.
5. Clique em **OK**. A etiqueta do produto atualizará automaticamente na tela de forma reativa.

---

## Como Filtrar o Painel Web por Coleções

A barra de filtros está localizada no topo da grade de monitoramento e é dividida em dois tipos de chips de seleção:

### 1. Filtros por Coleções Físicas
* **Todas as Coleções**: Exibe a totalidade de hardwares em monitoramento sem restrição.
* **Etiquetas de Coleções (Fundo Roxo)**: Botões gerados dinamicamente com base nas coleções ativas cadastradas em seu banco (ex: `📁 Placa de Vídeo`). Clicar em um deles ocultará todos os outros produtos instantaneamente.

### 2. Filtros Dinâmicos Virtuais (Chips Especiais)
Esses filtros não dependem de coleções cadastradas manualmente e executam cálculos matemáticos reativos em tempo real baseados nas leituras de preço coletadas:
* **🎯 Abaixo da Meta (Fundo Verde)**: Exibe apenas os hardwares onde o preço Pix atual lido é menor ou igual ao preço-alvo estipulado por você.
* **💰 Abaixo de R$ 2.000**: Exibe apenas os produtos cujo valor Pix lido atual é igual ou inferior a R$ 2.000,00.
* **💸 Abaixo de R$ 1.000**: Exibe apenas os hardwares de entrada com preço Pix de até R$ 1.000,00.
