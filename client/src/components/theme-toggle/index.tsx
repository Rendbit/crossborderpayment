import React from "react";
import { useAppContext } from "../../context/useContext";

type ThemeToggleProps = {
  type?: "full" | "icon";
};

export default function ThemeToggle({ type = "full" }: ThemeToggleProps) {
  const { theme, toggleTheme } = useAppContext();

  return (
    <button
      onClick={toggleTheme}
      className="px-3 py-2 cursor-pointer rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800"
      aria-label="Toggle theme"
    >
      {type === "icon"
      ? theme === "light"
        ? "🌙"
        : theme === "dark"
        ? "☀️"
        : "🖥️"
      : type === "full"
      ? theme === "light"
        ? "🌙 Dark Mode"
        : theme === "dark"
        ? "🖥️ System"
        : "☀️ Light Mode"
      : null}
    </button>
  );
}
