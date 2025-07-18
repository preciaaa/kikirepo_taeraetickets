"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Shield, DollarSign, Lock, Users, CheckCircle, MessageSquare, Sparkles, ArrowRight, Star } from 'lucide-react';

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-100 via-blue-50 to-white">
      <div className="relative overflow-hidden bg-gradient-to-b from-blue-200 to-blue-100">
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 z-10">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-8 text-center lg:text-left">
              <div className="space-y-6">
                <h1 className="text-5xl lg:text-6xl font-bold leading-tight text-black drop-shadow-md">
                  taeraetickets
                </h1>
                <p className="text-xl lg:text-2xl font-medium text-black">
                  No Scalpers. No Scams. Just Tickets.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <button className="bg-yellow-400 hover:bg-yellow-300 active:bg-yellow-500 text-black font-semibold px-8 py-4 rounded-lg text-lg transition-all duration-200 hover:scale-105 active:scale-95 hover:shadow-lg active:shadow-inner inline-flex items-center justify-center"
                onClick={() => window.location.href = '/auth/signup'}>
                  Get Started
                </button>
                <button className="bg-black hover:bg-gray-800 active:bg-gray-900 text-white font-semibold px-8 py-4 rounded-lg text-lg transition-all duration-200 hover:scale-105 active:scale-95 hover:shadow-lg active:shadow-inner inline-flex items-center justify-center" 
                onClick={() => window.location.href = '/events'}>
                  Browse Events
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Section: Why taeraetickets? */}
      <div className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4 drop-shadow-md inline-block relative">
              Why taeraetickets?
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              We've built the most secure and fair ticket marketplace to protect both buyers and sellers
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="border-0 shadow-lg hover:shadow-2xl transition-all duration-300 delay-75 group hover:-translate-y-2 hover:ring-2 hover:ring-yellow-200 bg-white/80 backdrop-blur-sm">
              <CardContent className="p-8 text-center space-y-4">
                <div className="w-16 h-16 bg-yellow-400 rounded-2xl mx-auto flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <Users className="w-8 h-8 text-black" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900">Verified Sellers Only</h3>
                <p className="text-gray-600 leading-relaxed">
                  Every seller goes through our comprehensive identity verification process. 
                  No anonymous accounts, no fake profiles.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-2xl transition-all duration-300 delay-75 group hover:-translate-y-2 hover:ring-2 hover:ring-yellow-200 bg-white/80 backdrop-blur-sm">
              <CardContent className="p-8 text-center space-y-4">
                <div className="w-16 h-16 bg-yellow-400 rounded-2xl mx-auto flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <DollarSign className="w-8 h-8 text-black" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900">Fair Resale Pricing</h3>
                <p className="text-gray-600 leading-relaxed">
                  Our AI-powered pricing algorithm prevents scalping by capping resale markups. 
                  Fair prices for everyone.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-2xl transition-all duration-300 delay-75 group hover:-translate-y-2 hover:ring-2 hover:ring-yellow-200 bg-white/80 backdrop-blur-sm">
              <CardContent className="p-8 text-center space-y-4">
                <div className="w-16 h-16 bg-yellow-400 rounded-2xl mx-auto flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <Lock className="w-8 h-8 text-black" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900">Escrow Protection</h3>
                <p className="text-gray-600 leading-relaxed">
                  Your money is held securely until you confirm the tickets work. 
                  Only pay when you successfully get into the event.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Key Features Section */}
      <div className="py-20 bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-center">
            <div className="space-y-8 items-center max-w-xl w-full">
              <div className="space-y-4 text-center">
                <h2 className="text-4xl font-bold text-gray-900 drop-shadow-md inline-block relative">Key Features</h2>
                <p className="text-xl text-gray-600">
                  Advanced security and fraud prevention built into every transaction
                </p>
              </div>

              <div className="space-y-6 pl-20">
                {[{ icon: Lock, title: "Escrow Payments", desc: "Money held securely until tickets are verified" },
                  { icon: Shield, title: "User ID Verification", desc: "Government ID verification for all users" },
                  { icon: DollarSign, title: "Anti-Scalping Price Limits", desc: "AI-powered pricing to prevent excessive markups" },
                  { icon: CheckCircle, title: "AI Scam Detection", desc: "Machine learning detects fake tickets and fraud" },
                  { icon: MessageSquare, title: "In-app Messaging with Fraud Warnings", desc: "Secure communication with built-in safety alerts" }
                ].map((feature, index) => (
                  <div key={index} className="flex items-start space-x-4 p-4 rounded-xl hover:bg-white/70 transition-colors duration-200 hover:-translate-y-1 hover:shadow-lg">
                    <div className="w-10 h-10 bg-yellow-400 rounded-lg flex items-center justify-center flex-shrink-0">
                      <feature.icon className="w-5 h-5 text-black" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="font-semibold text-gray-900">{feature.title}</h3>
                      <p className="text-gray-600">{feature.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-20 bg-gradient-to-r from-yellow-400 to-yellow-500">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <div className="space-y-8">
            <h2 className="text-4xl lg:text-5xl font-bold text-black drop-shadow-md inline-block relative">
              Ready to buy and sell tickets safely?
            </h2>
            <p className="text-xl text-gray-800 max-w-2xl mx-auto">
              Join thousands of users who trust taeraetickets for secure, verified ticket transactions
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="bg-black hover:bg-gray-800 active:bg-gray-900 text-white font-semibold px-8 py-4 rounded-lg text-lg transition-all duration-200 hover:scale-105 active:scale-95 hover:shadow-xl active:shadow-inner inline-flex items-center justify-center"
              onClick={() => window.location.href = '/auth/signup'}>
                Start Selling
              </button>
              <button className="bg-black hover:bg-gray-800 active:bg-gray-900 text-white font-semibold px-8 py-4 rounded-lg text-lg transition-all duration-200 hover:scale-105 active:scale-95 hover:shadow-xl active:shadow-inner inline-flex items-center justify-center"
              onClick={() => window.location.href = '/events'}>
                Browse Events
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-yellow-400 rounded-lg flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-black" />
                </div>
                <span className="text-xl font-bold">taeraetickets</span>
              </div>
              <p className="text-gray-400">
                The secure marketplace for verified ticket resales.
              </p>
            </div>
            
            <div className="space-y-4">
              <h3 className="font-semibold">Platform</h3>
              <div className="space-y-2 text-gray-400">
                <div>About Us</div>
                <div>How It Works</div>
                <div>Safety & Security</div>
                <div>Terms of Service</div>
              </div>
            </div>
            
            <div className="space-y-4">
              <h3 className="font-semibold">Support</h3>
              <div className="space-y-2 text-gray-400">
                <div>Help Center</div>
                <div>Contact Us</div>
                <div>Seller Guide</div>
                <div>Buyer Guide</div>
              </div>
            </div>
            
            <div className="space-y-4">
              <h3 className="font-semibold">Connect</h3>
              <div className="space-y-2 text-gray-400">
                <div>Twitter</div>
                <div>Discord</div>
                <div>Instagram</div>
              </div>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center">
            <div className="text-gray-400">
              © 2025 taeraetickets. All rights reserved.
            </div>

          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;

