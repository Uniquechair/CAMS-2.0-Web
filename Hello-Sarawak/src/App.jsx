import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createBrowserRouter, RouterProvider, Outlet } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';

// Import Pages
import Home from './Pages/customer/Home/Home';
import Login from './Pages/customer/Login/Login';
import Register from './Pages/customer/Register/Register';
import ModeratorDashboard from './Pages/moderator/ModeratorDashboard';
import AdminDashboard from './Pages/administrator/AdminDashboard';
import OwnerDashboard from './Pages/cams_owner/OwnerDashboard';
import AboutSarawak from './Pages/customer/About_Sarawak/about_sarawak';
import Product from './Pages/customer/Product/product';
import PropertyDetails from './Pages/customer/PropertyDetails/PropertyDetails';
import Cart from './Pages/customer/Cart/cart';
import AboutUs from './Pages/customer/About_us/About_Us';
import NoAccess from './Component/NoAccess/NoAccess';
import Error from './Component/Error_404/Error';
import Profile from './Pages/customer/Profile/Profile';
import Notification from './Pages/customer/Notification/Notification';
import CustomerFAQ from './Pages/customer/FAQ/CustomerFAQ';
import AdminNotification from './Pages/administrator/Modules/Notification/AdminNotification';
import ModeratorNotification from './Pages/moderator/Modules/Notification/ModeratorNotification';

// Import ScrollToTop
import ScrollToTop from './Component/ScrollToTop';

const queryClient = new QueryClient();

const RootLayout = () => {
  return (
    <>
      <ScrollToTop />
      <Outlet />
    </>
  );
};

const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      { index: true, element: <Home /> },
      { path: 'home', element: <Home /> },
      { path: 'register', element: <Register /> },
      { path: 'login', element: <Login /> },
      { path: 'about_sarawak', element: <AboutSarawak /> },
      { path: 'product', element: <Product /> },
      { path: 'product/:propertyid', element: <PropertyDetails /> },
      { path: 'cart', element: <Cart /> },
      { path: 'about_us', element: <AboutUs /> },
      { path: 'customer-faq', element: <CustomerFAQ /> },
      { path: 'profile', element: <Profile /> },
      { path: 'notifications', element: <Notification /> },

      { path: 'administrator_dashboard/*', element: <AdminDashboard /> },
      { path: 'admin/notifications', element: <AdminNotification /> },
      { path: 'moderator_dashboard/*', element: <ModeratorDashboard /> },
      { path: 'moderator/notifications', element: <ModeratorNotification /> },
      { path: 'owner_dashboard/*', element: <OwnerDashboard /> },
      { path: 'no-access', element: <NoAccess /> },
      { path: '*', element: <Error /> },
    ],
  },
]);

function App() {
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  return (
    <GoogleOAuthProvider clientId={googleClientId}>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </GoogleOAuthProvider>
  );
}

export default App;