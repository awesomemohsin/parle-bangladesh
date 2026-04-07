'use client';

import { CheckCircle2, Target, Users, Award } from 'lucide-react'
import { motion } from 'framer-motion'

export default function AboutPage() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="relative py-24 overflow-hidden bg-slate-50">
        <motion.div 
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 0.5, scale: 1 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/4 w-[600px] h-[600px] bg-red-50 rounded-full blur-3xl" 
        />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative text-center lg:text-left">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="max-w-3xl mx-auto lg:mx-0"
          >
            <h1 className="text-4xl lg:text-6xl font-black text-gray-900 tracking-tighter uppercase italic leading-none mb-6">
              Welcome to <span className="text-red-600">Parle Bangladesh</span>
            </h1>
            <p className="text-lg lg:text-xl text-gray-600 font-medium leading-relaxed mb-8">
              We bring the joy of tasty and healthy snacks to people across Bangladesh. For a long time, Parle has been a name people trust for good taste and quality.
            </p>
            
            {/* Authorised Distributor Statement */}
            <div className="bg-red-600 text-white p-6 lg:p-8 rounded-3xl shadow-xl shadow-red-100 mb-10 text-center">
               <p className="text-xs font-bold uppercase tracking-[0.2em] mb-2 opacity-80">Official Announcement</p>
               <h2 className="text-sm lg:text-base font-black uppercase leading-relaxed tracking-wider italic">
                 M/S CIRCLE ENTERPRISE IS THE EXCLUSIVE AUTHORISED DISTRIBUTOR OF PARLE BISCUITS PVT. LTD- (INDIA) IN BANGLADESH FOR THE DISTRIBUTION OF PARLE BISCUITS, WAFERS.
               </h2>
            </div>

            <div className="flex flex-wrap gap-4 justify-center lg:justify-start">
              <motion.div 
                whileHover={{ y: -5 }}
                className="bg-white px-6 py-3 rounded-2xl shadow-sm border border-slate-100"
              >
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Our Role</p>
                <p className="text-xl font-black text-gray-900">Official Distributor</p>
              </motion.div>
              <motion.div 
                whileHover={{ y: -5 }}
                className="bg-white px-6 py-3 rounded-2xl shadow-sm border border-slate-100"
              >
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Service</p>
                <p className="text-xl font-black text-gray-900">Nationwide Delivery</p>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Simplified Mission Section */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
            <div className="space-y-8">
              <div className="inline-flex items-center gap-3 px-4 py-2 bg-red-50 rounded-full">
                <Target className="w-4 h-4 text-red-600" />
                <span className="text-[11px] font-black text-red-600 uppercase tracking-[0.2em]">Our Goal</span>
              </div>
              <h2 className="text-4xl font-black text-gray-900 tracking-tight leading-tight uppercase italic">
                Snacks for every <span className="text-red-600">home</span>
              </h2>
              <p className="text-gray-600 text-lg leading-relaxed italic">
                "We want to make sure every family in Bangladesh can enjoy fresh and delicious Parle snacks at a fair price."
              </p>
              <ul className="space-y-4">
                {[
                  'Clean and safe products',
                  'Best quality ingredients',
                  'Quick delivery to your shop',
                  'Always happy to help you'
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-red-600 flex-shrink-0" />
                    <span className="text-sm font-bold text-gray-700 uppercase tracking-wide">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="relative group p-4 lg:p-0">
              <div className="absolute inset-0 bg-red-600 rounded-[2rem] rotate-3 group-hover:rotate-1 transition-transform duration-500 shadow-2xl shadow-red-100" />
              <div className="relative h-full bg-gray-900 rounded-[2rem] p-12 flex flex-col justify-center overflow-hidden">
                 <h3 className="text-3xl font-black text-white uppercase tracking-tighter italic mb-6">Our Promise</h3>
                 <p className="text-gray-400 text-lg leading-relaxed font-medium">
                   We promise to work hard every day to get your favorite Parle biscuits and wafers to you in perfect condition.
                 </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why Parle Section */}
      <section className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black text-gray-900 uppercase tracking-tighter italic">Why people love <span className="text-red-600">Parle?</span></h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
             {[
               {
                 title: 'Best Taste',
                 desc: 'Everyone loves the crunchy and sweet taste of Parle biscuits. It is the perfect partner for your tea.'
               },
               {
                 title: 'Safe to Eat',
                 desc: 'We follow strict rules to keep our food clean and safe for children and adults alike.'
               },
               {
                 title: 'Great Price',
                 desc: 'You get the best quality and taste without spending too much money. It is value in every bite.'
               }
             ].map((value, i) => (
               <div key={i} className="bg-white p-8 rounded-3xl border border-slate-100 hover:shadow-xl transition-all group">
                 <h4 className="text-xl font-black text-gray-900 uppercase tracking-tight mb-3 italic">{value.title}</h4>
                 <p className="text-gray-500 text-sm leading-relaxed">{value.desc}</p>
               </div>
             ))}
          </div>
        </div>
      </section>
    </div>
  )
}
