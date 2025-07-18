'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import {
  Card,
  CardTitle,
  CardDescription,
  CardHeader,
  CardFooter,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
} from '@/components/ui/carousel'

function slugify(text: string) {
  return text 
    .toLowerCase()
    .replace(/\s+/g, '-')           // Replace spaces with dashes
    .replace(/[^\w-]+/g, '')        // Remove non-word characters
    .replace(/--+/g, '-')           // Replace multiple dashes with one
    .trim()
}

interface Listing {
  event_id: number
}

interface Event {
  id: number
  title: string
  description: string
  venue: string
  img_url?: string // Add image_url property
}

export default function EventsPage() {
  const [loading, setLoading] = useState(true)
  const [events, setEvents] = useState<Event[]>([])
  const [search, setSearch] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [slidesToScroll, setSlidesToScroll] = useState(1)
  const router = useRouter()

  useEffect(() => {
    const checkAuthAndFetchEvents = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/auth/login')
        return
      }
  
      const { data: eventsData, error: eventsError } = await supabase.from('events').select('*')
      if (eventsError) {
        console.error('Error fetching events:', eventsError.message)
        return setLoading(false)
      }
  
      const { data: listingsData, error: listingsError } = await supabase.from('listings').select('event_id')
      if (listingsError) {
        console.error('Error fetching listings:', listingsError.message)
        return setLoading(false)
      }
  
      const listingCounts = listingsData?.reduce((acc: Record<number, number>, listing: Listing) => {
        acc[listing.event_id] = (acc[listing.event_id] || 0) + 1
        return acc
      }, {}) || {}
  
      const eventsWithCount = eventsData.map(event => ({
        ...event,
        listingCount: listingCounts[event.id] || 0
      }))
  
      setEvents(eventsWithCount)
      setLoading(false)
    }
  
    checkAuthAndFetchEvents()
  }, [router])  

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      // console.log('🔍 session on /events:', session)
  
      if (session) {
        localStorage.setItem('customSessionStart', Date.now().toString())
      }
    })
  }, [])

   useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth
      if (width >= 1280) setSlidesToScroll(4) // xl
      else if (width >= 1024) setSlidesToScroll(3) // lg
      else if (width >= 768) setSlidesToScroll(2) // md
      else setSlidesToScroll(1) // sm
    }

    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  if (loading) return <div>Loading...</div>

  // Filtered suggestions for autocomplete
  const filteredSuggestions = events.filter(event =>
    event.title.toLowerCase().includes(search.toLowerCase()) ||
    event.venue.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="px-6 py-10">

      {/* Search Bar */}
      <div className="flex justify-center my-8">
        <div className="relative w-full max-w-3xl">
          <Label htmlFor="search-events" className="sr-only">Search events</Label>
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
            <svg width="22" height="22" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35m1.35-5.15a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
          </span>
          <Input
            id="search-events"
            type="text"
            placeholder="Search events..."
            value={search}
            onChange={e => {
              setSearch(e.target.value)
              setShowSuggestions(e.target.value.length > 0)
            }}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 100)}
            className="pl-12 pr-4 py-3 text-lg bg-white/80 dark:bg-zinc-900/60 border border-gray-300 dark:border-zinc-700 rounded-xl shadow-md focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200"
            autoComplete="off"
          />
          {showSuggestions && filteredSuggestions.length > 0 && (
            <ul className="absolute left-0 right-0 w-full mt-2 z-20 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-xl shadow-lg max-h-60 overflow-y-auto">
              {filteredSuggestions.slice(0, 8).map(event => (
                <li
                  key={event.id}
                  className="px-4 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-zinc-800"
                  onMouseDown={() => {
                    setSearch(event.title)
                    setShowSuggestions(false)
                  }}
                >
                  <span className="font-semibold">{event.title}</span>
                  <span className="text-xs text-gray-500 ml-2">{event.venue}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <h2 className="scroll-m-20 text-3xl font-semibold tracking-tight first:mt-0">
        For You
      </h2>

      <div className="mt-4 relative w-full">
        <Carousel className="w-auto" opts={{ align: 'start', slidesToScroll }}>
          <CarouselContent>
            {events
              .filter(event =>
                event.title.toLowerCase().includes(search.toLowerCase()) ||
                event.venue.toLowerCase().includes(search.toLowerCase())
              )
              .map((event) => (
                <CarouselItem key={event.id} className="basis-full sm:basis-1/1 md:basis-1/2 lg:basis-1/3 xl:basis-1/4 flex justify-center">
                  <Card
                    className="w-[370px] h-[370px] flex flex-col relative mb-2 mt-2 pt-3 pl-3 pr-3 hover:cursor-pointer hover:shadow-md hover:-translate-y-2 transition-shadow duration-200"
                    onClick={() => router.push(`/events/${slugify(event.title)}?id=${event.id}`)}
                    >
                    {event.img_url ? (
                      <img
                        src={event.img_url}
                        alt={event.title}
                        className="w-full h-60 object-cover rounded-xl border border-gray-200 dark:border-zinc-700 bg-gray-100 dark:bg-zinc-800"
                      />
                    ) : (
                      <div className="w-full h-60 flex items-center justify-center rounded-xl border border-gray-200 dark:border-zinc-700 bg-gray-100 dark:bg-zinc-800">
                        <img src="/globe.svg" alt="No event image" className="w-16 h-60 opacity-40" />
                      </div>
                    )}
                    <CardHeader className="pb-2 px-0 items-start text-left">
                      <CardTitle className=" pt-2 text-base font-semibold line-clamp-1 text-left ml-0">{event.title}</CardTitle>
                      <CardDescription className="text-sm line-clamp-1 text-left ml-0">{event.venue}</CardDescription>
                    </CardHeader>
                    <CardFooter>
                      <p className="text-xs text-muted-foreground pt-3">Click to view</p>
                    </CardFooter>
                  </Card>
                </CarouselItem>
              ))}
          </CarouselContent>
          <CarouselPrevious className="-left-4" />
          <CarouselNext className="-right-4" />
        </Carousel>
      </div>

      <h2 className="scroll-m-20 text-3xl font-semibold tracking-tight mt-5">
        Trending
      </h2>

      <div className="mt-4 relative w-full">
        <Carousel className="w-auto" opts={{ slidesToScroll: 4, align: 'start' }}>
          <CarouselContent>
          {[...events]
            .sort((a, b) => b.listingCount - a.listingCount)
            .filter(event =>
              event.title.toLowerCase().includes(search.toLowerCase()) ||
              event.venue.toLowerCase().includes(search.toLowerCase())
            )
            .map(event => (
                <CarouselItem key={event.id} className="basis-full sm:basis-1/1 md:basis-1/2 lg:basis-1/3 xl:basis-1/4 flex justify-center">
                  <Card
                    className="w-[370px] h-[370px] flex flex-col relative mb-2 mt-2 pt-3 pl-3 pr-3 hover:cursor-pointer hover:shadow-md hover:-translate-y-2 transition-shadow duration-200"
                    onClick={() => router.push(`/events/${slugify(event.title)}?id=${event.id}`)}
                  >
                    {event.img_url ? (
                      <img
                        src={event.img_url}
                        alt={event.title}
                        className="w-full h-60 object-cover rounded-xl border border-gray-200 dark:border-zinc-700 bg-gray-100 dark:bg-zinc-800"
                      />
                    ) : (
                      <div className="w-full h-60 flex items-center justify-center rounded-xl border border-gray-200 dark:border-zinc-700 bg-gray-100 dark:bg-zinc-800">
                        <img src="/globe.svg" alt="No event image" className="w-16 h-60 opacity-40" />
                      </div>
                    )}
                    <CardHeader className="pb-2 px-0 items-start text-left">
                      <CardTitle className=" pt-2 text-base font-semibold line-clamp-1 text-left ml-0">{event.title}</CardTitle>
                      <CardDescription className="text-sm line-clamp-1 text-left ml-0">{event.venue}</CardDescription>
                    </CardHeader>
                    <CardFooter>
                      <p className="text-xs text-muted-foreground pt-3">Click to view</p>
                    </CardFooter>
                  </Card>
                </CarouselItem>
              ))}
          </CarouselContent>
          <CarouselPrevious className="-left-4" />
          <CarouselNext className="-right-4" />
        </Carousel>
      </div>
    </div>
  )
}