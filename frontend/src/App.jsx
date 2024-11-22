import { useEffect, useState } from 'react';
import './App.css';
import ProtectedRoute from './components/ProtectedRoute';
import { createBrowserRouter, Outlet, RouterProvider } from "react-router-dom";
import Home from './pages/Home';

import axios from 'axios';
import PublicRoute from './components/PublicRoute';
import Hero from './pages/Hero';
import Footer from './pages/Footer';
import Login from './pages/Login';

function App() {
  const [email, setEmail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([]);  // New state to store user list

  // Layout Component
  const Layout = () => (
    <>
      <Hero setEmail={setEmail} email={email} />
      <main>
        <Outlet /> {/* Outlet will render the appropriate route content */}
      </main>
      <Footer />
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
              <Login />
            </PublicRoute>
          ),
        },
        {
          path: "/home",
          element: (
            <ProtectedRoute email={email}>
              <Home email={email} setEmail={setEmail} users={users} /> {/* Pass users to Home */}
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
