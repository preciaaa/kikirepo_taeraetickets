const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000';
const API_URL = process.env.NEXT_PUBLIC_API_URL || API_BASE_URL;
const FASTAPI_BACKEND_API_URL = process.env.NEXT_PUBLIC_FASTAPI_BACKEND_API_URL || API_BASE_URL;
const DEDUP_BACKEND_API_URL = process.env.NEXT_PUBLIC_DEDUP_BACKEND_API_URL || 'http://localhost:5003';

export const apiRoutes = {

  users: `${API_BASE_URL}/users`,
  user: (userId: string) => `${API_BASE_URL}/users/${userId}`,
  userById: (id: string) => `${API_BASE_URL}/users/${id}`,
  userVerification: (userId: string) => `${API_BASE_URL}/users/${userId}/verification`,
  userFaceEmbedding: (userId: string) => `${API_BASE_URL}/users/${userId}/face_embedding`, // PUT face embedding

  authUsers: `${API_BASE_URL}/auth-users`,
  authUserById: (id: string) => `${API_BASE_URL}/auth-users/${id}`,

  verifyRecaptcha: `${API_BASE_URL}/verify-recaptcha`,

  // Events
  events: `${API_BASE_URL}/events`,
  event: (eventId: string) => `${API_BASE_URL}/events/${eventId}`,
  searchEvent: `${FASTAPI_BACKEND_API_URL}/search-event`,
  createEvent: `${API_BASE_URL}/events/create`,
  addEventDate: (eventId: string) => `${API_BASE_URL}/events/${eventId}/add-date`,

  ticket: (ticketId: string) => `${API_BASE_URL}/tickets/${ticketId}`,
  updateTicket: (ticketId: string) => `${API_BASE_URL}/tickets/${ticketId}`,
  deleteTicket: (ticketId: string) => `${API_BASE_URL}/tickets/${ticketId}`,
  moveTicketToListing: (ticketId: string) => `${API_BASE_URL}/tickets/${ticketId}/move-to-listing`,

  allListings: `${API_BASE_URL}/listings/all`,
  getEventListings: (eventId: number) => `${API_BASE_URL}/listings/getEventListings/${eventId}`,
  getUserListings: (userId: string) => `${API_BASE_URL}/listings/getUserListings/${userId}`,
  listings: `${API_BASE_URL}/listings`,
  createListing: `${API_BASE_URL}/listings`,
  listingById: (listingId: string) => `${API_BASE_URL}/listings/${listingId}`,
  updateListing: (listingId: string) => `${API_BASE_URL}/listings/${listingId}`, 
  deleteListing: (listingId: string) => `${API_BASE_URL}/listings/${listingId}`,
  listingSummary: (listingId: string) => `${API_BASE_URL}/listings/${listingId}/summary`,
  listingByListingId: (listingId: string) => `${API_BASE_URL}/listings/by-listing-id/${listingId}`,
  confirmListing: (listingId: string) => `${API_BASE_URL}/confirm-listing/${listingId}`,

  cart: (userId: string) => `${API_BASE_URL}/cart/${userId}`,
  addToCart: `${API_BASE_URL}/cart`,
  removeFromCart: (userId: string, ticketId: string) => `${API_BASE_URL}/cart/${userId}/${ticketId}`,

  payments: (userId: string) => `${API_BASE_URL}/payments/${userId}`,
  confirmPurchase: `${API_BASE_URL}/confirm-purchase`,
  reportSeller: `${API_BASE_URL}/report-seller`,
  checkout: `${API_BASE_URL}/checkout`,
  createStripeAccount: `${API_BASE_URL}/create-stripe-account`,
  autoRelease: `${API_BASE_URL}/auto-release`,
  paymentSuccess: `${API_BASE_URL}/payment-success`,

  uploadTicket: `${API_BASE_URL}/upload-ticket`,
  processTicket: `${API_BASE_URL}/process-ticket`,

  health: `${API_BASE_URL}/health`,
  fastapiHealth: `${FASTAPI_BACKEND_API_URL}/health`,

// fastapis
  extractEmbedding: `${FASTAPI_BACKEND_API_URL}/extract-embedding`,
  compareFaces: `${FASTAPI_BACKEND_API_URL}/compare-faces`,
  checkDuplicate: `${FASTAPI_BACKEND_API_URL}/check-duplicate`,
  extractText: `${FASTAPI_BACKEND_API_URL}/extract-text/`,
};  