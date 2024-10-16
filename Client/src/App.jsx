import './App.css'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { Auth0Provider } from '@auth0/auth0-react';

import HomePage from './Screens/HomePage';
import TicketPage from './Screens/TicketPage';

function App() {
  return (
    <Auth0Provider
      domain = {import.meta.env.VITE_CLIENT_DOMAIN}
      clientId = {import.meta.env.VITE_CLIENT_ID}
      redirectUri={window.location.origin}
      useRefreshTokens={true} 
      cacheLocation="localstorage"
    >
       <Router>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/ticket/:ticketId" element={<TicketPage />} />
        </Routes>
      </Router>
    </Auth0Provider>
   
  )
}

export default App
