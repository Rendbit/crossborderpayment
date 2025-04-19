import React from "react";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import Deposit from "./pages/Deposit";
import DepositCrypto from "./pages/DepositCrypto";
import DepositeFiat from "./pages/DepositFiat";
import Withdraw from "./pages/Withdraw";
import WithdrawCrypto from "./pages/WithdrawCrypto";
import WithdrawFiat from "./pages/WithdrawFiat";
import WithdrawProvider from "./pages/WithdrawProvider";
import DepositProvider from "./pages/DepositProvider";
import Wallet from "./pages/Wallet";
import Swap from "./pages/Swap";
import History from "./pages/History";
import Settings from "./pages/Settings";
import CreateAccount from "./pages/CreateAccount";
import ConfirmEmail from "./pages/ConfirmEmail";
import AboutSelf from "./pages/AboutSelf";
import ForgotPassword from "./pages/ForgotPAssword";
import PasswordReset from "./pages/PasswordReset";

const App: React.FC = () => {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/wallet" element={<Wallet />} />
        <Route path="/swap" element={<Swap />} />
        <Route path="/deposit" element={<Deposit />} />
        <Route path="/deposit-crypto" element={<DepositCrypto />} />
        <Route path="/deposit-fiat" element={<DepositeFiat />} />
        <Route path="/deposit-provider" element={<DepositProvider />} />
        <Route path="/withdraw" element={<Withdraw />} />
        <Route path="/withdraw-crypto" element={<WithdrawCrypto />} />
        <Route path="/withdraw-fiat" element={<WithdrawFiat />} />
        <Route path="/withdraw-provider" element={<WithdrawProvider />} />
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
