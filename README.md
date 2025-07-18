This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
cd frontend
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

# TaeraeTickets - Ticket Resale Platform

A modern ticket resale platform built with Next.js, Node.js, and Supabase, featuring AI-powered OCR for ticket processing.

## Features

- **AI-Powered OCR**: Uses Mistral.ai's OCR API to extract text from ticket images and PDFs
- **PDF Support**: Upload and process large PDF files (up to 100MB)
- **Image Processing**: Automatic image optimization and deduplication
- **User Authentication**: Secure user management with Supabase Auth
- **Real-time Updates**: Live updates for ticket listings and status changes

## Tech Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS
- **Backend**: Node.js, Express, FastAPI (Python)
- **Database**: Supabase (PostgreSQL)
- **Storage**: Supabase Storage
- **OCR**: Mistral.ai API
- **Image Processing**: Sharp, Tesseract

## Setup Instructions

### 1. Clone the Repository
```bash
git clone <repository-url>
cd taeraetickets
```

### 2. Install Dependencies

#### Backend Dependencies
```bash
cd backend
npm install
pip install -r requirements.txt
```

#### Frontend Dependencies
```bash
cd frontend
npm install
```

### 3. Environment Configuration

Create a `.env` file in the backend directory with the following variables:

```env
# Supabase Configuration
SUPABASE_URL=your_supabase_url_here
SUPABASE_KEY=your_supabase_anon_key_here

# Mistral.ai API Configuration
MISTRAL_API_KEY=your_mistral_api_key_here

# Server Configuration
PORT=3000
NODE_ENV=development

# API URLs
NEXT_PUBLIC_API_URL=http://localhost:3000
```

### 4. Get Your API Keys

#### Mistral.ai API Key
1. Sign up at [Mistral.ai](https://mistral.ai)
2. Navigate to your API keys section
3. Create a new API key
4. Add it to your `.env` file as `MISTRAL_API_KEY`

#### Supabase Configuration
1. Create a Supabase project
2. Get your project URL and anon key
3. Add them to your `.env` file

### 5. Start the Services

#### Start the Python OCR Service
```bash
cd backend
uvicorn services.ocrService:app --host 0.0.0.0 --port 5001
```

#### Start the Node.js Backend
```bash
cd backend
npm run dev
```

#### Start the Frontend
```bash
cd frontend
npm run dev
```

## API Endpoints

### OCR Service (Python/FastAPI)
- `POST /extract-text/` - Extract text from images/PDFs using Mistral.ai
- `GET /health` - Health check endpoint

### Backend Service (Node.js/Express)
- `POST /process-ticket` - Upload processed ticket details
- `GET /listings/:userId` - Get user's listings
- `POST /confirm-listing/:listingId` - Confirm a listing
- `DELETE /listings/:listingId` - Delete a listing

## File Upload Support

- **Images**: JPG, PNG, GIF, BMP (up to 100MB)
- **PDFs**: PDF files (up to 100MB)
- **OCR Processing**: Automatic text extraction using Mistral.ai

## Deployment

### Environment Variables for Production
Make sure to set these environment variables in your production environment:

- `MISTRAL_API_KEY` - Your Mistral.ai API key
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_KEY` - Your Supabase anon key
- `NEXT_PUBLIC_API_URL` - Your backend API URL

### Supported Platforms
- **Vercel**: Frontend deployment
- **Railway**: Backend deployment
- **Supabase**: Database and storage
- **Any platform** that supports Node.js and Python

## Troubleshooting

### OCR Issues
- Ensure your `MISTRAL_API_KEY` is correctly set
- Check that the OCR service is running on port 5001
- Verify file size limits (100MB max)

### Upload Issues
- Check Supabase storage configuration
- Verify file type restrictions
- Ensure backend services are running

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.

