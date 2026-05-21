import os
import sys
import json
from rich.console import Console
from rich.table import Table
from rich.panel import Panel
from rich.prompt import Prompt, FloatPrompt
from rich import print as rprint

from database.db_manager import (
    init_db, add_product, get_all_products, get_product,
    delete_product, add_price_reading, get_last_price, get_price_history,
    get_price_stats
)
from scrapers import get_scraper_class_for_url
from utils.notifier import send_telegram_alert
from config import PROMO_THRESHOLD_INTERESTING, PROMO_THRESHOLD_SUPER, PROMO_THRESHOLD_INSANE

console = Console()

def clear_screen():
    os.system("cls" if os.name == "nt" else "clear")

def show_header():
    console.print(Panel.fit(
        "   🚀 [bold magenta]AGENTE MONITORADOR DE PREÇOS (MVP)[/bold magenta] 🚀   \n"
        "        [dim]Monitore preços de hardware na sua região[/dim]",
        border_style="magenta",
        padding=(1, 4)
    ))

def register_product():
    console.print("\n[bold cyan]--- CADASTRAR NOVO PRODUTO ---[/bold cyan]")
    url = Prompt.ask("Cole a URL do produto (Mercado Livre, Amazon ou Kabum)")
    
    try:
        # Tenta obter a classe correspondente
        scraper_cls = get_scraper_class_for_url(url)
        
        # Teste de extração em tempo real para confirmar
        with console.status("[bold green]Conectando à loja e testando link...", spinner="dots") as status:
            scraper = scraper_cls(url)
            res = scraper.scrape()
            
        if not res or not res.get("name") or res.get("price") == 0.0:
            console.print("[red]❌ Erro: Não foi possível obter as informações do produto. Verifique a URL.[/red]")
            return
            
        console.print(f"\n[green]✅ Produto Identificado com Sucesso![/green]")
        console.print(f"📦 [bold]Nome:[/bold] {res['name']}")
        console.print(f"💰 [bold]Preço Atual:[/bold] R$ {res['price']:.2f}")
        
        # Pede o preço alvo
        target_price = FloatPrompt.ask(f"Defina seu preço alvo em R$ (atual: R$ {res['price']:.2f})")
        
        # Registra no banco
        prod_id = add_product(res['name'], scraper_cls.__name__.replace("Scraper", ""), url, target_price)
        # Salva a primeira leitura de preço
        price_inst = res.get("price_installments", res['price'])
        add_price_reading(prod_id, res['price'], price_inst)
        
        console.print(f"\n[bold green]🎉 Produto cadastrado com sucesso e monitoramento iniciado! (ID: {prod_id})[/bold green]")
        
    except ValueError as ve:
        console.print(f"[red]❌ {ve}[/red]")
    except Exception as e:
        console.print(f"[red]❌ Ocorreu um erro ao processar: {e}[/red]")
    
    Prompt.ask("\nPressione Enter para continuar")

def list_products():
    console.print("\n[bold cyan]--- PRODUTOS MONITORADOS ---[/bold cyan]")
    products = get_all_products()
    
    if not products:
        console.print("[yellow]Nenhum produto cadastrado para monitoramento.[/yellow]")
        Prompt.ask("\nPressione Enter para continuar")
        return
        
    table = Table(title="Lista de Itens", border_style="magenta")
    table.add_column("ID", justify="center", style="cyan", no_wrap=True)
    table.add_column("Loja", justify="center", style="green")
    table.add_column("Nome do Produto", max_width=40)
    table.add_column("Último Preço", justify="right", style="yellow")
    table.add_column("Preço Alvo", justify="right", style="cyan")
    table.add_column("Status", justify="center")
    
    for prod in products:
        prod_id = prod["id"]
        last_price = get_last_price(prod_id)
        target = prod["target_price"]
        
        status_str = "[red]Acima do Alvo[/red] ❌"
        if last_price and last_price <= target:
            status_str = "[bold green]ALVO ATINGIDO![/bold green] 🎉"
            
        price_str = f"R$ {last_price:.2f}" if last_price else "Sem leituras"
        
        table.add_row(
            str(prod_id),
            prod["store"].upper(),
            prod["name"],
            price_str,
            f"R$ {target:.2f}",
            status_str
        )
        
    console.print(table)
    Prompt.ask("\nPressione Enter para continuar")

