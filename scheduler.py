import os
import sys
import time
from rich.console import Console
from rich.panel import Panel
from rich.live import Live
from rich.text import Text
# pyrefly: ignore [missing-import]
from dotenv import load_dotenv

# Adiciona o diretório do projeto ao PATH do Python
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database.db_manager import init_db
from main import run_price_check

# Carrega variáveis do arquivo .env
load_dotenv()

# Configuração do intervalo de verificação (padrão: 4 horas = 14400 segundos)
# Para fins de demonstração e teste rápido, o usuário pode definir no .env
CHECK_INTERVAL = int(os.getenv("CHECK_INTERVAL_SECONDS", 14400))

console = Console()

def main():
    # Garante que o banco e tabelas estão inicializados
    init_db()
    
    console.clear()
    console.print(Panel.fit(
        "   ⏰ [bold cyan]AGENDADOR DE MONITORAMENTO AUTOMÁTICO[/bold cyan] ⏰   \n"
        f"       Verificações a cada [bold green]{CHECK_INTERVAL / 3600:.1f} horas[/bold green] ({CHECK_INTERVAL} segundos)",
        border_style="cyan",
        padding=(1, 4)
    ))
    
    try:
        while True:
            console.print("\n[bold yellow]🔄 Iniciando varredura agendada de preços...[/bold yellow]")
            run_price_check(non_interactive=True)
            console.print(f"\n[green]✓ Varredura concluída com sucesso![/green]")
            
            # Contagem regressiva visual elegante com Live text
            sleep_end = time.time() + CHECK_INTERVAL
            with Live(console=console, auto_refresh=True) as live:
                while time.time() < sleep_end:
                    remaining = int(sleep_end - time.time())
                    mins, secs = divmod(remaining, 60)
                    hours, mins = divmod(mins, 60)
                    
                    time_str = f"{hours:02d}:{mins:02d}:{secs:02d}"
                    text = Text.assemble(
                        ("⏰ ", "cyan"),
                        ("Próxima verificação em: ", "dim"),
                        (time_str, "bold green"),
                        (" (Pressione Ctrl+C para encerrar)", "dim")
                    )
                    live.update(text)
                    time.sleep(1)
                    
    except KeyboardInterrupt:
        console.print("\n\n[magenta]Agendador interrompido pelo usuário. Até mais![/magenta] 👋")
        sys.exit(0)

if __name__ == "__main__":
    main()
