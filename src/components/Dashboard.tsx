import { useEffect, useState } from 'react';
import { WaterContainer } from './WaterContainer.tsx';
import { Card, CardHeader, CardTitle, CardContent } from './Card.tsx';
import { Settings, Clock } from "lucide-react";


interface DashboardProps {
  initialLevel: number;
}

export default function Dashboard({ initialLevel = 0 }: DashboardProps) {
    const [level, setLevel] = useState(initialLevel); // valor de 0 a 100

    useEffect(() => {
        const interval = setInterval(() => {
        setLevel(prev => {
            if (prev >= 100) {
            clearInterval(interval);
            return 100;
            }
            return prev + 1;
        });
        }, 100); // cada 100ms sube 1%
        
        return () => clearInterval(interval);
    }, []);
    
  return (
    <div className="flex flex-col items-center justify-start min-h-screen py-6 px-4">
      <Card className="w-[95vw] h-[65vh]">
        <CardHeader className='flex justify-center'>
          <CardTitle className='text-center text-2x1 font-bold'>Water Dispenser</CardTitle>
          <p className='self-start text-lg text-sky-600 font-semibold mt-2'>Llenado del Envase</p>
          <div className="flex justify-between items-center w-full mt-4 px-2">
            <span className="text-base font-medium text-base text-blue-800">Nivel de Llenado</span>
            <span className="text-base font-semibold text-sky-600">0%</span>
           </div>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-start flex-1">
          <WaterContainer level={initialLevel} />
        </CardContent>
      </Card>
      <Card className="w-[95vw] mt-6 p-4 mb-6">
        <p className="text-lg text-sky-600 font-semibold mb-4">Estado</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full place-items-center">
            <Card className="flex items-center justify-center p-6">
            <span className="text-base font-medium text-cyan-700">Envase</span>
            </Card>
            <Card className="flex items-center justify-center p-6">
            <span className="text-base font-medium text-cyan-700">Dispensando</span>
            </Card>
        </div>
      </Card>
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

