import React, { Suspense, lazy } from "react";
import { HashRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { useAppContext } from "./context/useContext";
import Profile from "./pages/Profile";
import PaymentLinks from "./pages/RequestPayment";
import RequestPayment from "./pages/RequestPayment";
import RecurringPayment from "./pages/RecurringOneTimePayment";

// Lazy-loaded pages
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Login = lazy(() => import("./pages/Login"));
const Deposit = lazy(() => import("./pages/Deposit"));
const DepositCrypto = lazy(() => import("./pages/DepositCrypto"));
const ChooseRecipientDepositCountry = lazy(
  () => import("./pages/ChooseRecipientDepositCountry")
);
const ChooseRecipientTransferCountry = lazy(
  () => import("./pages/ChooseRecipientTransferCountry")
);
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
const AnchorDepositMethod = lazy(() => import("./pages/AnchorDepositMethod"));
const AnchorTransferMethod = lazy(() => import("./pages/AnchorTransferMethod"));
const TransactionDashboard = lazy(() => import("./pages/TransactionDashboard"));
const SendCrypto = lazy(() => import("./pages/SendCrypto"));
const SideNav = lazy(() => import("./components/side-nav/SideNav"));
const SendMoneyModal = lazy(() => import("./components/modals/send-money"));
const AddMoneyModal = lazy(() => import("./components/modals/add-money"));
const RequestPaymentModal = lazy(() => import("./components/modals/request-payment"));

// Layout for pages that need sidebar
const SideNavLayout: React.FC = () => {
  const {
    sidebarOpen,
    isAddMoneyModalOpen,
    isSendMoneyModalOpen,
    isRequestPaymentModalOpen
  } = useAppContext();

  return (
    <div className="flex min-h-screen bg-white dark:bg-gray-800">
      <div className="h-screen fixed">
        {sidebarOpen !== undefined && <SideNav />}
      </div>
      {isAddMoneyModalOpen && <AddMoneyModal />}
      {isSendMoneyModalOpen && <SendMoneyModal />}
      {isRequestPaymentModalOpen && <RequestPaymentModal />}

      <div className="flex-1 lg:ml-[240px] ml-0">
        <Outlet />
      </div>
    </div>
  );
};

// Layout for pages without sidebar
const NonSideNavLayout: React.FC = () => {
  const { isAddMoneyModalOpen, isSendMoneyModalOpen, isRequestPaymentModalOpen } =
    useAppContext();
  return (
    <div className="min-h-screen bg-white dark:bg-gray-800">
      {isAddMoneyModalOpen && <AddMoneyModal />}
      {isSendMoneyModalOpen && <SendMoneyModal />}
      {isRequestPaymentModalOpen && <RequestPaymentModal />}

      <Outlet />
    </div>
  );
};

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
            <Route path="/request-payment" element={<RequestPayment />} />
            <Route path="/recurring-one-time-payment" element={<RecurringPayment />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/history" element={<History />} />
            <Route path="/profile" element={<Profile />} />
          </Route>

          {/* Auth pages (no SideNav) */}
          <Route element={<NonSideNavLayout />}>
            <Route path="/traction" element={<TransactionDashboard />} />
            <Route path="/wallet" element={<Wallet />} />
            <Route path="/send-crypto" element={<SendCrypto />} />
            <Route path="/swap" element={<Swap />} />
            <Route path="/deposit" element={<Deposit />} />
            <Route path="/deposit-crypto" element={<DepositCrypto />} />
            <Route
              path="/anchor-deposit-method"
              element={<AnchorDepositMethod />}
            />
            <Route
              path="/anchor-transfer-method"
              element={<AnchorTransferMethod />}
            />
            <Route
              path="/choose-recipient-deposit-country"
              element={<ChooseRecipientDepositCountry />}
            />
            <Route
              path="/choose-recipient-transfer-country"
              element={<ChooseRecipientTransferCountry />}
            />
            <Route path="/transfer" element={<Transfer />} />

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
