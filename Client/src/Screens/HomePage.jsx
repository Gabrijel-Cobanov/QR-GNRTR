import { useState, useEffect } from 'react'
import '../App.css'
import axios from 'axios';
import { useAuth0 } from '@auth0/auth0-react';
import { useNavigate } from 'react-router-dom';

function HomePage() {
  const [count, setCount] = useState(0)
  const { loginWithRedirect, logout, user, isAuthenticated } = useAuth0();

  const navigate = useNavigate();

  useEffect(() => {
    axios.get('http://localhost:5000/api/tickets/count').then(response => {
      setCount(response.data.count);
    });

    // Hack but it works
    // Check if user is authenticated and should redirect to a ticket
    if (isAuthenticated && window.location.pathname.includes('/ticket/')) {
      navigate(window.location.pathname);
    }
  }, [isAuthenticated, navigate]);

  return (
    <>
        <div className="card">
        <h1>QR-GNRTR</h1>
        <h1>Generated Tickets: {count}</h1>
        <h3>If you need to generate a ticket, send a POST request to: http://endpoint</h3>

        { isAuthenticated ? (
            <>
                <h3>Logged in as: { user.nickname } </h3>
                <button onClick={() => logout()}>Log out</button>
            </>
        ) : (
            <>
                <button onClick={() => loginWithRedirect()}>Log In</button>
            </>
        )}
        </div>
    </>
  )
}

export default HomePage
