import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // Use dotenv strictly in development instances where Vercel CLI misses .env
    if (process.env.NODE_ENV !== 'production') {
        dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
        dotenv.config({ path: path.resolve(process.cwd(), '.env') });
    }

    // Server-side only (try both standard process.env and Vite's import.meta.env)
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) || '';
    const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) || '';

    const supabase = createClient(supabaseUrl, supabaseKey);

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // GET /api/scores -> Fetch leaderboard
    if (req.method === 'GET') {
        try {
            const { data, error } = await supabase
                .from('minion_scores')
                .select('id, player_name, difficulty, moves, time_taken, created_at')
                .order('moves', { ascending: true })
                .order('time_taken', { ascending: true })
                .limit(100);

            if (error) throw error;
            return res.status(200).json(data);
        } catch (e: any) {
            console.error('[GET /api/scores] Error:', e);
            return res.status(500).json({ error: e.message });
        }
    }

    // POST /api/scores -> Save score
    if (req.method === 'POST') {
        try {
            const { player_name, difficulty, moves, time_taken } = req.body;

            if (!player_name || !difficulty || moves === undefined || time_taken === undefined) {
                return res.status(400).json({ error: '필수 필드가 누락되었습니다.' });
            }

            const { data, error } = await supabase
                .from('minion_scores')
                .insert({ player_name, difficulty, moves, time_taken })
                .select()
                .single();

            if (error) throw error;
            return res.status(201).json(data);
        } catch (e: any) {
            console.error('[POST /api/scores] Error:', e);
            return res.status(500).json({ error: e.message });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
}
