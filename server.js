const express = require('express');
const axios = require('axios');
const path = require('path');

const app = express();

const CLIENT_ID = '1518313679525904586';
const CLIENT_SECRET = 'FJK8-g9m1_rXY9cTyS93-MEvgWqYRcc_';
const GUILD_ID = '1517257709592907898';
const REQUIRED_ROLE = '1518261451167629343';
const REDIRECT_URI = process.env.REDIRECT_URI || 'https://jouw-app.railway.app/callback';
const DOWNLOAD_FILE = './ImageMagicTool-Setup-v3.2.exe';

app.use(express.static('public'));

// Stap 1: Stuur gebruiker naar Discord login
app.get('/login', (req, res) => {
    const params = new URLSearchParams({
        client_id: CLIENT_ID,
        redirect_uri: REDIRECT_URI,
        response_type: 'code',
        scope: 'identify guilds.members.read'
    });
    res.redirect(`https://discord.com/oauth2/authorize?${params}`);
});

// Stap 2: Discord stuurt gebruiker terug met een code
app.get('/callback', async (req, res) => {
    const { code } = req.query;
    if (!code) return res.redirect('/?error=no_code');

    try {
        // Wissel code in voor access token
        const tokenRes = await axios.post('https://discord.com/api/oauth2/token',
            new URLSearchParams({
                client_id: CLIENT_ID,
                client_secret: CLIENT_SECRET,
                grant_type: 'authorization_code',
                code,
                redirect_uri: REDIRECT_URI
            }),
            { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
        );

        const { access_token } = tokenRes.data;

        // Check of gebruiker in de server zit met de juiste rol
        const memberRes = await axios.get(
            `https://discord.com/api/users/@me/guilds/${GUILD_ID}/member`,
            { headers: { Authorization: `Bearer ${access_token}` } }
        );

        const roles = memberRes.data.roles || [];
        const username = memberRes.data.nick || memberRes.data.user?.username || 'Gebruiker';

        if (roles.includes(REQUIRED_ROLE)) {
            // Heeft de rol → directe download via Netlify
            res.redirect('https://imagemagictool.netlify.app/ImageMagicTool-Setup-v3.2.exe');
        } else {
            // Geen rol → melding
            res.redirect(`/?error=no_role&name=${encodeURIComponent(username)}`);
        }

    } catch (err) {
        console.error(err.response?.data || err.message);
        // Niet in server → melding
        res.redirect('/?error=not_in_server');
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server draait op poort ${PORT}`));
