import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import API from '../../config/api';
import { format } from 'date-fns';

const AdminDashboard = () => {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['adminStats'],
    queryFn: async () => {
      try {
        // Get total businesses
        const businessesRes = await API.get('/business-records/recent?page=1&per_page=1');
        const totalBusinesses = businessesRes.data.total || 0;
        
        // Get all businesses for violations count
        const allBusinessesRes = await API.get('/business-records/all');
        const allBusinesses = allBusinessesRes.data || [];
        const withViolations = allBusinesses.filter(b => b.has_violation).length;
        
        // Get clearances
        const clearancesRes = await API.get('/clearance/history/all');
        const clearances = clearancesRes.data || [];
        const totalClearances = clearances.length;
        
        // Get users
        const usersRes = await API.get('/users');
        const totalUsers = usersRes.data?.length || 0;
        
        // Get recent 5 businesses
        const recentRes = await API.get('/business-records/recent?page=1&per_page=5');
        const recentBusinesses = recentRes.data.items || [];

        return {
          totalBusinesses,
          withViolations,
          totalClearances,
          totalUsers,
          recentBusinesses
        };
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        return {
          totalBusinesses: 0,
          withViolations: 0,
          totalClearances: 0,
          totalUsers: 0,
          recentBusinesses: []
        };
      }
    },
  });

  const cards = [
    {
      title: 'Total Businesses',
      value: stats?.totalBusinesses || 0,
      link: '/admin/business'
    },
    {
      title: 'Clearances',
      value: stats?.totalClearances || 0,
      link: '/admin/clearance'
    },
    {
      title: 'Staff Members',
      value: stats?.totalUsers || 0,
      link: '/admin/staff'
    },
    {
      title: 'With Violations',
      value: stats?.withViolations || 0,
      link: '/admin/inspections'
    },
  ];

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Admin Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card) => (
          <Link
            key={card.title}
            to={card.link}
            className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow border border-gray-100"
          >
            <p className="text-sm text-gray-500 mb-1">{card.title}</p>
            <p className="text-3xl font-bold text-emerald-700">{card.value}</p>
          </Link>
        ))}
      </div>

      {/* recent businesses */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-800">Recent Businesses</h2>
          <Link
            to="/admin/business"
            className="text-sm text-emerald-600 hover:text-emerald-800"
          >
            View All
          </Link>
        </div>
        
        {!stats?.recentBusinesses || stats.recentBusinesses.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No recent businesses</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date Applied</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Business Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Business Line</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Owner</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {stats.recentBusinesses.map((business) => (
                  <tr 
                    key={business.id} 
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => window.location.href = `/admin/business/${business.id}`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {business.application_date ? format(new Date(business.application_date), 'MMM dd, yyyy') : '—'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">
                        {business.establishment_name}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        BIN: {business.bin_number || '—'}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {business.business_line || '—'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {business.owner_name || '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {business.application_type || 'NEW'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;