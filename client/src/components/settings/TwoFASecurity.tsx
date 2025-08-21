import React from "react";

const TwoFASecurity: React.FC = () => {

    const [selectedMethod, setSelectedMethod] = React.useState("");

    const handleMethodChange = (method:any) => {
        setSelectedMethod(method);
    };

    const methods = [
        // {
        //     name: "SMS Code",
        //     description: "Receive a one-time verification code via SMS to enter during login.",
        //     icon: "./image/sms.svg"
        // },
        // {
        //     name: "Email Code",
        //     description: "Get a temporary verification code sent to your email for added security.",
        //     icon: "./image/email.svg"
        // },
        {
            name: "Authenticator App",
            description: "Use an authenticator app to generate time-based verification codes for login.",
            icon: "./image/auth.svg"
        }
    ];

  return (
    <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md xl:w-[45%] lg:w-[60%] md:w-[70%] w-[95%] mx-auto">
        <div className="border-b border-gray-200 dark:border-gray-700 mb-4">
            <h2 className="text-lg font-semibold">2FA Security</h2>
            <p className="text-gray-700 mb-1 dark:text-gray-400">Enable two-factor authentication to your account.</p>
        </div>
        {
            methods.map((method, index) => (
                <div 
                    key={index}
                    className={`cursor-pointer flex items-center gap-4 mb-4 mt-[1rem] border ${selectedMethod === method.name ? 'border-[#0E7BB2]' : 'border-gray-200'} dark:${selectedMethod === method.name ? 'border-[#0E7BB2]' : 'border-gray-700'} px-[14px] py-5 rounded-[10px]`}
                    onClick={() => handleMethodChange(method.name)}
                >
                    <img src={method.icon} alt={method.name} />
                    <div>
                        <p className="text-[#0A0D14] md:text-lg text-md font-semibold dark:text-white">{method.name}</p>
                        <p className="text-[#525866] text-sm dark:text-gray-400">{method.description}</p>
                    </div>
                </div>
            ))
        }
        <button className="bg-[#0E7BB2] w-full text-white px-4 py-2 rounded-lg transition-colors duration-300">
          Enable 2FA Security
        </button>
    </div>
  );
};

export default TwoFASecurity;
