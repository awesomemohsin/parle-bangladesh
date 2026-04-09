'use client'

import { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { Filter, User, Building2, Calendar, Phone, Mail, MessageSquare, MapPin } from 'lucide-react'

export default function AdminContactsPage() {
  const [contacts, setContacts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'regular' | 'corporate' | 'dealer'>('all')
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'name-asc' | 'name-desc'>('newest')

  const fetchContacts = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/admin/contacts?type=${filter}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (response.ok) {
        const data = await response.json()
        let fetchedContacts = data.contacts || []
        setContacts(fetchedContacts)
        // Trigger sidebar update to clear the badge
        window.dispatchEvent(new CustomEvent('refreshAdminCounts'))
      } else {
        toast.error('Failed to fetch contacts')
      }
    } catch (error) {
      toast.error('Error connecting to server')
    } finally {
      setLoading(false)
    }
  }

  const sortedContacts = [...contacts].sort((a, b) => {
    if (sortBy === 'newest') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    if (sortBy === 'oldest') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    if (sortBy === 'name-asc') return a.name.localeCompare(b.name)
    if (sortBy === 'name-desc') return b.name.localeCompare(a.name)
    return 0
  })

  useEffect(() => {
    fetchContacts()
  }, [filter])

  return (
    <div className="flex flex-col min-h-full">
      <div className="flex-1 overflow-visible">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-6 mb-10">
            <div>
              <h1 className="text-3xl font-black text-gray-900 tracking-tighter uppercase italic leading-none mb-2">Contact Form <span className="text-red-600">Submissions</span></h1>
              <p className="text-gray-500 text-sm font-medium">Manage customer and corporate inquiries.</p>
            </div>
            <div className="flex flex-wrap items-center gap-3 bg-white p-2 rounded-2xl border border-gray-100 shadow-sm w-full md:w-auto">
              {/* Type Filters */}
              <div className="flex items-center gap-1.5 border-r border-gray-100 pr-3 mr-1">
                <button
                  onClick={() => setFilter('all')}
                  className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${filter === 'all' ? 'bg-gray-900 text-white shadow-lg shadow-gray-200' : 'text-gray-400 hover:bg-gray-50'}`}
                >
                  All
                </button>
                <button
                  onClick={() => setFilter('regular')}
                  className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${filter === 'regular' ? 'bg-red-600 text-white shadow-lg shadow-red-100' : 'text-gray-400 hover:bg-gray-50'}`}
                >
                  Regular
                </button>
                <button
                  onClick={() => setFilter('corporate')}
                  className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${filter === 'corporate' ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'text-gray-400 hover:bg-gray-50'}`}
                >
                  Corporate
                </button>
                <button
                  onClick={() => setFilter('dealer')}
                  className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${filter === 'dealer' ? 'bg-orange-600 text-white shadow-lg shadow-orange-100' : 'text-gray-400 hover:bg-gray-50'}`}
                >
                  Dealer
                </button>
              </div>

              {/* Sort Dropdown */}
              <div className="flex items-center gap-2">
                <Filter className="w-3.5 h-3.5 text-gray-300" />
                <select 
                  value={sortBy}
                  onChange={(e: any) => setSortBy(e.target.value)}
                  className="bg-transparent text-[9px] font-black uppercase tracking-widest text-gray-500 focus:outline-none cursor-pointer"
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="name-asc">Name (A-Z)</option>
                  <option value="name-desc">Name (Z-A)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Contacts Table/List */}
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <div className="w-10 h-10 border-4 border-red-600/20 border-t-red-600 rounded-full animate-spin"></div>
            </div>
          ) : sortedContacts.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-[2rem] border-2 border-dashed border-gray-100 shadow-sm shadow-gray-50">
               <div className="p-4 bg-gray-50 w-fit mx-auto rounded-full mb-4">
                  <Filter className="w-8 h-8 text-gray-300" />
               </div>
               <p className="text-gray-400 font-black uppercase tracking-widest text-xs italic">No submissions found</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {sortedContacts.map((contact) => (
                <Card key={contact._id} className="overflow-hidden border-none shadow-xl shadow-gray-100 rounded-[2rem] group hover:scale-[1.01] transition-all">
                  <div className={`h-1 w-full ${contact.type === 'corporate' ? 'bg-blue-600' : contact.type === 'dealer' ? 'bg-orange-600' : 'bg-red-600'}`}></div>
                  <CardContent className="p-0">
                    <div className="p-8 flex flex-col lg:flex-row gap-8">
                      {/* Person Details */}
                      <div className="flex-1 space-y-4">
                        <div className="flex items-center gap-3">
                           <div className={`p-2.5 rounded-xl ${contact.type === 'corporate' ? 'bg-blue-50 text-blue-600' : contact.type === 'dealer' ? 'bg-orange-50 text-orange-600' : 'bg-red-50 text-red-600'}`}>
                              {contact.type === 'corporate' ? <Building2 className="w-5 h-5" /> : contact.type === 'dealer' ? <MapPin className="w-5 h-5" /> : <User className="w-5 h-5" />}
                           </div>
                           <div>
                               <div className="flex items-center gap-3">
                                 <h3 className="text-xl font-black text-gray-900 tracking-tight">{contact.name}</h3>
                                 <Badge className={contact.type === 'corporate' ? 'bg-blue-600' : contact.type === 'dealer' ? 'bg-orange-600' : 'bg-red-600'}>
                                   {contact.type}
                                 </Badge>
                              </div>
                              {contact.type === 'corporate' && (
                                 <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mt-1">
                                    <span className="text-blue-600">Company:</span> {contact.organizationName}
                                 </p>
                              )}
                              {contact.type === 'dealer' && (
                                 <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mt-1">
                                    <span className="text-orange-600">Location:</span> {contact.location}
                                 </p>
                              )}
                           </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                           <div className="flex items-center gap-2 text-gray-600">
                              <Phone className="w-4 h-4 text-gray-300" />
                              <span className="text-sm font-bold">{contact.number}</span>
                           </div>
                           {contact.email && (
                              <div className="flex items-center gap-2 text-gray-600">
                                 <Mail className="w-4 h-4 text-gray-300 flex-shrink-0" />
                                 <span className="text-[13px] font-bold break-all">{contact.email}</span>
                              </div>
                           )}
                           <div className="flex items-center gap-2 text-gray-600">
                              <Calendar className="w-4 h-4 text-gray-300" />
                              <span className="text-xs font-bold text-gray-400">
                                {format(new Date(contact.createdAt), 'dd MMM yyyy, p')}
                              </span>
                           </div>
                        </div>
                      </div>

                      {/* Message section */}
                      <div className="flex-[1.5] bg-gray-50 rounded-2xl p-6 relative">
                         <div className="absolute top-4 right-4 text-gray-200">
                            <MessageSquare className="w-8 h-8" />
                         </div>
                         <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 italic">Submission Message</p>
                         <p className="text-sm text-gray-700 font-medium leading-relaxed">
                            {contact.message ? contact.message : <span className="italic text-gray-300">No message provided</span>}
                         </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
