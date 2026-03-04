import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';
import cron from 'node-cron';
import Stripe from 'stripe';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

// Initialize Gemini SDK
const genaiKey = process.env.GEMINI_API_KEY;
const genAI = genaiKey ? new GoogleGenerativeAI(genaiKey) : null;
if (!genAI) console.warn("WARNING: GEMINI_API_KEY is missing. AI analysis will fail.");

// Initialize Supabase Admin Client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
let supabaseAdmin: any = null;

if (supabaseUrl && supabaseServiceKey) {
    try {
        supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    } catch (e) {
        console.error("ERROR: Failed to initialize Supabase client:", e);
    }
} else {
    console.warn("WARNING: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing. Leaderboards and coin fulfillment will fail.");
}

// Initialize Stripe
const stripeKey = process.env.STRIPE_SECRET_KEY;
const stripe = stripeKey ? new Stripe(stripeKey, {
    apiVersion: '2025-02-24.acacia' as any,
}) : null;
if (!stripe) console.warn("WARNING: STRIPE_SECRET_KEY is missing. Checkout will fail.");

app.use(cors());

// Webhook needs raw body, not JSON parsed body, so route it before express.json()
app.post('/api/webhook/stripe', express.raw({ type: 'application/json' }), async (req: Request, res: Response) => {
    const sig = req.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!stripe) {
        return res.status(500).send('Stripe not initialized');
    }

    if (!sig || !endpointSecret) {
        return res.status(400).send('Webhook secret or signature missing');
    }

    let event;
    try {
        event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err: any) {
        console.error(`Webhook Error: ${err.message}`);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the checkout.session.completed event
    if (event.type === 'checkout.session.completed' && stripe) {
        const session = event.data.object as Stripe.Checkout.Session;

        // Retrieve the user ID and coin amount from metadata
        const userId = session.metadata?.userId;
        const coinsToAdd = parseInt(session.metadata?.coins || '0', 10);

        if (userId && coinsToAdd > 0 && supabaseAdmin) {
            console.log(`Fulfilling purchase: Adding ${coinsToAdd} coins to user ${userId}`);

            // Get current coins
            const { data: profile } = await supabaseAdmin
                .from('profiles')
                .select('coins')
                .eq('id', userId)
                .single();

            if (profile) {
                // Add new coins
                await supabaseAdmin
                    .from('profiles')
                    .update({ coins: profile.coins + coinsToAdd })
                    .eq('id', userId);
                console.log('Successfully added coins via Stripe webhook.');
            }
        }
    }

    res.json({ received: true });
});

app.use(express.json({ limit: '20mb' }));

app.get('/health', (req: Request, res: Response) => {
    res.json({
        status: 'ok',
        config: {
            hasGemini: !!genAI,
            hasSupabase: !!supabaseAdmin,
            hasStripe: !!stripe,
            hasWebhookSecret: !!process.env.STRIPE_WEBHOOK_SECRET
        }
    });
});

