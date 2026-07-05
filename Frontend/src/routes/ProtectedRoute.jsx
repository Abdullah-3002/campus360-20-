import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { dashboardPathForRole } from './paths';
import { LoadingSpinner } from '../dashboard/shared/helpers';

export default function ProtectedRoute({ children, allowedRoles }) {
    const { user, token, authReady, logout } = useAuth();
    const location = useLocation();

    if (token && !authReady) {
        return <LoadingSpinner message="Loading your session..." />;
    }

    if (!user) {
        return <Navigate to="/login" state={{ from: location.pathname }} replace />;
    }

    if (!user.user_type) {
        logout();
        return <Navigate to="/login" state={{ from: location.pathname }} replace />;
    }

    if (allowedRoles?.length && !allowedRoles.includes(user.user_type)) {
        return <Navigate to={dashboardPathForRole(user.user_type)} replace />;
    }

    return children;
}
