document.getElementById('calcular').addEventListener('click', async () => {
    const salarioBase = parseFloat(document.getElementById('salarioBase').value);
    const horasExtras = parseFloat(document.getElementById('horasExtras').value);
    const pagoHoraExtra = parseFloat(document.getElementById('pagoHoraExtra').value);
    const deducciones = parseFloat(document.getElementById('deducciones').value);

    if ([salarioBase, horasExtras, pagoHoraExtra, deducciones].some(isNaN)) {
        alert('Por favor, completa todos los campos con valores válidos.');
        return;
    }

    const response = await fetch('/calculate_salary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ salarioBase, horasExtras, pagoHoraExtra, deducciones }),
    });

    const data = await response.json();
    if (response.ok) {
        // Mostrar resultados en el HTML
        document.getElementById('resSalarioNeto').textContent = `$${data.salarioNeto.toFixed(2)}`;
    } else {
        alert('Error al calcular el salario.');
    }
});
