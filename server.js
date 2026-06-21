const express = require('express');
const axios = require('axios');
const path = require('path');

const app = express();

const CLIENT_ID = '1518313679525904586';
const CLIENT_SECRET = 'FJK8-g9m1_rXY9cTyS93-MEvgWqYRcc_';
const GUILD_ID = '1517257709592907898';
const REQUIRED_ROLE = '1518261451167629343';
const REDIRECT_URI = process.env.REDIRECT_URI || 'https://imt-auth-production.up.railway.app/callback';

app.use(express.static('public'));

app.get('/login', (req, res) => {
    const params = new URLSearchParams({
        client_id: CLIENT_ID,
        redirect_uri: REDIRECT_URI,
        response_type: 'code',
        scope: 'identify guilds.members.read'
    });
    res.redirect(`https://discord.com/oauth2/authorize?${params}`);
});

app.get('/callback', async (req, res) => {
    const { code } = req.query;
    if (!code) return res.redirect('/?error=no_code');

    try {
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

        const memberRes = await axios.get(
            `https://discord.com/api/users/@me/guilds/${GUILD_ID}/member`,
            { headers: { Authorization: `Bearer ${access_token}` } }
        );

        const roles = memberRes.data.roles || [];
        const username = memberRes.data.nick || memberRes.data.user?.username || 'Gebruiker';

        if (roles.includes(REQUIRED_ROLE)) {
            res.redirect('https://imagemagictool.netlify.app/ImageMagicTool-Setup-v3.2.exe');
        } else {
            res.redirect(`/?error=no_role&name=${encodeURIComponent(username)}`);
        }

    } catch (err) {
        console.error(err.response?.data || err.message);
        res.redirect('/?error=not_in_server');
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server draait op poort ${PORT}`));
