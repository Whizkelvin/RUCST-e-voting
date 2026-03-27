import { FaUsers, FaChartBar, FaClock, FaLock } from 'react-icons/fa';

const iconMap = {
  FaUsers: <FaUsers className="text-blue-500" />,
  FaChartBar: <FaChartBar className="text-green-500" />,
  FaClock: <FaClock className="text-orange-500" />,
  FaLock: <FaLock className="text-red-950" />
};

const StatsCard = ({ stat, loading }) => {
  return (
    <div className="text-center bg-white p-4 rounded-xl shadow-sm border border-gray-100 hover-lift">
      <div className="flex justify-center mb-2">
        <div className="p-2 bg-gray-50 rounded-lg">
          {iconMap[stat.icon]}
        </div>
      </div>
      <div className="text-2xl font-bold text-gray-900 font-display">
        {loading ? (
          <div className="h-8 w-20 bg-gray-200 animate-pulse rounded mx-auto"></div>
        ) : (
          stat.value
        )}
      </div>
      <div className="text-sm text-gray-600">{stat.label}</div>
    </div>
  );
};

export default StatsCard;