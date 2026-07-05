import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { dashboardPathForRole } from './paths';

/** Redirect authenticated users away from login/signup to their dashboard. */
export default function GuestRoute({ children }) {
    const { user } = useAuth();
    if (user?.user_type) {
        return <Navigate to={dashboardPathForRole(user.user_type)} replace />;
    }
    return children;
}
