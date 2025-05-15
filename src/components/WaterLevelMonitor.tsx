// src/components/WaterLevelMonitor.tsx
import { useState, useEffect } from 'react';
import { WaterContainer } from './WaterContainer';

// Interfaces para TypeScript
interface DeviceData {
  peso: number;
  distancia: number;
  objetivo_alcanzado: boolean;
  objeto_presente: boolean;
  timestamp: string;
}

interface DevicesResponse {
  devices: {
    [deviceId: string]: DeviceData;
  };
  count: number;
  timestamp: string;
}

interface DeviceListResponse {
  devices: string[];
  count: number;
}

export function WaterLevelMonitor() {
  const [devices, setDevices] = useState<string[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);
  const [deviceData, setDeviceData] = useState<{[deviceId: string]: DeviceData}>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [targetWeight, setTargetWeight] = useState<number>(300);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);

  // URL del servidor - IMPORTANTE: Actualiza esto con la URL correcta
  const serverUrl = import.meta.env.PUBLIC_SERVER_URL || "http://localhost:8080";

  // Función para cargar la lista de dispositivos
  const loadDevices = async () => {
    try {
      const response = await fetch(`${serverUrl}/api/device-list`);
      if (!response.ok) {
        throw new Error(`Error en la solicitud: ${response.status}`);
      }
      
      const data: DeviceListResponse = await response.json();
      setDevices(data.devices);
      
      // Seleccionar automáticamente el primer dispositivo si hay alguno y ninguno está seleccionado
      if (data.devices.length > 0 && !selectedDevice) {
        setSelectedDevice(data.devices[0]);
      }
      
      setError(null);
    } catch (err) {
      console.error('Error al cargar dispositivos:', err);
      setError('No se pudieron cargar los dispositivos. Verifica la conexión al servidor.');
    }
  };

  // Función para cargar los datos de los dispositivos
  const loadDeviceData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${serverUrl}/api/devices`);
      if (!response.ok) {
        throw new Error(`Error en la solicitud: ${response.status}`);
      }
      
      const data: DevicesResponse = await response.json();
      setDeviceData(data.devices);
      setLastUpdate(new Date().toLocaleTimeString());
      setError(null);
    } catch (err) {
      console.error('Error al cargar datos de dispositivos:', err);
      setError('No se pudieron cargar los datos. Verifica la conexión al servidor.');
    } finally {
      setLoading(false);
    }
  };

  // Cargar dispositivos y datos al montar el componente
  useEffect(() => {
    loadDevices();
    loadDeviceData();
    
    // Configurar intervalo para actualizar datos automáticamente
    const intervalId = setInterval(() => {
      loadDeviceData();
    }, 3000); // Actualizar cada 3 segundos
    
    // Limpiar intervalo al desmontar
    return () => clearInterval(intervalId);
  }, []);

  // Calcular el porcentaje de nivel para WaterContainer
  const calculateWaterPercentage = (): number => {
    if (!selectedDevice || !deviceData[selectedDevice]) return 0;
    
    const data = deviceData[selectedDevice];
    const max = data.objetivo_alcanzado ? 100 : (data.peso / targetWeight) * 100;
    return Math.min(Math.max(0, max), 100);
  };

  const waterPercentage = calculateWaterPercentage();
  const selectedDeviceData = selectedDevice ? deviceData[selectedDevice] : null;

  // Función para manejar la tara (reinicio) del peso
  const handleTare = async () => {
    if (!selectedDevice) return;
    
    try {
      // Esta función simula el envío de un comando al ESP32
      // En una implementación real, necesitarías una ruta en el servidor
      // que reenvíe este comando al ESP32
      const response = await fetch(`${serverUrl}/api/tare`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          deviceId: selectedDevice
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }
      
      alert('Comando de tara enviado. Espera a que el dispositivo procese la solicitud.');
    } catch (err) {
      console.error('Error al enviar comando tare:', err);
      alert('Error al enviar comando. Verifica la conexión al servidor.');
    }
  };

  // Función para establecer el peso objetivo
  const handleSetTarget = async () => {
    if (!selectedDevice) return;
    
    try {
      // Esta función simula el envío de un comando al ESP32
      const response = await fetch(`${serverUrl}/api/set-target`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          deviceId: selectedDevice,
          target: targetWeight
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }
      
      alert('Nuevo peso objetivo establecido.');
    } catch (err) {
      console.error('Error al establecer peso objetivo:', err);
      alert('Error al enviar comando. Verifica la conexión al servidor.');
    }
  };

  return (
    <div className="p-4 max-w-md mx-auto bg-white rounded-xl shadow-md">
      <h2 className="text-2xl font-bold mb-4 text-blue-600">Monitor de Nivel de Agua</h2>
      
      {/* Estado de la conexión */}
      <div className="mb-4 flex items-center">
        <div className={`w-3 h-3 rounded-full mr-2 ${error ? 'bg-red-500' : 'bg-green-500'}`}></div>
        <span>{error ? 'Error de conexión' : 'Conectado al servidor'}</span>
        {lastUpdate && <span className="ml-auto text-sm text-gray-500">Última actualización: {lastUpdate}</span>}
      </div>
      
      {/* Selector de dispositivos */}
      {devices.length > 0 ? (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Seleccionar Dispositivo</label>
          <select 
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            value={selectedDevice || ''}
            onChange={(e) => setSelectedDevice(e.target.value)}
          >
            {devices.map(device => (
              <option key={device} value={device}>{device}</option>
            ))}
          </select>
        </div>
      ) : (
        <div className="mb-4 p-3 bg-yellow-100 text-yellow-800 rounded-md">
          {loading ? 'Cargando dispositivos...' : 'No hay dispositivos conectados.'}
        </div>
      )}
      
      {/* Visualización del nivel de agua usando WaterContainer */}
      <div className="mb-6 flex flex-col items-center">
        {selectedDeviceData ? (
          <>
            <div className="mb-2 text-center">
              <div className="font-medium">Nivel Actual:</div>
              <div className="text-lg">{selectedDeviceData.peso.toFixed(1)} g</div>
              <div className="text-sm text-blue-500">Meta: {targetWeight} g</div>
            </div>
            
            {/* Usar el componente WaterContainer existente */}
            <WaterContainer level={waterPercentage} isSource={false} />
            
            <div className="mt-4 grid grid-cols-2 gap-4 w-full text-sm">
              <div className="p-2 bg-gray-100 rounded-md">
                <div className="font-medium">Distancia</div>
                <div>{selectedDeviceData.distancia.toFixed(1)} cm</div>
              </div>
              <div className="p-2 bg-gray-100 rounded-md">
                <div className="font-medium">Estado</div>
                <div>{selectedDeviceData.objetivo_alcanzado ? 'Meta Alcanzada ✅' : 'Llenando...'}</div>
              </div>
              <div className="p-2 bg-gray-100 rounded-md">
                <div className="font-medium">Objeto Presente</div>
                <div>{selectedDeviceData.objeto_presente ? 'Sí ✅' : 'No ❌'}</div>
              </div>
              <div className="p-2 bg-gray-100 rounded-md">
                <div className="font-medium">Última Actualización</div>
                <div>{new Date(selectedDeviceData.timestamp).toLocaleTimeString()}</div>
              </div>
            </div>
          </>
        ) : (
          <div className="p-3 bg-gray-100 text-gray-600 rounded-md text-center">
            {loading ? 'Cargando datos...' : 'Selecciona un dispositivo para ver el nivel de agua'}
          </div>
        )}
      </div>
      
      {/* Controles */}
      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={handleTare}
          disabled={!selectedDevice || loading}
          className="px-4 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Tarar Balanza
        </button>
        
        <div>
          <div className="flex">
            <input
              type="number"
              value={targetWeight}
              onChange={(e) => setTargetWeight(Number(e.target.value))}
              className="block w-full px-3 py-2 border border-gray-300 rounded-l-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              min="0"
              step="10"
            />
            <button
              onClick={handleSetTarget}
              disabled={!selectedDevice || loading}
              className="px-2 py-2 bg-blue-600 text-white rounded-r-md hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Fijar
            </button>
          </div>
        </div>
      </div>
      
      {/* Botón para actualizar manualmente */}
      <div className="mt-4 text-center">
        <button
          onClick={() => {
            loadDevices();
            loadDeviceData();
          }}
          className="px-4 py-2 bg-blue-100 text-blue-800 rounded-md hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-300"
        >
          Actualizar datos
        </button>
      </div>
    </div>
  );
};

export default WaterLevelMonitor;