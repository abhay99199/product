export type Category = {
  id: string
  name: string
  slug: string
  created_at: string
}

export type Product = {
  id: string
  name: string
  description: string
  image_url: string | null
  product_url: string
  price: number | null
  category_id: string | null
  is_featured: boolean
  status: 'published' | 'draft'
  tags: string[]
  created_at: string
  updated_at: string
  category: Pick<Category, 'id' | 'name' | 'slug'> | null
}

export type ClickCount = {
  product_id: string
  click_count: number
}