document.getElementById('calcular').addEventListener('click', async () => {
    const salarioBase = parseFloat(document.getElementById('salarioBase').value);
    const horasExtras = parseFloat(document.getElementById('horasExtras').value);
    const pagoHoraExtra = parseFloat(document.getElementById('pagoHoraExtra').value);
    const deducciones = parseFloat(document.getElementById('deducciones').value);

    if ([salarioBase, horasExtras, pagoHoraExtra, deducciones].some(isNaN)) {
        alert('Por favor, completa todos los campos con valores válidos.');
        return;
    }

    const response = await fetch('/calculate_salary/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ salarioBase, horasExtras, pagoHoraExtra, deducciones }),
    });

    const data = await response.json();
    if (response.ok) {
        const totalHorasExtras = horasExtras * pagoHoraExtra;
        document.getElementById('resSalarioBase').textContent = `$${salarioBase.toFixed(2)}`;
        document.getElementById('resHorasExtras').textContent = `$${totalHorasExtras.toFixed(2)}`;
        document.getElementById('resDeducciones').textContent = `$${deducciones.toFixed(2)}`;
        document.getElementById('resSalarioNeto').textContent = `$${data.salarioNeto.toFixed(2)}`;

        document.getElementById('resultado').classList.remove('hidden');
    } else {
        alert('Error al calcular el salario.');
    }

    if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'nomina_report.pdf';
        document.body.appendChild(a);
        a.click();
        a.remove();
    } else {
        alert('Error al generar el PDF.');
    }
});
