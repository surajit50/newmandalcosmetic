import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'
import 'dotenv/config'

const prisma = new PrismaClient()

async function main() {
  // Create Admin User
  const adminPassword = await hash('admin123', 12)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@mandal.com' },
    update: {},
    create: {
      email: 'admin@mandal.com',
      name: 'Admin',
      password: adminPassword,
      role: 'ADMIN',
      phone: '1234567890',
    },
  })
  console.log({ admin })

  // Create Categories
  const categories = [
    { name: 'Grocery', description: 'Daily grocery items' },
    { name: 'Cosmetic', description: 'Beauty and skin care products' },
    { name: 'Snacks', description: 'Chips, biscuits, and more' },
    { name: 'Cold Drinks', description: 'Soft drinks and juices' },
    { name: 'Dairy', description: 'Milk, curd, butter, etc.' },
    { name: 'Personal Care', description: 'Soaps, shampoos, etc.' },
    { name: 'Household', description: 'Cleaning supplies, etc.' },
    { name: 'Stationery', description: 'Pens, notebooks, etc.' },
    { name: 'Medicine', description: 'Optional medicine items' },
  ]

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { name: cat.name },
      update: {},
      create: cat,
    })
  }
  console.log('Categories created')

  // Create Brands
  const brands = [
    { name: 'Hindustan Unilever', description: 'HUL products' },
    { name: 'P&G', description: 'Procter & Gamble' },
    { name: 'ITC', description: 'ITC products' },
    { name: 'Nestle', description: 'Nestle products' },
    { name: 'Amul', description: 'Amul dairy products' },
    { name: 'Dabur', description: 'Dabur herbal products' },
    { name: 'Marico', description: 'Marico products' },
    { name: 'Britannia', description: 'Britannia biscuits' },
    { name: 'Coca-Cola', description: 'Soft drinks' },
    { name: 'PepsiCo', description: 'Soft drinks and snacks' },
    { name: 'Haldiram', description: 'Snacks and sweets' },
    { name: 'Colgate-Palmolive', description: 'Oral care' },
    { name: 'Emami', description: 'Ayurvedic and personal care' },
    { name: 'Parle', description: 'Biscuits and snacks' },
  ]

  for (const brand of brands) {
    await prisma.brand.upsert({
      where: { name: brand.name },
      update: {},
      create: brand,
    })
  }
  console.log('Brands created')

  // Create Settings
  await prisma.settings.upsert({
    where: { id: '69feba39979540c85cb0c402' },
    update: {},
    create: {
      id: '69feba39979540c85cb0c402',
      shopName: 'New Mandal Cosmetic',
      address: 'Trimohini, Hili, Dakshin Dinajpur',
      phone: 'XXXXX XXXXX',
      gstin: 'XXXXXX',
      invoicePrefix: 'NMC',
      currentInvoiceNumber: 1001,
    },
  })
  console.log('Settings created')

  // Create Products from the provided list
  const allCategories = await prisma.category.findMany()
  const allBrands = await prisma.brand.findMany()

  const getCatId = (name: string) => allCategories.find(c => c.name === name)?.id || allCategories[0].id
  const getBrandId = (name: string) => allBrands.find(b => b.name === name)?.id

  const products = [
    { name: 'Fruits (Mixed)', categoryName: 'Grocery', gstRate: 0, unit: 'Kg', mrp: 120, sellingPrice: 100, purchasePrice: 80 },
    { name: 'Onion', categoryName: 'Grocery', gstRate: 0, unit: 'Kg', mrp: 40, sellingPrice: 35, purchasePrice: 28 },
    { name: 'Sugar', categoryName: 'Grocery', gstRate: 5, unit: 'Kg', mrp: 48, sellingPrice: 45, purchasePrice: 42 },
    { name: 'Mustard Oil (1L)', categoryName: 'Grocery', brandName: 'Marico', gstRate: 5, unit: 'Ltr', mrp: 160, sellingPrice: 150, purchasePrice: 140 },
    { name: 'Jeera (Cumin)', categoryName: 'Grocery', gstRate: 5, unit: 'g', mrp: 150, sellingPrice: 140, purchasePrice: 120 },
    { name: 'Salt (Tata/Aashirvaad)', categoryName: 'Grocery', brandName: 'ITC', gstRate: 0, unit: 'Kg', mrp: 28, sellingPrice: 25, purchasePrice: 22 },
    { name: 'Vim Bar', categoryName: 'Household', brandName: 'Hindustan Unilever', gstRate: 18, unit: 'pcs', mrp: 10, sellingPrice: 10, purchasePrice: 8 },
    { name: 'Surf Excel (1Kg)', categoryName: 'Household', brandName: 'Hindustan Unilever', gstRate: 18, unit: 'Kg', mrp: 120, sellingPrice: 110, purchasePrice: 95 },
    { name: 'Britannia Marie Gold', categoryName: 'Snacks', brandName: 'Britannia', gstRate: 18, unit: 'pack', mrp: 30, sellingPrice: 28, purchasePrice: 24 },
    { name: 'Haldiram Namkeen (Aloo Bhujia)', categoryName: 'Snacks', brandName: 'Haldiram', gstRate: 12, unit: 'pack', mrp: 50, sellingPrice: 45, purchasePrice: 38 },
    { name: 'Amul Cool (200ml)', categoryName: 'Cold Drinks', brandName: 'Amul', gstRate: 12, unit: 'ml', mrp: 25, sellingPrice: 25, purchasePrice: 20 },
    { name: 'Colgate Strong Teeth (100g)', categoryName: 'Personal Care', brandName: 'Colgate-Palmolive', gstRate: 18, unit: 'pcs', mrp: 60, sellingPrice: 55, purchasePrice: 48 },
    { name: 'Mangaldeep Agarbatti', categoryName: 'Household', brandName: 'ITC', gstRate: 5, unit: 'pack', mrp: 20, sellingPrice: 18, purchasePrice: 15 },
    { name: 'Parachute Coconut Oil (100ml)', categoryName: 'Personal Care', brandName: 'Marico', gstRate: 18, unit: 'ml', mrp: 40, sellingPrice: 38, purchasePrice: 32 },
    { name: 'Lux Soap', categoryName: 'Personal Care', brandName: 'Hindustan Unilever', gstRate: 18, unit: 'pcs', mrp: 35, sellingPrice: 32, purchasePrice: 28 },
    { name: 'Clinic Plus Shampoo (175ml)', categoryName: 'Personal Care', brandName: 'Hindustan Unilever', gstRate: 18, unit: 'ml', mrp: 90, sellingPrice: 85, purchasePrice: 75 },
    { name: 'Vaseline Body Lotion', categoryName: 'Personal Care', brandName: 'Hindustan Unilever', gstRate: 18, unit: 'pcs', mrp: 150, sellingPrice: 140, purchasePrice: 120 },
    { name: 'Ponds Face Wash', categoryName: 'Personal Care', brandName: 'Hindustan Unilever', gstRate: 18, unit: 'pcs', mrp: 85, sellingPrice: 80, purchasePrice: 70 },
    { name: 'Fair & Lovely (Glow & Lovely)', categoryName: 'Personal Care', brandName: 'Hindustan Unilever', gstRate: 18, unit: 'pcs', mrp: 60, sellingPrice: 55, purchasePrice: 48 },
    { name: 'Pan Masala', categoryName: 'Snacks', gstRate: 28, unit: 'pcs', mrp: 5, sellingPrice: 5, purchasePrice: 3.5 },
    { name: 'Vasmol Hair Colour', categoryName: 'Personal Care', brandName: 'Emami', gstRate: 18, unit: 'pcs', mrp: 45, sellingPrice: 42, purchasePrice: 35 },
    { name: 'Bidi (Bundle)', categoryName: 'Grocery', gstRate: 28, unit: 'pack', mrp: 20, sellingPrice: 20, purchasePrice: 16 },
    { name: 'Soan Papdi (250g)', categoryName: 'Snacks', brandName: 'Haldiram', gstRate: 5, unit: 'pack', mrp: 80, sellingPrice: 75, purchasePrice: 65 },
    { name: 'Horlicks (500g)', categoryName: 'Personal Care', brandName: 'Hindustan Unilever', gstRate: 18, unit: 'pcs', mrp: 250, sellingPrice: 240, purchasePrice: 210 },
    { name: 'Perfume (Fogg)', categoryName: 'Cosmetic', gstRate: 18, unit: 'pcs', mrp: 199, sellingPrice: 180, purchasePrice: 150 },
    { name: 'Zandu Balm', categoryName: 'Medicine', brandName: 'Emami', gstRate: 12, unit: 'pcs', mrp: 45, sellingPrice: 40, purchasePrice: 32 },
    { name: 'KitKat Chocolate', categoryName: 'Snacks', brandName: 'Nestle', gstRate: 18, unit: 'pcs', mrp: 20, sellingPrice: 20, purchasePrice: 16 },
  ]

  for (const p of products) {
    await prisma.product.upsert({
      where: { barcode: p.name.replace(/\s+/g, '-').toLowerCase() }, // Dummy barcode using name
      update: {},
      create: {
        name: p.name,
        barcode: p.name.replace(/\s+/g, '-').toLowerCase(),
        categoryId: getCatId(p.categoryName),
        brandId: p.brandName ? getBrandId(p.brandName) : null,
        gstRate: p.gstRate,
        unit: p.unit,
        mrp: p.mrp,
        sellingPrice: p.sellingPrice,
        purchasePrice: p.purchasePrice,
        currentStock: 50,
        minStock: 10,
      }
    })
  }
  console.log('Products created')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
