import Header from './Header';
import Sidebar from './Sidebar';
import { useAuth } from '../hooks/useAuth.jsx';

const SidebarLayout = ({ children }) => {
  const { user } = useAuth();

  if (!user) return children;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <Sidebar />
      
      <main className="ml-64 pt-16 min-h-screen bg-gray-50">
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  );
};

export default SidebarLayout;