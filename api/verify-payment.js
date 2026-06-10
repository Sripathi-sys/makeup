const crypto = require('crypto');

const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || '';

module.exports = async (req, res) => {
    const origin = req.headers.origin || '';
    const allowed = ALLOWED_ORIGIN && origin === ALLOWED_ORIGIN;
    res.setHeader('Access-Control-Allow-Origin', allowed ? origin : ALLOWED_ORIGIN);
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Vary', 'Origin');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    if (!allowed) return res.status(403).json({ error: 'Forbidden' });

    if (!process.env.RAZORPAY_KEY_SECRET) return res.status(500).json({ error: 'Server error' });

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body || {};

    if (
        typeof razorpay_order_id !== 'string' ||
        typeof razorpay_payment_id !== 'string' ||
        typeof razorpay_signature !== 'string' ||
        !razorpay_order_id || !razorpay_payment_id || !razorpay_signature
    ) {
        return res.status(400).json({ error: 'Invalid request' });
    }

    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(body)
        .digest('hex');

    const expected = Buffer.from(expectedSignature, 'hex');
    const received = Buffer.from(razorpay_signature, 'hex');

    let verified = false;
    if (expected.length === received.length) {
        verified = crypto.timingSafeEqual(expected, received);
    }

    if (verified) {
        res.status(200).json({ verified: true });
    } else {
        res.status(400).json({ verified: false });
    }
};
