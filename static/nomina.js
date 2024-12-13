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

    if (response.ok) {
        const data = await response.json();
        const totalHorasExtras = horasExtras * pagoHoraExtra;

        // Actualizar resultados
        document.getElementById('resSalarioBase').textContent = `$${salarioBase.toFixed(2)}`;
        document.getElementById('resHorasExtras').textContent = `$${totalHorasExtras.toFixed(2)}`;
        document.getElementById('resDeducciones').textContent = `$${deducciones.toFixed(2)}`;
        document.getElementById('resSalarioNeto').textContent = `$${data.salarioNeto.toFixed(2)}`;

        // Mostrar la sección de resultados
        document.getElementById('resultado').classList.remove('hidden');
        document.getElementById('descargarPDF').classList.remove('hidden'); // Mostrar botón de descarga
    } else {
        alert('Error al calcular el salario.');
    }
});


// Botón Descargar PDF
document.getElementById('descargarPDF').addEventListener('click', async () => {
    const salarioBase = parseFloat(document.getElementById('salarioBase').value);
    const horasExtras = parseFloat(document.getElementById('horasExtras').value);
    const pagoHoraExtra = parseFloat(document.getElementById('pagoHoraExtra').value);
    const deducciones = parseFloat(document.getElementById('deducciones').value);

    // Generar PDF
    const pdfResponse = await fetch('/download_pdf/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ salarioBase, horasExtras, pagoHoraExtra, deducciones }),
    });

    if (pdfResponse.ok) {
        const blob = await pdfResponse.blob();
        const url = window.URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = 'nomina_report.pdf'; // Nombre del archivo
        document.body.appendChild(a);
        a.click();
        a.remove();

        window.URL.revokeObjectURL(url); // Liberar memoria
    } else {
        alert('Error al generar el PDF.');
    }
});
