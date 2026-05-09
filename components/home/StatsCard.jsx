import { FaUsers, FaChartBar, FaClock, FaLock } from 'react-icons/fa';

const StatsCard = ({ stat, loading, theme }) => {
  // Get icon color based on theme
  const getIconColor = () => {
    return theme === 'light' ? 'text-black' : 'text-white';
  };

  // Map icons with dynamic theme-based colors
  const getIcon = (iconName) => {
    const iconProps = { className: getIconColor() };
    switch (iconName) {
      case 'FaUsers':
        return <FaUsers {...iconProps} />;
      case 'FaChartBar':
        return <FaChartBar {...iconProps} />;
      case 'FaClock':
        return <FaClock {...iconProps} />;
      case 'FaLock':
        return <FaLock {...iconProps} />;
      default:
        return <FaChartBar {...iconProps} />;
    }
  };

  return (
    <div className={`text-center ${theme === 'light' ? 'bg-white' : 'bg-gray-800'} p-4 rounded-xl shadow-sm border ${theme === 'light' ? 'border-gray-100' : 'border-gray-700'} hover-lift`}>
      <div className="flex justify-center mb-2">
        <div className={`p-2 ${theme === 'light' ? 'bg-gray-50' : 'bg-gray-700'} rounded-lg`}>
          {getIcon(stat.icon)}
        </div>
      </div>
      <div className={`text-2xl font-bold ${theme === 'light' ? 'text-gray-900' : 'text-white'} font-display`}>
        {loading ? (
          <div className={`h-8 w-20 ${theme === 'light' ? 'bg-gray-200' : 'bg-gray-700'} animate-pulse rounded mx-auto`}></div>
        ) : (
          stat.value
        )}
      </div>
      <div className={`text-sm ${theme === 'light' ? 'text-gray-600' : 'text-gray-400'}`}>{stat.label}</div>
    </div>
  );
};

export default StatsCard;