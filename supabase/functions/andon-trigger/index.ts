
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
        const body = await req.json()

        // 1. Initialize Supabase Client
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // ==========================================
        // SCENARIO A: REQUEST FROM TELEGRAM (WEBHOOK)
        // ==========================================
        if (body.callback_query) {
            const callback = body.callback_query
            const data = callback.data // e.g., "ack:123"
            const responderName = callback.from.first_name + (callback.from.last_name ? ' ' + callback.from.last_name : '')

            if (data.startsWith('ack:')) {
                const logId = data.split(':')[1]

                // Update Database
                const { error } = await supabaseClient
                    .from('andon_loglari')
                    .update({
                        status: 'RESPONDING',
                        responder_name: responderName,
                        responded_at: new Date().toISOString()
                    })
                    .eq('id', logId)

                if (error) {
                    console.error('DB Update Error:', error)
                    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
                }

                // Answer Callback Query (Stop loading animation on button)
                // We need the bot token. In this webhook context, we might not know ISOLATED company token easily 
                // without querying DB by logId. 
                // TRICK: We can optimize by fetching the row first to get sirket_id -> then config.
                // For speed, let's try to fetch the token associated with this update if possible, 
                // OR better: The webhook URL is usually set per bot. 
                // If you have multiple companies with multiple bots pointing to this SAME function, logic gets complex.
                // ASSUMPTION: Single Bot or we look up Bot Token via Log Entry if needed.
                // Let's lookup the log entry to find sirket_id -> then get token.

                const { data: logEntry } = await supabaseClient.from('andon_loglari').select('sirket_id').eq('id', logId).single()

                if (logEntry && logEntry.sirket_id) {
                    const { data: sirket } = await supabaseClient.from('sirketler').select('telegram_grup_idleri').eq('id', logEntry.sirket_id).single()
                    if (sirket && sirket.telegram_grup_idleri) {
                        const token = sirket.telegram_grup_idleri.bot_token

                        // Edit Message Text to show "ACKNOWLEDGED"
                        await fetch(`https://api.telegram.org/bot${token}/editMessageText`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                chat_id: callback.message.chat.id,
                                message_id: callback.message.message_id,
                                text: callback.message.text + `\n\n✅ ${responderName} Yola Çıktı!`,
                                parse_mode: 'Markdown'
                            })
                        })
                    }
                }
            }

            return new Response(JSON.stringify({ received: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        // ==========================================
        // SCENARIO B: REQUEST FROM FRONTEND (TRIGGER)
        // ==========================================
        const { machineId, operatorId, type, operatorName, machineName, sirketId } = body

        if (!machineId || !type) {
            throw new Error("Invalid Request Body")
        }

        // 2. Fetch Company Config for Telegram
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

        let chatId = ''
        if (type === 'MAINTENANCE') chatId = config.bakim_chat_id
        else if (type === 'MATERIAL') chatId = config.depo_chat_id
        else chatId = config.yonetim_chat_id

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

        // 4. Send Telegram Message
        let messageText = ''

        if (type === 'MAINTENANCE') {
            messageText = `🔴 🔴 *ACİL BAKIM ÇAĞRISI* 🔴 🔴
    
🏭 *Makine:* ${machineName}
👤 *Operatör:* ${operatorName}
🕒 *Saat:* ${new Date().toLocaleTimeString('tr-TR')}

🛠️ _Lütfen en kısa sürede müdahale ediniz._`
        } else {
            messageText = `📦 📦 *MALZEME TALEBİ* 📦 📦
    
🏭 *Makine:* ${machineName}
👤 *Operatör:* ${operatorName}
🕒 *Saat:* ${new Date().toLocaleTimeString('tr-TR')}

🚚 _Depo sorumlusunun dikkatine._`
        }

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
            // return error to frontend to debug
            throw new Error(`Telegram API: ${telegramData.description}`)
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
