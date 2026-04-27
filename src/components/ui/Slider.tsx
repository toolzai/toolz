import React, { InputHTMLAttributes } from "react";

interface SliderProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  activeColor?: string;
  trackColor?: string;
}

export function Slider({
  value,
  min,
  max,
  step = 1,
  onChange,
  activeColor = "#f97316", // Tailwind orange-500
  trackColor = "#e4e4e7", // Tailwind zinc-200
  className = "",
  ...props
}: SliderProps) {
  // Ensure we don't divide by zero if min === max
  const range = max - min;
  const percentage = range === 0 ? 0 : Math.max(0, Math.min(100, ((value - min) / range) * 100));

  const style = {
    background: `linear-gradient(to right, ${activeColor} ${percentage}%, ${trackColor} ${percentage}%)`,
  };

  return (
    <input
      type="range"
      value={value}
      min={min}
      max={max}
      step={step}
      onChange={(e) => onChange(Number(e.target.value))}
      style={{ ...style, ...props.style }}
      className={`w-full h-1.5 rounded-full appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-orange-300 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-orange-500 [&::-webkit-slider-thumb]:rounded-full hover:[&::-webkit-slider-thumb]:bg-orange-600 [&::-webkit-slider-thumb]:transition-colors [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:bg-orange-500 [&::-moz-range-thumb]:border-none [&::-moz-range-thumb]:rounded-full hover:[&::-moz-range-thumb]:bg-orange-600 ${className}`}
      {...props}
    />
  );
}
