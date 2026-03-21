import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://dmloyybnmqmnjufvmedp.supabase.co';
const supabaseKey = 'sb_publishable_0Ur2zsqwWb3YG2Q4tTVtqg_sO5XB7FN';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const { error } = await supabase.from('whatsapp_leads').upsert({
        phone: '1234567890',
        name: 'Test Name',
        email: 'test@example.com',
        summary: 'Test summary',
        score: 90,
        updated_at: new Date().toISOString()
    }, { onConflict: 'phone' });
        
    if (error) {
        console.error('Supabase Lead Error:', error.message);
    } else {
        console.log('Lead inserted successfully with updated_at');
    }

}

check();