def delete_monitored_product():
    console.print("\n[bold red]--- DELETAR PRODUTO ---[/bold red]")
    products = get_all_products()
    
    if not products:
        console.print("[yellow]Nenhum produto cadastrado para deletar.[/yellow]")
        Prompt.ask("\nPressione Enter para continuar")
        return
        
    # Mostra tabela simples
    for prod in products:
        console.print(f"[{prod['id']}] {prod['name']} ({prod['store'].upper()})")
        
    try:
        prod_id = int(Prompt.ask("\nDigite o ID do produto que deseja remover"))
        prod = get_product(prod_id)
        if prod:
            delete_product(prod_id)
            console.print(f"[green]✅ Produto '{prod['name']}' removido com sucesso![/green]")
        else:
            console.print("[red]❌ ID não encontrado.[/red]")
    except ValueError:
        console.print("[red]❌ Entrada inválida. Digite um número inteiro.[/red]")
        
    Prompt.ask("\nPressione Enter para continuar")

def run_price_check(non_interactive: bool = False):
    products = get_all_products()
    if not products:
        console.print("[yellow]Nenhum produto cadastrado para monitoramento.[/yellow]")
        if not non_interactive:
            Prompt.ask("\nPressione Enter para continuar")
        return
        
    console.print(Panel("[bold cyan]Iniciando Verificação de Preços...[/bold cyan]"))
    
    for prod in products:
        prod_id = prod["id"]
        url = prod["url"]
        name = prod["name"]
        target = prod["target_price"]
        store = prod["store"]
        
        console.print(f"\n[bold]Verificando:[/bold] {name} ({store.upper()})")
        
        try:
            with console.status("[bold green]Acessando a página e extraindo dados...", spinner="dots"):
                scraper_cls = get_scraper_class_for_url(url)
                scraper = scraper_cls(url)
                res = scraper.scrape()
                
            if not res or not res.get("available") or res.get("price") == 0.0:
                console.print(f"[red]❌ Indisponível ou erro de conexão.[/red]")
                continue
                
            current_price = res["price"]
            
            # Pega leitura anterior para comparação antes de salvar a nova
            history = get_price_history(prod_id, limit=1)
            prior_price = history[0]["price"] if history else None
            
            # Puxa estatísticas históricas antes de gravar a nova leitura
            stats = get_price_stats(prod_id)
            
            # Salva nova leitura
            price_inst = res.get("price_installments", res["price"])
            add_price_reading(prod_id, current_price, price_inst)
            
            comparison_str = ""
            if prior_price:
                diff = current_price - prior_price
                if diff < 0:
                    comparison_str = f" [green](Caiu R$ {abs(diff):.2f})[/green] 📉"
                elif diff > 0:
                    comparison_str = f" [red](Subiu R$ {diff:.2f})[/red] 📈"
                else:
                    comparison_str = " [dim](Sem alteração)[/dim]"
                    
            console.print(f"💰 Preço atual: [bold yellow]R$ {current_price:.2f}[/bold yellow] à vista / [bold cyan]R$ {price_inst:.2f}[/bold cyan] parcelado{comparison_str}")
            
            # Algoritmo de Detecção Inteligente de Promoções
            is_promo = False
            drop_percentage = 0.0
            ref_price = 0.0
            is_new_low = False
            promo_category = ""
            
            if stats and stats["count"] >= 3:
                avg_price = stats["avg_price"]
                min_price = stats["min_price"]
                ref_price = avg_price
                
                if current_price < avg_price:
                    drop_percentage = ((avg_price - current_price) / avg_price) * 100
                    if drop_percentage >= PROMO_THRESHOLD_INTERESTING:
                        is_promo = True
                        
                if current_price < min_price:
                    is_new_low = True
            elif prior_price and prior_price > 0.0:
                ref_price = prior_price
                if current_price < prior_price:
                    drop_percentage = ((prior_price - current_price) / prior_price) * 100
                    if drop_percentage >= PROMO_THRESHOLD_INTERESTING:
                        is_promo = True
                    is_new_low = True
            
            if is_promo:
                if drop_percentage >= PROMO_THRESHOLD_INSANE:
                    promo_category = "PRECO_INSANO"
                elif drop_percentage >= PROMO_THRESHOLD_SUPER:
                    promo_category = "SUPER_DESCONTO"
                else:
                    promo_category = "OFERTA"
            
            # 1. Caso de Promoção Detectada
            if is_promo:
                if promo_category == "PRECO_INSANO":
                    console.print(Panel(
                        f"🚨 [bold red]SIRENE DE PREÇO INSANO ATIVADA![/bold red] 🚨\n\n"
                        f"O preço de [bold]{name}[/bold] despencou [bold red]{drop_percentage:.1f}%[/bold red]!\n"
                        f"Média anterior: [dim]R$ {ref_price:.2f}[/dim] | Preço atual: [bold red]R$ {current_price:.2f}[/bold red] (Possível erro/bug!)",
                        title="🚨 PREÇO INSANO",
                        border_style="red"
                    ))
                elif promo_category == "SUPER_DESCONTO":
                    console.print(Panel(
                        f"💥 [bold orange3]SUPER DESCONTO DETECTADO![/bold orange3] 🔥\n\n"
                        f"O preço de [bold]{name}[/bold] caiu [bold green]{drop_percentage:.1f}%[/bold green]!\n"
                        f"Média anterior: [dim]R$ {ref_price:.2f}[/dim] | Preço atual: [bold orange3]R$ {current_price:.2f}[/bold orange3]",
                        title="💥 Super Oferta",
                        border_style="orange3"
                    ))
                else:
                    console.print(Panel(
                        f"🏷️ [bold yellow]OFERTA INTERESSANTE DETECTADA![/bold yellow]\n\n"
                        f"O preço de [bold]{name}[/bold] caiu [bold green]{drop_percentage:.1f}%[/bold green]!\n"
                        f"Média anterior: [dim]R$ {ref_price:.2f}[/dim] | Preço atual: [bold yellow]R$ {current_price:.2f}[/bold yellow]",
                        title="🏷️ Oferta",
                        border_style="yellow"
                    ))
                
                if is_new_low:
                    console.print("[bold yellow]🏆 NOVO MÍNIMO HISTÓRICO REGISTRADO! 🏆[/bold yellow]")
                    
                sent = send_telegram_alert(
                    product_name=name,
                    store=store,
                    current_price=current_price,
                    target_price=target,
                    url=url,
                    is_promo=True,
                    drop_percentage=drop_percentage,
                    ref_price=ref_price,
                    is_new_low=is_new_low,
                    promo_category=promo_category,
                    price_installments=price_inst
                )
                if sent:
                    console.print("[bold green]📲 Notificação de PROMOÇÃO enviada com sucesso para o Telegram![/bold green]")
                else:
                    console.print("[dim yellow]⚠️ Telegram: Notificação não enviada (verifique as credenciais no .env).[/dim yellow]")
            
            # 2. Caso de Preço Alvo atingido (sem ser promo)
            elif current_price <= target:
                console.print(Panel(
                    f"🎉 [bold green]ALERTA DE PREÇO ALVO ATINGIDO![/bold green]\n\n"
                    f"O produto [bold]{name}[/bold] atingiu o valor alvo de **R$ {target:.2f}**!\n"
                    f"Preço atual: [bold yellow]R$ {current_price:.2f}[/bold yellow]\n\n"
                    f"🔗 Compre agora: {url}",
                    title="🚨 Alerta de Preço Alvo",
                    border_style="green"
                ))
                
                if is_new_low:
                    console.print("[bold yellow]🏆 NOVO MÍNIMO HISTÓRICO REGISTRADO! 🏆[/bold yellow]")
                    
                sent = send_telegram_alert(
                    product_name=name,
                    store=store,
                    current_price=current_price,
                    target_price=target,
                    url=url,
                    is_new_low=is_new_low,
                    price_installments=price_inst
                )
                if sent:
                    console.print("[bold green]📲 Notificação de PREÇO ALVO enviada com sucesso para o Telegram![/bold green]")
                else:
                    console.print("[dim yellow]⚠️ Telegram: Notificação não enviada (verifique as credenciais no .env).[/dim yellow]")
            else:
                console.print(f"🎯 Alvo: R$ {target:.2f} (Faltam R$ {current_price - target:.2f} para atingir o alvo)")
                if is_new_low:
                    console.print("[bold yellow]🏆 NOVO MÍNIMO HISTÓRICO REGISTRADO! 🏆[/bold yellow]")
                
        except Exception as e:
            console.print(f"[red]❌ Erro ao verificar {name}: {e}[/red]")

