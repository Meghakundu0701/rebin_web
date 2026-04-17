const fs = require('fs');
const path = require('path');

const files = ['index.html', 'points.html', 'leaderboard.html', 'connect.html', 'about.html'];
const scriptTag = `
<script>
// Global Profile Sync
(function() {
    try {
        const u = JSON.parse(localStorage.getItem('rebin_user'));
        if (u) {
            const ava = document.querySelector('.nav-avatar');
            if (ava) ava.textContent = (u.name && u.name.length > 0) ? u.name[0].toUpperCase() : '?';
            if (u.addresses && u.addresses.length > 0) {
                const def = u.addresses.find(a => a.is_default) || u.addresses[0];
                const locGrp = document.querySelector('.nav-location');
                if (locGrp && def.street) {
                    const st = def.street.split(',')[0];
                    locGrp.innerHTML = '<span class="loc-label">📍 ' + def.city + ' ▾</span><span class="loc-sub">Near ' + st + '</span>';
                }
            }
        }
    } catch(e) {}
})();
</script>
</body>`;

for (let file of files) {
  let fp = path.join('C:/Users/ASUS/Desktop/New folder/frontend', file);
  if (!fs.existsSync(fp)) continue;
  let content = fs.readFileSync(fp, 'utf8');
  if (!content.includes('Global Profile Sync')) {
    content = content.replace(/<\/body>\s*<\/html>/gi, scriptTag + '\n</html>');
    fs.writeFileSync(fp, content);
  }
}
console.log('done updating files');
