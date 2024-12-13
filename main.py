from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse, FileResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
from math import pow
import os
import uvicorn
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))  # Por defecto usa el puerto 8000 si no está definido
    uvicorn.run("main:app", host="0.0.0.0", port=port)

app = FastAPI()

# Middleware para CORS que permite que la API sea consumida por cualquier origen
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/static", StaticFiles(directory="static"), name="static")

# Simulación de base de datos
transactions_db = []
current_balance = 0
max_expense = 0
max_expense_date = ""


# Modelos
class Transaction(BaseModel):
    description: str
    amount: float
    transaction_type: str  # "ingreso" o "gasto"
    date: str


class InitialBalance(BaseModel):
    balance: float


# Rutas para la aplicación financiera
@app.post("/initial_balance/")
async def set_initial_balance(balance: InitialBalance):
    global current_balance
    current_balance = balance.balance
    return {"message": "Balance inicial establecido", "balance": current_balance}


@app.post("/transactions/")
async def add_transaction(transaction: Transaction):
    global current_balance, max_expense, max_expense_date
    transactions_db.append(transaction)

    if transaction.transaction_type == "ingreso":
        current_balance += transaction.amount
    else:
        current_balance -= transaction.amount
        if transaction.amount > max_expense:
            max_expense = transaction.amount
            max_expense_date = transaction.date

    return {"message": "Transacción añadida", "balance": current_balance}


@app.get("/transactions/", response_model=List[Transaction])
async def get_transactions(sort: str = "default"):
    if sort == "date":
        return sorted(transactions_db, key=lambda x: x.date)
    elif sort == "amount":
        return sorted(transactions_db, key=lambda x: x.amount)
    else:
        return transactions_db


@app.get("/balance/")
async def get_balance():
    return {"balance": current_balance}


@app.get("/max_expense/")
async def get_max_expense():
    return {"max_expense": max_expense, "date": max_expense_date}


# Rutas para servir las páginas HTML
@app.get("/", response_class=FileResponse)
async def read_index():
    return "templates/index.html"


@app.get("/app", response_class=HTMLResponse)
async def read_app(request: Request):
    with open("templates/app.html") as f:
        return f.read()

# Endpoint para calcular rendimientos
@app.post("/calculate_investment/")
async def calculate_investment(data: dict):
    """
    Calcula el rendimiento para CETES, Nu y Mercado Pago.
    """
    amount = data.get("amount", 0)
    days = data.get("days", 0)

    if amount <= 0 or days <= 0:
        return {"error": "Cantidad y días deben ser mayores a 0"}

    # Tasas de interés
    cetes_rates = {28: 0.1096, 91: 0.114, 182: 0.1207, 364: 0.1209}
    nu_rates = {7: 0.136, 28: 0.139, 90: 0.1475, 365: 0.09}
    mp_rate = 0.15  # Mercado Pago

    # CETES
    cetes_rate = cetes_rates.get(days, 0.1096)
    cetes_years = days / 365
    cetes_gain = amount * pow(1 + cetes_rate, cetes_years) - amount

    # Nu
    nu_rate = nu_rates.get(days, 0.09)
    nu_years = days / 365
    nu_gain = amount * pow(1 + nu_rate, nu_years) - amount

    # Mercado Pago
    mp_years = days / 365
    mp_gain = amount * pow(1 + mp_rate, mp_years) - amount

    return {
        "cetes": {"gain": cetes_gain, "total": cetes_gain + amount},
        "nu": {"gain": nu_gain, "total": nu_gain + amount},
        "mercado_pago": {"gain": mp_gain, "total": mp_gain + amount},
    }

@app.get("/calculadoras.html", response_class=HTMLResponse)
async def read_calculadoras():
    with open("templates/calculadoras.html") as f:
        return f.read()

@app.get("/nomina.html", response_class=HTMLResponse)
async def read_nomina():
    with open("templates/nomina.html") as f:
        return f.read()

@app.post("/calculate_salary/")
async def calculate_salary(data: dict):
    salario_base = data.get("salarioBase", 0)
    horas_extras = data.get("horasExtras", 0)
    pago_hora_extra = data.get("pagoHoraExtra", 0)
    deducciones = data.get("deducciones", 0)

    if any(x <= 0 for x in [salario_base, horas_extras, pago_hora_extra, deducciones]):
        return {"error": "Todos los valores deben ser mayores a 0"}

    total_horas_extras = horas_extras * pago_hora_extra
    salario_neto = salario_base + total_horas_extras - deducciones

    return {
        "salarioBase": salario_base,
        "totalHorasExtras": total_horas_extras,
        "deducciones": deducciones,
        "salarioNeto": salario_neto
    }

