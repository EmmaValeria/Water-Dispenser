// server-http-completo.js
// Servidor HTTP con endpoints completos usando ES modules

import express from 'express';
import http from 'http';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Obtener dirección del archivo actual (necesario en ES modules)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Crear app Express
const app = express();

// Habilitar CORS para todas las solicitudes
app.use(cors());

// Middleware para parsear JSON
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Datos de dispositivos
const deviceData = new Map();

// Ruta para recibir datos del ESP32
app.get('/water-data', (req, res) => {
    try {
        const { deviceId, peso, distancia, objetivo_alcanzado, objeto_presente } = req.query;

        if (!deviceId) {
            return res.status(400).send('Error: deviceId es obligatorio');
        }

        // Guardar datos recibidos
        deviceData.set(deviceId, {
            timestamp: new Date().toISOString(),
            peso: parseFloat(peso) || 0,
            distancia: parseFloat(distancia) || 0,
            objetivo_alcanzado: objetivo_alcanzado === 'true',
            objeto_presente: objeto_presente === 'true',
        });

        console.log(`Datos recibidos del dispositivo ${deviceId}:`, deviceData.get(deviceId));

        // Respuesta de éxito
        res.status(200).send('Datos recibidos correctamente');
    } catch (error) {
        console.error('Error al procesar datos:', error);
        res.status(500).send('Error interno del servidor');
    }
});

// API: Obtener todos los datos de dispositivos
app.get('/api/devices', (req, res) => {
    const devices = {};
    deviceData.forEach((data, id) => {
        devices[id] = data;
    });

    res.json({
        devices: devices,
        count: deviceData.size,
        timestamp: new Date().toISOString()
    });
});

// API: Obtener la lista de dispositivos
app.get('/api/device-list', (req, res) => {
    res.json({
        devices: Array.from(deviceData.keys()),
        count: deviceData.size
    });
});

