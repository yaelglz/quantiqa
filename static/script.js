// Función asincrónica para establecer el balance inicial
async function setInitialBalance() {
    // Obtiene el valor del balance ingresado por el usuario
    const balanceInput = document.getElementById("initial-balance").value;

    // Verifica si se ha ingresado un balance
    if (balanceInput) {
        // Realiza una solicitud POST para establecer el balance inicial
        const response = await fetch("https://quantiqa.onrender.com/initial_balance/", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({balance: parseFloat(balanceInput)}), // Convierte el balance a número
        });

        // Si la respuesta es exitosa, muestra el formulario de transacciones
        if (response.ok) {
            document.getElementById("transaction-form").style.display = "block";
            document.getElementById("initial-balance-form").style.display = "none";
            updateBalanceDisplay(); // Actualiza el balance en pantalla
        } else {
            alert("Error al establecer balance inicial");
        }
    }
}

// Función asincrónica para agregar una nueva transacción
async function addTransaction() {
    // Obtiene los valores de la transacción del formulario
    const description = document.getElementById("description").value;
    const amount = document.getElementById("amount").value;
    const transactionType = document.querySelector('input[name="transaction-type"]:checked').value;
    const date = document.getElementById("date").value || new Date().toLocaleDateString(); // Usa la fecha actual si no se proporciona

    // Verifica que se hayan ingresado la descripción y el monto
    if (description && amount) {
        // Realiza una solicitud POST para agregar la transacción
        const response = await fetch("https://quantiqa.onrender.com/transactions/", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                description,
                amount: parseFloat(amount), // Convierte el monto a número
                transaction_type: transactionType,
                date
            }),
        });

        // Si la respuesta es exitosa, limpia los campos del formulario y actualiza la lista de transacciones
        if (response.ok) {
            document.getElementById("description").value = "";
            document.getElementById("amount").value = "";
            document.getElementById("date").value = "";
            await getTransactions(); // Actualiza la lista de transacciones
            await updateBalanceDisplay(); // Actualiza el balance en pantalla
            await updateMaxExpense(); // Actualiza el máximo gasto
            await updateChart(); // Actualiza el gráfico
        } else {
            alert("Error al agregar transacción");
        }
    }
}

// Función asincrónica para obtener la lista de transacciones
function sortTransactions() {
    const sortBy = document.getElementById("sort-transactions").value;
    console.log("Ordenando transacciones por:", sortBy);
    getTransactions(sortBy);
}

// Definir la función getTransactions
async function getTransactions(sortBy = "default") {
    console.log("Fetching transactions with sortBy:", sortBy);
    try {
        const response = await fetch(`https://quantiqa.onrender.com/transactions/?sort=${sortBy}`);
        if (!response.ok) {
            throw new Error("Network response was not ok");
        }
        const data = await response.json();
        console.log("Datos recibidos:", data);

        // Ordenar los datos según el criterio seleccionado
        const sortedData = sortBy === "date" ? data.sort((a, b) => new Date(a.date) - new Date(b.date)) :
            sortBy === "amount" ? data.sort((a, b) => a.amount - b.amount) :
                data; // Por defecto, no se ordena

        updateTransactionsList(sortedData);
    } catch (error) {
        console.error("Error al obtener transacciones:", error);
        alert("Error al obtener transacciones. Por favor, inténtalo de nuevo.");
    }
}

// Definir la función updateTransactionsList
function updateTransactionsList(transactions) {
    console.log("Actualizando la lista de transacciones:", transactions);

    // Crear una nueva lista en lugar de limpiar la existente
    const newList = document.createElement("ul");
    newList.id = "transactions-list"; // Asegúrate de que el id sea el mismo

    transactions.forEach(transaction => {
        const listItem = document.createElement("li");
        listItem.textContent = `${transaction.date}: ${transaction.description} - $${transaction.amount} (${transaction.transaction_type})`;
        newList.appendChild(listItem);
    });

    // Reemplazar la lista existente con la nueva lista
    const oldList = document.getElementById("transactions-list");
    oldList.parentNode.replaceChild(newList, oldList);

    console.log("Lista de transacciones actualizada.");
}


