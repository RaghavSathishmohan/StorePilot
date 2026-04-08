# StorePilot Sample Data Files

## Overview
This package includes comprehensive sample data for testing StorePilot with a realistic convenience store setup.

## Files

### 1. sample-products-full.csv (665 products)
Complete product catalog covering all convenience store categories:

| Category | Count | Examples |
|----------|-------|----------|
| Beverages | 43 | Soda, energy drinks, sports drinks, water, coffee, tea, juice, milk |
| Snacks | 42 | Chips, crackers, nuts, jerky, popcorn, pretzels |
| Candy | 75 | Chocolate bars, gum, mints, gummies, protein bars, cookies |
| Tobacco | 44 | Cigarettes, lighters, cigars, vape, chewing tobacco, nicotine pouches |
| Bakery | 38 | Bread, bagels, muffins, tortillas, rolls |
| Frozen | 62 | Pizza, hot pockets, taquitos, fries, ice cream, breakfast items |
| Canned Goods | 100 | Soups, pasta, meat, chili, beans, vegetables, fruits, sauces |
| Health/Beauty | 100+ | Pain relievers, cold medicine, vitamins, personal care, dental |
| Household | 35+ | Cleaning supplies, paper goods, trash bags, storage |
| Automotive | 100+ | Motor oil, fluids, car care, tools, accessories, batteries |

### 2. sample-inventory-full.csv (605 inventory records)
Stock levels for products across multiple locations:
- Cooler
- Front Counter
- Main Floor
- Back Shelf
- Liquor Room
- Bakery Shelf
- Checkout Counter

### 3. sample-sales-full.csv (150+ line items)
Individual sales transactions. Each row represents one line item (product sold), not the entire receipt. Multiple products with the same receipt_number belong to the same transaction.

## Import Instructions

1. **Import Products first** - Upload `sample-products-full.csv`
2. **Import Inventory second** - Upload `sample-inventory-full.csv`
3. **Import Sales last** - Upload `sample-sales-full.csv`

## CSV Templates

The Import Dashboard now includes downloadable templates for each import type. These templates use the exact column headers expected by the auto-mapping system.

### Products Template Columns:
- `sku` - Unique product code (e.g., BEV-001)
- `name` - Product name
- `description` - Product description
- `category` - Category name
- `barcode` - UPC/EAN code
- `selling_price` - Retail price
- `cost_price` - Wholesale cost
- `tax_rate` - Tax percentage (e.g., 8.25)
- `min_stock_level` - Minimum stock alert threshold
- `max_stock_level` - Maximum stock capacity
- `reorder_point` - When to reorder
- `reorder_quantity` - How much to reorder
- `unit_of_measure` - Unit (each, lb, oz, etc)
- `supplier_name` - Vendor name
- `supplier_contact` - Vendor email

### Inventory Template Columns:
- `sku` - Product SKU
- `quantity` - Current quantity
- `unit_cost` - Cost per unit
- `location_name` - Storage location

### Sales Template Columns:
- `receipt_number` - Receipt/transaction ID
- `transaction_date` - Date and time (YYYY-MM-DD HH:MM:SS)
- `sku` - Product SKU
- `product_name` - Product name
- `quantity` - Quantity sold
- `unit_price` - Unit price
- `discount_amount` - Discount applied
- `tax_amount` - Tax amount
- `payment_method` - card/cash/mobile
- `customer_name` - Customer name
- `customer_email` - Customer email
- `customer_phone` - Customer phone
- `location_name` - Store location

## Auto-Mapping

StorePilot automatically detects the import type and maps columns based on:
- Header names matching expected fields
- Field synonyms (e.g., "product_code" → "sku")
- Required field coverage (must be ≥80% for auto-import)

## Low Stock Examples
These items have intentionally low stock for testing alerts:
- BEER-005 (Tito's Vodka): 15 units
- BEER-006 (Crown Royal): 18 units
- SNK-008 (Beef Jerky): 39 units

## Notes
- All prices use 8.25% tax rate
- Dates are in local datetime format (YYYY-MM-DD HH:MM:SS)
- SKUs follow pattern: XXX-NNN (category-prefix + number)
