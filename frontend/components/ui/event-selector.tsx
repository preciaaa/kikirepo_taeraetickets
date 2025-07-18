'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabaseClient'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { apiRoutes } from '@/lib/apiRoutes';

interface Event {
  id: string
  title: string
}

interface EventSelectorProps {
  selectedEvent: Event | null
  onEventSelect: (event: Event | null) => void
}

export function EventSelector({ selectedEvent, onEventSelect }: EventSelectorProps) {
  const [eventSearch, setEventSearch] = useState('')
  const [eventSuggestions, setEventSuggestions] = useState<Event[]>([])
  const [eventLoading, setEventLoading] = useState(false)
  const [eventError, setEventError] = useState<string | null>(null)
  const [creatingEvent, setCreatingEvent] = useState(false)
  const [scrapedEvent, setScrapedEvent] = useState<any>(null)
  const [creatingModal, setCreatingModal] = useState(false)
  const [showScrapeModal, setShowScrapeModal] = useState(false)


  useEffect(() => {
    if (!eventSearch) {
      setEventSuggestions([])
      return
    }

    setEventLoading(true)
    supabase
      .from('events')
      .select('*')
      .ilike('title', `%${eventSearch}%`)
      .then(({ data, error }) => {
        setEventLoading(false)
        if (error) {
          setEventError('Failed to fetch events')
          setEventSuggestions([])
        } else {
          setEventSuggestions(data || [])
        }
      })
  }, [eventSearch])

  const handleCreateEvent = async (title: string) => {
    setCreatingEvent(true)
    try {
      const response = await fetch(apiRoutes.searchEvent, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ search_term: title }),
      })
  
      const result = await response.json()
  
      if (result.num_results === 1) {
        setScrapedEvent({ ...result })
        setShowScrapeModal(true)
      } else if (result.num_results > 1) {
        alert(`Found ${result.num_results} events. Please narrow your search.`)
      } else {
        alert('No results found. Try a different search.')
      }
    } catch (err) {
      console.error(err)
      setEventError('Failed to fetch or create event')
    } finally {
      setCreatingEvent(false)
    }
  }  

  return (
    <Card className="rounded-2xl shadow-xl border border-gray-100 bg-white/90 mb-8">
      <CardHeader className="pb-6">
        <div className="mb-4 flex items-center gap-3">
          <span className="inline-block bg-blue-100 text-blue-700 rounded-full px-3 py-1 text-xs font-semibold">
            Step 1
          </span>
          <span className="font-semibold text-gray-800 text-lg">Select or Create Event</span>
        </div>
        <CardDescription className="text-gray-500 text-base leading-relaxed">
          Search for an existing event or create a new one
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 px-6 pb-6">
        <div className="relative">
          <Input
            id="event-search"
            type="text"
            placeholder="Search or create event..."
            value={selectedEvent ? selectedEvent.title : eventSearch}
            onChange={e => {
              onEventSelect(null)
              setEventSearch(e.target.value)
              setEventError(null)
            }}
            autoComplete="on"
            className="pr-24 py-3 text-base rounded-xl border-2 border-blue-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 shadow-sm transition"
            disabled={creatingEvent}
          />
          <Dialog open={showScrapeModal && scrapedEvent != null} onOpenChange={setShowScrapeModal}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Confirm Event Creation</DialogTitle>
                <DialogDescription>
                  We found an event matching <strong>{scrapedEvent?.title}</strong>.
                  Please confirm the details before creating.
                </DialogDescription>
              </DialogHeader>

              {scrapedEvent?.image && (
                <img src={scrapedEvent.image} alt="Event Poster" className="w-full rounded-lg mb-4" />
              )}

              <div className="space-y-2">
                <p><strong>Title:</strong> {scrapedEvent?.title}</p>
                <p><strong>Venue:</strong> {scrapedEvent?.venue}</p>
                <p><strong>Date:</strong> {scrapedEvent?.date}</p>
              </div>

              <DialogFooter className="mt-4">
                <Button variant="outline" onClick={() => setShowScrapeModal(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={async () => {
                    setCreatingModal(true)
                    try {
                      const res = await fetch(apiRoutes.createEvent, {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                          title: scrapedEvent.title,
                          venue: scrapedEvent.venue,
                          // date: scrapedEvent.date, // Add this later if needed
                          img_url: scrapedEvent.image,
                          description: scrapedEvent.description,
                        }),
                      })
                      const data = await res.json()
                      if (!res.ok || !data || !data[0]) {
                        setEventError('Failed to create event');
                        setShowScrapeModal(false);
                        return;
                      }
                      onEventSelect(data[0]);
                      setEventSearch(data[0].title);
                      setEventSuggestions([]);
                      setShowScrapeModal(false);
                    } catch (err) {
                      setEventError('Failed to create event');
                      setShowScrapeModal(false);
                    }
                  }}
                >
                  Confirm Details
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {eventSearch && !selectedEvent && (
            <div className="absolute left-0 right-0 z-10 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto mt-1">
              {eventLoading ? (
                <div className="p-3 text-gray-500">Loading...</div>
              ) : (
                <>
                  {eventSuggestions.length > 0 && eventSuggestions.map(event => (
                    <div
                      key={event.id}
                      className="px-4 py-3 cursor-pointer hover:bg-blue-50 rounded transition"
                      onMouseDown={() => {
                        onEventSelect(event)
                        setEventSearch(event.title)
                        setEventSuggestions([])
                      }}
                    >
                      <span className="font-semibold text-blue-700">{event.title}</span>
                    </div>
                  ))}
                  {(
                    !eventSuggestions.some(e => e.title.toLowerCase() === eventSearch.trim().toLowerCase()) &&
                    eventSearch.trim().length > 0
                  ) && (
                    <div className="px-4 py-3 flex items-center justify-between border-t border-gray-100 bg-blue-50/30">
                      <span className="text-gray-700"></span>
                      <Button
                        size="sm"
                        className="ml-2"
                        onMouseDown={() => handleCreateEvent(eventSearch)}
                        disabled={creatingEvent}
                      >
                        {creatingEvent ? 'Creating...' : `Create New Event: "${eventSearch}"`}
                      </Button>
                    </div>
                  )}
                  {eventSuggestions.length === 0 && (
                    <div className="px-4 py-3 text-gray-500">No results.</div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
        {eventError && <div className="text-red-500 text-sm">{eventError}</div>}
      </CardContent>
    </Card>
  )
}