@app.post("/download_pdf/")
async def download_pdf(data: dict):
    salario_base = data.get("salarioBase", 0)
    horas_extras = data.get("horasExtras", 0)
    pago_hora_extra = data.get("pagoHoraExtra", 0)
    deducciones = data.get("deducciones", 0)
    salario_neto = salario_base + (horas_extras * pago_hora_extra) - deducciones

    # Crear el archivo PDF
    pdf_path = "nomina_report.pdf"
    c = canvas.Canvas(pdf_path, pagesize=letter)
    c.setFont("Helvetica", 12)

    # Título
    c.drawString(100, 750, "Reporte de Cálculo de Nómina")
    c.line(100, 745, 500, 745)

    # Información detallada
    c.drawString(100, 720, f"Salario Base: ${salario_base:.2f}")
    c.drawString(100, 700, f"Horas Extras: {horas_extras} x ${pago_hora_extra:.2f} = ${horas_extras * pago_hora_extra:.2f}")
    c.drawString(100, 680, f"Deducciones: ${deducciones:.2f}")
    c.drawString(100, 660, f"Salario Neto: ${salario_neto:.2f}")

    # Guardar y cerrar el archivo PDF
    c.save()

    # Retornar el archivo como respuesta
    return FileResponse(pdf_path, filename="nomina_report.pdf", media_type="application/pdf")

@app.get("/acerca.html", response_class=HTMLResponse)
async def read_acerca():
    with open("templates/acerca.html") as f:
        return f.read()

@app.post("/reset/")
async def reset_data():
    global transactions_db, current_balance, max_expense, max_expense_date

    # Reiniciar los datos
    transactions_db = []
    current_balance = 0
    max_expense = 0
    max_expense_date = ""

    return {"message": "Datos reiniciados con éxito"}

# Ruta para generar y descargar el reporte en PDF
@app.get("/generate_report/", response_class=FileResponse)
async def generate_report():
    from reportlab.lib.pagesizes import letter
    from reportlab.lib import colors
    from reportlab.platypus import Table, TableStyle, SimpleDocTemplate, Paragraph
    from reportlab.lib.styles import getSampleStyleSheet

    file_name = "quantiqa_report.pdf"
    doc = SimpleDocTemplate(file_name, pagesize=letter)

    elements = []
    styles = getSampleStyleSheet()
    title_style = styles["Heading1"]
    title_style.alignment = 1

    title = Paragraph("QUANTIQA - Reporte de Transacciones", title_style)
    elements.append(title)

    ingresos = [
        ["Fecha", "Monto", "Descripción"]
    ] + sorted(
        [
            [t.date, f"${t.amount:.2f}", t.description]
            for t in transactions_db
            if t.transaction_type == "ingreso"
        ],
        key=lambda x: x[0],
        reverse=True,
    )
    gastos = [
        ["Fecha", "Monto", "Descripción"]
    ] + sorted(
        [
            [t.date, f"${t.amount:.2f}", t.description]
            for t in transactions_db
            if t.transaction_type == "gasto"
        ],
        key=lambda x: x[0],
        reverse=True,
    )

    # Crear tabla de ingresos
    elements.append(Paragraph("Ingresos", styles["Heading2"]))
    table_ingresos = Table(ingresos)
    table_ingresos.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.lightgrey),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
                ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.black),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("BACKGROUND", (0, 1), (-1, -1), colors.beige),
            ]
        )
    )
    elements.append(table_ingresos)

    elements.append(Paragraph("<br/><br/>", styles["Normal"]))

    elements.append(Paragraph("Gastos", styles["Heading2"]))
    table_gastos = Table(gastos)
    table_gastos.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.lightgrey),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
                ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.black),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("BACKGROUND", (0, 1), (-1, -1), colors.pink),
            ]
        )
    )
    elements.append(table_gastos)

    doc.build(elements)

    return FileResponse(file_name, media_type="application/pdf", filename="Reporte_QUANTIQA.pdf")

