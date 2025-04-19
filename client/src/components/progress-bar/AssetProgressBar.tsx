import { FC } from "react";
import { FaEthereum } from "react-icons/fa";
import { SiBitcoincash } from "react-icons/si";
import { SiTether } from "react-icons/si";
import { BsCircleFill } from "react-icons/bs";

interface TokenSegment {
  label: string;
  value: number;
  color: string;
  icon: any;
}

const tokenData: TokenSegment[] = [
  {
    label: "ETH",
    value: 40,
    color: "#5191FA",
    icon: <FaEthereum className="text-[#5191FA]" />,
  },
  {
    label: "BTC",
    value: 30,
    color: "#F7A83E",
    icon: <SiBitcoincash className="text-[#F7A83E]" />,
  },
  {
    label: "USDT",
    value: 20,
    color: "#24B378",
    icon: <SiTether className="text-[#24B378]" />,
  },
  {
    label: "Other",
    value: 10,
    color: "#B155F1",
    icon: <BsCircleFill className="text-[#B155F1]" />,
  },
];

const AssetProgressBar: FC = () => {
  return (
    <div className="w-full">
      {/* Bar */}
      <div className="flex h-2.5 rounded-full overflow-hidden mb-3">
        {tokenData.map((token, idx) => (
          <div
            key={idx}
            className="h-full"
            style={{
              width: `${token.value}%`,
              backgroundColor: token.color,
            }}
          />
        ))}
      </div>

      {/* Legend */}
      <div className="flex justify-between text-white text-sm">
        {tokenData.map((token, idx) => (
          <div key={idx} className="flex items-center space-x-1">
            {token.icon}
            <span>{token.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AssetProgressBar;
