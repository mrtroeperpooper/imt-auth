const express = require('express');
const axios = require('axios');
const path = require('path');

const app = express();

const CLIENT_ID = '1518313679525904586';
const CLIENT_SECRET = 'FJK8-g9m1_rXY9cTyS93-MEvgWqYRcc_';
const GUILD_ID = '1517257709592907898';
const REQUIRED_ROLE = '1518261451167629343';
const REDIRECT_URI = process.env.REDIRECT_URI || 'https://imt-auth-production.up.railway.app/callback';
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
            // Heeft de rol → stuur naar tusssenpagina die download start en terugkeert
            const downloadUrl = 'https://imagemagictool.netlify.app/ImageMagicTool-Setup-v3.2.exe';
            res.send(`<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Download gestart...</title>
<style>
  body { background: #0D0D0F; color: #C4B5FD; font-family: Segoe UI, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; flex-direction: column; gap: 16px; }
  .spinner { width: 40px; height: 40px; border: 3px solid #2A2640; border-top-color: #7C3AED; border-radius: 50%; animation: spin 0.8s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
  a { color: #60A5FA; }
</style>
</head>
<body>
<div class="spinner"></div>
<p>✅ Toegang bevestigd! Download wordt gestart...</p>
<p style="font-size:12px;color:#5B5370;">Je wordt automatisch teruggestuurd naar de site.</p>
<script>
  // Start download
  window.location.href = '${downloadUrl}';
  // Ga terug naar de site na 3 seconden
  setTimeout(() => { window.location.href = 'https://imagemagictool.netlify.app'; }, 3000);
</script>
</body>
</html>`);
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
