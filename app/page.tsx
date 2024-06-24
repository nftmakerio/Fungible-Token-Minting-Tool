"use client"

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import { Progress } from "@/components/ui/progress"

const WALLET_ADDRESS = 'addr1q98qjgkvv6ul6p5tlxvq9zxklnj87y0lf4s0lta4km4s0scktx0qwk39jnq9a3krt20xa07fgkpf23q4wl3sqcgmrwps79n8u9'
const FIXED_PRICE_LOVELACE = 20000000 // 2 ADA in lovelace

export default function Home() {
  const [tokenName, setTokenName] = useState('')
  const [description, setDescription] = useState('')
  const [image, setImage] = useState<File | null>(null)
  const [supply, setSupply] = useState('')
  const [payLink, setPayLink] = useState('')
  const [apiResponses, setApiResponses] = useState<string[]>([])
  const [uploadedTokenData, setUploadedTokenData] = useState<any>(null)
  const [currentStep, setCurrentStep] = useState(0)
  const { toast } = useToast()

  const steps = ['Preparing', 'Creating Project', 'Uploading Token', 'Creating Payment', 'Completed']

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImage(e.target.files[0])
    }
  }

  const addApiResponse = (step: string, response: any) => {
    setApiResponses(prev => [...prev, `${step}:\n${JSON.stringify(response, null, 2)}`])
  }

  const handleMint = async () => {
    setApiResponses([]) // Clear previous responses
    setCurrentStep(1) // Start with Creating Project
    try {
      console.log('About to create project...');
      const projectResponse = await fetch('/api/create-project', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectname: `Project for ${tokenName}`,
          description: description || "Fungible Token Project",
          projecturl: "string",
          tokennamePrefix: "string",
          twitterHandle: "string",
          policyExpires: true,
          policyLocksDateTime: "2025-12-06T12:46:19.695Z",
          payoutWalletaddress: WALLET_ADDRESS,
          maxNftSupply: parseInt(supply) || 1000000, // Use the supply input for maxNftSupply
          addressExpiretime: 20,
          pricelist: [
            {
              countNft: 1,
              priceInLovelace: FIXED_PRICE_LOVELACE,
              isActive: true,
              validFrom: "2022-12-06T12:46:19.695Z",
              validTo: "2025-12-06T12:46:19.695Z"
            }
          ],
          enableDecentralPayments: true,
          enableCrossSaleOnPaymentgateway: true,
          activatePayinAddress: true,
          paymentgatewaysalestart: "2022-12-08T12:46:19.695Z"
        })
      });
  
      if (!projectResponse.ok) {
        const errorText = await projectResponse.text();
        throw new Error(`HTTP error! status: ${projectResponse.status}, message: ${errorText}`);
      }
  
      const projectData = await projectResponse.json();
      console.log('Project creation response:', projectData);
      addApiResponse('Create Project', projectData);
      
      toast({
        title: "Project Created!",
        description: "Your project has been created successfully.",
      });
  
      // Upload Token (this will also create the payment transaction)
      await handleUploadToken(projectData.uid);
  
    } catch (error) {
      console.error('Error in minting process:', error);
      let errorMessage = 'Unknown error occurred';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      addApiResponse('Error', { message: errorMessage, fullError: JSON.stringify(error) });
      toast({
        title: "Error",
        description: `There was an error in the minting process: ${errorMessage}`,
        variant: "destructive"
      });
      setCurrentStep(0) // Reset to initial state on error
    }
  }
  
  

  const handleUploadToken = async (projectUid: string) => {
    setCurrentStep(2) // Uploading Token
    if (!image) {
      toast({
        title: "Error",
        description: "Please select an image file",
        variant: "destructive"
      });
      setCurrentStep(0) // Reset to initial state on error
      return;
    }
  
    try {
      const formData = new FormData();
      formData.append('projectUid', projectUid);
      formData.append('tokenname', tokenName || 'DefaultTokenName');
      formData.append('displayname', tokenName || 'Default Display Name');
      formData.append('description', description || 'Default description');
      formData.append('image', image);
  
      const response = await fetch('/api/upload-token', {
        method: 'POST',
        body: formData,
      });
  
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }
  
      const data = await response.json();
      console.log('Token upload response:', data);
      setUploadedTokenData(data);
      addApiResponse('Upload Token', data);
  
      if (!data.nftUid) {
        throw new Error('NFT UID not received from token upload');
      }
  
      toast({
        title: "Token Uploaded!",
        description: "Your token has been uploaded successfully.",
      });
  
      // Immediately create payment transaction after successful upload
      await createPaymentTransaction(projectUid, data.nftUid);
  
    } catch (error) {
      console.error('Error uploading token:', error);
      let errorMessage = 'Unknown error occurred';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      addApiResponse('Error', { message: errorMessage, fullError: JSON.stringify(error) });
      toast({
        title: "Error",
        description: `There was an error uploading the token: ${errorMessage}`,
        variant: "destructive"
      });
      setCurrentStep(0) // Reset to initial state on error
    }
  };
  
  const createPaymentTransaction = async (projectUid: string, nftUid: string) => {
    setCurrentStep(3) // Creating Payment
    try {
      console.log('Creating payment transaction with:', { projectUid, nftUid });
      const response = await fetch('/api/create-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectUid,
          nftUid,
          tokencount: parseInt(supply) || 1, // Use the supply state variable
        }),
      });
  
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response from create-payment API:', response.status, errorText);
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }
  
      const data = await response.json();
      console.log('Payment transaction created:', data);
      addApiResponse('Create Payment', data);
      setPayLink(data.nmkrPayUrl);
  
      toast({
        title: "Payment Created!",
        description: "Your payment transaction has been created successfully.",
      });
      setCurrentStep(4) // Completed
    } catch (error) {
      console.error('Error creating payment:', error);
      let errorMessage = 'Unknown error occurred';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      addApiResponse('Error', { message: errorMessage, fullError: JSON.stringify(error) });
      toast({
        title: "Error",
        description: `There was an error creating the payment: ${errorMessage}`,
        variant: "destructive"
      });
      setCurrentStep(0) // Reset to initial state on error
    }
  };
  
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <Card className="w-[350px] mb-8">
        <CardHeader>
          <CardTitle>Mint Your Fungible Token with NMKR</CardTitle>
          <CardDescription>Fill in the details to mint your token.</CardDescription>
        </CardHeader>
        <CardContent>
          <form>
            <div className="grid w-full items-center gap-4">
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="name">Token Name</Label>
                <Input id="name" placeholder="Name of your token" value={tokenName} onChange={(e) => setTokenName(e.target.value)} />
              </div>
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" placeholder="Describe your token" value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="image">Image</Label>
                <Input id="image" type="file" onChange={handleImageChange} />
              </div>
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="supply">Total Supply</Label>
                <Input id="supply" type="number" placeholder="Set total supply" value={supply} onChange={(e) => setSupply(e.target.value)} />
              </div>
              <div className="flex flex-col space-y-1.5">
                <Label>Price</Label>
                <p className="text-sm text-gray-500">Fixed at 2 ADA per token</p>
              </div>
            </div>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col items-center space-y-2">
          <Button onClick={handleMint} className="w-full" disabled={currentStep !== 0}>Mint Token</Button>
          <div className="w-full">
            <Progress value={(currentStep / (steps.length - 1)) * 100} className="w-full" />
            <p className="text-center mt-2">{steps[currentStep]}</p>
          </div>
          {uploadedTokenData && (
            <div className="text-sm text-gray-500">
              Token uploaded with ID: {uploadedTokenData.nftId}
            </div>
          )}
          {payLink && (
            <a href={payLink} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
              Buy Token on NMKR Pay
            </a>
          )}
        </CardFooter>
      </Card>

      {apiResponses.length > 0 && (
        <Card className="w-full max-w-[800px]">
          <CardHeader>
            <CardTitle>API Responses</CardTitle>
          </CardHeader>
          <CardContent>
            {apiResponses.map((response, index) => (
              <pre key={index} className="bg-gray-100 p-2 rounded mb-2 overflow-x-auto">
                <code>{response}</code>
              </pre>
            ))}
          </CardContent>
        </Card>
      )}
    </main>
  )
}