app.post('/api/rank', async (req: Request, res: Response) => {
    try {
        const { image } = req.body;
        if (!image) {
            return res.status(400).json({ error: 'No image provided' });
        }

        // 1. Verify it's a valid data URL and get mime type / base64 data
        const matches = image.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
        if (!matches || matches.length !== 3) {
            return res.status(400).json({ error: 'Invalid image format' });
        }

        const mimeType = matches[1];
        const base64Data = matches[2];

        if (!genAI) {
            return res.status(500).json({ error: 'AI Backend not configured (missing API Key)' });
        }

        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

        // 2. The single-face & scoring prompt
        const prompt = `
        You are an objective, brutally honest facial analysis AI designed for a "LooksRank" app.You evaluate human faces based on universally recognized metrics of facial aesthetics.

CRITICAL RULE 1: FACE DETECTION.Before providing any scores, you must verify that there is EXACTLY ONE clearly visible human face in the image. 
- If the image is a plain wall, a ceiling, an object, an animal, or anything that is NOT a human face, you MUST set "valid": false.
- If there are zero faces, multiple faces, or the face is heavily obscured / blurry, you MUST set "valid": false.
- Do NOT attempt to hallucinate a face or score an object.

CRITICAL RULE 2: FORMATTING.You MUST return your response as a valid JSON object matching this exact structure, with no markdown formatting or extra text:

        {
            "valid": boolean, // true ONLY if exactly one human face is clearly visible
                "reason": string, // if valid is false, provide a polite but firm explanation (e.g., "No human face detected", "Image is too blurry"). If true, empty string.
                    "score": number, // an integer from 1 to 99 representing the OVERALL aesthetic score (0 if valid false)
                        "psl": number, // a float from 1.0 to 8.0 representing the exact PSL (Physical Social Level) mapping, to 2 decimal places.
                            "details": {
                "harmony": number, // 1-100 score: How well individual facial features work together geometrically and symmetrically.
                    "dimorphism": number, // 1-100 score: How distinct the features are from the opposite sex (e.g. strong jaw/brow for men).
                        "angularity": number, // 1-100 score: Sharpness of facial features, bone structure visibility, lack of excess facial fat.
                            "skin": number // 1-100 score: Skin clarity, eyebrow thickness, contrast, and teeth.
            }
        }

You are analyzing based on the rigorous Looksmaxxing PSL scale.
USER FEEDBACK: The previous scoring was too lenient.NERF the ratings. 
- Be MUCH MORE CRITICAL.Most people should fall in the Normie(3.5 - 5.5) range. 
- Reserve scores above 75(PSL 6.0 +) only for model - tier, exceptional looks.
- PSL 1.0 - 3.0(Score 1 - 29): Subhuman.Severe flaws.
- PSL 3.0 - 4.0(Score 30 - 44): Low - tier Normie(LTN).Below average.
- PSL 4.0 - 5.0(Score 45 - 59): Mid - tier Normie(MTN).Average / Background.
- PSL 5.0 - 6.0(Score 60 - 74): High - tier Normie(HTN).Good looking, attractive.
- PSL 6.0 - 7.0(Score 75 - 84): Chadlite.Top - tier, model material.
- PSL 7.0 - 8.0(Score 85 - 99): Chad / Elite Model.Exceptional, nearly flawless perfection.

Be brutally honest, but precise.Analyze the image and return ONLY the JSON.
`;

        // 3. Call Gemini 1.5 Flash
        const result = await model.generateContent([
            prompt,
            {
                inlineData: {
                    mimeType,
                    data: base64Data
                }
            }
        ]);

        const responseData = await result.response;
        const rawText = responseData.text();

        // Clean up markdown code blocks if gemini returns them despite instructions
        const cleanedText = rawText.replace(/```json\n ? /g, '').replace(/```\n?/g, '').trim();

        console.log("Raw Gemini Output:", cleanedText);

        const parsed = JSON.parse(cleanedText);

        if (!parsed.valid) {
            return res.status(400).json({ error: parsed.reason });
        }

        // 4. Calculate Tier based on PSL
        let tier = 'Subhuman';
        if (parsed.psl >= 7.0) tier = 'Chad';
        else if (parsed.psl >= 6.0) tier = 'Chadlite';
        else if (parsed.psl >= 5.0) tier = 'HTN';
        else if (parsed.psl >= 4.0) tier = 'MTN';
        else if (parsed.psl >= 3.0) tier = 'LTN';

        // 5. Return the full result
        return res.json({
            score: parsed.score, // 1-99 overall score
            psl: Number(parsed.psl.toFixed(2)),
            tier: tier,
            details: parsed.details || {
                harmony: Math.floor(parsed.score * 0.9 + Math.random() * 10),
                dimorphism: Math.floor(parsed.score * 0.8 + Math.random() * 20),
                angularity: Math.floor(parsed.score * 0.95 + Math.random() * 5),
                skin: Math.floor(parsed.score * 0.85 + Math.random() * 15)
            }
        });

    } catch (error: any) {
        console.error("API Error:", error);
        res.status(500).json({ error: 'Failed to process image', details: error.message });
    }
});

