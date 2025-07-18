// frontend/components/ThemeSelector.tsx
"use client";

import { useTheme } from "@/context/ThemeContext";
import { THEMES } from "@/themes";
import { ThemeName } from "@/themes";


export default function ThemeSelector() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex gap-4 p-4">
      {Object.entries(THEMES).map(([key, config]) => (
        <button
          key={key}
          onClick={() => setTheme(key as ThemeName)}
          className={`p-4 rounded-lg shadow-md transition transform hover:scale-105
            ${theme === key ? "ring-4 ring-blue-400" : "ring-transparent"}
            ${config.backgroundColor} ${config.textColor}
          `}
        >
          {config.name}
        </button>
      ))}
    </div>
  );
}

