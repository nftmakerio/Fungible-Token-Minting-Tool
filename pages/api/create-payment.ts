import type { NextApiRequest, NextApiResponse } from 'next'

const NMKR_API_KEY = process.env.NMKR_API_KEY
const NMKR_API_URL = 'https://studio-api.nmkr.io'
const FIXED_PRICE_LOVELACE = 2000000 // 2 ADA in lovelace

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    try {
      const { projectUid, nftUid, tokencount } = req.body;

      const payloadData = {
        projectUid: projectUid,
        paymentTransactionType: "nmkr_pay_specific",
        customProperties: {},
        paymentgatewayParameters: {
            priceInLovelace: FIXED_PRICE_LOVELACE,
          mintnfts: {
            reserveNfts: [
              { 
                nftUid: nftUid,
                tokencount: tokencount
              }
            ]
          }
        },
        customerIpAddress: req.socket.remoteAddress || "0.0.0.0"
      };

      console.log('Payload for CreatePaymentTransaction:', JSON.stringify(payloadData, null, 2));

      const response = await fetch(`${NMKR_API_URL}/v2/CreatePaymentTransaction`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${NMKR_API_KEY}`
        },
        body: JSON.stringify(payloadData)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response from NMKR API:', response.status, errorText);
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }

      const data = await response.json();
      res.status(200).json(data);
    } catch (error) {
      console.error('Error creating payment transaction:', error);
      res.status(500).json({ error: 'Error creating payment transaction', details: error.message });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}