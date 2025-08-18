import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
} from "react";

type Theme = "light" | "dark" | "system";

interface AppContextProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  isAddMoneyModalOpen: boolean;
  setIsAddMoneyModalOpen: (open: boolean) => void;
  isSendMoneyModalOpen: boolean;
  setIsSendMoneyModalOpen: (open: boolean) => void;
  selectedCountryForTransfer: any;
  setSelectedCountryForTransfer: (country: any) => void;
  theme: Theme;
  toggleTheme: () => void;
  setTheme: React.Dispatch<React.SetStateAction<Theme>>;
}

const AppContext = createContext<AppContextProps | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isAddMoneyModalOpen, setIsAddMoneyModalOpen] = useState(false);
  const [isSendMoneyModalOpen, setIsSendMoneyModalOpen] = useState(false);

  const [selectedCountryForTransfer, setSelectedCountryForTransfer] =
    useState<any>(() => {
      const saved = localStorage.getItem("selectedCountryForTransfer");
      try {
        return saved ? JSON.parse(saved) : null;
      } catch (e) {
        console.error("Error parsing selectedCountryForTransfer:", e);
        return null;
      }
    });

  const [theme, setTheme] = useState<Theme>(
    (localStorage.getItem("theme") as Theme) || "system"
  );

  // Get system theme
  const getSystemTheme = () =>
    window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";

  // Apply theme
  useEffect(() => {
    const root = window.document.documentElement;
    const systemTheme = getSystemTheme();

    const effectiveTheme = theme === "system" ? systemTheme : theme;

    if (effectiveTheme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }

    localStorage.setItem("theme", theme);
  }, [theme]);

  // Watch for system theme changes when theme = "system"
  useEffect(() => {
    if (theme !== "system") return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const handleChange = () => {
      const root = document.documentElement;
      if (mediaQuery.matches) {
        root.classList.add("dark");
      } else {
        root.classList.remove("dark");
      }
    };

    mediaQuery.addEventListener("change", handleChange);
    handleChange();

    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [theme]);

  // Save selectedCountryForTransfer
  useEffect(() => {
    if (selectedCountryForTransfer !== null) {
      localStorage.setItem(
        "selectedCountryForTransfer",
        JSON.stringify(selectedCountryForTransfer)
      );
    }
  }, [selectedCountryForTransfer]);

  const toggleTheme = () => {
    setTheme((prev) =>
      prev === "light" ? "dark" : prev === "dark" ? "system" : "light"
    );
  };

  return (
    <AppContext.Provider
      value={{
        sidebarOpen,
        setSidebarOpen,
        isAddMoneyModalOpen,
        setIsAddMoneyModalOpen,
        isSendMoneyModalOpen,
        setIsSendMoneyModalOpen,
        selectedCountryForTransfer,
        setSelectedCountryForTransfer,
        theme,
        setTheme,
        toggleTheme,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useAppContext must be used within an AppProvider");
  }
  return context;
};
