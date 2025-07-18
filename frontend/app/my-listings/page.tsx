'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plus, Eye, Trash2, CheckCircle, AlertCircle } from 'lucide-react'
import { createClient } from '@supabase/supabase-js'
import { toast } from 'sonner'
import { apiRoutes } from '@/lib/apiRoutes'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

interface Listing {
  listings_id: string
  ticket_id: string,
  user_id: string
  image_url: string
  parsed_fields: Record<string, any>
  fingerprint: string
  is_verified: boolean | null
  status: string
  created_at: string
  verified_at?: string
  price?: number
  event_name?: string
  date?: string
  section?: string
  row?: string
  seat_number?: string
  category?: string
}

export default function MyListings() {
  const [listings, setListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const router = useRouter()

  const fetchListings = useCallback(
    async (userId: string) => {
      setLoading(true)
      try {
        const response = await fetch(apiRoutes.getUserListings(userId))
        if (!response.ok) {
          if (response.status === 404) {
            setListings([])
            return
          }
          throw new Error('Failed to fetch listings')
        }
        const contentType = response.headers.get('content-type') || ''
        if (!contentType.includes('application/json')) {
          setListings([])
          return
        }
        const data = await response.json()
        setListings(data.listings || [])
      } catch (error) {
        console.error('Error fetching listings:', error)
        toast.error('Failed to load your listings')
      } finally {
        setLoading(false)
      }
    },
    []
  )

  const groupedListings = listings.reduce((acc, ticket) => {
    if (!acc[ticket.listings_id]) {
      acc[ticket.listings_id] = {
        listingId: ticket.listings_id,
        tickets: [],
        is_verified: ticket.is_verified,
        status: ticket.status,
        created_at: ticket.created_at,
        parsed_fields: ticket.parsed_fields
      };
    }
    acc[ticket.listings_id].tickets.push(ticket);
    return acc;
  }, {} as Record<string, any>);

  const checkUserAndFetch = useCallback(async () => {
    try {
      const {
        data: { session }
      } = await supabase.auth.getSession()

      if (session?.user) {
        setUser(session.user)
        await fetchListings(session.user.id)
      } else {
        router.push('/auth/login')
      }
    } catch (error) {
      console.error('Error checking user session:', error)
      router.push('/auth/login')
    }
  }, [fetchListings, router])

  useEffect(() => {
    checkUserAndFetch()
  }, [checkUserAndFetch])

  const deleteListing = async (listingId: string) => {
    if (!user) {
      toast.error('User not logged in')
      return
    }
    try {
      const response = await fetch(apiRoutes.listingById(listingId), {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id })
      })

      if (!response.ok) {
        throw new Error('Failed to delete listing')
      }

      toast.success('Listing deleted successfully')
      await fetchListings(user.id)
    } catch (error) {
      console.error('Error deleting listing:', error)
      toast.error('Failed to delete listing')
    }
  }

  const confirmListing = async (listingId: string) => {
    if (!user) {
      toast.error('User not logged in')
      return
    }
  
    try {
      const response = await fetch(apiRoutes.confirmListing(listingId), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id })
      })
  
      const data = await response.json() // ✅ Parse response body
  
      if (!response.ok) {
        throw new Error(data?.message || 'Failed to confirm listing')
      }
  
      if (data.verification_status === 'rejected') {
        toast.error(data.message || 'Listing was rejected due to duplication.')
      } else {
        toast.success(data.message || 'Listing verified and published!')
      }
  
      await fetchListings(user.id)
    } catch (error: any) {
      console.error('Error confirming listing:', error)
      toast.error(error.message || 'Failed to confirm listing')
    }
  }
  

  const getStatusBadge = (listing: Listing) => {
    if (listing.is_verified === true) {
      return (
        <Badge className="bg-green-100 text-green-800 flex items-center">
          <CheckCircle className="w-3 h-3 mr-1" />
          Verified
        </Badge>
      )
    }
    if (listing.is_verified === null && listing.status === 'rejected') {
      return (
        <Badge className="bg-red-100 text-red-800 flex items-center">
          <AlertCircle className="w-3 h-3 mr-1" />
          Rejected
        </Badge>
      )
    }
    return (
      <Badge className="bg-gray-200 text-gray-700 flex items-center">
        <AlertCircle className="w-3 h-3 mr-1" />
        Unverified
      </Badge>
    )
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900" />
        </div>
      </div>
    )
  }

  return (
    <div className="px-6 py-10">
      <div className="relative z-10 max-w-5xl mx-auto">
        <div className="mb-10">
          <div className="rounded-2xl shadow-md bg-white/80 border border-gray-200 px-8 py-6 flex flex-col items-center md:items-start card-glass">
            <h1 className="text-4xl font-extrabold text-gray-900 mb-2 text-center md:text-left">My Listings</h1>
            <p className="text-gray-600 text-lg mb-4 text-center md:text-left">Manage your uploaded tickets here.</p>
            <Button onClick={() => router.push('/my-listings/new')} className="bg-blue-600 hover:bg-blue-700 self-center md:self-end">
              <Plus className="w-4 h-4 mr-2" />
              Create Listing
            </Button>
          </div>
        </div>

        {listings.length === 0 ? (
          <Card className="text-center py-16 bg-white/90 shadow-lg border border-gray-200 animate-fade-in-scale card-glass">
            <CardContent>
              <div className="mx-auto w-28 h-28 bg-blue-100 rounded-full flex items-center justify-center mb-6 shadow">
                <Plus className="w-12 h-12 text-blue-400" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">No listings yet</h3>
              <p className="text-gray-600 mb-8 text-lg">Start by uploading your first ticket for resale.</p>
              <Button onClick={() => router.push('/my-listings/new')} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Listing
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Object.values(groupedListings).map((listingGroup: any, idx) => {
              const { listingId, tickets, is_verified, status, created_at, parsed_fields } = listingGroup;
              return (
                <Card
                  key={listingId}
                  className="overflow-hidden rounded-2xl card-glass shadow-lg border border-gray-200 transition-transform hover:scale-[1.025] hover:shadow-xl min-h-[400px]"
                  style={{ animationDelay: `${idx * 60}ms` }}
                >
                  <CardHeader className="pb-2 pt-4 px-6">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle>
                          Listing ID: {listingId}
                        </CardTitle>
                        <CardDescription>
                          {tickets.length} ticket{tickets.length > 1 ? 's' : ''}
                        </CardDescription>
                      </div>
                      <div>{getStatusBadge({ is_verified, status } as Listing)}</div>
                    </div>
                  </CardHeader>

                  <CardContent className="pt-0 px-6 pb-4">
                    <div className="mb-4 space-y-3">
                      {tickets.map((ticket: Listing) => (
                        <div key={ticket.fingerprint || ticket.ticket_id} className="border rounded-lg p-3 bg-gray-50">
                          <p><strong>Event Name:</strong> {ticket.event_name}</p>
                          <p><strong>Section:</strong> {ticket.section || ticket.parsed_fields?.section || '-'}</p>
                          <p><strong>Row:</strong> {ticket.row || ticket.parsed_fields?.row || '-'}</p>
                          <p><strong>Seat:</strong> {ticket.seat_number || ticket.parsed_fields?.seat || '-'}</p>
                          <p><strong>Price:</strong> ${ticket.price || ticket.parsed_fields?.price || '-'}</p>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(ticket.image_url, '_blank')}
                            className="mt-2"
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            View Ticket
                          </Button>
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-2 mt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteListing(listingId)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 flex-1"
                        title="Delete this listing"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                      {!is_verified && (
                        <Button
                          size="sm"
                          onClick={() => confirmListing(listingId)}
                          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                          title="Verify this listing"
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Verify Listing
                        </Button>
                      )}
                    </div>

                    <div className="text-gray-400 text-xs mt-4">
                      Uploaded: {formatDate(created_at)}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
    ); 
}
