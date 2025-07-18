'use client'

import Image from 'next/image'
import { notFound } from 'next/navigation'
import { zodResolver } from '@hookform/resolvers/zod'
import { set, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { useSearchParams } from 'next/navigation'
import { apiRoutes } from '@/lib/apiRoutes';

import { Check, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import Link from 'next/link'
import React from 'react'

interface Event {
  id: number
  title: string
  venue: string
  date: string
  description: string
  img_url: string
}

interface Listing {
  listings_id:string,
  ticket_id: string
  event_id: number
  event_name: string
  section: string
  row: string
  seat_number: string
  price: number
  category: string
  venue: string
  status: string
  date: string
  fixed_seating: boolean
  image_url: string
}

const FormSchema = z.object({
  category: z.coerce.string().optional(),
  quantity: z.coerce.number().optional(),
})

async function fetchUserVerification(userId: string): Promise<boolean> {
  try {
    const res = await fetch(apiRoutes.userVerification(userId))
    if (!res.ok) throw new Error('Failed to verify user')
    const data = await res.json()
    return data.verified === true
  } catch (err) {
    console.error('[Verification Error]', err)
    return false
  }
}

// Utility: group listings by section and row, and chunk consecutive seats
function groupListings(listings: Listing[]): Record<string, Record<string, Listing[]>> {
  const grouped: Record<string, Record<string, Listing[]>> = {};
  listings.forEach(listing => {
    const section = listing.section || 'Unknown Section';
    const row = listing.row || 'Unknown Row';
    if (!grouped[section]) grouped[section] = {};
    if (!grouped[section][row]) grouped[section][row] = [];
    grouped[section][row].push(listing);
  });
  // Sort seat numbers within each row
  Object.keys(grouped).forEach((section) => {
    const rows = grouped[section];
    Object.keys(rows).forEach((row) => {
      const seats = rows[row];
      seats.sort((a: Listing, b: Listing) => {
        const aNum = parseInt(a.seat_number, 10);
        const bNum = parseInt(b.seat_number, 10);
        if (isNaN(aNum) || isNaN(bNum)) return String(a.seat_number).localeCompare(String(b.seat_number));
        return aNum - bNum;
      });
    });
  });
  return grouped;
}

// Utility: chunk sorted seat listings into consecutive groups
function chunkConsecutiveSeats(seats: Listing[]): Listing[][] {
  if (seats.length === 0) return [];
  const result: Listing[][] = [];
  let group: Listing[] = [seats[0]];
  for (let i = 1; i < seats.length; i++) {
    const prev = parseInt(seats[i - 1].seat_number, 10);
    const curr = parseInt(seats[i].seat_number, 10);
    if (!isNaN(prev) && !isNaN(curr) && curr === prev + 1) {
      group.push(seats[i]);
    } else {
      result.push(group);
      group = [seats[i]];
    }
  }
  result.push(group);
  return result;
}

export default function EventPage({ params }: { params: { slug: string } }) {
  const [event, setEvent] = useState<Event | null>(null)
  const [isUserVerified, setIsUserVerified] = useState(false)
  const [listings, setListings] = useState<Listing[]>([])
  const [filteredListings, setFilteredListings] = useState<Listing[]>([])
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null)
  const [showConfirm, setShowConfirm] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  const searchParams = useSearchParams()
  const eventId = useMemo(() => {
    const id = searchParams.get('id')
    return id ? parseInt(id, 10) : null
  }, [searchParams])

  useEffect(() => {
    const storedUserId =
      localStorage.getItem('user_id') || sessionStorage.getItem('user_id')
    console.log('[User ID]', storedUserId)

    if (!storedUserId) return

    fetchUserVerification(storedUserId).then((verified) => {
      console.log('[Verified from backend]', verified)
      setIsUserVerified(verified)
    })
  }, [])

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
  })

  useEffect(() => {
    if (typeof eventId !== 'number' || isNaN(eventId)) {
      setEvent(null);
      setListings([]);
      setFilteredListings([]);
      setIsLoading(false);
      return;
    }
  
    async function fetchAll() {
      setIsLoading(true);
      try {
        const [eventRes, listingsRes] = await Promise.all([
          fetch(apiRoutes.event(eventId)),
          fetch(apiRoutes.getEventListings(eventId))
        ]);
        if (!eventRes.ok) throw new Error('Failed to fetch event');
        if (!listingsRes.ok) throw new Error('Failed to fetch listings');
  
        const eventData = await eventRes.json();
        const listingsData = await listingsRes.json();
  
        setEvent(eventData);
        const activeListings = listingsData.filter((listing: Listing) => listing.status === 'active');
        setListings(activeListings);
        setFilteredListings(activeListings);
      } catch (error) {
        console.error('Fetch error:', error);
        setEvent(null);
        setListings([]);
        setFilteredListings([]);
        toast.error('Failed to load event or listings');
      } finally {
        setIsLoading(false);
      }
    }
  
    fetchAll();
  }, [eventId]);  
  

  // Remove the old categories useMemo and instead compute unique categories from filteredListings
  const categories = useMemo(
    () => [
      ...new Set(
        listings
          .map((listing) => (listing.category || '').trim().toLowerCase())
          .filter(Boolean)
      ),
    ],
    [listings]
  );

  // Dynamically compute unique available seat numbers from filteredListings
  const seatNumbers = useMemo(
    () => [
      ...new Set(
        listings
          .map((listing) => String(listing.seat_number ?? '').trim())
          .filter(Boolean)
      ),
    ],
    [listings]
  );

  function onFilter(data: z.infer<typeof FormSchema>) {
    const filtered = listings.filter((listing) => {
      // Normalize category for comparison
      const matchCategory = data.category
        ? (listing.category || '').trim().toLowerCase() === data.category.trim().toLowerCase()
        : true;
      // Compare seat number as string
      const matchSeat = data.quantity
        ? String(listing.seat_number ?? '').trim() === String(data.quantity).trim()
        : true;
      return matchCategory && matchSeat;
    });
    setFilteredListings(filtered);
    toast.success('Tickets filtered', {
      description: `Found ${filtered.length} ticket${filtered.length !== 1 ? 's' : ''}`,
    });
  }

  if (isLoading) {
    return <div className="p-8 text-center text-gray-500">Loading event...</div>
  }
  
  if (!listings) return <p>Loading...</p>;
  if (listings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-16 text-muted-foreground">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="w-16 h-16 text-gray-400 mb-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 17v-2a2 2 0 012-2h2a2 2 0 012 2v2m-4 4h.01M4 4h16M4 8h16M4 12h8"
          />
        </svg>
        <h2 className="text-xl font-semibold mb-2">No tickets available</h2>
        <p className="max-w-md text-sm">
          It looks like there are no listings available for this event right now. Please check back later or explore other events.
        </p>
        <a
          href="/events"
          className="mt-6 inline-block px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded transition"
        >
          Browse All Events
        </a>
      </div>
    );
  }

  if (!event) return notFound()

  return (
    <div className="px-6 py-10 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2 flex items-center gap-2">
          {event.title}
          {filteredListings.length > 10 && (
            <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded shadow">🔥 Hot</span>
          )}
        </h1>
        <p className="text-lg text-muted-foreground">{event.venue}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        <div className="w-full">
          {event.img_url ? (
          <Image
            src={event.img_url}
            alt={event.title}
            width={600}
            height={400}
            className="rounded-xl object-cover w-full shadow-md"
          />
        ) : (
          <div className="w-full h-64 bg-gray-200 flex items-center justify-center rounded-xl">
            <span className="text-gray-500">No image available</span>
          </div>
        )}
        </div>

        <div className="flex flex-col gap-6">
          <p className="text-gray-700 text-base">{event.description}</p>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onFilter)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Select a Category</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button variant="outline" role="combobox" className={cn('w-full justify-between', !field.value && 'text-muted-foreground')}>
                              {field.value || 'Choose category'}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-full p-0">
                          <Command>
                            <CommandInput placeholder="Search..." />
                            <CommandList>
                              <CommandEmpty>No results found.</CommandEmpty>
                              <CommandGroup>
                                {categories.map((cat) => (
                                  <CommandItem key={cat} onSelect={() => form.setValue('category', cat)}>
                                    <Check className={cn('mr-2 h-4 w-4', cat === field.value ? 'opacity-100' : 'opacity-0')} />
                                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Seat Preference</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button variant="outline" role="combobox" className={cn('w-full justify-between', !field.value && 'text-muted-foreground')}>
                              {field.value || 'Choose quantity'}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-full p-0">
                          <Command>
                            <CommandInput placeholder="Search..." />
                            <CommandList>
                              <CommandEmpty>No results found.</CommandEmpty>
                              <CommandGroup>
                                {seatNumbers.map((seat) => (
                                  <CommandItem key={seat} onSelect={() => form.setValue('quantity', seat)}>
                                    <Check className={cn('mr-2 h-4 w-4', seat === String(field.value) ? 'opacity-100' : 'opacity-0')} />
                                    {seat}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <div className="flex flex-col justify-end gap-2 md:gap-4">
                  <Button type="submit">Filter</Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      form.reset()
                      setFilteredListings(listings)
                      setSelectedListing(null)
                    }}
                  >
                    Reset
                  </Button>
                </div>
              </div>
            </form>
          </Form>

          {isLoading ? (
            <div className="mt-8 text-gray-500 italic">Loading tickets...</div>
          ) : filteredListings.length > 0 ? (
            <div className="mt-2 space-y-4">
              <h3 className="text-xl font-semibold">Available Tickets:</h3>
              {/* New seat map layout */}
              {Object.entries(groupListings(filteredListings)).map(([section, rows]) => (
                <div key={String(section)} className="mb-8">
                  <div className="font-bold text-lg border-b mb-2">{String(section)}</div>
                  {Object.entries(rows).map(([row, seats]) => (
                    <div key={String(row)} className="mb-4 pl-4">
                      <div className="font-semibold mb-1">{String(row)}</div>
                      {chunkConsecutiveSeats(seats).map((seatGroup, idx) => (
                        <div key={String(idx)} className="flex flex-row gap-4 mb-2">
                          {seatGroup.map((listing) => (
                            <div
                              key={listing.ticket_id}
                              className={cn(
                                'border p-4 rounded-md shadow-sm cursor-pointer transition min-w-[120px]',
                                selectedListing?.ticket_id === listing.ticket_id
                                  ? 'border-blue-500 bg-blue-50'
                                  : 'hover:bg-gray-50'
                              )}
                              onClick={() => setSelectedListing(listing)}
                            >
                              <div className="font-medium text-gray-900">Seat {listing.seat_number}</div>
                              <div className="text-sm text-gray-600">{listing.category || 'General'}</div>
                              <div className="text-xs text-gray-500">${listing.price}</div>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              ))}
              <Button
                disabled={!selectedListing}
                onClick={(e) => {
                  e.preventDefault()
                  if (!selectedListing) return
                  if (!isUserVerified) {
                    toast.error('You need to verify your identity before purchasing tickets!', {
                      description: 'Go to profile settings to complete identity verification',
                    })
                    router.push('/profile/verification')
                    return
                  }
                  setShowConfirm(true)
                }}
              >
                Buy Now
              </Button>
            </div>
          ) : (
            <div className="mt-8 text-gray-500 italic">No tickets available for this event.</div>
          )}
        </div>
      </div>

      {showConfirm && selectedListing && (
        <div className="fixed inset-0 bg-white-70 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-[90%] max-w-md">
            <h2 className="text-lg font-semibold mb-4">Confirm Ticket Purchase</h2>
            <p className="mb-2">Category: {selectedListing.category}</p>
            <p className="mb-2">Section: {selectedListing.section}</p>
            <p className="mb-4 font-semibold">Price: ${selectedListing.price}</p>
            <div className="flex justify-end gap-4">
              <Button variant="secondary" onClick={() => setShowConfirm(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  setShowConfirm(false)
                  setSelectedListing(null)
                  router.push(`/checkout?listings_id=${selectedListing.listings_id}`);
                }}
              >
                Confirm
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}