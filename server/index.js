// server/index.js - Servidor Socket.IO simplificado para monitoreo de nivel de agua

import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';

// Obtener directorio actual
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Crear app Express
const app = express();

// Servir archivos estáticos desde la carpeta dist de Astro
app.use(express.static(join(__dirname, '../dist')));

// Crear servidor HTTP
const server = createServer(app);

// Crear servidor Socket.IO con configuración CORS simplificada
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Almacenar datos de cada dispositivo
const deviceData = new Map();

// Simplifiquemos los espacios de nombres para evitar problemas con path-to-regexp
const deviceIO = io.of('/device');
const clientIO = io.of('/client');

// Manejar conexiones de dispositivos (ESP32)
deviceIO.on('connection', (socket) => {
    console.log(`Dispositivo conectado: ${socket.id}`);
    let deviceId = null;

    // Manejar registro de dispositivo
    socket.on('register', (data) => {
        try {
            const parsedData = typeof data === 'string' ? JSON.parse(data) : data;

            if (parsedData && parsedData.deviceId) {
                deviceId = parsedData.deviceId;

                // Guardar referencia a este socket
                socket.deviceId = deviceId;

                // Inicializar datos para este dispositivo si no existen
                if (!deviceData.has(deviceId)) {
                    deviceData.set(deviceId, {});
                }

                console.log(`Dispositivo registrado: ${deviceId}`);

                // Notificar a todos los clientes sobre la lista de dispositivos
                clientIO.emit('device_list', {
                    devices: Array.from(deviceData.keys())
                });
            }
        } catch (error) {
            console.error('Error al procesar registro de dispositivo:', error);
        }
    });

    // Manejar actualizaciones de datos del dispositivo
    socket.on('data', (data) => {
        try {
            const parsedData = typeof data === 'string' ? JSON.parse(data) : data;

            if (deviceId) {
                // Almacenar los datos más recientes con marca de tiempo
                deviceData.set(deviceId, {
                    timestamp: new Date().toISOString(),
                    ...parsedData
                });

                // Transmitir datos a todos los clientes web
                clientIO.emit('device_data', {
                    deviceId: deviceId,
                    data: deviceData.get(deviceId)
                });
            }
        } catch (error) {
            console.error('Error al procesar datos de dispositivo:', error);
        }
    });

    // Manejar desconexión
    socket.on('disconnect', () => {
        console.log(`Dispositivo desconectado: ${socket.id}`);

        if (deviceId) {
            // Notificar a los clientes sobre la desconexión del dispositivo
            clientIO.emit('device_status', {
                deviceId: deviceId,
                status: 'offline'
            });
        }
    });
});

// Manejar conexiones de clientes web
clientIO.on('connection', (socket) => {
    console.log(`Cliente web conectado: ${socket.id}`);

    // Enviar lista inicial de dispositivos
    socket.emit('device_list', {
        devices: Array.from(deviceData.keys())
    });

    // Enviar datos más recientes de todos los dispositivos
    deviceData.forEach((data, deviceId) => {
        socket.emit('device_data', {
            deviceId: deviceId,
            data: data
        });
    });

    // Manejar comandos del cliente web a los dispositivos
    socket.on('command', (data) => {
        if (data && data.deviceId) {
            // Reenviar comando al dispositivo específico usando un evento específico
            deviceIO.emit(`command:${data.deviceId}`, data);
            console.log(`Comando enviado al dispositivo ${data.deviceId}:`, data);
        }
    });

    // Manejar desconexión
    socket.on('disconnect', () => {
        console.log(`Cliente web desconectado: ${socket.id}`);
    });
});

// Definir ruta del archivo de datos para persistencia
const DATA_FILE = join(__dirname, 'device_data.json');

// Cargar datos existentes al iniciar
async function loadSavedData() {
    try {
        await fs.access(DATA_FILE);
        const fileContent = await fs.readFile(DATA_FILE, 'utf8');
        const savedData = JSON.parse(fileContent);

        Object.entries(savedData).forEach(([key, value]) => {
            deviceData.set(key, value);
        });

        console.log(`Datos cargados para ${deviceData.size} dispositivos`);
    } catch (error) {
        if (error.code !== 'ENOENT') {
            console.error('Error al cargar datos guardados:', error);
        }
    }
}

// Guardar datos periódicamente
async function saveData() {
    try {
        const dataObject = {};
        deviceData.forEach((value, key) => {
            dataObject[key] = value;
        });

        await fs.writeFile(DATA_FILE, JSON.stringify(dataObject, null, 2));
        console.log(`Datos guardados para ${deviceData.size} dispositivos`);
    } catch (error) {
        console.error('Error al guardar datos de dispositivos:', error);
    }
}

// Guardar datos cada 5 minutos
const saveInterval = setInterval(saveData, 5 * 60 * 1000);

// Proporcionar una ruta básica para verificar que el servidor está funcionando
app.get('/status', (req, res) => {
    res.json({
        status: 'online',
        devices: Array.from(deviceData.keys()),
        uptime: process.uptime()
    });
});

// Ruta de respaldo para SPA (Single Page Application)
app.get('*', (req, res) => {
    res.sendFile(join(__dirname, '../dist/index.html'));
});

// Manejar apagado seguro
process.on('SIGINT', async () => {
    console.log('Servidor apagándose...');

    // Limpiar intervalo
    clearInterval(saveInterval);

    // Guardar datos antes de salir
    await saveData();
    console.log('Datos guardados. Saliendo...');

    process.exit(0);
});

// Iniciar el servidor
const PORT = process.env.PORT || 8080;
server.listen(PORT, async () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
    await loadSavedData();
});