import React from "react";

interface LogoProps {
  className?: string;
  size?: number | string;
}

// 🏢 JANUZEN Global / Enterprise Corporate Logo
export function JanuzenLogo({ className = "", size = 40 }: LogoProps) {
  return (
    <img
      src="/logo.png"
      alt="JANUZEN Global Logo"
      className={`inline-block object-contain transition-transform duration-300 ${className}`}
      style={{ width: size, height: size }}
    />
  );
}

// 🏥 NUTHAN MEDICALS Logo
export function NuthanMedicalsLogo({ className = "", size = 40 }: LogoProps) {
  return (
    <img
      src="/nuthan_medicals.png"
      alt="Nuthan Medicals Logo"
      className={`inline-block object-contain transition-transform duration-300 ${className}`}
      style={{ width: size, height: size }}
    />
  );
}

// 🖋️ JA STATIONERY Logo
export function JaStationeryLogo({ className = "", size = 40 }: LogoProps) {
  return (
    <img
      src="/ja_stationery.png"
      alt="JA Stationery Logo"
      className={`inline-block object-contain transition-transform duration-300 ${className}`}
      style={{ width: size, height: size }}
    />
  );
}

// ✨ LEVRA Everyday Essentials Logo
export function LevraLogo({ className = "", size = 40 }: LogoProps) {
  const [imgError, setImgError] = React.useState(false);
  const sizeNum = typeof size === "number" ? size : parseInt(String(size), 10) || 40;

  if (imgError) {
    return (
      <div 
        className={`inline-flex items-center justify-center rounded-lg bg-gradient-to-tr from-purple-600 to-indigo-600 text-white font-bold font-serif ${className}`}
        style={{ width: sizeNum, height: sizeNum, fontSize: Math.max(12, sizeNum * 0.4) }}
      >
        L
      </div>
    );
  }

  return (
    <img
      src="/levra.png"
      alt="Levra Logo"
      onError={() => setImgError(true)}
      className={`inline-block object-contain transition-transform duration-300 ${className}`}
      style={{ width: size, height: size }}
    />
  );
}

// Backwards compatibility alias
export const ZenoraLogo = LevraLogo;