// --- CRON JOBS ---
// Daily Reset (Midnight)
cron.schedule('0 0 * * *', async () => {
    if (!supabaseAdmin) return console.warn("Cron skipped: Supabase not initialized");
    console.log('Running daily leaderboard reset...');
    try {
        const { error } = await supabaseAdmin
            .from('profiles')
            .update({ best_today: 0 })
            .neq('best_today', 0); // Only update if > 0

        if (error) throw error;
        console.log('Daily reset complete.');
    } catch (error) {
        console.error('Error during daily reset:', error);
    }
});

// Weekly Reset (Monday Midnight)
cron.schedule('0 0 * * 1', async () => {
    if (!supabaseAdmin) return console.warn("Cron skipped: Supabase not initialized");
    console.log('Running weekly leaderboard reset...');
    try {
        const { error } = await supabaseAdmin
            .from('profiles')
            .update({ best_weekly: 0 })
            .neq('best_weekly', 0); // Only update if > 0

        if (error) throw error;
        console.log('Weekly reset complete.');
    } catch (error) {
        console.error('Error during weekly reset:', error);
    }
});

// --- ADMIN API ---
// Manual reset endpoint (for testing/admin use)
app.post('/api/admin/reset', async (req: Request, res: Response) => {
    const { type } = req.body; // 'daily' or 'weekly'
    if (!supabaseAdmin) return res.status(500).json({ error: 'Supabase not initialized' });
    try {
        if (type === 'daily') {
            await supabaseAdmin.from('profiles').update({ best_today: 0 }).neq('best_today', 0);
            return res.json({ message: 'Daily reset triggered manually.' });
        } else if (type === 'weekly') {
            await supabaseAdmin.from('profiles').update({ best_weekly: 0 }).neq('best_weekly', 0);
            return res.json({ message: 'Weekly reset triggered manually.' });
        }
        res.status(400).json({ error: 'Invalid reset type. Use "daily" or "weekly".' });
    } catch (error: any) {
        console.error('Manual reset error:', error);
        res.status(500).json({ error: 'Failed to reset leaderboard', details: error.message });
    }
});

// --- STRIPE CHECKOUT ---
app.post('/api/create-checkout-session', async (req: Request, res: Response) => {
    const { userId, packageId, amount, coins } = req.body; // e.g., amount is in cents, coins is number to add

    if (!stripe) {
        return res.status(500).json({ error: 'Stripe not configured correctly' });
    }

    if (!userId || !amount || !coins) {
        return res.status(400).json({ error: 'Missing required parameters' });
    }

    try {
        // You would dynamically set the success/cancel URL to your deployed frontend URL
        const frontendUrl = process.env.FRONTEND_URL || req.headers.origin || 'http://localhost:5173';

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
                {
                    price_data: {
                        currency: 'usd',
                        product_data: {
                            name: `${coins} LooksRank Coins`,
                            description: 'Use coins to scan faces and duel other players.',
                        },
                        unit_amount: amount, // e.g. $2.99 = 299
                    },
                    quantity: 1,
                },
            ],
            mode: 'payment',
            success_url: `${frontendUrl}?checkout=success`,
            cancel_url: `${frontendUrl}?checkout=canceled`,
            metadata: {
                userId,
                coins: coins.toString(),
            },
        });

        res.json({ url: session.url });
    } catch (error: any) {
        console.error('Error creating checkout session:', error);
        res.status(500).json({ error: 'Failed to create checkout session' });
    }
});

app.listen(Number(port), "0.0.0.0", () => {
    console.log(`LooksRank API server running on port ${port} (0.0.0.0)`);
});
