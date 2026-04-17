const fs = require('fs');
const path = require('path');

const frontendDir = path.join(__dirname, '..', 'frontend');
const filesToUpdate = [
    'index.html',
    'leaderboard.html',
    'points.html',
    'about.html',
    'connect.html',
    'place-request.html'
];

const syncScript = `
<!-- Global Profile Sync -->
<script>
(function() {
    const API_URL = '/api';

    async function updateGlobalHeader() {
        try {
            let userData = JSON.parse(localStorage.getItem('rebin_user'));
            const token = localStorage.getItem('rebin_token');

            // If we have a token but no user data or missing addresses, fetch it once
            if (token && (!userData || !userData.addresses)) {
                try {
                    const r = await fetch(API_URL + '/profile', { headers: { 'authorization': token } });
                    if (r.ok) {
                        const data = await r.json();
                        userData = { ...data.user, addresses: data.addresses };
                        localStorage.setItem('rebin_user', JSON.stringify(userData));
                    }
                } catch (e) {
                    console.error('Initial fetch failed', e);
                }
            }

            if (!userData) return;

            // 1. Update Avatar Initial
            const avatars = document.querySelectorAll('.nav-avatar');
            const initial = (userData.name && userData.name.length > 0) ? userData.name[0].toUpperCase() : '?';
            avatars.forEach(ava => {
                ava.textContent = initial;
                if (!ava.hasAttribute('onclick')) {
                    ava.setAttribute('onclick', "window.location.href='rebin_profile.html'");
                    ava.style.cursor = 'pointer';
                }
            });

            // 2. Update Location Display
            // Target all common selectors across different page versions
            const locLabels = document.querySelectorAll('.loc-label, .nav-loc, .nav-location span:first-child');
            const locSubs = document.querySelectorAll('.loc-sub, .nav-loc-sub, .nav-location span:last-child');
            
            if (userData.addresses && userData.addresses.length > 0) {
                const def = userData.addresses.find(a => a.is_default) || userData.addresses[0];
                const cityText = '📍 ' + def.city + ' ▾';
                const streetText = 'Near ' + def.street.split(',')[0];

                locLabels.forEach(el => { el.textContent = cityText; });
                locSubs.forEach(el => { 
                    // Only update if it's the secondary line
                    if (el !== locLabels[0]) el.textContent = streetText; 
                });
            }
        } catch (e) {
            console.error('Header sync error:', e);
        }
    }

    // Run on load
    updateGlobalHeader();
    
    // Listen for storage changes (if updated in another tab)
    window.addEventListener('storage', (e) => {
        if (e.key === 'rebin_user') updateGlobalHeader();
    });
})();
</script>
`;

filesToUpdate.forEach(fileName => {
    const filePath = path.join(frontendDir, fileName);
    if (!fs.existsSync(filePath)) return;

    let content = fs.readFileSync(filePath, 'utf8');

    // Remove existing sync script if present to replace it with the new version
    content = content.replace(/<!-- Global Profile Sync -->[\s\S]*?<\/script>/g, '');

    // Inject New Sync Script
    content = content.replace(/<\/body>/i, `${syncScript}\n</body>`);

    fs.writeFileSync(filePath, content);
    console.log(`Updated: ${fileName}`);
});

console.log('Global Navigation and Profile Sync (Auto-Fetch Version) update complete.');