// API: Comando de tara
app.post('/api/tare', (req, res) => {
    try {
        const { deviceId } = req.body;

        if (!deviceId) {
            return res.status(400).json({
                success: false,
                message: 'Error: deviceId es obligatorio'
            });
        }

        // En un sistema real, enviarías el comando al ESP32
        // Como es una simulación, simplemente registramos el comando
        console.log(`Comando de tara enviado para el dispositivo ${deviceId}`);

        // Imaginemos que enviamos el comando al ESP32 y funciona
        // Actualizar los datos del dispositivo simulando tara
        if (deviceData.has(deviceId)) {
            const data = deviceData.get(deviceId);
            data.peso = 0; // Simular tara (peso = 0)
            deviceData.set(deviceId, {
                ...data,
                timestamp: new Date().toISOString()
            });
        }

        res.json({
            success: true,
            message: 'Comando de tara enviado correctamente'
        });
    } catch (error) {
        console.error('Error al procesar comando de tara:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

// API: Establecer peso objetivo
app.post('/api/set-target', (req, res) => {
    try {
        const { deviceId, target } = req.body;

        if (!deviceId) {
            return res.status(400).json({
                success: false,
                message: 'Error: deviceId es obligatorio'
            });
        }

        if (target === undefined) {
            return res.status(400).json({
                success: false,
                message: 'Error: target es obligatorio'
            });
        }

        const targetWeight = parseFloat(target);
        if (isNaN(targetWeight)) {
            return res.status(400).json({
                success: false,
                message: 'Error: target debe ser un número'
            });
        }

        // En un sistema real, enviarías el comando al ESP32
        console.log(`Comando para establecer peso objetivo (${targetWeight}g) enviado para el dispositivo ${deviceId}`);

        // Actualizar los datos simulando cambio de objetivo
        if (deviceData.has(deviceId)) {
            const data = deviceData.get(deviceId);

            // Actualizar si se ha alcanzado el objetivo con el nuevo peso
            const objetivo_alcanzado = data.peso >= targetWeight;

            deviceData.set(deviceId, {
                ...data,
                objetivo_alcanzado,
                timestamp: new Date().toISOString()
            });
        }

        res.json({
            success: true,
            message: 'Peso objetivo establecido correctamente',
            targetWeight
        });
    } catch (error) {
        console.error('Error al procesar comando de peso objetivo:', error);
        res.status(500).json({
            success: false,
            message: 'Error interno del servidor'
        });
    }
});

// Ruta para simular datos (útil para pruebas sin ESP32)
app.get('/simulate-data', (req, res) => {
    const deviceId = 'water-level-sensor-01';
    const peso = Math.random() * 400; // Peso aleatorio entre 0 y 400g
    const distancia = Math.random() * 10; // Distancia aleatoria entre 0 y 10cm
    const objetivo_alcanzado = peso >= 300; // Si supera 300g, objetivo alcanzado
    const objeto_presente = distancia < 5; // Si distancia menor a 5cm, objeto presente

    // Guardar datos simulados
    deviceData.set(deviceId, {
        timestamp: new Date().toISOString(),
        peso,
        distancia,
        objetivo_alcanzado,
        objeto_presente,
    });

    console.log(`Datos simulados generados para ${deviceId}:`, deviceData.get(deviceId));

    res.json({
        success: true,
        message: 'Datos simulados generados correctamente',
        data: deviceData.get(deviceId)
    });
});

// Página principal simple
app.get('/', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Monitor de Nivel de Agua</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; line-height: 1.6; }
        .container { max-width: 800px; margin: 0 auto; }
        h1 { color: #0066cc; }
        .status { padding: 15px; background: #f0f0f0; border-radius: 5px; margin: 20px 0; }
        .device { padding: 15px; margin: 10px 0; background: #e6f7ff; border-left: 5px solid #0099ff; }
        .no-devices { color: #666; font-style: italic; }
        .water-container { width: 100px; height: 200px; border: 2px solid #ccc; border-radius: 5px; position: relative; margin: 20px auto; }
        .water-level { position: absolute; bottom: 0; left: 0; right: 0; background: #3498db; transition: height 0.5s ease; }
        .refresh-btn { padding: 8px 16px; background: #0066cc; color: white; border: none; border-radius: 4px; cursor: pointer; }
        .refresh-btn:hover { background: #0055aa; }
        .btn { padding: 8px 16px; margin: 5px; background: #0066cc; color: white; border: none; border-radius: 4px; cursor: pointer; }
        .btn:hover { background: #0055aa; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background-color: #f2f2f2; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>Monitor de Nivel de Agua (Versión HTTP)</h1>
        
        <div class="status">
          <p><strong>Estado:</strong> Servidor activo</p>
          <p><strong>URL para ESP32:</strong> <code>http://${req.headers.host}/water-data</code></p>
          <p><strong>APIs disponibles:</strong></p>
          <ul>
            <li><code>GET /api/devices</code> - Obtener datos de todos los dispositivos</li>
            <li><code>GET /api/device-list</code> - Obtener lista de dispositivos</li>
            <li><code>POST /api/tare</code> - Enviar comando de tara</li>
            <li><code>POST /api/set-target</code> - Establecer peso objetivo</li>
            <li><code>GET /simulate-data</code> - Generar datos simulados (para pruebas)</li>
          </ul>
          
          <div style="margin-top: 15px;">
            <button class="btn" onclick="simulateData()">Simular datos</button>
            <button class="refresh-btn" onclick="refreshData()">Actualizar datos</button>
          </div>
        </div>
        
        <h2>Dispositivos conectados</h2>
        <div id="devices-container">
          <p class="no-devices">Cargando dispositivos...</p>
        </div>
      </div>
      
      <script>
        // Función para actualizar los datos
        function refreshData() {
          fetch('/api/devices')
            .then(response => response.json())
            .then(data => {
              const container = document.getElementById('devices-container');
              
              if (data.count === 0) {
                container.innerHTML = '<p class="no-devices">No hay dispositivos conectados.</p>';
                return;
              }
              
              let html = '<table><tr><th>Dispositivo</th><th>Peso</th><th>Distancia</th><th>Estado</th><th>Objeto</th><th>Acciones</th></tr>';
              
              for (const [id, device] of Object.entries(data.devices)) {
                const percentage = Math.min(100, Math.max(0, (device.peso / 300) * 100)).toFixed(1);
                
                html += \`
                  <tr>
                    <td>\${id}</td>
                    <td>\${device.peso.toFixed(1)} g</td>
                    <td>\${device.distancia.toFixed(1)} cm</td>
                    <td>\${device.objetivo_alcanzado ? '✅ Completo' : '⏳ Llenando'}</td>
                    <td>\${device.objeto_presente ? '✅ Presente' : '❌ Ausente'}</td>
                    <td>
                      <button class="btn" onclick="tareDevice('\${id}')">Tarar</button>
                      <button class="btn" onclick="setTarget('\${id}')">Fijar objetivo</button>
                    </td>
                  </tr>
                \`;
              }
              
              html += '</table>';
              
              // Añadir visualización
              for (const [id, device] of Object.entries(data.devices)) {
                const percentage = Math.min(100, Math.max(0, (device.peso / 300) * 100)).toFixed(1);
                
                html += \`
                  <div class="device">
                    <h3>Dispositivo: \${id}</h3>
                    <div style="display: flex;">
                      <div style="flex: 1;">
                        <p><strong>Peso:</strong> \${device.peso.toFixed(1)} g</p>
                        <p><strong>Distancia:</strong> \${device.distancia.toFixed(1)} cm</p>
                        <p><strong>Objetivo alcanzado:</strong> \${device.objetivo_alcanzado ? '✅ Sí' : '❌ No'}</p>
                        <p><strong>Objeto presente:</strong> \${device.objeto_presente ? '✅ Sí' : '❌ No'}</p>
                        <p><strong>Última actualización:</strong> \${new Date(device.timestamp).toLocaleTimeString()}</p>
                      </div>
                      <div style="flex: 0 0 120px; text-align: center;">
                        <div class="water-container">
                          <div class="water-level" style="height: \${percentage}%; background-color: \${device.objetivo_alcanzado ? '#4caf50' : '#3498db'};"></div>
                        </div>
                        <div>\${percentage}%</div>
                      </div>
                    </div>
                  </div>
                \`;
              }
              
              container.innerHTML = html;
            })
            .catch(error => {
              console.error('Error al obtener datos:', error);
              document.getElementById('devices-container').innerHTML = 
                '<p class="no-devices">Error al cargar dispositivos.</p>';
            });
        }
        
        // Función para simular datos
        function simulateData() {
          fetch('/simulate-data')
            .then(response => response.json())
            .then(data => {
              console.log('Datos simulados:', data);
              refreshData();
            })
            .catch(error => {
              console.error('Error al simular datos:', error);
              alert('Error al simular datos');
            });
        }
        
        // Función para tarar dispositivo
        function tareDevice(deviceId) {
          fetch('/api/tare', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ deviceId }),
          })
            .then(response => response.json())
            .then(data => {
              console.log('Respuesta:', data);
              if (data.success) {
                alert('Dispositivo tarado correctamente');
                refreshData();
              } else {
                alert('Error: ' + data.message);
              }
            })
            .catch(error => {
              console.error('Error:', error);
              alert('Error al tarar dispositivo');
            });
        }
        
        // Función para establecer objetivo
        function setTarget(deviceId) {
          const target = prompt('Introduce el peso objetivo (en gramos):', '300');
          if (target === null) return;
          
          const targetNum = parseFloat(target);
          if (isNaN(targetNum)) {
            alert('El peso debe ser un número');
            return;
          }
          
          fetch('/api/set-target', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ deviceId, target: targetNum }),
          })
            .then(response => response.json())
            .then(data => {
              console.log('Respuesta:', data);
              if (data.success) {
                alert('Peso objetivo establecido: ' + targetNum + 'g');
                refreshData();
              } else {
                alert('Error: ' + data.message);
              }
            })
            .catch(error => {
              console.error('Error:', error);
              alert('Error al establecer peso objetivo');
            });
        }
        
        // Cargar datos iniciales
        refreshData();
        
        // Actualizar cada 5 segundos
        setInterval(refreshData, 5000);
      </script>
    </body>
    </html>
  `);
});

// Puerto y arranque del servidor
const PORT = process.env.PORT || 8080;
const server = http.createServer(app);

server.listen(PORT, () => {
    console.log(`Servidor HTTP escuchando en http://localhost:${PORT}`);
    console.log(`ESP32 debe enviar datos a: http://TU_IP:${PORT}/water-data`);
    console.log('APIs disponibles:');
    console.log('- GET /api/devices - Obtener datos de todos los dispositivos');
    console.log('- GET /api/device-list - Obtener lista de dispositivos');
    console.log('- POST /api/tare - Comando de tara');
    console.log('- POST /api/set-target - Establecer peso objetivo');
    console.log('- GET /simulate-data - Generar datos simulados (para pruebas)');
});