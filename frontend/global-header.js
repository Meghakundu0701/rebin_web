/**
 * Global Header Synchronization & Profile Navigation
 * This script ensures the user avatar and location details are synced across all pages.
 */
(function () {
    const API_URL = '/api';

    async function updateGlobalHeader() {
        try {
            let userData = JSON.parse(localStorage.getItem('rebin_user'));
            const token = localStorage.getItem('rebin_token');

            // 1. Fetch data if missing or likely stale
            if (token && (!userData || !userData.addresses)) {
                try {
                    const r = await fetch(API_URL + '/profile', {
                        headers: { 'authorization': token }
                    });
                    if (r.ok) {
                        const data = await r.json();
                        // Merge user and addresses
                        userData = { ...data.user, addresses: data.addresses };
                        localStorage.setItem('rebin_user', JSON.stringify(userData));
                    }
                } catch (e) {
                    console.error('Initial header fetch failed:', e);
                }
            }

            if (!userData) return;

            // 2. Standardize Profile Redirect Target
            const profilePage = (userData.role === 'collector') ? 'collector-profile.html' : 'rebin_profile.html';

            // 3. Update Avatars (Initials & Links)
            // Handle multiple possible selectors used across different pages
            const avatars = document.querySelectorAll('.nav-avatar, .avatar-sm, .avatar-initial, #nav-init, #header-avatar');

            let initial = '?';
            if (userData.name) {
                const names = userData.name.trim().split(/\s+/);
                if (names.length > 1) {
                    initial = (names[0][0] + names[names.length - 1][0]).toUpperCase();
                } else {
                    initial = names[0][0].toUpperCase();
                }
            }

            avatars.forEach(ava => {
                ava.textContent = initial;
                ava.style.cursor = 'pointer';

                // Add click event if not already present
                if (!ava.onclick) {
                    ava.onclick = () => window.location.href = profilePage;
                }
            });

            // 4. Update Location Information (User pages only)
            const locLabels = document.querySelectorAll('.loc-label, .nav-loc, .nav-location span:first-child');
            const locSubs = document.querySelectorAll('.loc-sub, .nav-loc-sub, .nav-location span:last-child');

            if (userData.addresses && userData.addresses.length > 0) {
                const def = userData.addresses.find(a => a.is_default) || userData.addresses[0];
                const cityText = '📍 ' + (def.city || 'Home') + ' ▾';
                const streetText = 'Near ' + (def.street ? def.street.split(',')[0] : 'Your Loc');

                locLabels.forEach(el => { el.textContent = cityText; });
                locSubs.forEach(el => {
                    // Only update secondary line if it's separate from the label
                    if (el !== locLabels[0]) el.textContent = streetText;
                });
            }
        } catch (e) {
            console.error('Header sync error:', e);
        }
    }

    // Initialize on load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', updateGlobalHeader);
    } else {
        updateGlobalHeader();
    }

    // Listen for cross-tab storage changes
    window.addEventListener('storage', (e) => {
        if (e.key === 'rebin_user' || e.key === 'rebin_token') updateGlobalHeader();
    });

    // Also expose to window in case manual trigger is needed
    window.syncRebinHeader = updateGlobalHeader;
})();
