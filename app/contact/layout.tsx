import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Contact Us | Parle Bangladesh',
  description: 'Get in touch with Parle Bangladesh. We are here to help you with any queries, feedback, or support.',
}

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
