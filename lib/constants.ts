export const ROLES = {
  CUSTOMER: 'customer',
  ADMIN: 'admin',
  MODERATOR: 'moderator',
  SUPER_ADMIN: 'super_admin',
  OWNER: 'owner',
} as const

export const ORDER_STATUS = {
  PENDING: 'pending',
  CANCELLED: 'cancelled',
  PROCESSING: 'processing',
  SHIPPED: 'shipped',
  DELIVERED: 'delivered',
  DAMAGED: 'damaged',
  LOST: 'lost',
} as const

export const PRODUCT_CATEGORIES = [
  'Biscuits',
  'Wafers',
  'Cookies',
  'Crackers',
  'Snacks',
]

export const API_ENDPOINTS = {
  AUTH_LOGIN: '/api/auth/login',
  AUTH_REGISTER: '/api/auth/register',
  AUTH_LOGOUT: '/api/auth/logout',
  PRODUCTS: '/api/products',
  CATEGORIES: '/api/categories',
  ORDERS: '/api/orders',
  USERS: '/api/users',
  SEARCH: '/api/search',
  ADMIN_STATS: '/api/admin/stats',
}
