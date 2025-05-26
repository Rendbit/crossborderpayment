import React from "react";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import Deposit from "./pages/Deposit";
import Transfer from "./pages/Transfer";
import Wallet from "./pages/Wallet";
import Swap from "./pages/Swap";
import History from "./pages/History";
import Settings from "./pages/Settings";
import CreateAccount from "./pages/CreateAccount";
import ConfirmEmail from "./pages/ConfirmEmail";
import AboutSelf from "./pages/AboutSelf";
import ForgotPassword from "./pages/ForgotPassword";
import PasswordReset from "./pages/PasswordReset";
import TransactionDashboard from "./pages/TransactionDashboard";

const App: React.FC = () => {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/traction" element={<TransactionDashboard />} />
        <Route path="/wallet" element={<Wallet />} />
        <Route path="/swap" element={<Swap />} />
        <Route path="/deposit" element={<Deposit />} />
        <Route path="/transfer" element={<Transfer />} />
        <Route path="/history" element={<History />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/login" element={<Login />} />
        <Route path="/create-account" element={<CreateAccount />} />
        <Route path="/confirm-email" element={<ConfirmEmail />} />
        <Route path="/about-self" element={<AboutSelf />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/password-reset" element={<PasswordReset />} />
      </Routes>
    </HashRouter>
  );
};

export default App;