// Añadir el evento al select para que llame a sortTransactions
document.getElementById("sort-transactions").addEventListener("change", sortTransactions);


// Función asincrónica para actualizar el balance mostrado en la pantalla
async function updateBalanceDisplay() {
    const response = await fetch("https://quantiqa.onrender.com/balance/");
    const {balance} = await response.json(); // Obtiene el balance actual
    document.getElementById("balance-display").textContent = `Balance Actual: $${balance}`; // Actualiza el texto del balance
}

// Función asincrónica para actualizar el gasto máximo
async function updateMaxExpense() {
    const response = await fetch("https://quantiqa.onrender.com/max_expense/");
    const {max_expense, date} = await response.json(); // Obtiene el máximo gasto y la fecha correspondiente

    const maxExpenseDisplay = document.getElementById("max-expense-display");
    const maxExpenseAmount = document.getElementById("max-expense-amount");
    const maxExpenseDate = document.getElementById("max-expense-date");

    maxExpenseAmount.textContent = `${max_expense}`; // Muestra el monto del gasto máximo
    maxExpenseDate.textContent = date || '-'; // Muestra la fecha o un guion si no hay fecha

    // Muestra u oculta la sección del gasto máximo dependiendo de su valor
    if (max_expense > 0) {
        maxExpenseDisplay.style.display = "block"; // Muestra si hay un gasto
    } else {
        maxExpenseDisplay.style.display = "none"; // Oculta si no hay gastos
    }
}

let myChart; // Variable para el gráfico

// Función para actualizar el gráfico
async function updateChart() {
    const response = await fetch("https://quantiqa.onrender.com/transactions/");
    const transactions = await response.json(); // Obtiene las transacciones

    const labels = transactions.map(transaction => transaction.date); // Crea etiquetas para el eje X

    // Filtra y mapea los datos de ingresos y gastos
    const incomeData = transactions
        .filter(transaction => transaction.transaction_type === "ingreso")
        .map(transaction => transaction.amount);

    const expenseData = transactions
        .filter(transaction => transaction.transaction_type === "gasto")
        .map(transaction => transaction.amount);

    // Completa los datos con ceros para que tengan la misma longitud
    const maxLength = Math.max(incomeData.length, expenseData.length);
    const incomeDataComplete = new Array(maxLength).fill(0);
    const expenseDataComplete = new Array(maxLength).fill(0);

    for (let i = 0; i < incomeData.length; i++) {
        incomeDataComplete[i] = incomeData[i]; // Asigna los ingresos
    }
    for (let i = 0; i < expenseData.length; i++) {
        expenseDataComplete[i] = expenseData[i]; // Asigna los gastos
    }

    if (myChart) {
        myChart.destroy(); // Destruye el gráfico anterior si existe
    }

    // Crea el gráfico con los datos de ingresos y gastos
    const ctx = document.getElementById('myChart').getContext('2d');
    myChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels.slice(0, maxLength), // Usa solo las etiquetas necesarias
            datasets: [
                {
                    label: 'Ingresos', // Etiqueta para ingresos
                    data: incomeDataComplete, // Datos de ingresos
                    fill: false,
                    borderColor: 'rgba(75, 192, 192, 1)', // Color de la línea de ingresos
                    tension: 0.1 //
                },
                {
                    label: 'Gastos', // Etiqueta para gastos
                    data: expenseDataComplete, // Datos de gastos
                    fill: false,
                    borderColor: 'rgba(255, 99, 132, 1)', // Color de la línea de gastos
                    tension: 0.1 //
                }
            ]
        },
        options: {
            scales: {
                y: {
                    beginAtZero: true // Inicia el eje Y en cero
                }
            }
        }
    });
}




