const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { Pool } = require('pg');
const { auth } = require('express-oauth2-jwt-bearer');

const QRCode = require('qrcode'); 
const cors = require('cors');
const app = express();

app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173' // Allow requests from your frontend
}));

require('dotenv').config();

app.use(express.json());

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

const _audience = process.env.AUTH0_AUDIENCE || 'http://localhost:5000';

const jwtCheck = auth({
    audience: _audience, 
    issuerBaseURL: process.env.AUTH0_ISSUER_URL,
    tokenSigningAlg: 'RS256',
});

app.get('/api/tickets/count', async (req, res) => {
    const result = await pool.query('SELECT COUNT(*) FROM tickets');
    res.json({ count: result.rows[0].count });
});

app.post('/api/ticket/generate', jwtCheck, async (req, res) => {
    const { vatin, firstName, lastName } = req.body;  
    const ownerOIB = vatin;                         

    if (!vatin || !firstName || !lastName) {
        return res.status(400).json({ error: 'Missing required fields: vatin, name, and surname are required.' });
    }

    try {
        const userInsertQuery = `
            INSERT INTO users (oib, firstName, lastName)
            VALUES ($1, $2, $3)
            ON CONFLICT (oib) DO NOTHING;
        `;
        await pool.query(userInsertQuery, [ownerOIB, firstName, lastName]);

        const ticketCountQuery = `
            SELECT COUNT(*) FROM tickets WHERE owner_oib = $1;
        `;
        const result = await pool.query(ticketCountQuery, [ownerOIB]);
        const ticketCount = parseInt(result.rows[0].count, 10);

        if (ticketCount >= 3) {
            return res.status(400).json({ error: 'User has already generated 3 tickets.' });
        }

        const ticketId = uuidv4();
        const ticketUrl = `${process.env.FRONTEND_URL}/ticket/${ticketId}`;

        const ticketInsertQuery = `
            INSERT INTO tickets (ticket_id, owner_oib, ticket_data)
            VALUES ($1, $2, $3);
        `;
        const ticketData = JSON.stringify({ firstName, lastName });
        await pool.query(ticketInsertQuery, [ticketId, ownerOIB, ticketData]);

        const qrCodeBuffer = await QRCode.toBuffer(ticketUrl, { type: 'png' });

        res.setHeader('Content-Type', 'image/png');
        res.send(qrCodeBuffer); 
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

        // Ticket data je jsonb
        const ticket = result.rows[0];
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

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
