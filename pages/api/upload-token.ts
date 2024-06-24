import type { NextApiRequest, NextApiResponse } from 'next'
import formidable from 'formidable'
import fs from 'fs/promises'

export const config = {
  api: {
    bodyParser: false,
  },
}

const NMKR_API_KEY = process.env.NMKR_API_KEY
const NMKR_API_URL = 'https://studio-api.nmkr.io'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    try {
      const form = formidable();
      const [fields, files] = await form.parse(req);

      const projectUid = fields.projectUid?.[0];
      const image = files.image?.[0];

      if (!projectUid || !image) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const imageBuffer = await fs.readFile(image.filepath);
      const base64Image = imageBuffer.toString('base64');

      const nftData = {
        tokenname: fields.tokenname?.[0] || 'DefaultTokenName',
        displayname: fields.displayname?.[0] || 'Default Display Name',
        description: fields.description?.[0] || 'Default description',
        previewImageNft: {
          mimetype: image.mimetype,
          fileFromBase64: base64Image,
        },
      };

      const response = await fetch(`${NMKR_API_URL}/v2/UploadNft/${projectUid}`, {
        method: 'POST',
        headers: {
          'accept': 'text/plain',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${NMKR_API_KEY}`
        },
        body: JSON.stringify(nftData)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }

      const data = await response.json();
      console.log('NMKR API response:', data);

      if (!data.nftUid) {
        throw new Error('NFT UID not received from NMKR API');
      }

      res.status(200).json(data);
    } catch (error) {
      console.error('Error uploading NFT:', error);
      if (error instanceof Error) {
        res.status(500).json({ error: 'Error uploading NFT', details: error.message });
      } else {
        res.status(500).json({ error: 'Error uploading NFT', details: 'An unknown error occurred' });
      }
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}