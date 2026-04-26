import os
import io
import json
import matplotlib.pyplot as plt
import numpy as np
from celery import Celery
from fpdf import FPDF
from datetime import datetime

# Configuration Celery
app = Celery("tasks_config")
app.conf.broker_url = os.environ.get("CELERY_BROKER_URL", "redis://localhost:6379/0")
app.conf.result_backend = os.environ.get("CELERY_RESULT_BACKEND", app.conf.broker_url)
app.conf.task_default_queue = "celery"
app.conf.worker_prefetch_multiplier = 1

# --- DESIGN CONSTANTS (Professional Analytics Dark) ---
COLORS = {
    'bg': '#0f172a',      # Slate 900
    'card': '#1e293b',    # Slate 800
    'accent': '#a5b4fc',  # Indigo 300
    'white': '#f8fafc',   # Slate 50
    'muted': '#94a3b8',   # Slate 400
    'win': '#10b981',     # Emerald 500
    'loss': '#f43f5e',    # Rose 500
    'draw': '#f59e0b',    # Amber 500
    'border': '#334155'   # Slate 700
}

def hex_to_rgb(hex_str):
    hex_str = hex_str.lstrip('#')
    return tuple(int(hex_str[i:i+2], 16) for i in (0, 2, 4))

class PDFReport(FPDF):
    def __init__(self, username):
        super().__init__()
        self.username = username
        self.set_auto_page_break(False)
        
    def header(self):
        self.set_fill_color(*hex_to_rgb(COLORS['bg']))
        self.rect(0, 0, 210, 297, 'F')
        self.set_draw_color(*hex_to_rgb(COLORS['accent']))
        self.set_line_width(0.3)
        self.line(20, 18, 190, 18)
        self.set_text_color(*hex_to_rgb(COLORS['white']))
        self.set_font('Helvetica', 'B', 16)
        self.set_xy(20, 8)
        self.cell(100, 10, "CHESS ANALYTICS", 0, 0, 'L')
        self.set_font('Helvetica', '', 8)
        self.set_text_color(*hex_to_rgb(COLORS['muted']))
        self.set_xy(20, 18)
        self.cell(0, 8, f"PROFESSIONAL PERFORMANCE REPORT  |  {self.username.upper()}", 0, 1, 'L')

    def footer(self):
        # Pied de page discret
        self.set_y(-10)
        self.set_font('Helvetica', 'I', 7)
        self.set_text_color(*hex_to_rgb(COLORS['muted']))
        self.cell(0, 8, f'Page {self.page_no()}  -  Transcendence Statistics', 0, 0, 'C')

    def draw_card(self, x, y, w, h, title="", subtitle=""):
        # Shadow
        self.set_fill_color(5, 8, 15) 
        self.rect(x+0.5, y+0.5, w, h, 'F')
        # Card body
        self.set_fill_color(*hex_to_rgb(COLORS['card']))
        self.set_draw_color(*hex_to_rgb(COLORS['border']))
        self.set_line_width(0.1)
        self.rect(x, y, w, h, 'FD')
        if title:
            self.set_xy(x + 6, y + 4)
            self.set_font('Helvetica', 'B', 7)
            self.set_text_color(*hex_to_rgb(COLORS['accent']))
            self.cell(w-12, 5, title.upper(), 0, 1, 'L')
        if subtitle:
            self.set_x(x + 6)
            self.set_font('Helvetica', 'I', 6)
            self.set_text_color(*hex_to_rgb(COLORS['muted']))
            self.cell(w-12, 4, subtitle, 0, 1, 'L')

def create_chart_buffer(fig):
    buf = io.BytesIO()
    plt.savefig(buf, format='png', transparent=True, dpi=300, bbox_inches='tight', pad_inches=0.05)
    plt.close(fig)
    buf.seek(0)
    return buf

