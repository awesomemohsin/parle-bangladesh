import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'About Us | Parle Bangladesh',
  description: 'Learn more about Parle Bangladesh, our mission, vision, and the quality we bring to your table.',
}

export default function AboutLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
