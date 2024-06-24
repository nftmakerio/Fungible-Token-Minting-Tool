import type { NextApiRequest, NextApiResponse } from 'next'

const NMKR_API_KEY = process.env.NMKR_API_KEY
const NMKR_API_URL = 'https://studio-api.nmkr.io'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    try {
      console.log('Received project creation request:', JSON.stringify(req.body, null, 2));

      const response = await fetch(`${NMKR_API_URL}/v2/CreateProject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${NMKR_API_KEY}`
        },
        body: JSON.stringify(req.body)
      });

      const responseText = await response.text();
      console.log('NMKR API response status:', response.status);
      console.log('NMKR API response body:', responseText);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}, message: ${responseText}`);
      }

      const data = JSON.parse(responseText);
      res.status(200).json(data);
    } catch (error) {
      console.error('Error creating project:', error);
      if (error instanceof Error) {
        res.status(500).json({ error: 'Error creating project', details: error.message });
      } else {
        res.status(500).json({ error: 'Error creating project', details: 'An unknown error occurred' });
      }
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}