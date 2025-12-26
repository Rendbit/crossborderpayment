import React, { useEffect, useState } from 'react'
import { useAppContext } from '../context/useContext';
import { FaExchangeAlt } from 'react-icons/fa';
import TopNav from '../components/top-nav/TopNav';
import { HiOutlineDocumentCurrencyDollar } from 'react-icons/hi2';
import { MdUpload, MdCalendarToday } from 'react-icons/md';
import Alert from '../components/alert/Alert';

const RecurringPayment = () => {

    const { setIsRequestPaymentModalOpen } = useAppContext();
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('crypto');
    const [isLoading, setIsLoading] = useState(false);
    const [msg, setMsg] = useState("");
    const [alertType, setAlertType] = useState("");
    const BASE_URL = import.meta.env.VITE_BASE_URL;
    const API_KEY = import.meta.env.VITE_API_KEY;
    const token = localStorage.getItem("token");

    const [formData, setFormData] = useState({
        amount: '',
        currency: 'USD',
        toUser: '',
        paymentMethod: selectedPaymentMethod,
        expiresIn: '',
        description: '',
        invoiceNumber: '',
        invoiceDateAndTime: '',

        frequency: 'weekly',
        collectUserInfo: false,
        // name: '',
        // banner: null,
        // datedue: '',
    });

    useEffect(() => {
        setIsRequestPaymentModalOpen(false)
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

    const handleProceed = async () => {
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
                metadata: {
                    invoiceNumber: formData.invoiceNumber,
                    invoiceDateAndTime: formData.invoiceDateAndTime,
                }
            };

            console.log('Payload:', payload);

            // Make your API call here
            const response = await fetch(`${BASE_URL}/paymentRequest/create`, {
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

  return (
    <main className="flex-1 p-4 sm:p-6 lg:p-8 text-gray-900 dark:text-gray-100">
        {msg && <Alert msg={msg} setMsg={setMsg} alertType={alertType} />}
        <TopNav page="Request Payment" />
        <div className="flex items-center justify-center min-h-screen p-4 sm:p-6 lg:p-8">
            <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
                <div className='flex items-center justify-center gap-6 mb-5'>
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
                </div>
                
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

                    {/* Invoice Number */}
                    <div>
                        <label className="block text-sm font-medium mb-2">Invoice Number</label>
                        <input
                            type="text"
                            name="invoiceNumber"
                            placeholder="Enter invoice number"
                            value={formData.invoiceNumber}
                            onChange={handleInputChange}
                            className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#0E7BB2]"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2">Invoice Date and Time</label>
                        <input
                            type="datetime-local"
                            name="invoiceDateAndTime"
                            placeholder="Enter invoice date and time"
                            value={formData.invoiceDateAndTime}
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

                    {/* Banner Upload */}
                    {/* <div>
                        <label className="block text-sm font-medium mb-2">Banner</label>
                        <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center bg-gray-50 dark:bg-gray-700/50">
                            <MdUpload className="mx-auto text-[#0E7BB2] w-8 h-8 mb-3" />
                            {formData.banner && (
                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                                    {formData.banner.name}
                                </p>
                            )}
                            <input
                                type="file"
                                id="banner-upload"
                                accept="image/*"
                                onChange={handleBannerUpload}
                                className="hidden"
                            />
                        </div>
                        <button
                            type="button"
                            onClick={() => document.getElementById('banner-upload').click()}
                            className="w-full mt-3 px-4 py-2.5 rounded-lg border border-[#0E7BB2] text-[#0E7BB2] hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors"
                        >
                            Upload
                        </button>
                    </div> */}

                    {/* Currency Selection */}
                    <div>
                        <label className="block text-sm font-medium mb-2">Currency</label>
                        <select
                            name="currency"
                            value={formData.currency}
                            onChange={handleInputChange}
                            className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#0E7BB2]"
                        >
                            <option value="USD">USD - US Dollar</option>
                            <option value="EUR">EUR - Euro</option>
                            <option value="GBP">GBP - British Pound</option>
                            <option value="BTC">BTC - Bitcoin</option>
                            <option value="ETH">ETH - Ethereum</option>
                            <option value="USDT">USDT - Tether</option>
                        </select>
                    </div>

                    

                    {/* Expires In */}
                    <div>
                        <label className="block text-sm font-medium mb-2">Expirees in</label>
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
                    <div>
                        <label className="flex items-start cursor-pointer">
                            <input
                                type="checkbox"
                                name="collectUserInfo"
                                checked={formData.collectUserInfo}
                                onChange={handleInputChange}
                                className="w-4 h-4 mt-1 text-[#0E7BB2] border-gray-300 dark:border-gray-600 rounded focus:ring-[#0E7BB2]"
                            />
                            <span className="ml-3 text-sm text-gray-600 dark:text-gray-400">
                                Collect user info allow for rendbit to gain the user info in order to include them in the details
                            </span>
                        </label>
                    </div>

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
    </main>
  )
}

export default RecurringPayment