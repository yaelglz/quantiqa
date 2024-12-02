from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
from math import pow
import os
import uvicorn

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

app.mount("/static", StaticFiles(directory="static"), name="static")  # Para montar archivos en la ruta /static

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
        # Ordenar por fecha (asumiendo que la fecha está en formato 'YYYY-MM-DD')
        return sorted(transactions_db, key=lambda x: x.date)
    elif sort == "amount":
        # Ordenar por monto
        return sorted(transactions_db, key=lambda x: x.amount)
    else:
        # Por defecto: devolver en el orden original
        return transactions_db


@app.get("/balance/")
async def get_balance():
    return {"balance": current_balance}


@app.get("/max_expense/")
async def get_max_expense():
    return {"max_expense": max_expense, "date": max_expense_date}


# Rutas para servir las páginas HTML
@app.get("/", response_class=HTMLResponse)
async def read_home(request: Request):
    with open("templates/index.html") as f:
        return f.read()


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
    amount = data.get("amount", 0)  # Cantidad inicial
    days = data.get("days", 0)     # Tiempo en días

    if amount <= 0 or days <= 0:
        return {"error": "Cantidad y días deben ser mayores a 0"}

    # Tasas de interés
    cetes_rates = {28: 0.1096, 91: 0.114, 182: 0.1207, 364: 0.1209}
    nu_rates = {7: 0.136, 28: 0.139, 90: 0.1475, 365: 0.09}
    mp_rate = 0.15  # Mercado Pago

    # CETES
    cetes_rate = cetes_rates.get(days, 0.1096)  # Tasa por defecto para CETES
    cetes_years = days / 365
    cetes_gain = amount * pow(1 + cetes_rate, cetes_years) - amount

    # Nu
    nu_rate = nu_rates.get(days, 0.09)  # Tasa por defecto para Nu
    nu_years = days / 365
    nu_gain = amount * pow(1 + nu_rate, nu_years) - amount

    # Mercado Pago
    mp_years = days / 365
    mp_gain = amount * pow(1 + mp_rate, mp_years) - amount

    # Respuesta con los cálculos
    return {
        "cetes": {"gain": cetes_gain, "total": cetes_gain + amount},
        "nu": {"gain": nu_gain, "total": nu_gain + amount},
        "mercado_pago": {"gain": mp_gain, "total": mp_gain + amount},
    }

@app.get("/calculadoras.html", response_class=HTMLResponse)
async def read_calculadoras():
    with open("templates/calculadoras.html") as f:
        return f.read()
