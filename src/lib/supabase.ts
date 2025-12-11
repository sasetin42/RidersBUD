import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase environment variables not configured. Running in localStorage mode.');
}

export const supabase = supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
        },
        realtime: {
            params: {
                eventsPerSecond: 10
            }
        },
        global: {
            headers: {
                'x-application-name': 'RidersBUD'
            }
        }
    })
    : null;

// Helper to check if Supabase is configured
export const isSupabaseConfigured = () => {
    return supabase !== null;
};

// Database type definitions (will be generated from Supabase)
export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Database {
    public: {
        Tables: {
            services: {
                Row: {
                    id: string
                    name: string
                    description: string | null
                    price: number
                    estimated_time: string | null
                    image_url: string | null
                    category: string
                    icon: string | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    name: string
                    description?: string | null
                    price: number
                    estimated_time?: string | null
                    image_url?: string | null
                    category: string
                    icon?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    name?: string
                    description?: string | null
                    price?: number
                    estimated_time?: string | null
                    image_url?: string | null
                    category?: string
                    icon?: string | null
                    created_at?: string
                    updated_at?: string
                }
            }
            mechanics: {
                Row: {
                    id: string
                    name: string
                    email: string
                    phone: string | null
                    bio: string | null
                    rating: number
                    reviews_count: number
                    specializations: string[]
                    status: 'Active' | 'Inactive' | 'Pending'
                    is_online: boolean
                    image_url: string | null
                    lat: number | null
                    lng: number | null
                    registration_date: string
                    birthday: string | null
                    created_at: string
                    updated_at: string
                }
            }
            bookings: {
                Row: {
                    id: string
                    customer_id: string | null
                    customer_name: string
                    service_id: string | null
                    mechanic_id: string | null
                    vehicle_id: string | null
                    date: string
                    time: string
                    status: string
                    location_lat: number | null
                    location_lng: number | null
                    notes: string | null
                    cancellation_reason: string | null
                    is_reviewed: boolean
                    is_paid: boolean
                    eta: number | null
                    before_images: string[]
                    after_images: string[]
                    created_at: string
                    updated_at: string
                }
            }
            notifications: {
                Row: {
                    id: string
                    type: string
                    title: string
                    message: string
                    recipient_id: string
                    link: string | null
                    read: boolean
                    created_at: string
                }
            }
        }
        Views: {
            [_ in never]: never
        }
        Functions: {
            [_ in never]: never
        }
        Enums: {
            [_ in never]: never
        }
    }
}
