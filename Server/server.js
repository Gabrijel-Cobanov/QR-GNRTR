const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { Pool } = require('pg');
const { auth } = require('express-oauth2-jwt-bearer');

const QRCode = require('qrcode'); 
const cors = require('cors');
const app = express();

app.use(cors({
    origin: 'http://localhost:5173' // Allow requests from your frontend
}));

require('dotenv').config();

app.use(express.json());

const pool = new Pool({
    connectionString: process.env.DATABASE_URL_LOCAL,
});


const jwtCheck = auth({
    audience: 'http://localhost:5000', 
    issuerBaseURL: 'https://dev-2ll65wmoyhmil3id.us.auth0.com/',
    tokenSigningAlg: 'RS256',
});

app.get('/api/tickets/count', async (req, res) => {
    const result = await pool.query('SELECT COUNT(*) FROM tickets');
    res.json({ count: result.rows[0].count });
});

app.post('/api/ticket/generate', jwtCheck, async (req, res) => {
    const { vatin, firstName, lastName } = req.body;  // Extract user info from the request body
    const ownerOIB = vatin;  // Assuming 'vatin' is the user's OIB

    if (!vatin || !firstName || !lastName) {
        return res.status(400).json({ error: 'Missing required fields: vatin, name, and surname are required.' });
    }

    try {
        // Insert or update the user in the Users table
        const userInsertQuery = `
            INSERT INTO users (oib, firstName, lastName)
            VALUES ($1, $2, $3)
            ON CONFLICT (oib) DO NOTHING;
        `;
        await pool.query(userInsertQuery, [ownerOIB, firstName, lastName]);

        // Check how many tickets the user has already generated
        const ticketCountQuery = `
            SELECT COUNT(*) FROM tickets WHERE owner_oib = $1;
        `;
        const result = await pool.query(ticketCountQuery, [ownerOIB]);
        const ticketCount = parseInt(result.rows[0].count, 10);

        // If the user has already generated 3 tickets, return a 400 error
        if (ticketCount >= 3) {
            return res.status(400).json({ error: 'User has already generated 3 tickets.' });
        }

        // Generate a unique ticket ID
        const ticketId = uuidv4();
        const ticketUrl = `http://localhost:5173/ticket/${ticketId}`;  // URL for the QR code

        // Insert the ticket into the Tickets table
        const ticketInsertQuery = `
            INSERT INTO tickets (ticket_id, owner_oib, ticket_data)
            VALUES ($1, $2, $3);
        `;
        const ticketData = JSON.stringify({ firstName, lastName }); // Storing name and surname in the ticket data
        await pool.query(ticketInsertQuery, [ticketId, ownerOIB, ticketData]);

        // Generate the QR code in PNG format (buffer)
        const qrCodeBuffer = await QRCode.toBuffer(ticketUrl, { type: 'png' });

        // Set the content type to image/png
        res.setHeader('Content-Type', 'image/png');
        res.send(qrCodeBuffer);  // Send the QR code image as a response
    } catch (error) {
        console.error('Error generating QR code:', error);
        res.status(500).json({ error: 'Failed to generate QR code' });
    }
});

app.get('/api/ticket/:id', async (req, res) => {
    console.log(`Received request for ticket ID: ${req.params.id}`);
    try {
        const { id } = req.params;
        const result = await pool.query(`SELECT * FROM Tickets WHERE ticket_id = $1`, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Ticket not found' });
        }

        // Assuming the ticket_data is stored as JSONB in the database
        const ticket = result.rows[0];
        // ticket.ticket_data = JSON.parse(ticket.ticket_data); // Parse the JSON string
        console.log(ticket)
        res.json(ticket);
    } catch (error) {
        console.error('Error fetching ticket:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});



pool.connect()
    .then(() => console.log('Connected to the database!'))
    .catch(err => console.error('Connection error', err.stack));

app.listen(5000, () => {
    console.log('Server running on port 5000');
});