def refresh_prices():
    run_price_check(non_interactive=False)
    Prompt.ask("\nVarredura concluída! Pressione Enter para voltar ao menu")

def import_batch_products():
    console.print("\n[bold cyan]--- IMPORTAÇÃO EM LOTE ---[/bold cyan]")
    default_filename = "importar_produtos.json"
    filename = Prompt.ask("Digite o nome do arquivo JSON de importação", default=default_filename)
    
    if not os.path.exists(filename):
        console.print(f"[yellow]⚠️ Arquivo '{filename}' não encontrado na raiz do projeto.[/yellow]")
        console.print("Crie um arquivo JSON com a seguinte estrutura:")
        console.print(Panel(
            '[\n'
            '  {\n'
            '    "url": "https://www.kabum.com.br/produto/...",\n'
            '    "target_price": 1800.00\n'
            '  }\n'
            ']',
            title="Estrutura Exemplo",
            border_style="dim"
        ))
        Prompt.ask("\nPressione Enter para continuar")
        return
        
    try:
        with open(filename, "r", encoding="utf-8") as f:
            items = json.load(f)
            
        if not isinstance(items, list):
            console.print("[red]❌ Erro: O arquivo JSON deve conter uma lista de produtos.[/red]")
            Prompt.ask("\nPressione Enter para continuar")
            return
            
        console.print(f"[green]✓ Lido {len(items)} itens do arquivo. Iniciando processamento...[/green]\n")
        
        success_count = 0
        for i, item in enumerate(items, 1):
            url = item.get("url")
            target_price = item.get("target_price")
            
            if not url or target_price is None:
                console.print(f"[red]⚠️ Item {i} ignorado: URL ou preço alvo ausente.[/red]")
                continue
                
            try:
                # Resolve scraper
                scraper_cls = get_scraper_class_for_url(url)
                
                console.print(f"[{i}/{len(items)}] [bold]Processando:[/bold] {url[:50]}...")
                with console.status("[bold green]Extraindo dados...", spinner="dots"):
                    scraper = scraper_cls(url)
                    res = scraper.scrape()
                    
                if not res or not res.get("name") or res.get("price") == 0.0:
                    console.print(f"[red]❌ Falha ao extrair dados para o link {i}.[/red]")
                    continue
                    
                # Insere no banco
                prod_id = add_product(
                    res['name'], 
                    scraper_cls.__name__.replace("Scraper", ""), 
                    url, 
                    float(target_price)
                )
                price_inst = res.get("price_installments", res['price'])
                add_price_reading(prod_id, res['price'], price_inst)
                
                console.print(f"[green]✓ Cadastrado:[/green] {res['name'][:40]}... (R$ {res['price']:.2f})")
                success_count += 1
                
            except Exception as e:
                console.print(f"[red]❌ Erro no item {i}: {e}[/red]")
                
        console.print(f"\n[bold green]🎉 Importação concluída! {success_count} de {len(items)} produtos cadastrados com sucesso.[/bold green]")
        
        # Renomeia o arquivo para evitar re-importação acidental
        processed_filename = filename.replace(".json", "_processado.json")
        try:
            os.rename(filename, processed_filename)
            console.print(f"[dim]Arquivo renomeado para '{processed_filename}' para evitar duplicidades.[/dim]")
        except Exception:
            pass
            
    except Exception as e:
        console.print(f"[red]❌ Erro ao ler arquivo: {e}[/red]")
        
    Prompt.ask("\nPressione Enter para continuar")

def main():
    # Inicializa banco de dados
    init_db()
    
    while True:
        clear_screen()
        show_header()
        
        console.print("[bold cyan]MENU PRINCIPAL:[/bold cyan]")
        console.print("[1] ➕ Cadastrar novo produto")
        console.print("[2] 📋 Listar produtos monitorados")
        console.print("[3] 🔄 Atualizar preços agora")
        console.print("[4] ❌ Deletar produto monitorado")
        console.print("[5] 📥 Importar produtos em lote (JSON)")
        console.print("[6] 🚪 Sair")
        
        choice = Prompt.ask("\nEscolha uma opção", choices=["1", "2", "3", "4", "5", "6"])
        
        if choice == "1":
            register_product()
        elif choice == "2":
            list_products()
        elif choice == "3":
            refresh_prices()
        elif choice == "4":
            delete_monitored_product()
        elif choice == "5":
            import_batch_products()
        elif choice == "6":
            console.print("\n[magenta]Obrigado por usar o Monitorador de Preços. Até mais![/magenta] 👋")
            sys.exit(0)

if __name__ == "__main__":
    main()
