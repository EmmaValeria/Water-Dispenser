import { useEffect, useState } from 'react';
import { WaterContainer } from './WaterContainer.tsx';
import { Card, CardHeader, CardTitle, CardContent } from './Card.tsx';
import { Settings, Clock, RefreshCw, DropletIcon } from "lucide-react";

interface DashboardProps {
  initialLevel?: number;
}

export default function Dashboard({ initialLevel = 0 }: DashboardProps) {
    // Estados para almacenar datos del sensor
    const [deviceId, setDeviceId] = useState<string | null>(null);
    const [devices, setDevices] = useState<string[]>([]);
    const [peso, setPeso] = useState<number>(0);
    const [distancia, setDistancia] = useState<number>(0);
    const [objetivoAlcanzado, setObjetivoAlcanzado] = useState<boolean>(false);
    const [objetoPresente, setObjetoPresente] = useState<boolean>(false);
    const [lastUpdate, setLastUpdate] = useState<string>('');
    const [level, setLevel] = useState<number>(initialLevel);
    const [targetWeight, setTargetWeight] = useState<number>(300);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [isDispensing, setIsDispensing] = useState<boolean>(false);

    // URL del servidor - ACTUALIZAR CON LA IP CORRECTA
    const serverUrl = "http://localhost:8080"; // O usa una variable de entorno

    // Cargar la lista de dispositivos disponibles
    useEffect(() => {
        const fetchDevices = async () => {
            try {
                const response = await fetch(`${serverUrl}/api/device-list`);
                if (!response.ok) {
                    throw new Error(`Error: ${response.status}`);
                }
                
                const data = await response.json();
                setDevices(data.devices || []);
                
                // Seleccionar automáticamente el primer dispositivo si hay alguno
                if (data.devices && data.devices.length > 0 && !deviceId) {
                    setDeviceId(data.devices[0]);
                }
                
                setError(null);
            } catch (err) {
                console.error('Error al cargar dispositivos:', err);
                setError('Error al cargar dispositivos');
            }
        };

        fetchDevices();
        
        // Actualizar lista de dispositivos periódicamente
        const intervalId = setInterval(fetchDevices, 30000); // cada 30 segundos
        return () => clearInterval(intervalId);
    }, []);

    // Cargar datos del dispositivo seleccionado
    useEffect(() => {
        if (!deviceId) return;
        
        const fetchData = async () => {
            try {
                setLoading(true);
                const response = await fetch(`${serverUrl}/api/devices`);
                if (!response.ok) {
                    throw new Error(`Error: ${response.status}`);
                }
                
                const data = await response.json();
                if (data.devices && data.devices[deviceId]) {
                    const deviceData = data.devices[deviceId];
                    setPeso(deviceData.peso || 0);
                    setDistancia(deviceData.distancia || 0);
                    setObjetivoAlcanzado(deviceData.objetivo_alcanzado || false);
                    setObjetoPresente(deviceData.objeto_presente || false);
                    setLastUpdate(new Date().toLocaleTimeString());
                    
                    // Calcular nivel como porcentaje
                    const newLevel = Math.min(100, Math.max(0, (deviceData.peso / targetWeight) * 100));
                    setLevel(newLevel);
                    
                    // Determinar si está dispensando (si hay objeto presente y no se ha alcanzado el objetivo)
                    setIsDispensing(deviceData.objeto_presente && !deviceData.objetivo_alcanzado);
                }
                
                setError(null);
            } catch (err) {
                console.error('Error al cargar datos:', err);
                setError('Error al cargar datos');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
        
        // Actualizar datos cada 3 segundos
        const intervalId = setInterval(fetchData, 200);
        return () => clearInterval(intervalId);
    }, [deviceId, targetWeight]);

    // Función para tarar la balanza
    const handleTare = async () => {
        if (!deviceId) return;
        
        try {
            setLoading(true);
            const response = await fetch(`${serverUrl}/api/tare`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ deviceId }),
            });
            
            if (!response.ok) {
                throw new Error(`Error: ${response.status}`);
            }
            
            alert('Balanza tarada correctamente');
        } catch (err) {
            console.error('Error al tarar balanza:', err);
            alert('Error al tarar balanza');
        } finally {
            setLoading(false);
        }
    };

    // Función para establecer peso objetivo
    const handleSetTarget = async () => {
        if (!deviceId) return;
        
        try {
            setLoading(true);
            const response = await fetch(`${serverUrl}/api/set-target`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ deviceId, target: targetWeight }),
            });
            
            if (!response.ok) {
                throw new Error(`Error: ${response.status}`);
            }
            
            alert('Peso objetivo establecido');
        } catch (err) {
            console.error('Error al establecer peso objetivo:', err);
            alert('Error al establecer peso objetivo');
        } finally {
            setLoading(false);
        }
    };

    // Función para actualizar datos manualmente
    const handleRefresh = () => {
        if (!deviceId) return;
        
        // Actualizar lista de dispositivos
        fetch(`${serverUrl}/api/device-list`)
            .then(response => response.json())
            .then(data => {
                setDevices(data.devices || []);
            })
            .catch(err => {
                console.error('Error al actualizar dispositivos:', err);
            });
        
        // Actualizar datos del dispositivo seleccionado
        fetch(`${serverUrl}/api/devices`)
            .then(response => response.json())
            .then(data => {
                if (data.devices && data.devices[deviceId]) {
                    const deviceData = data.devices[deviceId];
                    setPeso(deviceData.peso || 0);
                    setDistancia(deviceData.distancia || 0);
                    setObjetivoAlcanzado(deviceData.objetivo_alcanzado || false);
                    setObjetoPresente(deviceData.objeto_presente || false);
                    setLastUpdate(new Date().toLocaleTimeString());
                    
                    // Calcular nivel como porcentaje
                    const newLevel = Math.min(100, Math.max(0, (deviceData.peso / targetWeight) * 100));
                    setLevel(newLevel);
                    
                    // Determinar si está dispensando
                    setIsDispensing(deviceData.objeto_presente && !deviceData.objetivo_alcanzado);
                }
            })
            .catch(err => {
                console.error('Error al actualizar datos:', err);
            });
    };
    
  return (
    <div className="flex flex-col items-center justify-start min-h-screen py-6 px-4">
      <Card className="w-[95vw]">
        <CardHeader className='flex justify-center'>
          <CardTitle className='text-center text-2x1 font-bold'>Water Dispenser</CardTitle>
          
          {/* Selector de dispositivo */}
          {/* <div className="w-full flex items-center gap-2 mt-2">
            <label htmlFor="device-select" className="text-sm font-medium text-gray-700">Dispositivo:</label>
            <select 
              id="device-select"
              className="flex-grow px-2 py-1 border border-gray-300 rounded-md text-sm"
              value={deviceId || ''}
              onChange={(e) => setDeviceId(e.target.value)}
              disabled={devices.length === 0 || loading}
            >
              {devices.length === 0 && <option value="">No hay dispositivos</option>}
              {devices.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
            <button 
              onClick={handleRefresh} 
              className="p-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100"
              title="Actualizar datos"
            >
              <RefreshCw size={18} />
            </button>
          </div> */}
          
          <p className='self-start text-lg text-sky-600 font-semibold mt-2'>Llenado del Envase</p>
          <div className="flex justify-between items-center w-full mt-4 px-2">
            <span className="font-medium text-base text-blue-800">Nivel de Llenado</span>
            <span className="text-base font-semibold text-sky-600">{level.toFixed(1)}%</span>
           </div>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-start flex-1">
          {/* Visualización del agua */}
          <WaterContainer level={level} />
          
          {/* Controles adicionales */}
          <div className="mt-4 w-full grid grid-cols-2 gap-4">
            <button
              onClick={handleTare}
              disabled={!deviceId || loading}
              className="px-3 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-700 disabled:opacity-50 text-sm"
            >
              Tarar Balanza
            </button>
            
            <div className="flex">
              <input
                type="number"
                value={targetWeight}
                onChange={(e) => setTargetWeight(Number(e.target.value))}
                className="block w-full px-2 py-2 border border-gray-300 rounded-l-md text-sm"
                min="0"
                step="10"
              />
              <button
                onClick={handleSetTarget}
                disabled={!deviceId || loading}
                className="px-2 py-2 bg-blue-600 text-white rounded-r-md hover:bg-blue-500 disabled:opacity-50 text-sm"
              >
                Fijar
              </button>
            </div>
          </div>
          
          {/* Información adicional */}
          <div className="mt-2 w-full text-center text-xs text-gray-500">
            {lastUpdate ? `Última actualización: ${lastUpdate}` : ''}
            {error && <p className="text-red-500 mt-1">{error}</p>}
          </div>
        </CardContent>
      </Card>
      
      {/* Tarjeta de estado */}
      <Card className="w-[95vw] mt-6 p-4 mb-6">
        <p className="text-lg text-sky-600 font-semibold mb-4">Estado</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full place-items-center">
            <Card className={`flex flex-col items-center justify-center p-4 w-full ${objetoPresente ? 'bg-cyan-700 text-white' : 'text-cyan-700'}`}>
              <div className="flex items-center justify-center gap-2">
                <DropletIcon className="w-5 h-5 " />
                <span className="text-base font-medium">Envase</span>
              </div>
            </Card>
            <Card className={`flex flex-col items-center justify-center p-4 w-full`}>
              <span className="text-base font-medium text-cyan-700">
                {
                  !objetivoAlcanzado 
                    ?
                      isDispensing ? 'Dispensando Agua ⚠️' : 'Sin Dispensar 💤' 
                    : 
                      'Envase Lleno ✅'
                }
              </span>
            </Card>
        </div>
      </Card>
      
      {/* Enlaces inferiores */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full place-items-center">
        <a href="/configuracion">
            <Card className="flex items-center justify-center gap-2 p-4">
            <Settings className="w-5 h-5 text-teal-600" />
            <span className="text-base font-medium text-teal-600">Configuración</span>
            </Card>
        </a>
        <a href='/historial'>
            <Card className="flex items-center justify-center gap-2 p-4">
            <Clock className="w-5 h-5 text-teal-600" />
            <span className="text-base font-medium text-teal-600">Historial</span>
            </Card>
        </a>
       </div>


    </div>
  );
}