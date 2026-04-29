'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { AlertCircle, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  variant?: 'danger' | 'warning' | 'info'
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger'
}: ConfirmModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-md bg-white rounded-[2rem] shadow-2xl overflow-hidden"
          >
            <div className="p-8">
              <div className="flex items-center justify-center mb-6">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${
                  variant === 'danger' ? 'bg-red-50 text-red-600' : 
                  variant === 'warning' ? 'bg-amber-50 text-amber-600' : 
                  'bg-blue-50 text-blue-600'
                }`}>
                  <AlertCircle className="w-8 h-8" />
                </div>
              </div>

              <div className="text-center mb-8">
                <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight mb-2 italic">
                  {title}
                </h3>
                <p className="text-sm text-gray-500 font-medium leading-relaxed">
                  {message}
                </p>
              </div>

              <div className="flex flex-col gap-3">
                <Button
                  onClick={() => {
                    onConfirm()
                    onClose()
                  }}
                  className={`h-14 rounded-2xl font-black uppercase tracking-widest text-xs transition-all active:scale-95 ${
                    variant === 'danger' ? 'bg-red-600 hover:bg-red-700 text-white' :
                    variant === 'warning' ? 'bg-amber-600 hover:bg-amber-700 text-white' :
                    'bg-black hover:bg-gray-900 text-white'
                  }`}
                >
                  {confirmText}
                </Button>
                <Button
                  onClick={onClose}
                  variant="ghost"
                  className="h-14 rounded-2xl font-black uppercase tracking-widest text-[10px] text-gray-400 hover:text-gray-900 hover:bg-gray-50 transition-all"
                >
                  {cancelText}
                </Button>
              </div>
            </div>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-6 right-6 text-gray-400 hover:text-gray-900 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
