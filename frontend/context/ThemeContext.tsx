"use client";

// frontend/context/ThemeContext.tsx
import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { THEMES, ThemeName } from "@/themes";

type ThemeContextType = {
    theme: ThemeName;
    setTheme: (theme: ThemeName) => void;
};

const ThemeContext = createContext<ThemeContextType>({
    theme: "default",
    setTheme: () => { },
});

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
    const [theme, setThemeState] = useState<ThemeName>("default");
    // console.log("Current theme:", theme);
    // console.log("Background image for theme:", THEMES[theme].backgroundImage);
    // Load from localStorage on mount
    useEffect(() => {
        const savedTheme = localStorage.getItem("theme") as ThemeName | null;
        if (savedTheme && THEMES[savedTheme]) {
            setThemeState(savedTheme);
        }
    }, []);

    // Save to localStorage whenever theme changes
    const setTheme = (newTheme: ThemeName) => {
        setThemeState(newTheme);
        localStorage.setItem("theme", newTheme);
    };


    return (
        <ThemeContext.Provider value={{ theme, setTheme }}>
            <div
                data-theme={theme}
                className={`${THEMES[theme].backgroundColor} ${THEMES[theme].textColor} min-h-screen transition-colors duration-500`}
                style={
                    THEMES[theme].backgroundImage
                        ? { backgroundImage: THEMES[theme].backgroundImage, backgroundSize: "cover", backgroundRepeat: "no-repeat", backgroundPosition: "center" }
                        : {}
                }
            >
                {children}
            </div>
        </ThemeContext.Provider>
    );
};

export const useTheme = () => useContext(ThemeContext);
