import React, { useEffect, useState } from 'react'
import { useAppContext } from '../context/useContext';
import { FaExchangeAlt } from 'react-icons/fa';
import TopNav from '../components/top-nav/TopNav';
import { HiOutlineDocumentCurrencyDollar } from 'react-icons/hi2';
import { MdUpload, MdCalendarToday } from 'react-icons/md';
import Alert from '../components/alert/Alert';
import { X } from 'lucide-react';
import OTPInput from 'react-otp-input';

const RecurringPayment = () => {

    const { setIsRequestPaymentModalOpen } = useAppContext();
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('crypto');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [loading, setLoading] = useState<boolean>(false);
    const [isPrivateKeyModalOpen, setIsPrivateKeyModalOpen] = useState<boolean>(false);
    const [msg, setMsg] = useState("");
    const [alertType, setAlertType] = useState("");
    const BASE_URL = import.meta.env.VITE_BASE_URL;
    const API_KEY = import.meta.env.VITE_API_KEY;
    const token = localStorage.getItem("token");
    const user = JSON.parse(localStorage.getItem("userData") || "{}");
    const [transactionPin, setTransactionPin] = useState<any>("");

    const [formData, setFormData] = useState({
        amount: '',
        currency: '',
        toUser: '',
        paymentMethod: 'crypto',
        // paymentMethod: selectedPaymentMethod,
        expiresIn: '',
        description: '',

        frequency: 'weekly',
    });

    useEffect(() => {
        setIsRequestPaymentModalOpen(false)
        console.log(user.pinCode);
        
    },[])

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleBannerUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            setFormData(prev => ({ ...prev, banner: file }));
        }
    };

    const proceedAndMakePaymentRequest = async () => {
        if(!transactionPin){
            setMsg("Please enter your transaction PIN.");
            setAlertType("error");
            return;
        }
        if(transactionPin !== user.pinCode) {
            setMsg("Invalid transaction PIN.");
            setAlertType("error");
            return;
        }
        // Handle continue action
        try {
            setIsLoading(true);
    
            // Prepare the payload according to the API structure
            const payload = {
                amount: formData.amount,
                currency: formData.currency,
                toUser: formData.toUser,
                paymentMethod: selectedPaymentMethod, // 'crypto' or 'fiat'
                expiresIn: formData.expiresIn,
                description: formData.description,
            };
    
            console.log('Payload:', payload);
            const requestUrl = localStorage.getItem("paymentMethod") === "one-time"
                ? `${BASE_URL}/paymentRequest/create`
                : `${BASE_URL}/recurringPayment/create`;
    
            // Make your API call here
            const response = await fetch(requestUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                    "x-api-key": `${API_KEY}`,
                    // "x-api-key": `${API_KEY}`,
                },
                body: JSON.stringify(payload)
            });
    
            const data = await response.json();
            setMsg(data.message);
            setAlertType(data.success ? "success" : "error");
            console.log('Response:', data);
            // Handle success
    
        } catch (error) {
            console.error('Error:', error);
            // Handle error
        } finally {
            setIsLoading(false);
        }
    };

    const handleProceed = async () => {
        setIsPrivateKeyModalOpen(true);
    };

  return (
    <main className="flex-1 p-4 sm:p-6 lg:p-8 text-gray-900 dark:text-gray-100">
        {msg && <Alert msg={msg} setMsg={setMsg} alertType={alertType} />}
        <TopNav page="Request Payment" />
        <div className="flex items-center justify-center min-h-screen p-4 sm:p-6 lg:p-8">
            <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
                {/* <div className='flex items-center justify-center gap-6 mb-5'>
                    <button 
                        onClick={() => setSelectedPaymentMethod('crypto')} 
                        className={selectedPaymentMethod === "crypto" 
                            ? 'px-8 border border-[#0E7BB2] bg-[#0E7BB2]/10 rounded-[6px] py-[6px] w-full text-[#0E7BB2] font-medium transition-colors' 
                            : 'px-8 border border-gray-300 dark:border-gray-600 rounded-[6px] py-[6px] w-full hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors'}
                    >
                        Crypto
                    </button>
                    <button 
                        onClick={() => setSelectedPaymentMethod('fiat')} 
                        className={selectedPaymentMethod === "fiat" 
                            ? 'px-8 border border-[#0E7BB2] bg-[#0E7BB2]/10 rounded-[6px] py-[6px] w-full text-[#0E7BB2] font-medium transition-colors' 
                            : 'px-8 border border-gray-300 dark:border-gray-600 rounded-[6px] py-[6px] w-full hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors'}
                    >
                        Fiat
                    </button>
                </div> */}
                
                {/* Icon */}
                <div className="flex justify-center items-center py-4">
                    <span className="bg-[#E7F1F7] dark:bg-gray-700 p-3 rounded-full">
                        <HiOutlineDocumentCurrencyDollar className="text-gray-900 dark:text-gray-100 w-6 h-6" />
                    </span>
                </div>

                {/* Heading */}
                {
                    localStorage.getItem("paymentMethod") === "one-time" ?
                    <h2 className="text-center text-xl font-semibold mb-6">
                        One time payment
                    </h2>
                    :
                    <h2 className="text-center text-xl font-semibold mb-6">
                        Recurring payment
                    </h2>
                }

                {/* Form */}
                <div className="space-y-5">
                    {/* Amount */}
                    <div>
                        <label className="block text-sm font-medium mb-2">Amount</label>
                        <input
                            type="text"
                            name="amount"
                            placeholder="Amount"
                            value={formData.amount}
                            onChange={handleInputChange}
                            className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#0E7BB2]"
                        />
                    </div>

                    {/* To User */}
                    <div>
                        <label className="block text-sm font-medium mb-2">To User</label>
                        <input
                            type="text"
                            name="toUser"
                            placeholder="Recipient username or ID"
                            value={formData.toUser}
                            onChange={handleInputChange}
                            className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#0E7BB2]"
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-medium mb-2">Description</label>
                        <input
                            type="text"
                            name="description"
                            placeholder="Description"
                            value={formData.description}
                            onChange={handleInputChange}
                            className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#0E7BB2]"
                        />
                    </div>

                    {/* Currency Selection */}
                    <div>
                        <label className="block text-sm font-medium mb-2">Currency</label>
                        <select
                            name="currency"
                            value={formData.currency}
                            onChange={handleInputChange}
                            className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#0E7BB2]"
                        >
                            <option value="">Select a currency</option>
                            <option value="NGNC">NGN - Nigerian Naira</option>
                            <option value="GHSC">GHSC - Ghanaian Cedi</option>
                            <option value="KESC">KES - Kenyan Shilling</option>
                            <option value="NATIVE">XLM - Stellar Token</option>
                        </select>
                    </div>
                    
                    {/* Expires In */}
                    <div>
                        <label className="block text-sm font-medium mb-2">Expires in</label>
                        <div className="relative">
                            <input
                                type="number"
                                name="expiresIn"
                                placeholder="Number of Days"
                                value={formData.expiresIn}
                                onChange={handleInputChange}
                                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#0E7BB2]"
                            />
                            {/* <MdCalendarToday className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 w-5 h-5" /> */}
                        </div>
                    </div>

                    {/* Frequency */}
                    {
                        localStorage.getItem("paymentMethod") === "recurring" &&
                        <div>
                            <label className="block text-sm font-medium mb-3">Frequency</label>
                            <div className="space-y-2.5">
                                {['daily', 'weekly', 'monthly', 'yearly'].map((freq) => (
                                    <label key={freq} className="flex items-center cursor-pointer">
                                        <input
                                            type="radio"
                                            name="frequency"
                                            value={freq}
                                            checked={formData.frequency === freq}
                                            onChange={handleInputChange}
                                            className="w-4 h-4 text-[#0E7BB2] border-gray-300 dark:border-gray-600 focus:ring-[#0E7BB2]"
                                        />
                                        <span className="ml-3 text-gray-900 dark:text-gray-100 capitalize">{freq}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    }

                    {/* Collect User Info Checkbox */}

                    {/* Proceed Button */}
                    <button
                        onClick={handleProceed}
                        disabled={isLoading || !formData.amount || !formData.toUser || !formData.currency}
                        className="w-full bg-[#0E7BB2] hover:bg-[#0B5E8C] text-white font-medium py-3 rounded-lg transition-colors mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading ? 'Processing...' : 'Proceed'}
                    </button>
                </div>
            </div>
        </div>
        {
            isPrivateKeyModalOpen &&
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-300/90 dark:bg-black/90">
                <div className="bg-white mx-5 dark:bg-gray-800 rounded-2xl w-full max-w-lg p-6 relative">
                    {/* Close Button */}
                    <button
                        className="absolute bg-gray-100 dark:bg-gray-700 rounded-full p-1 text-[1rem] top-4 right-4 text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-100"
                        onClick={() => setIsPrivateKeyModalOpen(false)}
                    >
                    <X size={24} />
                    </button>

                    {/* Modal Header */}
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                        Confirm Payment
                    </h2>
                    <p className="text-gray-600 dark:text-gray-300 mb-6 border-b border-gray-200 dark:border-gray-700 pb-4 md:text-[16px] text-[14px]">
                        Please enter your transaction PIN to confirm this payment of
                    </p>

                    <OTPInput
                        value={transactionPin}
                        inputType="password"
                        inputStyle={{ width: "100%" }}
                        onChange={setTransactionPin}
                        numInputs={4}
                        renderSeparator={<span style={{ visibility: "hidden" }}>---</span>}
                        renderInput={(props) => (
                            <input
                            {...props}
                            placeholder="0"
                            className="text-center text-gray-700 darktext-gray-300 focus:border-[#0E7BB2] bg-white/8 border-gray-300 dark:border-[white]/50  otp-input text-[26px] font-[600] outline-none h-[68px] rounded-md border placeholder:text-[#96969659] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                        )}
                    />

                    <button
                        onClick={proceedAndMakePaymentRequest}
                        disabled={loading || !transactionPin || transactionPin.length < 4}
                        className="hover:bg-[#0c5e89] bg-[#0E7BB2] mt-3 flex justify-center items-center rounded-[10px] py-2 w-full text-white"
                    >
                    Confirm
                    {isLoading && (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    )}
                    </button>
                </div>
            </div>
        }
    </main>
  )
}

export default RecurringPayment