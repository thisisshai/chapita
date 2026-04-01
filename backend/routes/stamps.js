const express = require('express');
const router = express.Router();
const supabase = require('../supabase');
const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');

// Generate a QR code for the business counter
router.get('/qr/:businessId', async (req, res) => {
  const { businessId } = req.params;
  const enrollUrl = `http://172.20.10.2:3000/stamps/enrol/${businessId}`;
  
  try {
    const qrDataUrl = await QRCode.toDataURL(enrollUrl);
    res.json({ qr: qrDataUrl, enrollUrl });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate QR code' });
  }
});

// Customer enrolment — called when customer scans the QR
router.get('/enrol/:businessId', async (req, res) => {
  const { businessId } = req.params;

  const { data: business, error } = await supabase
    .from('businesses')
    .select('*')
    .eq('id', businessId)
    .single();

  if (error || !business) {
    return res.status(404).send('Business not found');
  }

  // Serve the stamp card web page
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>${business.name} — Chapita</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, sans-serif; background: #f5f5f5; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px; }
        .card { background: white; border-radius: 20px; padding: 32px 24px; max-width: 360px; width: 100%; box-shadow: 0 4px 24px rgba(0,0,0,0.10); }
        .header { display: flex; align-items: center; gap: 12px; margin-bottom: 24px; }
        .dot { width: 14px; height: 14px; border-radius: 50%; background: ${business.brand_colour || '#2E75B6'}; }
        .business-name { font-size: 20px; font-weight: 700; color: #1a1a1a; }
        .reward-label { font-size: 13px; color: #999; margin-bottom: 4px; }
        .reward { font-size: 16px; font-weight: 600; color: #333; margin-bottom: 28px; }
        .stamps-label { font-size: 13px; color: #999; margin-bottom: 12px; }
        .stamps-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; margin-bottom: 28px; }
        .stamp { width: 100%; aspect-ratio: 1; border-radius: 50%; border: 2px solid ${business.brand_colour || '#2E75B6'}; display: flex; align-items: center; justify-content: center; }
        .stamp.filled { background: ${business.brand_colour || '#2E75B6'}; }
        .stamp.filled::after { content: '✓'; color: white; font-size: 16px; font-weight: 700; }
        .count { text-align: center; font-size: 14px; color: #777; margin-bottom: 24px; }
        .enrol-form { display: flex; flex-direction: column; gap: 12px; }
        .enrol-form input { padding: 12px; border: 1px solid #ddd; border-radius: 10px; font-size: 15px; }
        .enrol-form button { padding: 14px; background: ${business.brand_colour || '#2E75B6'}; color: white; border: none; border-radius: 10px; font-size: 15px; font-weight: 600; cursor: pointer; }
        .powered { text-align: center; margin-top: 20px; font-size: 12px; color: #bbb; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <div class="dot"></div>
          <span class="business-name">${business.name}</span>
        </div>
        <div class="reward-label">Your reward</div>
        <div class="reward">${business.reward_name}</div>
        <div class="stamps-label">Stamps collected</div>
        <div class="stamps-grid">
          ${Array.from({length: 10}, (_, i) => `<div class="stamp"></div>`).join('')}
        </div>
        <div class="count">0 / 10 stamps</div>
        <div class="enrol-form">
          <input type="email" id="email" placeholder="Enter your email to get started" />
          <button onclick="enrol('${businessId}')">Get my stamp card</button>
        </div>
        <div class="powered">Powered by Chapita</div>
      </div>
      <script>
        async function enrol(businessId) {
          const email = document.getElementById('email').value;
          if (!email) return alert('Please enter your email');
          
          const res = await fetch('/stamps/customer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ businessId, email })
          });
          
          const data = await res.json();
          if (data.customerId) {
            window.location.href = '/stamps/card/' + data.customerId;
          } else {
            alert(data.error || 'Something went wrong');
          }
        }
      </script>
    </body>
    </html>
  `);
});

// Create or find a customer
router.post('/customer', async (req, res) => {
  const { businessId, email } = req.body;

  // Check if customer already exists
  const { data: existing } = await supabase
    .from('customers')
    .select('*')
    .eq('business_id', businessId)
    .eq('phone_or_email', email)
    .single();

  if (existing) {
    return res.json({ customerId: existing.id });
  }

  // Create new customer
  const { data: newCustomer, error } = await supabase
    .from('customers')
    .insert({ business_id: businessId, phone_or_email: email })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  res.json({ customerId: newCustomer.id });
});

// Show a customer's stamp card
router.get('/card/:customerId', async (req, res) => {
  const { customerId } = req.params;

  const { data: customer, error: custError } = await supabase
    .from('customers')
    .select('*')
    .eq('id', customerId)
    .single();

  if (custError || !customer) return res.status(404).send('Card not found');

  const { data: business } = await supabase
    .from('businesses')
    .select('*')
    .eq('id', customer.business_id)
    .single();

  const { data: stamps } = await supabase
    .from('stamps')
    .select('*')
    .eq('customer_id', customerId);

  const stampCount = stamps ? stamps.length : 0;
  const hasReward = stampCount >= 10;
  const cardQr = await QRCode.toDataURL(`http://localhost:3000/stamps/card/${customerId}`);

  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>${business.name} — My Card</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, sans-serif; background: #f5f5f5; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px; }
        .card { background: white; border-radius: 20px; padding: 32px 24px; max-width: 360px; width: 100%; box-shadow: 0 4px 24px rgba(0,0,0,0.10); }
        .header { display: flex; align-items: center; gap: 12px; margin-bottom: 8px; }
        .dot { width: 14px; height: 14px; border-radius: 50%; background: ${business.brand_colour || '#2E75B6'}; }
        .business-name { font-size: 20px; font-weight: 700; color: #1a1a1a; }
        .email { font-size: 13px; color: #999; margin-bottom: 24px; }
        .reward-label { font-size: 13px; color: #999; margin-bottom: 4px; }
        .reward { font-size: 16px; font-weight: 600; color: #333; margin-bottom: 28px; }
        .stamps-label { font-size: 13px; color: #999; margin-bottom: 12px; }
        .stamps-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; margin-bottom: 16px; }
        .stamp { width: 100%; aspect-ratio: 1; border-radius: 50%; border: 2px solid ${business.brand_colour || '#2E75B6'}; display: flex; align-items: center; justify-content: center; }
        .stamp.filled { background: ${business.brand_colour || '#2E75B6'}; }
        .stamp.filled::after { content: '✓'; color: white; font-size: 16px; font-weight: 700; }
        .count { text-align: center; font-size: 14px; color: #777; margin-bottom: 24px; }
        .reward-badge { background: ${business.brand_colour || '#2E75B6'}; color: white; border-radius: 12px; padding: 16px; text-align: center; margin-bottom: 20px; }
        .reward-badge h3 { font-size: 18px; margin-bottom: 4px; }
        .reward-badge p { font-size: 13px; opacity: 0.85; }
        .qr-section { text-align: center; margin-bottom: 20px; }
        .qr-label { font-size: 13px; color: #999; margin-bottom: 10px; }
        .wallet-btn { display: block; width: 100%; padding: 14px; background: black; color: white; border: none; border-radius: 10px; font-size: 15px; font-weight: 600; cursor: pointer; text-align: center; text-decoration: none; margin-bottom: 8px; }
        .powered { text-align: center; margin-top: 20px; font-size: 12px; color: #bbb; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="header">
          <div class="dot"></div>
          <span class="business-name">${business.name}</span>
        </div>
        <div class="email">${customer.phone_or_email}</div>
        <div class="reward-label">Your reward</div>
        <div class="reward">${business.reward_name}</div>
        <div class="stamps-label">Stamps collected</div>
        <div class="stamps-grid">
          ${Array.from({length: 10}, (_, i) =>
            `<div class="stamp ${i < stampCount ? 'filled' : ''}"></div>`
          ).join('')}
        </div>
        <div class="count">${stampCount} / 10 stamps</div>
        ${hasReward ? `
          <div class="reward-badge">
            <h3>Reward ready!</h3>
            <p>Show this to staff to claim your ${business.reward_name}</p>
          </div>
        ` : ''}
        <div class="qr-section">
          <p class="qr-label">Staff scan this to add a stamp</p>
          <img src="${cardQr}" style="width:140px;height:140px;" />
        </div>
       <div style="text-align:center; margin-bottom:8px;">
  <a href="#" style="display:inline-flex; align-items:center; gap:10px; background:black; color:white; padding:10px 20px; border-radius:10px; text-decoration:none; font-family:-apple-system,sans-serif; font-size:15px; font-weight:500;">
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <rect x="2" y="4" width="20" height="16" rx="3" fill="#1a1a1a" stroke="white" stroke-width="1"/>
      <rect x="2" y="8" width="20" height="4" fill="#3a7bd5"/>
      <rect x="2" y="8" width="20" height="2" fill="#e8b84b"/>
      <rect x="2" y="10" width="20" height="2" fill="#4caf50"/>
      <rect x="2" y="12" width="20" height="2" fill="#e57373"/>
    </svg>
    <span style="display:flex; flex-direction:column; line-height:1.2; text-align:left;">
      <span style="font-size:11px; opacity:0.8;">Add to</span>
      <span style="font-size:17px; font-weight:600;">Apple Wallet</span>
    </span>
  </a>
</div>
        <div class="powered">Powered by Chapita</div>
      </div>
    </body>
    </html>
  `);
}); 

// Issue a stamp to a customer
router.post('/issue', async (req, res) => {
  const { customerId, businessId } = req.body;

  if (!customerId || !businessId) {
    return res.status(400).json({ error: 'customerId and businessId are required' });
  }

  const { data, error } = await supabase
    .from('stamps')
    .insert({ customer_id: customerId, business_id: businessId })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  res.status(201).json({ 
    message: 'Stamp issued successfully',
    stamp: data
  });
});

// Get business ID by email — used by the dashboard
router.get('/business-by-email/:email', async (req, res) => {
  const { email } = req.params;

  const { data, error } = await supabase
    .from('businesses')
    .select('id')
    .eq('email', email)
    .single();

  if (error || !data) return res.json({ businessId: null });
  res.json({ businessId: data.id });
});

module.exports = router;