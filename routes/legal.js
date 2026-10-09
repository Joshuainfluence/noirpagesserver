const express = require('express');
const router = express.Router();

const APP = 'Dark Desires';
const DEVELOPER = process.env.DEVELOPER_NAME || 'The Dark Desires team';
const EMAIL = process.env.SUPPORT_EMAIL || 'support@example.com';
const UPDATED = 'October 9, 2026';

function page(title, body) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title} · ${APP}</title>
<style>body{margin:0;background:#0A0A0C;color:#F5F0F2;font:16px/1.65 -apple-system,Segoe UI,Inter,sans-serif}main{max-width:720px;margin:0 auto;padding:32px 20px 64px}h1,h2{font-family:Georgia,serif;font-weight:400}h2{margin-top:32px;color:#F06B8C}a{color:#F06B8C}input,button{font:inherit;padding:10px 12px;border-radius:8px;border:1px solid #2A252E;background:#151318;color:#F5F0F2;width:100%;box-sizing:border-box;margin-bottom:12px}button{background:#E63262;border:0;cursor:pointer}.muted{color:#A89AA0;font-size:14px}</style></head><body><main>${body}</main></body></html>`;
}

const privacy = `
<h1>Privacy Policy</h1>
<p class="muted">Last updated: ${UPDATED}</p>
<p>${APP} is a reading app operated by ${DEVELOPER}. This policy explains what we collect, why, and the choices you have. Contact: <a href="mailto:${EMAIL}">${EMAIL}</a>.</p>

<h2>Information we collect</h2>
<ul>
  <li><strong>Account details:</strong> your email address and display name. If you sign in with Google we receive your Google email and name. Passwords are stored only in hashed form.</li>
  <li><strong>Reading activity:</strong> the stories and chapters you open, your bookmarks and your reading progress.</li>
  <li><strong>Coins:</strong> your coin balance and a log of coins you earned and spent.</li>
  <li><strong>Device and advertising data:</strong> our advertising partner, Google AdMob, collects data such as your advertising ID, IP address and device information to show and measure ads.</li>
</ul>

<h2>How we use it</h2>
<p>To run your account, remember your progress and bookmarks, credit and spend coins, prevent abuse, keep the app secure, and show ads that fund the app.</p>

<h2>Advertising</h2>
<p>${APP} shows ads provided by Google AdMob, including optional rewarded videos. Google's use of data is described at <a href="https://policies.google.com/technologies/ads">policies.google.com/technologies/ads</a>. You can reset your advertising ID or opt out of personalised ads in your Android settings.</p>

<h2>Who we share data with</h2>
<p>We do not sell your personal information. We use service providers to operate the app: hosting (Vercel), database (MongoDB Atlas) and Google (sign-in and ads). They process data only to provide those services.</p>

<h2>Retention and deletion</h2>
<p>We keep your data while your account is active. You can delete your account inside the app (Profile, then Delete account) or on our <a href="/delete-account">account deletion page</a>. Deletion removes your account, bookmarks, reading activity, unlocks and coin history.</p>

<h2>Security</h2>
<p>Data is sent over encrypted connections and passwords are hashed. No system is perfectly secure, but we work to protect your information.</p>

<h2>Age</h2>
<p>${APP} contains fiction with mature themes and is intended for people aged 18 and over. It is not directed at children.</p>

<h2>Changes and contact</h2>
<p>We may update this policy and will change the date above when we do. Questions: <a href="mailto:${EMAIL}">${EMAIL}</a>.</p>`;

const terms = `
<h1>Terms of Use</h1>
<p class="muted">Last updated: ${UPDATED}</p>
<h2>Using ${APP}</h2>
<p>You must be 18 or older. Stories are works of fiction supplied by ${DEVELOPER} and may contain mature themes. Content is protected by copyright; do not copy or redistribute it.</p>
<h2>Coins</h2>
<p>Coins are an in-app feature. They have no cash value, cannot be withdrawn, sold or transferred, and can only be used to unlock chapters in ${APP}. We may change how many coins a video earns and how many coins a chapter costs. Coins are removed if your account is deleted.</p>
<h2>Ads and fair use</h2>
<p>Videos are optional. Using bots, emulators, scripts or multiple accounts to generate ad views or coins is not allowed, and we may remove coins or close accounts that do.</p>
<h2>Termination</h2>
<p>You can delete your account at any time. We may suspend accounts that break these terms.</p>
<h2>Disclaimer</h2>
<p>The app is provided as is, without warranties. Contact: <a href="mailto:${EMAIL}">${EMAIL}</a>.</p>`;

const deletePage = `
<h1>Delete your account</h1>
<p>You can delete your ${APP} account and its data here, or in the app under Profile, then Delete account. This cannot be undone.</p>
<form id="f">
  <input id="email" type="email" placeholder="Email" required>
  <input id="password" type="password" placeholder="Password" required>
  <button type="submit">Permanently delete my account</button>
</form>
<p id="msg" class="muted"></p>
<p class="muted">Signed up with Google? Delete your account in the app (Profile, then Delete account), or email <a href="mailto:${EMAIL}">${EMAIL}</a> from the address on your account.</p>
<script>
document.getElementById('f').addEventListener('submit', async function (e) {
  e.preventDefault();
  var msg = document.getElementById('msg');
  msg.textContent = 'Deleting...';
  try {
    var r = await fetch('/api/auth/delete-account', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: document.getElementById('email').value, password: document.getElementById('password').value })
    });
    var j = await r.json();
    msg.textContent = j.message || (r.ok ? 'Account deleted.' : 'Something went wrong.');
  } catch (err) {
    msg.textContent = 'Network error. Please try again.';
  }
});
</script>`;

router.get('/', (req, res) => res.type('text').send('Dark Desires API'));
router.get('/privacy', (req, res) => res.type('html').send(page('Privacy Policy', privacy)));
router.get('/terms', (req, res) => res.type('html').send(page('Terms of Use', terms)));
router.get('/delete-account', (req, res) => res.type('html').send(page('Delete account', deletePage)));

module.exports = router;