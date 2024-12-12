// Función asincrónica para establecer el balance inicial
async function setInitialBalance() {
    const balanceInput = document.getElementById("initial-balance").value;

    if (balanceInput) {
        const balance = parseFloat(balanceInput);

        if (isNaN(balance) || balance < 0) {
            alert("Por favor ingresa un número válido para el balance inicial.");
            return;
        }

        localStorage.setItem('balance', balance);
        const response = await fetch("http://quantiqa.live/initial_balance/", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ balance }),
        });

        if (response.ok) {
            document.getElementById("transaction-form").style.display = "block";
            document.getElementById("initial-balance-form").style.display = "none";
            updateBalanceDisplay();
        } else {
            alert("Error al establecer balance inicial");
        }
    }
}

// Función asincrónica para agregar una nueva transacción
async function addTransaction() {
    const description = document.getElementById("description").value;
    const amount = document.getElementById("amount").value;
    const transactionType = document.querySelector('input[name="transaction-type"]:checked').value;
    const date = document.getElementById("date").value || new Date().toLocaleDateString();

    if (description && amount) {
        const transaction = {
            description,
            amount: parseFloat(amount),
            transaction_type: transactionType,
            date
        };
        let transactions = JSON.parse(localStorage.getItem('transactions')) || [];
        transactions.push(transaction);
        localStorage.setItem('transactions', JSON.stringify(transactions));


        let balance = parseFloat(localStorage.getItem('balance'));
        if (transaction.transaction_type === "ingreso") {
            balance += transaction.amount;
        } else {
            balance -= transaction.amount;
        }
        localStorage.setItem('balance', balance);


        const response = await fetch("http://quantiqa.live/transactions/", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(transaction),
        });

        if (response.ok) {
            document.getElementById("description").value = "";
            document.getElementById("amount").value = "";
            document.getElementById("date").value = "";
            await getTransactions();
            await updateBalanceDisplay();
            await updateChart();
            await updateMaxExpense();
        } else {
            alert("Error al agregar transacción");
        }
    }
}

// Función asincrónica para actualizar el balance mostrado en la pantalla
async function updateBalanceDisplay() {
    let balance = localStorage.getItem('balance');

    if (!balance) {
        const response = await fetch("http://quantiqa.live/balance/");
        const data = await response.json();
        balance = data.balance;

        localStorage.setItem('balance', balance);
    }

    document.getElementById("balance-display").textContent = `Balance Actual: $${balance}`;
}

// Función para obtener las transacciones desde localStorage o backend
async function getTransactions(sortBy = "default") {
    let transactions = JSON.parse(localStorage.getItem('transactions'));

    if (!transactions) {
        const response = await fetch(`http://quantiqa.live/transactions/?sort=${sortBy}`);
        if (!response.ok) {
            throw new Error("Network response was not ok");
        }
        transactions = await response.json();

        localStorage.setItem('transactions', JSON.stringify(transactions));
    }

    const sortedData = sortBy === "date" ? transactions.sort((a, b) => new Date(a.date) - new Date(b.date)) :
        sortBy === "amount" ? transactions.sort((a, b) => a.amount - b.amount) :
            transactions;

    updateTransactionsList(sortedData);
}

async function updateMaxExpense() {
    const response = await fetch("http://quantiqa.live/max_expense/");
    const {max_expense, date} = await response.json();

    const maxExpenseDisplay = document.getElementById("max-expense-display");
    const maxExpenseAmount = document.getElementById("max-expense-amount");
    const maxExpenseDate = document.getElementById("max-expense-date");

    maxExpenseAmount.textContent = `${max_expense}`;
    maxExpenseDate.textContent = date || '-';

    if (max_expense > 0) {
        maxExpenseDisplay.style.display = "block";
    } else {
        maxExpenseDisplay.style.display = "none";
    }
}


// Función para actualizar la lista de transacciones
function updateTransactionsList(transactions) {
    const newList = document.createElement("ul");
    newList.id = "transactions-list";

    transactions.forEach(transaction => {
        const listItem = document.createElement("li");
        listItem.textContent = `${transaction.date}: ${transaction.description} - $${transaction.amount} (${transaction.transaction_type})`;
        newList.appendChild(listItem);
    });

    const oldList = document.getElementById("transactions-list");
    oldList.parentNode.replaceChild(newList, oldList);
}

let myChart;

// Función para actualizar el gráfico
async function updateChart() {
    let transactions = JSON.parse(localStorage.getItem('transactions'));

    if (!transactions) {
        const response = await fetch("http://quantiqa.live/transactions/");
        transactions = await response.json();
        localStorage.setItem('transactions', JSON.stringify(transactions));
    }

    const labels = transactions.map(transaction => transaction.date);


    const incomeData = transactions
        .filter(transaction => transaction.transaction_type === "ingreso")
        .map(transaction => transaction.amount);

    const expenseData = transactions
        .filter(transaction => transaction.transaction_type === "gasto")
        .map(transaction => transaction.amount);


    const maxLength = Math.max(incomeData.length, expenseData.length);
    const incomeDataComplete = new Array(maxLength).fill(0);
    const expenseDataComplete = new Array(maxLength).fill(0);

    for (let i = 0; i < incomeData.length; i++) {
        incomeDataComplete[i] = incomeData[i];
    }
    for (let i = 0; i < expenseData.length; i++) {
        expenseDataComplete[i] = expenseData[i];
    }


    if (myChart) {
        myChart.destroy();
    }

    // Crea un nuevo gráfico
    const ctx = document.getElementById('myChart').getContext('2d');
    myChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels.slice(0, maxLength),
            datasets: [
                {
                    label: 'Ingresos',
                    data: incomeDataComplete,
                    fill: false,
                    borderColor: 'rgba(75, 192, 192, 1)',
                    tension: 0.1
                },
                {
                    label: 'Gastos',
                    data: expenseDataComplete,
                    fill: false,
                    borderColor: 'rgba(255, 99, 132, 1)',
                    tension: 0.1
                }
            ]
        },
        options: {
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

document.addEventListener("DOMContentLoaded", updateChart);


document.addEventListener("DOMContentLoaded", async () => {
    const balance = localStorage.getItem('balance');

    if (balance) {
        document.getElementById("transaction-form").style.display = "block";
        document.getElementById("initial-balance-form").style.display = "none";
        await updateBalanceDisplay();
        await getTransactions();
        await updateChart();
    } else {
        document.getElementById("transaction-form").style.display = "none";
        document.getElementById("initial-balance-form").style.display = "block";
    }
});

// Función para reiniciar la aplicación
async function resetApp() {
    localStorage.clear();
    const response = await fetch("http://quantiqa.live/reset/", {
        method: "POST",
    });
    if (response.ok) {
        alert("Aplicación reiniciada con éxito");
        location.reload();
    } else {
        alert("Hubo un problema al reiniciar la aplicación");
    }
}
document.getElementById("reset-button").addEventListener("click", resetApp);

