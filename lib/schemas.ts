import { z } from 'zod'

export const LoginSchema = z.object({
  email: z.string().min(1, 'Email or mobile is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

export const RegisterSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
})

export const VariationSchema = z.object({
  weight: z.string().optional(),
  flavor: z.string().optional(),
  price: z.number().positive(),
  stock: z.number().nonnegative().optional(),
})

export const ProductSchema = z.object({
  name: z.string().min(1, 'Product name required'),
  slug: z.string().optional(),
  description: z.string().optional(),
  price: z.number().positive('Price must be positive'),
  category: z.string().min(1, 'Category required'),
  image: z.string().optional(),
  stock: z.number().nonnegative('Stock must be non-negative'),
  rating: z.number().min(0).max(5).optional(),
  weight: z.string().optional(),
  flavor: z.string().optional(),
  variations: z.array(VariationSchema).optional(),
})

export const CategorySchema = z.object({
  name: z.string().min(1, 'Category name required'),
  description: z.string().optional(),
  image: z.string().optional(),
})

export const OrderSchema = z.object({
  items: z.array(
    z.object({
      productId: z.string(),
      quantity: z.number().positive(),
      price: z.number().positive(),
    })
  ),
  customerName: z.string().min(1, 'Customer name required'),
  email: z.string().email('Invalid email'),
  phone: z.string().min(1, 'Phone required'),
  address: z.string().min(1, 'Address required'),
  city: z.string().min(1, 'City required'),
  postalCode: z.string().min(1, 'Postal code required'),
})

export const UserSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  name: z.string().min(1, 'Name required'),
  role: z.enum(['admin', 'moderator']),
})

export type LoginInput = z.infer<typeof LoginSchema>
export type RegisterInput = z.infer<typeof RegisterSchema>
export type ProductInput = z.infer<typeof ProductSchema>
export type CategoryInput = z.infer<typeof CategorySchema>
export type OrderInput = z.infer<typeof OrderSchema>
export type UserInput = z.infer<typeof UserSchema>
