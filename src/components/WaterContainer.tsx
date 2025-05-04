import type { ReactNode } from 'react';

interface WaterContainerProps {
  level: number;
  isSource?: boolean;
}

export function WaterContainer({ level, isSource = false }: WaterContainerProps): React.ReactNode {
  const clampedLevel = Math.max(0, Math.min(100, level)); // Asegura que esté entre 0 y 100

  return (
    <div className="relative w-32 h-64 mx-auto border-2 border-gray-300 rounded-b-xl rounded-t-lg overflow-hidden">
      {/* Tapa del envase */}
      <div className="absolute top-0 left-0 right-0 h-4 bg-gray-200 border-b-2 border-gray-300 rounded-t-lg z-10"></div>

      {/* Agua (solo si clampedLevel > 0) */}
      {clampedLevel > 0 && (
        <div
          className="absolute bottom-0 left-0 right-0 transition-all duration-1000 ease-in-out"
          style={{
            height: `${clampedLevel}%`,
            background: `linear-gradient(to bottom, ${isSource ? '#60a5fa, #3b82f6' : '#38bdf8, #0ea5e9'})`,
            boxShadow: `0 0 10px rgba(${isSource ? '59, 130, 246' : '14, 165, 233'}, 0.5) inset`,
          }}
        >
          {/* Efecto de ondas */}
          <div className="absolute top-0 left-0 right-0 h-2 bg-blue-300 opacity-50 animate-pulse"></div>
        </div>
      )}

      {/* Marcas de medición */}
      <div className="absolute inset-0 flex flex-col justify-between py-8 pointer-events-none">
        <div className="w-2 h-0.5 bg-gray-400 ml-0"></div>
        <div className="w-4 h-0.5 bg-gray-400 ml-0 flex items-center">
          <span className="text-xs text-gray-500 ml-5">75%</span>
        </div>
        <div className="w-2 h-0.5 bg-gray-400 ml-0"></div>
        <div className="w-4 h-0.5 bg-gray-400 ml-0 flex items-center">
          <span className="text-xs text-gray-500 ml-5">50%</span>
        </div>
        <div className="w-2 h-0.5 bg-gray-400 ml-0"></div>
        <div className="w-4 h-0.5 bg-gray-400 ml-0 flex items-center">
          <span className="text-xs text-gray-500 ml-5">25%</span>
        </div>
        <div className="w-2 h-0.5 bg-gray-400 ml-0"></div>
      </div>

      {/* Burbujas animadas */}
      {clampedLevel > 0 && (
        <>
          <div className="absolute bottom-2 left-3 w-1.5 h-1.5 bg-blue-200 rounded-full animate-bubble1 opacity-70"></div>
          <div className="absolute bottom-2 left-8 w-2 h-2 bg-blue-200 rounded-full animate-bubble2 opacity-70"></div>
          <div className="absolute bottom-2 right-5 w-1 h-1 bg-blue-200 rounded-full animate-bubble3 opacity-70"></div>
        </>
      )}
    </div>
  );
}