def create_winrate_donut(data):
    labels = ['Wins', 'Draws', 'Losses']
    sizes = [data.get('wins', 0), data.get('draws', 0), data.get('losses', 0)]
    colors = [COLORS['win'], COLORS['draw'], COLORS['loss']]
    filtered = [(l, s, c) for l, s, c in zip(labels, sizes, colors) if s > 0]
    if not filtered: return None
    labels, sizes, colors = zip(*filtered)
    fig, ax = plt.subplots(figsize=(2, 2))
    ax.pie(sizes, colors=colors, startangle=90, pctdistance=0.74,
           textprops={'color': COLORS['white'], 'weight': 'bold', 'size': 9},
           wedgeprops={'width': 0.5, 'edgecolor': 'none'}, autopct='%1.0f%%')
    ax.axis('equal')
    return create_chart_buffer(fig)

def create_elo_path(elo_history):
    if not elo_history: return None
    vals = [h.get('player', 1000) for h in elo_history]
    if len(vals) < 2: return None
    fig, ax = plt.subplots(figsize=(6, 1.4)) # Ratio plus panoramique
    ax.plot(vals, color=COLORS['accent'], linewidth=2, marker='o', markersize=2, markerfacecolor=COLORS['white'], markeredgecolor=COLORS['accent'])
    ax.fill_between(range(len(vals)), vals, min(vals)-5, color=COLORS['accent'], alpha=0.1)
    ax.set_facecolor('none')
    ax.tick_params(colors=COLORS['muted'], labelsize=7)
    for s in ['top', 'right', 'left']: ax.spines[s].set_visible(False)
    ax.spines['bottom'].set_color(COLORS['border'])
    ax.grid(True, axis='y', linestyle=':', alpha=0.1, color=COLORS['white'])
    return create_chart_buffer(fig)

def create_usage_bars(piece_usage, all_piece_usage):
    pieces = ['pawn', 'knight', 'bishop', 'rook', 'queen', 'king']
    player = [piece_usage.get(p, 0) for p in pieces]
    avg = [all_piece_usage.get(p, 0) for p in pieces]
    fig, ax = plt.subplots(figsize=(6, 1.4)) # Ratio plus panoramique
    x = np.arange(len(pieces))
    ax.bar(x - 0.17, player, 0.3, color=COLORS['accent'], zorder=3)
    ax.bar(x + 0.17, avg, 0.3, color=COLORS['muted'], alpha=0.2, zorder=3)
    ax.set_xticks(x)
    ax.set_xticklabels([p[:3].upper() for p in pieces], color=COLORS['muted'], size=7)
    ax.tick_params(axis='y', colors=COLORS['muted'], labelsize=7)
    for s in ['top', 'right', 'left']: ax.spines[s].set_visible(False)
    ax.spines['bottom'].set_color(COLORS['border'])
    ax.grid(axis='y', linestyle='--', alpha=0.05, color=COLORS['white'], zorder=0)
    return create_chart_buffer(fig)

