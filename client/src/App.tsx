import React, { Suspense, lazy } from "react";
import { HashRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { useAppContext } from "./context/useContext";

// Lazy-loaded pages
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Login = lazy(() => import("./pages/Login"));
const Deposit = lazy(() => import("./pages/Deposit"));
const DepositCrypto = lazy(() => import("./pages/DepositCrypto"));
const ChooseRecipientCountry = lazy(() => import("./pages/ChooseRecipientCountry"));
const Transfer = lazy(() => import("./pages/Transfer"));
const Wallet = lazy(() => import("./pages/Wallet"));
const Swap = lazy(() => import("./pages/Swap"));
const History = lazy(() => import("./pages/History"));
const Settings = lazy(() => import("./pages/Settings"));
const CreateAccount = lazy(() => import("./pages/CreateAccount"));
const ConfirmEmail = lazy(() => import("./pages/ConfirmEmail"));
const AboutSelf = lazy(() => import("./pages/AboutSelf"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const PasswordReset = lazy(() => import("./pages/PasswordReset"));
const TransactionDashboard = lazy(() => import("./pages/TransactionDashboard"));
const SideNav = lazy(() => import("./components/side-nav/SideNav"));

// Layout for pages that need sidebar
const SideNavLayout: React.FC = () => {
  const { sidebarOpen } = useAppContext();

  return (
    <div className="flex min-h-screen bg-white dark:bg-gray-800">
      {sidebarOpen !== undefined && <SideNav />}
      <div className="flex-1">
        <Outlet />
      </div>
    </div>
  );
};

// Layout for pages without sidebar
const NonSideNavLayout: React.FC = () => (
  <div className="min-h-screen bg-white dark:bg-gray-800">
    <Outlet />
  </div>
);


const App: React.FC = () => {
  return (
    <HashRouter>
      <Suspense fallback={<div className="text-center p-8">Loading...</div>}>
        <Routes>
          {/* Redirect root */}
          <Route path="/" element={<Navigate to="/dashboard" />} />

          {/* Dashboard pages (with SideNav) */}
          <Route element={<SideNavLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
          </Route>

          {/* Auth pages (no SideNav) */}
          <Route element={<NonSideNavLayout />}>
            <Route path="/traction" element={<TransactionDashboard />} />
            <Route path="/wallet" element={<Wallet />} />
            <Route path="/swap" element={<Swap />} />
            <Route path="/deposit" element={<Deposit />} />
            <Route path="/deposit-crypto" element={<DepositCrypto />} />
            <Route path="/choose-recipient-country" element={<ChooseRecipientCountry />} />
            <Route path="/transfer" element={<Transfer />} />
            <Route path="/history" element={<History />} />
            <Route path="/settings" element={<Settings />} />

            <Route path="/login" element={<Login />} />
            <Route path="/create-account" element={<CreateAccount />} />
            <Route path="/confirm-email" element={<ConfirmEmail />} />
            <Route path="/about-self" element={<AboutSelf />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/password-reset" element={<PasswordReset />} />
          </Route>
        </Routes>
      </Suspense>
    </HashRouter>
  );
};

export default App;
