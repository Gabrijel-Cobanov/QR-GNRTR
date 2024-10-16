import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import '../App.css';
import axios from 'axios';
import { useAuth0 } from '@auth0/auth0-react';

function TicketPage() {
  const { ticketId } = useParams(); // Extract ticketId from the URL
  const [ticketData, setTicketData] = useState(null); // Use null as the initial state for ticketData
  const { loginWithRedirect, isAuthenticated, isLoading } = useAuth0();

  useEffect(() => {
    if (!isLoading) { // Only proceed if loading is complete
      if (isAuthenticated && ticketId) {
        // Fetch ticket data from the backend
        axios.get(`http://localhost:5000/api/ticket/${ticketId}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`, // Include the token in the header
          },
        })
        .then(response => {
          console.log(response.data)
          setTicketData(response.data); // Set the fetched ticket data
        })
        .catch(error => {
          console.error('Error fetching ticket data:', error);
          // Handle errors as needed, e.g., redirect or show a message
        });
      } else if (!isAuthenticated) {
        loginWithRedirect({
          appState: { returnTo: window.location.pathname } // Redirect back after login
        });
      }
    }
  }, [isAuthenticated, isLoading, loginWithRedirect, ticketId]);

  return (
    <>
      {isAuthenticated ? (
        <>
          {ticketData ? (
            <div className="card">
              <h1>TICKET INFO</h1>
              <h3>CREATED:  {ticketData.created_at}</h3>
              <h3>VATIN:    {ticketData.owner_oib}</h3>
              <h3>NAME:     {ticketData.ticket_data.firstName}</h3>
              <h3>SURNAME:  {ticketData.ticket_data.lastName}</h3>
            </div>
          ) : (
            <h3>Loading ticket information...</h3>
          )}
        </>
      ) : (
        <h3>Redirecting to login...</h3>
      )}
    </>
  );
}

export default TicketPage;
