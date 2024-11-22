import { useEffect, useState, Suspense } from 'react';
import './App.css';
import ProtectedRoute from './components/ProtectedRoute';
import { createBrowserRouter, Outlet, RouterProvider } from "react-router-dom";
import axios from 'axios';
import PublicRoute from './components/PublicRoute';

// Lazy load the components
const Home = React.lazy(() => import('./pages/Home'));
const Hero = React.lazy(() => import('./pages/Hero'));
const Footer = React.lazy(() => import('./pages/Footer'));
const Login = React.lazy(() => import('./pages/Login'));

function App() {
  const [email, setEmail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([]);  // New state to store user list

  // Layout Component
  const Layout = () => (
    <>
      <Suspense fallback={<div>Loading Hero...</div>}>
        <Hero setEmail={setEmail} email={email} />
      </Suspense>
      <main>
        <Outlet /> {/* Outlet will render the appropriate route content */}
      </main>
      <Suspense fallback={<div>Loading Footer...</div>}>
        <Footer />
      </Suspense>
    </>
  );

  const router = createBrowserRouter([
    {
      path: "/",
      element: <Layout />, // Layout for the main structure
      children: [
        {
          path: "/",
          element: (
            <PublicRoute email={email}>
              <Suspense fallback={<div>Loading Login...</div>}>
                <Login />
              </Suspense>
            </PublicRoute>
          ),
        },
        {
          path: "/home",
          element: (
            <ProtectedRoute email={email}>
              <Suspense fallback={<div>Loading Home...</div>}>
                <Home email={email} setEmail={setEmail} users={users} /> {/* Pass users to Home */}
              </Suspense>
            </ProtectedRoute>
          ),
        },
        // Add other routes if needed
      ],
    },
  ]);

  // Fetch user info and user list on mount
  useEffect(() => {
    const fetchUser = async () => {
      setLoading(true);
      try {
        const response = await axios.get(`${import.meta.env.VITE_BACKEND_BASE_URL}/user`, {
          withCredentials: true,
        });
        setEmail(response.data.emails[0].verified ? response.data.emails[0].value : null);
      } catch (error) {
        setEmail(null);
      } finally {
        setLoading(false);
      }
    };

    const fetchUsers = async () => {
      try {
        const userListResponse = await axios.get(`${import.meta.env.VITE_BACKEND_BASE_URL}/users`);
        setUsers(userListResponse.data);  // Set the fetched users
      } catch (error) {
        console.error("Error fetching users:", error);
      }
    };

    fetchUser();  // Fetch user details
    fetchUsers(); // Fetch users list
  }, []);

  return (
    <>
      <RouterProvider router={router} />
    </>
  );
}

export default App;