@app.task(name="tasks_config.generate_stats_pdf")
def generate_stats_pdf(payload):
    username = payload.get('username', 'Player')
    all_stats = payload.get('stats', {})
    pdf = PDFReport(username)
    
    for category in ['bullet', 'blitz', 'rapid']:
        data = all_stats.get(category)
        if not data or data.get('total_games', 0) == 0: continue
        pdf.add_page()
        
        # --- TITLE ---
        pdf.set_font('Helvetica', 'B', 10)
        pdf.set_text_color(*hex_to_rgb(COLORS['accent']))
        pdf.set_xy(20, 28)
        pdf.cell(0, 10, f"DATASET: {category.upper()}", 0, 1, 'L')
        
        # --- PRECISE GRID 3.5 (Tighter top, more room for charts) ---
        Y_GRID = {
            'top': 38,      # Metrics & Donut (H=48)
            'mid': 90,      # ELO Chart (H=65)
            'bot': 158,     # Piece Chart (H=65)
            'ins': 226      # Insights Card (H=60)
        }
        
        # 1. TOP ROW
        pdf.draw_card(20, Y_GRID['top'], 82, 48, "Performance Summary", "Key metrics for this category")
        pdf.set_font('Helvetica', '', 8)
        m_list = [
            ("Matches Played", data.get('total_games')),
            ("Winrate", f"{data.get('winrate_global')}%"),
            ("Draws", f"{data.get('drawrate_global')}%"),
            ("Avg Game Time", f"{data.get('avg_duration')}s"),
            ("Thinking Time", f"{data.get('avg_thinking_time')}s"),
        ]
        yy = Y_GRID['top'] + 14
        for lab, val in m_list:
            pdf.set_xy(25, yy)
            pdf.set_text_color(*hex_to_rgb(COLORS['muted']))
            pdf.cell(40, 6, lab, 0, 0)
            pdf.set_text_color(*hex_to_rgb(COLORS['white']))
            pdf.cell(20, 6, str(val), 0, 1, 'R')
            yy += 6.5

        pdf.draw_card(108, Y_GRID['top'], 82, 48, "Success Distribution", "Win/Loss/Draw ratio")
        donut = create_winrate_donut(data)
        if donut:
            pdf.image(donut, x=130, y=Y_GRID['top'] + 10, w=38, h=32)

        # 2. MIDDLE ROW: ELO Chart
        # H=65 gives plenty of room for Title(18) + Image(40) + Padding(7)
        pdf.draw_card(20, Y_GRID['mid'], 170, 65, "Rating Evolution", "Historical ELO progression")
        elo_img = create_elo_path(data.get('performance_history', {}).get('elo_history', []))
        if elo_img:
            # On commence l'image plus bas (18mm) pour éviter le titre
            pdf.image(elo_img, x=25, y=Y_GRID['mid'] + 18, w=160, h=40)

        # 3. BOTTOM ROW: Strategic Profile
        pdf.draw_card(20, Y_GRID['bot'], 170, 65, "Strategic Profile", "Piece preference vs Global community")
        bars_img = create_usage_bars(data.get('piece_usage', {}), data.get('all_players_piece_usage', {}))
        if bars_img:
            pdf.image(bars_img, x=25, y=Y_GRID['bot'] + 18, w=160, h=40)

        # 4. INSIGHTS CARD
        pdf.draw_card(20, Y_GRID['ins'], 170, 60, "Tactical Engine Deep Analysis", "Advanced behavioral playstyle markers")
        adv = data.get('performance_history', {}).get('advanced', {})
        insights = [
            ("TACTICAL VOLATILITY", str(adv.get('volatility')), "Measures the chaos and material fluctuations in your games. High value indicates a sharp style."),
            ("OPENING SPEED", f"{adv.get('opening_speed')}s", "Average time spent per move during the first 10 turns. Fast pace puts pressure on opponents."),
            ("COMEBACK FACTOR", f"{adv.get('comeback_rate')}%", "Frequency of wins after being at a significant material deficit. Shows mental resilience."),
            ("BLUNDER FREQUENCY", f"{adv.get('blunder_ratio')}%", "Percentage of moves leading to significant loss of advantage. Lower is better."),
        ]
        coords = [(25, Y_GRID['ins'] + 15), (105, Y_GRID['ins'] + 15), 
                  (25, Y_GRID['ins'] + 37), (105, Y_GRID['ins'] + 37)]
        for i, (title, val, desc) in enumerate(insights):
            if i >= len(coords): break
            cx, cy = coords[i]
            pdf.set_xy(cx, cy)
            pdf.set_font('Helvetica', 'B', 7)
            pdf.set_text_color(*hex_to_rgb(COLORS['accent']))
            pdf.cell(75, 4, title, 0, 1)
            pdf.set_x(cx)
            pdf.set_font('Helvetica', 'B', 8)
            pdf.set_text_color(*hex_to_rgb(COLORS['white']))
            pdf.cell(75, 5, val, 0, 1)
            pdf.set_x(cx)
            pdf.set_font('Helvetica', 'I', 6)
            pdf.set_text_color(*hex_to_rgb(COLORS['muted']))
            pdf.multi_cell(75, 3, desc, 0, 'L')

    # Build filename
    try:
        ts = datetime.now().strftime('%Y%m%d_%H%M%S')
        fname = f"stats_{username}_{ts}.pdf"
        output_dir = "/app/shared_plots"
        if not os.path.exists(output_dir): os.makedirs(output_dir)
        path = os.path.join(output_dir, fname)
        pdf.output(path)
        return {"status": "success", "filename": fname, "url": f"/shared/{fname}"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.task(name="tasks_config.ping")
def ping(): return "pong"
