import { supabase } from '../lib/supabase';
import { seedServices, seedMechanics, seedParts } from '../data/mockData';

export const seedDatabase = async () => {
    console.log("Starting database seeding...");

    // 1. Seed Services
    console.log("Seeding Services...");
    const { error: serviceError } = await supabase.from('services').upsert(
        seedServices.map(s => ({
            id: s.id, // Keep IDs consistent if possible, or let Supabase generate new ones if UUIDs don't match
            name: s.name,
            description: s.description,
            price: s.price,
            estimated_time: s.estimatedTime,
            image_url: s.imageUrl,
            category: s.category,
            icon: s.icon
        })), { onConflict: 'name' } // Avoid duplicates based on name if IDs differ
    );
    if (serviceError) console.error("Error seeding services:", serviceError);

    // 2. Seed Products (Parts)
    console.log("Seeding Products...");
    const { error: productError } = await supabase.from('products').upsert(
        seedParts.map(p => ({
            id: p.id, // Assuming these are UUIDs or compatible
            name: p.name,
            description: p.description,
            price: p.price,
            sales_price: p.salesPrice,
            image_urls: p.imageUrls,
            category: p.category,
            sku: p.sku,
            brand: p.brand,
            stock: p.stock
        }))
    );
    if (productError) console.error("Error seeding products:", productError);

    // 3. Seed Mechanics (Requires creating auth users first, which we can't do easily from client without admin API)
    // For this demo, we will just insert into the 'mechanics' table directly if RLS allows, 
    // BUT 'mechanics' references 'profiles' which references 'auth.users'.
    // So we can't easily seed mechanics with real auth users from the client side without a backend script.
    // STRATEGY: We will skip seeding mechanics/users for now and rely on manual signup or a separate admin script.
    // OR: We can create a "public" mechanics table for display if we want to bypass auth for the directory.
    // However, our schema enforces referential integrity.

    console.log("Skipping Mechanics and Bookings seeding due to Auth constraints.");
    console.log("Please sign up manually to create users.");

    console.log("Database seeding completed (partial).");
};
