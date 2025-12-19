
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { machineId, operatorId, type, operatorName, machineName, sirketId } = await req.json()

        // 1. Initialize Supabase Client
        const supabaseClient = createClient(
            // Supabase API URL - Env var automatically populated by Supabase
            Deno.env.get('SUPABASE_URL') ?? '',
            // Supabase Service Key - Env var automatically populated by Supabase
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // 2. Fetch Company Config for Telegram (using sirketId)
        // Assuming sirketler table has telegram_config or similar JSON col
        // "telegram_grup_idleri" was mentioned by user.
        // Expected Format: { "bakim_chat_id": "...", "depo_chat_id": "...", "bot_token": "..." }
        const { data: sirketData, error: sirketError } = await supabaseClient
            .from('sirketler')
            .select('telegram_grup_idleri')
            .eq('id', sirketId)
            .single()

        if (sirketError || !sirketData || !sirketData.telegram_grup_idleri) {
            throw new Error("Company Telegram config not found")
        }

        const config = sirketData.telegram_grup_idleri
        const botToken = config.bot_token

        // Determine Target Chat ID
        let chatId = ''
        if (type === 'MAINTENANCE') chatId = config.bakim_chat_id
        else if (type === 'MATERIAL') chatId = config.depo_chat_id
        else chatId = config.yonetim_chat_id // Fallback

        if (!botToken || !chatId) {
            throw new Error("Missing Bot Token or Chat ID in config")
        }

        // 3. Create Log Entry in Database
        const { data: logEntry, error: logError } = await supabaseClient
            .from('andon_loglari')
            .insert({
                machine_id: machineId,
                operator_id: operatorId,
                operator_name: operatorName,
                type: type,
                status: 'PENDING',
                sirket_id: sirketId
            })
            .select()
            .single()

        if (logError) throw logError

        // 4. Send Telegram Message with Inline Keyboard
        const messageText = `🚨 *ANDON UYARISI* 🚨
    
📍 *Makine:* ${machineName}
👤 *Operatör:* ${operatorName}
⚠️ *Tip:* ${type === 'MAINTENANCE' ? 'BAKIM' : 'MALZEME'}
⏰ *Saat:* ${new Date().toLocaleTimeString('tr-TR')}

Lütfen müdahale ediniz.`

        // TELEGRAM API CALL
        const telegramres = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text: messageText,
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [
                        [
                            { text: "✅ Müdahale Ediyorum", callback_data: `ack:${logEntry.id}` }
                        ]
                    ]
                }
            })
        })

        const telegramData = await telegramres.json()

        if (!telegramData.ok) {
            console.error("Telegram API Error:", telegramData)
            // Don't fail the whole request, but log it.
        }

        return new Response(
            JSON.stringify({ success: true, logId: logEntry.id }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error) {
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
