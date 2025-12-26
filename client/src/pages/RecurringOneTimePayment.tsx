import React, { useEffect, useState } from 'react'
import { useAppContext } from '../context/useContext';
import { FaExchangeAlt } from 'react-icons/fa';
import TopNav from '../components/top-nav/TopNav';
import { HiOutlineDocumentCurrencyDollar } from 'react-icons/hi2';
import { MdUpload, MdCalendarToday } from 'react-icons/md';

const RecurringPayment = () => {

    const { setIsRequestPaymentModalOpen } = useAppContext();
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('crypto');

    const [formData, setFormData] = useState({
        name: '',
        description: '',
        banner: null,
        currency: 'US',
        amount: '',
        datedue: '',
        frequency: 'weekly',
        collectUserInfo: false
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

    const handleProceed = () => {
        console.log('Form data:', formData);
        // Add your proceed logic here
    };

  return (
    <main className="flex-1 p-4 sm:p-6 lg:p-8 text-gray-900 dark:text-gray-100">
        <TopNav page="Request Payment" />
        <div className="flex items-center justify-center min-h-screen p-4 sm:p-6 lg:p-8">
            <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
                <div className='flex items-center justify-center gap-6 mb-5'>
                    <button onClick={() => setSelectedPaymentMethod('crypto')} className={ selectedPaymentMethod === "crypto" ? 'px-8 border rounded-[6px] py-[6px] w-full' : 'px-8 rounded-[6px] py-[6px] w-full'}>Crypto</button>
                    <button onClick={() => setSelectedPaymentMethod('fiat')} className={ selectedPaymentMethod === "fiat" ? 'px-8 border rounded-[6px] py-[6px] w-full' : 'px-8 rounded-[6px] py-[6px] w-full'}>Fiat</button>
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
                    {/* Name */}
                    <div>
                        <label className="block text-sm font-medium mb-2">Name</label>
                        <input
                            type="text"
                            name="name"
                            placeholder="Name"
                            value={formData.name}
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
                    <div>
                        <label className="block text-sm font-medium mb-2">Banner</label>
                        <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center bg-gray-50 dark:bg-gray-700/50">
                            <MdUpload className="mx-auto text-[#0E7BB2] w-8 h-8 mb-3" />
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
                            // onClick={() => document.getElementById('banner-upload').click()}
                            className="w-full mt-3 px-4 py-2.5 rounded-lg border border-[#0E7BB2] text-[#0E7BB2] hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors"
                        >
                            Upload
                        </button>
                    </div>

                    {/* Prefer Currency */}
                    <div>
                        <label className="block text-sm font-medium mb-2">Prefer currency</label>
                        <div className="flex gap-3">
                            <select
                                name="currency"
                                value={formData.currency}
                                onChange={handleInputChange}
                                className="px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#0E7BB2]"
                            >
                                <option value="US">🇺🇸 US</option>
                            </select>
                            <select
                                className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#0E7BB2]"
                            >
                                <option>Select currency</option>
                            </select>
                        </div>
                    </div>

                    {/* Amount */}
                    <div>
                        <label className="block text-sm font-medium mb-2">Amount</label>
                        <div className="relative">
                            <input
                                type="text"
                                name="amount"
                                placeholder="Enter amount"
                                value={formData.amount}
                                onChange={handleInputChange}
                                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#0E7BB2]"
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 text-sm">Max</span>
                        </div>
                    </div>

                    {/* Date Due */}
                    <div>
                        <label className="block text-sm font-medium mb-2">Date due</label>
                        <div className="relative">
                            <input
                                type="text"
                                name="datedue"
                                placeholder="DD/MM/YY"
                                value={formData.datedue}
                                onChange={handleInputChange}
                                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#0E7BB2]"
                            />
                            <MdCalendarToday className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 w-5 h-5" />
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
                        className="w-full bg-[#0E7BB2] hover:bg-[#0B5E8C] text-white font-medium py-3 rounded-lg transition-colors mt-4"
                    >
                        Proceed
                    </button>
                </div>
            </div>
        </div>
    </main>
  )
}

export default RecurringPayment